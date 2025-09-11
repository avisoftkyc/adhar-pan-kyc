const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { protect } = require('../middleware/auth');
const AadhaarVerification = require('../models/AadhaarVerification');
const { logAadhaarVerificationEvent } = require('../services/auditService');
const logger = require('../utils/logger');
const { verifyAadhaar, simulateAadhaarVerification } = require('../services/aadhaarVerificationService');

// Helper function to convert Excel serial number to date string
function excelSerialToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  
  try {
    // Use XLSX library's built-in date parsing
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) {
      // Format as DD/MM/YYYY
      const day = String(date.d).padStart(2, '0');
      const month = String(date.m).padStart(2, '0');
      const year = date.y;
      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    console.error('Error parsing Excel date:', error);
  }
  
  return null;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/aadhaar-verification');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: async (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    cb(null, `${originalName}_${timestamp}_${randomSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Get all Aadhaar verification batches for the user
router.get('/batches', protect, async (req, res) => {
  try {
    const batches = await AadhaarVerification.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(req.user.id),
          // Exclude single verification records (they start with SINGLE_VERIFICATION_)
          batchId: { $not: { $regex: /^SINGLE_VERIFICATION_/ } }
        } 
      },
      {
        $group: {
          _id: '$batchId',
          totalRecords: { $sum: 1 },
          pendingRecords: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          verifiedRecords: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          rejectedRecords: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          invalidRecords: { $sum: { $cond: [{ $eq: ['$status', 'invalid'] }, 1, 0] } },
          errorRecords: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({ success: true, data: batches });
  } catch (error) {
    logger.error('Error fetching Aadhaar verification batches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
});

// Get all records for a user
router.get('/records', protect, async (req, res) => {
  try {
    const records = await AadhaarVerification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Decrypt sensitive data for each record
    const decryptedRecords = records.map(record => {
      try {
        // Create a temporary AadhaarVerification instance to use the decryptData method
        const tempRecord = new AadhaarVerification(record);
        return tempRecord.decryptData();
      } catch (error) {
        console.error('Decryption error for record:', record._id, error.message);
        // Return original record if decryption fails
        return record;
      }
    });

    res.json({
      success: true,
      data: decryptedRecords
    });
  } catch (error) {
    logger.error('Error fetching Aadhaar verification records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch records',
      error: error.message
    });
  }
});

// Get batch details
router.get('/batch/:batchId', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    const records = await AadhaarVerification.find({
      userId: req.user.id,
      batchId: batchId
    }).sort({ createdAt: -1 });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Decrypt sensitive data for display
    const decryptedRecords = records.map(record => {
      try {
        const tempDoc = new AadhaarVerification(record);
        return tempDoc.decryptData();
      } catch (error) {
        logger.error('Error decrypting record:', error);
        return record;
      }
    });

    const stats = await AadhaarVerification.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), batchId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      total: records.length,
      pending: 0,
      verified: 0,
      rejected: 0,
      invalid: 0,
      error: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        batchId,
        records: decryptedRecords,
        stats: statusCounts
      }
    });
  } catch (error) {
    logger.error('Error fetching batch details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch batch details' });
  }
});

// Upload Aadhaar verification file
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in the Excel file'
      });
    }

    // Validate required columns
    const requiredColumns = ['aadhaarNumber', 'name', 'dateOfBirth'];
    const firstRow = data[0];
    
    const columnMapping = {
      'aadhaarNumber': ['aadhaarNumber', 'AADHAAR', 'Aadhaar', 'aadhaar', 'Aadhaar Number', 'aadhaar_number', 'Aadhaar No', 'Aadhaar No.'],
      'name': ['name', 'Name', 'NAME', 'fullName', 'Full Name', 'full_name', 'FULL NAME'],
      'dateOfBirth': ['dateOfBirth', 'DOB', 'dob', 'Date of Birth', 'dateOfBirth', 'birthDate', 'Birth Date', 'BIRTH DATE'],
      'gender': ['gender', 'Gender', 'GENDER', 'sex', 'Sex', 'SEX']
    };
    
    const missingColumns = [];
    const columnMap = {};
    
    requiredColumns.forEach(requiredCol => {
      const possibleNames = columnMapping[requiredCol];
      let found = false;
      
      for (const possibleName of possibleNames) {
        if (firstRow.hasOwnProperty(possibleName)) {
          columnMap[requiredCol] = possibleName;
          found = true;
          break;
        }
      }
      
      if (!found) {
        missingColumns.push(requiredCol);
      }
    });
    
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Create batch ID
    const batchId = `${req.file.originalname.split('.')[0]}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Process and save records
    const records = [];
    for (const row of data) {
      // Validate that required fields are present and not empty
      const aadhaarNumber = row[columnMap.aadhaarNumber];
      const name = row[columnMap.name];
      const dateOfBirthRaw = row[columnMap.dateOfBirth];
      
      // Skip rows with missing or empty required fields
      if (!aadhaarNumber || !name || aadhaarNumber.toString().trim() === '' || name.toString().trim() === '') {
        logger.warn(`Skipping row with missing required fields:`, { aadhaarNumber, name, dateOfBirth: dateOfBirthRaw });
        continue;
      }
      
      // Convert date of birth - handle both Excel serial numbers and date strings
      let dateOfBirth = null;
      if (dateOfBirthRaw !== undefined && dateOfBirthRaw !== null) {
        if (typeof dateOfBirthRaw === 'number' && dateOfBirthRaw > 1000) { // Excel serial number (reasonable range)
          dateOfBirth = excelSerialToDate(dateOfBirthRaw);
        } else if (typeof dateOfBirthRaw === 'string' && dateOfBirthRaw.trim() !== '') {
          dateOfBirth = dateOfBirthRaw.trim();
        }
      }
      
      // Skip rows with empty or missing date of birth
      if (!dateOfBirth || dateOfBirth.trim() === '') {
        logger.warn(`Skipping row with missing date of birth:`, { aadhaarNumber, name, dateOfBirth: dateOfBirthRaw });
        continue;
      }
      
      const record = new AadhaarVerification({
        userId: req.user.id,
        batchId: batchId,
        aadhaarNumber: aadhaarNumber.toString().trim(),
        name: name.toString().trim(),
        dateOfBirth: dateOfBirth,
        gender: row[columnMap.gender] || row.gender || 'M',
        address: row.address || row.Address || '',
        pinCode: row.pinCode || row.pincode || row.PinCode || '',
        state: row.state || row.State || '',
        district: row.district || row.District || '',
        status: 'pending'
      });
      
      await record.save();
      records.push(record);
    }

    // Check if any valid records were processed
    if (records.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        message: 'No valid records found in the file. Please check that all required columns (Aadhaar Number, Name, Date of Birth) have data.',
        data: {
          totalRows: data.length,
          skippedRows: data.length
        }
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Log successful upload
    logger.info(`Successfully uploaded Aadhaar verification file: ${req.file.originalname}`, {
      userId: req.user.id,
      batchId,
      totalRecords: records.length,
      totalRows: data.length,
      skippedRows: data.length - records.length
    });

    // Log the upload event for admin stats
    await logAadhaarVerificationEvent('aadhaar_verification_upload', req.user.id, {
      batchId,
      recordCount: records.length,
      fileName: req.file.originalname
    }, req);

    res.json({
      success: true,
      message: `Successfully uploaded ${records.length} records`,
      data: {
        batchId,
        totalRecords: records.length,
        totalRows: data.length,
        skippedRows: data.length - records.length,
        batchName: req.file.originalname
      }
    });

  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// Process batch verification with REAL Sandbox API
router.post('/batch/:batchId/process', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Get pending records
    const pendingRecords = await AadhaarVerification.find({
      userId: req.user.id,
      batchId: batchId,
      status: 'pending'
    });

    if (pendingRecords.length === 0) {
      return res.json({
        success: true,
        message: 'No pending records to process'
      });
    }

    const results = [];

    for (const record of pendingRecords) {
      try {
        // Use real Sandbox API for verification
        const startTime = Date.now();
        
        // Decrypt the data before calling the API
        const decryptedRecord = record.decryptData();
        
        // Call real Aadhaar verification API with decrypted data
        const verificationResult = await verifyAadhaar(
          decryptedRecord.aadhaarNumber, 
          decryptedRecord.name, 
          decryptedRecord.dateOfBirth,
          decryptedRecord.gender
        );
        
        const processingTime = Date.now() - startTime;
        
        // Update record with real verification result
        record.status = verificationResult.valid && verificationResult.details.dataMatch ? 'verified' : 'rejected';
        record.isProcessed = true;
        record.processedAt = new Date();
        record.processingTime = processingTime;
        record.verificationDetails = {
          apiResponse: verificationResult.details.apiResponse,
          verificationDate: new Date(),
          remarks: verificationResult.message,
          source: verificationResult.details.source,
          confidence: verificationResult.details.confidence,
          dataMatch: verificationResult.details.dataMatch,
          nameMatch: verificationResult.details.nameMatch,
          dobMatch: verificationResult.details.dobMatch,
          genderMatch: verificationResult.details.genderMatch,
          addressMatch: verificationResult.details.addressMatch,
          transactionId: verificationResult.details.transactionId,
          fullAddress: verificationResult.details.fullAddress,
          state: verificationResult.details.state,
          district: verificationResult.details.district,
          pinCode: verificationResult.details.pinCode
        };
        
        await record.save();
        
        results.push({
          recordId: record._id,
          status: record.status,
          result: verificationResult,
          processingTime: processingTime
        });

        // Log verification event
        await logAadhaarVerificationEvent('aadhaar_verification_verification', req.user.id, {
          recordId: record._id,
          batchId: batchId,
          status: record.status,
          processingTime: processingTime
        }, req);

        // Add delay between API calls to avoid overwhelming the Sandbox API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Error processing record ${record._id}:`, error);
        
        record.status = 'error';
        record.errorMessage = error.message;
        record.isProcessed = true;
        record.processedAt = new Date();
        await record.save();
        
        results.push({
          recordId: record._id,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} records`,
      data: {
        batchId,
        results,
        summary: {
          total: results.length,
          verified: results.filter(r => r.status === 'verified').length,
          rejected: results.filter(r => r.status === 'rejected').length,
          error: results.filter(r => r.status === 'error').length
        }
      }
    });

  } catch (error) {
    logger.error('Error processing batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch',
      error: error.message
    });
  }
});

// Batch record verification endpoint (frontend calls this with recordIds)
router.post('/verify', protect, async (req, res) => {
  // Set a longer timeout for batch processing
  req.setTimeout(300000); // 5 minutes timeout
  res.setTimeout(300000); // 5 minutes timeout
  try {
    console.log('🔍 Received Aadhaar verification request:', {
      body: req.body,
      contentType: req.get('Content-Type'),
      user: req.user.id
    });

    // Check if this is a batch verification request
    if (req.body.recordIds && Array.isArray(req.body.recordIds)) {
      console.log('📦 Processing Aadhaar batch verification for records:', req.body.recordIds.length, 'records');
      
      const results = [];
      const totalRecords = req.body.recordIds.length;
      
      for (let i = 0; i < req.body.recordIds.length; i++) {
        const recordId = req.body.recordIds[i];
        console.log(`🔄 Processing Aadhaar record ${i + 1}/${totalRecords}: ${recordId}`);
        try {
          // Find the record
          const record = await AadhaarVerification.findOne({
            _id: recordId,
            userId: req.user.id
          });

          if (!record) {
            results.push({
              recordId,
              status: 'error',
              error: 'Record not found'
            });
            continue;
          }

          // Use real Sandbox API for verification
          const startTime = Date.now();
          
          // Decrypt the data before calling the API
          const decryptedRecord = record.decryptData();
          
          // Call real Aadhaar verification API with decrypted data
          const verificationResult = await verifyAadhaar(
            decryptedRecord.aadhaarNumber, 
            decryptedRecord.name, 
            decryptedRecord.dateOfBirth,
            decryptedRecord.gender
          );
          
          const processingTime = Date.now() - startTime;
          
          // Update record with real verification result
          record.status = verificationResult.valid && verificationResult.details.dataMatch ? 'verified' : 'rejected';
          record.isProcessed = true;
          record.processedAt = new Date();
          record.processingTime = processingTime;
          record.verificationDetails = {
            apiResponse: verificationResult.details.apiResponse,
            verificationDate: new Date(),
            remarks: verificationResult.message,
            source: verificationResult.details.source,
            confidence: verificationResult.details.confidence,
            dataMatch: verificationResult.details.dataMatch,
            nameMatch: verificationResult.details.nameMatch,
            dobMatch: verificationResult.details.dobMatch,
            genderMatch: verificationResult.details.genderMatch,
            addressMatch: verificationResult.details.addressMatch,
            transactionId: verificationResult.details.transactionId,
            fullAddress: verificationResult.details.fullAddress,
            state: verificationResult.details.state,
            district: verificationResult.details.district,
            pinCode: verificationResult.details.pinCode
          };
          
          await record.save();
          
          results.push({
            recordId: record._id,
            status: record.status,
            result: verificationResult,
            processingTime: processingTime
          });

          // Log verification event
          await logAadhaarVerificationEvent('aadhaar_verification_verification', req.user.id, {
            recordId: record._id,
            status: record.status,
            processingTime: processingTime
          }, req);

          // Reduced delay between API calls for better performance
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Error processing record ${recordId}:`, error);
          
          results.push({
            recordId,
            status: 'error',
            error: error.message
          });
        }
      }

      return res.json({
        success: true,
        message: `Processed ${results.length} records`,
        data: {
          results,
          summary: {
            total: results.length,
            verified: results.filter(r => r.status === 'verified').length,
            rejected: results.filter(r => r.status === 'rejected').length,
            error: results.filter(r => r.status === 'error').length
          }
        }
      });
    }

    // If not batch verification, proceed with single verification
    const { aadhaarNumber, name, dateOfBirth, gender } = req.body;

    // Log the extracted values
    console.log('📋 Extracted values:', { aadhaarNumber, name, dateOfBirth, gender });

    if (!aadhaarNumber || !name || !dateOfBirth) {
      console.log('❌ Missing required fields:', { 
        hasAadhaarNumber: !!aadhaarNumber, 
        hasName: !!name, 
        hasDateOfBirth: !!dateOfBirth 
      });
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Number, Name, and Date of Birth are required'
      });
    }

    // Validate Aadhaar format
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }

    // Create a temporary record for verification
    const tempRecord = new AadhaarVerification({
      userId: req.user.id,
      batchId: 'SINGLE_VERIFICATION_' + Date.now(),
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      name: name.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender: gender || 'M',
      status: 'pending'
    });

    // Use real Sandbox API for verification
    const startTime = Date.now();
    const verificationResult = await verifyAadhaar(aadhaarNumber, name, dateOfBirth, gender);
    
    // Update record with real verification result
    tempRecord.status = verificationResult.valid && verificationResult.details.dataMatch ? 'verified' : 'rejected';
    tempRecord.verificationDetails = {
      apiResponse: verificationResult.details.apiResponse,
      verificationDate: new Date(),
      remarks: verificationResult.message,
      source: verificationResult.details.source,
      confidence: verificationResult.details.confidence,
      dataMatch: verificationResult.details.dataMatch,
      nameMatch: verificationResult.details.nameMatch,
      dobMatch: verificationResult.details.dobMatch,
      genderMatch: verificationResult.details.genderMatch,
      addressMatch: verificationResult.details.addressMatch,
      transactionId: verificationResult.details.transactionId,
      fullAddress: verificationResult.details.fullAddress,
      state: verificationResult.details.state,
      district: verificationResult.details.district,
      pinCode: verificationResult.details.pinCode
    };
    tempRecord.processedAt = new Date();
    tempRecord.processingTime = Date.now() - startTime;
    
    await tempRecord.save();

    // Log verification event
    await logAadhaarVerificationEvent('single_verification_verified', req.user.id, {
      aadhaarNumber: tempRecord.aadhaarNumber,
      name: tempRecord.name,
      status: tempRecord.status
    }, req);

    res.json({
      success: true,
      message: 'Aadhaar verification completed',
      data: {
        aadhaarNumber: tempRecord.aadhaarNumber,
        name: tempRecord.name,
        dateOfBirth: tempRecord.dateOfBirth,
        gender: tempRecord.gender,
        status: tempRecord.status,
        verificationDetails: tempRecord.verificationDetails,
        processedAt: tempRecord.processedAt,
        processingTime: tempRecord.processingTime
      }
    });

  } catch (error) {
    logger.error('Error in single Aadhaar verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify Aadhaar'
    });
  }
});

// Single Aadhaar verification endpoint with REAL Sandbox API (alias for /verify)
router.post('/verify-single', protect, async (req, res) => {
  try {
    const { aadhaarNumber, name, dateOfBirth, gender } = req.body;

    if (!aadhaarNumber || !name || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Number, Name, and Date of Birth are required'
      });
    }

    // Validate Aadhaar format
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }

    // Create a temporary record for verification
    const tempRecord = new AadhaarVerification({
      userId: req.user.id,
      batchId: 'SINGLE_VERIFICATION_' + Date.now(),
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      name: name.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender: gender || 'M',
      status: 'pending'
    });

    // Use real Sandbox API for verification
    const startTime = Date.now();
    const verificationResult = await verifyAadhaar(aadhaarNumber, name, dateOfBirth, gender);
    
    // Update record with real verification result
    tempRecord.status = verificationResult.valid && verificationResult.details.dataMatch ? 'verified' : 'rejected';
    tempRecord.verificationDetails = {
      apiResponse: verificationResult.details.apiResponse,
      verificationDate: new Date(),
      remarks: verificationResult.message,
      source: verificationResult.details.source,
      confidence: verificationResult.details.confidence,
      dataMatch: verificationResult.details.dataMatch,
      nameMatch: verificationResult.details.nameMatch,
      dobMatch: verificationResult.details.dobMatch,
      genderMatch: verificationResult.details.genderMatch,
      addressMatch: verificationResult.details.addressMatch,
      transactionId: verificationResult.details.transactionId,
      fullAddress: verificationResult.details.fullAddress,
      state: verificationResult.details.state,
      district: verificationResult.details.district,
      pinCode: verificationResult.details.pinCode
    };
    tempRecord.processedAt = new Date();
    tempRecord.processingTime = Date.now() - startTime;
    
    await tempRecord.save();

    // Decrypt the data before sending response
    let decryptedRecord;
    try {
      decryptedRecord = tempRecord.decryptData();
    } catch (error) {
      console.error('❌ Decryption error:', error.message);
      // Fallback to original input data if decryption fails
      decryptedRecord = {
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''), // Use original input
        name: name.trim(),                  // Use original input
        dateOfBirth: dateOfBirth.trim(),    // Use original input
        gender: gender || 'M',
        verificationDetails: tempRecord.verificationDetails
      };
    }

    // Log verification event
    await logAadhaarVerificationEvent('single_verification_verified', req.user.id, {
      aadhaarNumber: decryptedRecord.aadhaarNumber,
      name: decryptedRecord.name,
      status: tempRecord.status
    }, req);

    // Set appropriate message based on verification status
    const statusMessage = tempRecord.status === 'verified' 
      ? 'Aadhaar verification completed successfully' 
      : 'Aadhaar verification failed - data mismatch detected';

    res.json({
      success: true,
      message: statusMessage,
      data: {
        aadhaarNumber: decryptedRecord.aadhaarNumber,
        name: decryptedRecord.name,
        dateOfBirth: decryptedRecord.dateOfBirth,
        gender: decryptedRecord.gender,
        status: tempRecord.status,
        verificationDetails: decryptedRecord.verificationDetails,
        processedAt: tempRecord.processedAt,
        processingTime: tempRecord.processingTime
      }
    });

  } catch (error) {
    logger.error('Error in single Aadhaar verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify Aadhaar'
    });
  }
});

// Delete batch and all its records
router.delete('/batch/:batchId', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Prevent deletion of single verification records
    if (batchId.startsWith('SINGLE_VERIFICATION_')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete single Aadhaar verification records'
      });
    }
    
    // Find all records for this batch that belong to the user
    const records = await AadhaarVerification.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      batchId: batchId
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or access denied'
      });
    }

    // Delete all records for this batch
    const deleteResult = await AadhaarVerification.deleteMany({
      userId: new mongoose.Types.ObjectId(req.user.id),
      batchId: batchId
    });

    // Log deletion event
    await logAadhaarVerificationEvent('batch_deleted', req.user.id, {
      batchId,
      recordCount: records.length
    }, req);

    res.json({
      success: true,
      message: `Successfully deleted batch with ${deleteResult.deletedCount} records`,
      data: {
        batchId,
        deletedRecords: deleteResult.deletedCount
      }
    });

  } catch (error) {
    logger.error('Error deleting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch'
    });
  }
});

module.exports = router;
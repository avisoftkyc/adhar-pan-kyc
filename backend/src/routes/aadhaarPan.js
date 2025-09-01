const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { protect } = require('../middleware/auth');
const AadhaarPan = require('../models/AadhaarPan');
const { logAadhaarPanEvent } = require('../services/auditService');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/aadhaar-pan');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: async (req, file, cb) => {
    // Add index to prevent overwrites and ensure uniqueness
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    
    // Get count of existing files with same base name for this user
    const baseFileName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const uploadDir = path.join(__dirname, '../../uploads/aadhaar-pan');
    const fs = require('fs');
    
    try {
      const files = fs.readdirSync(uploadDir);
      const existingFiles = files.filter(f => 
        f.startsWith(baseFileName) && f.endsWith(extension)
      );
      
      const nextIndex = existingFiles.length + 1;
      cb(null, `${originalName}_${nextIndex}${extension}`);
    } catch (error) {
      // If directory doesn't exist or error, start with index 1
      cb(null, `${originalName}_1${extension}`);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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

// Get all Aadhaar-PAN batches for the user
router.get('/batches', protect, async (req, res) => {
  try {
    const batches = await AadhaarPan.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: '$batchId',
          totalRecords: { $sum: 1 },
          pendingRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          linkedRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'linked'] }, 1, 0] }
          },
          notLinkedRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'not-linked'] }, 1, 0] }
          },
          invalidRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'invalid'] }, 1, 0] }
          },
          errorRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    logger.error('Error fetching Aadhaar-PAN batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches'
    });
  }
});

// Get batch details
router.get('/batch/:batchId', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    const records = await AadhaarPan.find({
      userId: req.user.id,
      batchId: batchId
    }).select('-__v');

    // Decrypt the records before sending to frontend
    const decryptedRecords = records.map(record => {
      try {
        return record.decryptData();
      } catch (error) {
        logger.error('Error decrypting record:', error);
        return record.toObject();
      }
    });

    const stats = await AadhaarPan.getBatchStats(batchId);

    res.json({
      success: true,
      data: {
        batchId,
        records: decryptedRecords,
        stats
      }
    });
  } catch (error) {
    logger.error('Error fetching batch details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch details'
    });
  }
});

// Upload Aadhaar-PAN file
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

    // Validate required columns with flexible column name matching
    const requiredColumns = ['panNumber', 'aadhaarNumber', 'name'];
    const firstRow = data[0];
    
    // Debug logging
    logger.info('Uploaded file columns:', Object.keys(firstRow));
    logger.info('Required columns:', requiredColumns);
    
    // Column name mapping for flexibility
    const columnMapping = {
      'panNumber': ['panNumber', 'PAN No', 'PAN', 'pan', 'PANNumber', 'pan_number'],
      'aadhaarNumber': ['aadhaarNumber', 'AADHAAR', 'Aadhaar', 'aadhaar', 'Aadhaar Number', 'aadhaar_number'],
      'name': ['name', 'Name', 'NAME', 'fullName', 'Full Name', 'full_name']
    };
    
    const missingColumns = [];
    const columnMap = {};
    
    // Check each required column
    requiredColumns.forEach(requiredCol => {
      const possibleNames = columnMapping[requiredCol];
      let found = false;
      
      for (const possibleName of possibleNames) {
        if (firstRow.hasOwnProperty(possibleName)) {
          columnMap[requiredCol] = possibleName;
          found = true;
          logger.info(`Column ${requiredCol} found as: ${possibleName}`);
          break;
        }
      }
      
      if (!found) {
        missingColumns.push(requiredCol);
        logger.info(`Column ${requiredCol} not found`);
      }
    });
    
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`,
        debug: {
          foundColumns: Object.keys(firstRow),
          requiredColumns: requiredColumns,
          columnMapping: columnMapping
        }
      });
    }

    // Generate unique batch ID from original filename with index
    const originalName = path.parse(req.file.originalname).name;
    
    // Get count of existing batches with same base name for this user
    const baseBatchName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const existingBatches = await AadhaarPan.distinct('batchId', {
      userId: req.user.id,
      batchId: new RegExp(`^${baseBatchName}_\\d+$`)
    });
    
    const nextIndex = existingBatches.length + 1;
    const batchId = `${baseBatchName}_${nextIndex}`; // Add index for uniqueness
    const records = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      const record = new AadhaarPan({
        userId: req.user.id,
        batchId: batchId,
        panNumber: row[columnMap.panNumber]?.toString().trim(),
        aadhaarNumber: row[columnMap.aadhaarNumber]?.toString().trim(),
        name: row[columnMap.name]?.toString().trim(),
        dateOfBirth: row.dateOfBirth || row.DOB || row['Date of Birth']?.toString().trim(),
        gender: row.gender || row.Gender?.toString().trim(),
        fileUpload: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          fileSize: req.file.size,
          uploadDate: new Date()
        }
      });

      records.push(record);
    }

    // Save all records
    await AadhaarPan.insertMany(records);

    // Log the upload event
    await logAadhaarPanEvent('aadhaar_pan_upload', req.user.id, {
      batchId,
      recordCount: records.length,
      fileName: req.file.originalname
    }, req);

    res.json({
      success: true,
      message: `Successfully uploaded ${records.length} records`,
      data: {
        batchId,
        recordCount: records.length,
        fileName: req.file.originalname
      }
    });

  } catch (error) {
    logger.error('Error uploading Aadhaar-PAN file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

// Process batch verification
router.post('/batch/:batchId/process', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Get pending records
    const pendingRecords = await AadhaarPan.find({
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

    // Process records in batches of 10
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < pendingRecords.length; i += batchSize) {
      const batch = pendingRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Simulate API call (replace with actual API integration)
          const startTime = Date.now();
          
          // Mock linking verification logic
          const randomValue = Math.random();
          let status, linkingStatus;
          
          if (randomValue > 0.6) {
            status = 'linked';
            linkingStatus = 'linked';
          } else if (randomValue > 0.3) {
            status = 'not-linked';
            linkingStatus = 'not-linked';
          } else {
            status = 'invalid';
            linkingStatus = 'invalid';
          }
          
          const processingTime = Date.now() - startTime;
          
          // Update record
          record.status = status;
          record.isProcessed = true;
          record.processedAt = new Date();
          record.processingTime = processingTime;
          record.linkingDetails = {
            apiResponse: {
              status: status,
              linkingStatus: linkingStatus,
              timestamp: new Date(),
              processingTime: processingTime
            },
            linkingDate: new Date(),
            linkingStatus: linkingStatus,
            lastChecked: new Date(),
            remarks: status === 'linked' ? 'Aadhaar-PAN linked successfully' : 
                     status === 'not-linked' ? 'Aadhaar-PAN not linked' : 'Invalid data provided'
          };
          
          await record.save();
          
          results.push({
            recordId: record._id,
            status: status,
            linkingStatus: linkingStatus,
            processingTime: processingTime
          });

          // Log verification event
          await logAadhaarPanEvent('aadhaar_pan_verification', req.user.id, {
            recordId: record._id,
            batchId: batchId,
            status: status,
            linkingStatus: linkingStatus,
            processingTime: processingTime
          }, req);

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
      
      // Add delay between batches to avoid overwhelming the API
      if (i + batchSize < pendingRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
          linked: results.filter(r => r.status === 'linked').length,
          notLinked: results.filter(r => r.status === 'not-linked').length,
          invalid: results.filter(r => r.status === 'invalid').length,
          error: results.filter(r => r.status === 'error').length
        }
      }
    });

  } catch (error) {
    logger.error('Error processing batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch'
    });
  }
});

// Get user statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await AadhaarPan.getUserStats(req.user.id, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching Aadhaar-PAN stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Download batch report
router.get('/batch/:batchId/download', protect, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { format = 'csv' } = req.query;
    
    const records = await AadhaarPan.find({
      userId: req.user.id,
      batchId: batchId
    }).select('-__v');

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No records found for this batch'
      });
    }

    // Log download event
    await logAadhaarPanEvent('report_downloaded', req.user.id, {
      batchId,
      format,
      recordCount: records.length
    }, req);

    if (format === 'json') {
      res.json({
        success: true,
        data: records
      });
    } else {
      // Generate CSV
      const csvData = records.map(record => ({
        'PAN Number': record.panNumber,
        'Aadhaar Number': record.aadhaarNumber,
        'Name': record.name,
        'Date of Birth': record.dateOfBirth,
        'Gender': record.gender,
        'Status': record.status,
        'Linking Status': record.linkingDetails?.linkingStatus,
        'Processing Time (ms)': record.processingTime,
        'Processed At': record.processedAt,
        'Created At': record.createdAt
      }));

      const csv = XLSX.utils.json_to_sheet(csvData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, csv, 'Aadhaar-PAN Report');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="aadhaar-pan-${batchId}.csv"`);
      res.send(buffer);
    }

  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report'
    });
  }
});

module.exports = router;

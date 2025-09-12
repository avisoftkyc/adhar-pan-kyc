const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const AadhaarVerification = require('../models/AadhaarVerification');
const { logAadhaarVerificationEvent } = require('../services/auditService');
const logger = require('../utils/logger');
const { verifyAadhaar, simulateAadhaarVerification } = require('../services/aadhaarVerificationService');



// Get all records for a user
router.get('/records', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build search query
    let searchQuery = { userId: req.user.id };
    
    // Add search term filter
    if (search) {
      // Create regex for case-insensitive search
      const searchRegex = new RegExp(search, 'i');
      
      // Search in multiple fields including API response data
      searchQuery = {
        ...searchQuery,
        $or: [
          { aadhaarNumber: searchRegex },
          { name: searchRegex },
          { address: searchRegex },
          { district: searchRegex },
          { state: searchRegex },
          { pinCode: searchRegex },
          { careOf: searchRegex },
          // Search in API response data (where actual decrypted values are stored)
          { 'verificationDetails.apiResponse.data.name': searchRegex },
          { 'verificationDetails.apiResponse.data.address.full_address': searchRegex },
          { 'verificationDetails.apiResponse.data.address.district': searchRegex },
          { 'verificationDetails.apiResponse.data.address.state': searchRegex },
          { 'verificationDetails.apiResponse.data.address.pincode': searchRegex },
          { 'verificationDetails.apiResponse.data.care_of': searchRegex }
        ]
      };
    }

    // Add status filter
    if (status) {
      searchQuery = {
        ...searchQuery,
        status: status
      };
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      searchQuery.dateOfBirth = {};
      if (dateFrom) {
        searchQuery.dateOfBirth.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        searchQuery.dateOfBirth.$lte = new Date(dateTo);
      }
    }

    // Debug: Log the search query
    if (search) {
      console.log('Search query built:', JSON.stringify(searchQuery, null, 2));
    }

    // Get total count for pagination
    const totalRecords = await AadhaarVerification.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalRecords / limit);

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get paginated records
    const records = await AadhaarVerification.find(searchQuery)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Decrypt sensitive data for each record
    const decryptedRecords = records.map(record => {
      try {
        // Create a temporary AadhaarVerification instance to use the decryptData method
        const tempRecord = new AadhaarVerification(record);
        const decryptedRecord = tempRecord.decryptData();
        
        // Extract care_of from API response if careOf field is encrypted or missing
        if ((decryptedRecord.careOf === '[ENCRYPTED]' || !decryptedRecord.careOf) && 
            decryptedRecord.verificationDetails && 
            decryptedRecord.verificationDetails.apiResponse && 
            decryptedRecord.verificationDetails.apiResponse.data && 
            decryptedRecord.verificationDetails.apiResponse.data.care_of) {
          decryptedRecord.careOf = decryptedRecord.verificationDetails.apiResponse.data.care_of;
        }
        
        return decryptedRecord;
      } catch (error) {
        console.error('Decryption error for record:', record._id, error.message);
        // Return original record if decryption fails
        return record;
      }
    });

    const responseData = {
      success: true,
      data: decryptedRecords,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: limit
      }
    };
    
    console.log('Aadhaar verification records response:', {
      totalRecords,
      totalPages,
      currentPage: page,
      recordsReturned: decryptedRecords.length,
      searchTerm: search || 'none',
      searchQuery: search ? 'Applied' : 'None',
      filters: {
        status: status || 'none',
        dateFrom: dateFrom || 'none',
        dateTo: dateTo || 'none',
        sortBy,
        sortOrder
      }
    });
    
    res.json(responseData);
  } catch (error) {
    logger.error('Error fetching Aadhaar verification records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch records',
      error: error.message
    });
  }
});





// Single Aadhaar verification endpoint - Send OTP
router.post('/verify-single', protect, async (req, res) => {
  try {
    const { aadhaarNumber, location, dummyField1, dummyField2, consentAccepted } = req.body;

    if (!aadhaarNumber || !location) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Number and Location are required'
      });
    }

    if (!consentAccepted) {
      return res.status(400).json({
      success: false,
        message: 'Consent is required to proceed'
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

    // Send OTP using Sandbox API
    const startTime = Date.now();
    const otpResult = await verifyAadhaar(aadhaarNumber, location, dummyField1, dummyField2);
    
    logger.info("OTP sent successfully - returning transaction ID:", {
      transactionId: otpResult.details.transactionId,
      transactionIdType: typeof otpResult.details.transactionId,
      fullOtpResult: otpResult
    });
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        location: location.trim(),
        dummyField1: dummyField1.trim(),
        dummyField2: dummyField2.trim(),
        otpSent: true,
        transactionId: otpResult.details.transactionId,
        apiResponse: otpResult.details.apiResponse,
        source: otpResult.details.source
      }
    });

  } catch (error) {
    logger.error('Error in single Aadhaar verification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
});


// OTP verification endpoint
router.post('/verify-otp', protect, async (req, res) => {
  try {
    const { aadhaarNumber, otp, transactionId } = req.body;

    if (!aadhaarNumber || !otp || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Number, OTP, and Transaction ID are required'
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

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format. Must be 6 digits.'
      });
    }

    // Verify OTP using Sandbox API
    const { verifyAadhaarOTP } = require('../services/aadhaarVerificationService');
    const startTime = Date.now();
    
    logger.info("OTP Verification route - received data:", {
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      otp,
      transactionId,
      transactionIdType: typeof transactionId,
      transactionIdLength: transactionId ? transactionId.length : 'null'
    });
    
    const otpResult = await verifyAadhaarOTP(transactionId, otp);

    // Extract address details from API response
    const apiData = otpResult.data?.data || otpResult.data || {};
    const addressData = apiData.address || {};
    
    // Debug: Log photo data
    logger.info("Photo data from API:", {
      hasPhoto: !!apiData.photo,
      photoLength: apiData.photo ? apiData.photo.length : 0,
      photoPreview: apiData.photo ? apiData.photo.substring(0, 50) + '...' : 'No photo'
    });
    
    // Create verification record with complete address information
    const verificationRecord = new AadhaarVerification({
      userId: req.user.id,
      batchId: 'OTP_VERIFICATION_' + Date.now(),
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      name: apiData.name || 'OTP Verified',
      dateOfBirth: apiData.date_of_birth || apiData.dateOfBirth || '',
      gender: apiData.gender || 'M',
      address: apiData.full_address || addressData.full_address || '',
      district: addressData.district || apiData.district || '',
      state: addressData.state || apiData.state || '',
      pinCode: addressData.pinCode || apiData.pinCode || '',
      careOf: apiData.care_of || '', // Add care_of field
      photo: apiData.photo || '', // Add photo field
      status: apiData.status === 'VALID' ? 'verified' : 'rejected',
      verificationDetails: {
        apiResponse: otpResult,
        verificationDate: new Date(),
        remarks: otpResult.message || 'OTP verification completed',
        source: 'sandbox_api',
        transactionId: transactionId,
        otpVerified: true,
        // Store additional API data
        careOf: apiData.care_of || '',
        house: addressData.house || '',
        street: addressData.street || '',
        landmark: addressData.landmark || '',
        vtc: addressData.vtc || '',
        subdist: addressData.subdist || '',
        country: addressData.country || 'India',
        photo: apiData.photo || '',
        emailHash: apiData.email_hash || '',
        mobileHash: apiData.mobile_hash || '',
        yearOfBirth: apiData.year_of_birth || '',
        shareCode: apiData.share_code || ''
      },
      processingTime: Date.now() - startTime,
      isProcessed: true,
      processedAt: new Date()
    });

    await verificationRecord.save();

    // Log the verification event
    await logAadhaarVerificationEvent('otp_verification_completed', req.user.id, {
      recordId: verificationRecord._id,
      batchId: verificationRecord.batchId,
      aadhaarNumber: verificationRecord.aadhaarNumber,
      status: verificationRecord.status,
      processingTime: verificationRecord.processingTime
    }, req);

    res.json({
      success: true,
      message: 'OTP verification completed successfully',
      data: {
        recordId: verificationRecord._id,
        batchId: verificationRecord.batchId,
        aadhaarNumber: verificationRecord.aadhaarNumber,
        status: verificationRecord.status,
        verificationDetails: verificationRecord.verificationDetails,
        processingTime: verificationRecord.processingTime,
        verifiedAt: verificationRecord.processedAt
      }
    });

  } catch (error) {
    logger.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
});

module.exports = router;
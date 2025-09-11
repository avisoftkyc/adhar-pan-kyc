const logger = require('../utils/logger');

// Sandbox API Configuration
const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY || 'key_live_6edea225e1354559b2422d3921c795cf';
const SANDBOX_API_SECRET = process.env.SANDBOX_API_SECRET || 'secret_live_03078556231c41879cd6ab46e1d6d6a07f';
const SANDBOX_BASE_URL = 'https://api.sandbox.co.in';

// Format date to DD/MM/YYYY format for Sandbox API
function formatDateToDDMMYYYY(dateStr) {
  try {
    // Handle different date formats
    let date;
    if (dateStr.includes('-')) {
      // Format: YYYY-MM-DD
      const [year, month, day] = dateStr.split('-');
      date = new Date(year, month - 1, day);
    } else if (dateStr.includes('/')) {
      // Format: DD/MM/YYYY or MM/DD/YYYY
      const parts = dateStr.split('/');
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        date = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        // DD/MM/YYYY
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } else {
      throw new Error('Unsupported date format');
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    logger.error('Date formatting error:', error);
    throw new Error(`Invalid date format: ${dateStr}`);
  }
}

// Authenticate with Sandbox API
async function authenticateWithSandbox() {
  try {
    logger.info("Authenticating with Sandbox API for Aadhaar verification...");
    
    const response = await fetch(`${SANDBOX_BASE_URL}/authenticate`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': SANDBOX_API_KEY,
        'x-api-secret': SANDBOX_API_SECRET,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("Sandbox authentication failed:", {
        status: response.status,
        data: errorData
      });
      throw new Error(`Authentication failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const authData = await response.json();
    const accessToken = authData.access_token || authData.data?.access_token;
    
    if (!accessToken) {
      logger.error("No access token received from Sandbox API");
      throw new Error("No access token received from authentication");
    }
    
    logger.info("Sandbox authentication successful for Aadhaar verification");
    return accessToken;
    
  } catch (error) {
    logger.error("Sandbox authentication error for Aadhaar verification:", error);
    throw error;
  }
}

// Verify Aadhaar with Sandbox API
async function verifyAadhaarWithSandbox(aadhaarNumber, name, dateOfBirth, gender, reason) {
  try {
    logger.info("Starting Sandbox API Aadhaar verification...");
    
    // Step 1: Authenticate
    const accessToken = await authenticateWithSandbox();
    
    // Step 2: Format date
    const formattedDob = formatDateToDDMMYYYY(dateOfBirth);
    
    // Step 3: Verify Aadhaar
    const verificationResponse = await fetch(`${SANDBOX_BASE_URL}/kyc/aadhaar/verify`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'authorization': accessToken,
        'x-api-key': SANDBOX_API_KEY,
        'x-accept-cache': 'true',
      },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.aadhaar_verification.request",
        aadhaar_number: aadhaarNumber.replace(/\s/g, ''),
        name_as_per_aadhaar: name.trim(),
        date_of_birth: formattedDob,
        gender: gender || 'M',
        consent: "Y",
        reason: reason || "KYC Verification",
      }),
    });

    if (!verificationResponse.ok) {
      const errorData = await verificationResponse.json();
      logger.error("Sandbox Aadhaar verification failed:", {
        status: verificationResponse.status,
        data: errorData
      });
      throw new Error(`Verification failed: ${verificationResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const verificationData = await verificationResponse.json();
    
    logger.info("Sandbox Aadhaar verification successful:", {
      status: verificationResponse.status,
      data: verificationData
    });
    
    return verificationData;
    
  } catch (error) {
    logger.error("Sandbox Aadhaar verification error:", error);
    throw error;
  }
}

// Main Aadhaar verification function
async function verifyAadhaar(aadhaarNumber, name, dateOfBirth, gender = 'M', reason = "KYC Verification") {
  try {
    logger.info("Starting Aadhaar verification:", {
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      name,
      dateOfBirth,
      gender,
      reason
    });
    
    // Validate Aadhaar number format
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ''))) {
      throw new Error('Invalid Aadhaar number format. Must be 12 digits.');
    }
    
    // Use Sandbox API for verification
    const result = await verifyAadhaarWithSandbox(aadhaarNumber, name, dateOfBirth, gender, reason);
    
    // Process the response
    const verificationData = result.data || result;
    
    return {
      valid: verificationData.status === 'valid',
      message: 'Aadhaar verification completed successfully',
      details: {
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        name: name.trim(),
        dateOfBirth,
        gender,
        verifiedAt: new Date(),
        source: 'sandbox_api',
        apiResponse: result,
        confidence: 95,
        dataMatch: verificationData.name_as_per_aadhaar_match && verificationData.date_of_birth_match && verificationData.gender_match,
        nameMatch: verificationData.name_as_per_aadhaar_match,
        dobMatch: verificationData.date_of_birth_match,
        genderMatch: verificationData.gender_match,
        addressMatch: verificationData.address_match,
        remarks: verificationData.remarks,
        transactionId: result.transaction_id,
        fullAddress: verificationData.full_address,
        state: verificationData.state,
        district: verificationData.district,
        pinCode: verificationData.pin_code
      }
    };
  } catch (error) {
    logger.error("Aadhaar verification failed:", {
      error: error.message,
      stack: error.stack,
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      name,
      dateOfBirth,
      gender
    });
    
    throw new Error(`Aadhaar verification failed: ${error.message}`);
  }
}

// Simulate Aadhaar verification for testing/fallback
async function simulateAadhaarVerification(record) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simulate verification logic
  const aadhaarNumber = record.aadhaarNumber;
  const name = record.name;
  const dateOfBirth = record.dateOfBirth;
  const gender = record.gender;
  
  // Simple validation simulation
  const isValidAadhaar = /^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''));
  const isValidName = name && name.length >= 2;
  const isValidDob = dateOfBirth && dateOfBirth.trim() !== '';
  const isValidGender = ['M', 'F', 'O'].includes(gender);
  
  let status = 'verified';
  let details = {
    message: 'Aadhaar verification successful',
    confidence: 95,
    dataMatch: true,
    nameMatch: true,
    dobMatch: true,
    genderMatch: true,
    addressMatch: true
  };
  
  if (!isValidAadhaar) {
    status = 'invalid';
    details = {
      message: 'Invalid Aadhaar number format',
      confidence: 0,
      dataMatch: false,
      nameMatch: false,
      dobMatch: false,
      genderMatch: false,
      addressMatch: false
    };
  } else if (!isValidName) {
    status = 'rejected';
    details = {
      message: 'Name mismatch',
      confidence: 30,
      dataMatch: false,
      nameMatch: false,
      dobMatch: true,
      genderMatch: true,
      addressMatch: true
    };
  } else if (!isValidDob) {
    status = 'rejected';
    details = {
      message: 'Date of birth mismatch',
      confidence: 30,
      dataMatch: false,
      nameMatch: true,
      dobMatch: false,
      genderMatch: true,
      addressMatch: true
    };
  } else if (!isValidGender) {
    status = 'rejected';
    details = {
      message: 'Gender mismatch',
      confidence: 30,
      dataMatch: false,
      nameMatch: true,
      dobMatch: true,
      genderMatch: false,
      addressMatch: true
    };
  } else {
    // Simulate random verification failures (10% chance)
    if (Math.random() < 0.1) {
      status = 'rejected';
      details = {
        message: 'Data mismatch detected',
        confidence: 30,
        dataMatch: false,
        nameMatch: Math.random() > 0.5,
        dobMatch: Math.random() > 0.5,
        genderMatch: Math.random() > 0.5,
        addressMatch: Math.random() > 0.5
      };
    }
  }
  
  return {
    status,
    details,
    processingTime: Math.floor(Math.random() * 2000) + 500
  };
}

module.exports = {
  verifyAadhaar,
  verifyAadhaarWithSandbox,
  authenticateWithSandbox,
  simulateAadhaarVerification
};
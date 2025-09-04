const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PanKyc = require('./src/models/PanKyc');

async function testDecryption() {
  try {
    console.log('🧪 Testing PAN KYC Decryption...\n');
    
    // Find a record with encrypted data
    const record = await PanKyc.findOne({ status: 'pending' });
    
    if (!record) {
      console.log('❌ No pending records found to test decryption');
      return;
    }
    
    console.log('📋 Found record:', {
      id: record._id,
      panNumber: record.panNumber,
      name: record.name,
      dateOfBirth: record.dateOfBirth,
      status: record.status
    });
    
    console.log('\n🔓 Testing decryption...');
    
    // Test decryption
    const decryptedRecord = record.decryptData();
    
    console.log('✅ Decrypted data:');
    console.log('PAN Number:', decryptedRecord.panNumber);
    console.log('Name:', decryptedRecord.name);
    console.log('Date of Birth:', decryptedRecord.dateOfBirth);
    
    // Test if the decrypted data looks like real data
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const isPanValid = panRegex.test(decryptedRecord.panNumber);
    const isNameValid = decryptedRecord.name && decryptedRecord.name.length > 0 && !decryptedRecord.name.includes('[ENCRYPTED]');
    const isDobValid = decryptedRecord.dateOfBirth && decryptedRecord.dateOfBirth.length > 0 && !decryptedRecord.dateOfBirth.includes('[ENCRYPTED]');
    
    console.log('\n🔍 Validation Results:');
    console.log('PAN Format Valid:', isPanValid ? '✅' : '❌');
    console.log('Name Valid:', isNameValid ? '✅' : '❌');
    console.log('DOB Valid:', isDobValid ? '✅' : '❌');
    
    if (isPanValid && isNameValid && isDobValid) {
      console.log('\n🎉 Decryption is working correctly!');
      console.log('The data can now be sent to the Sandbox API.');
    } else {
      console.log('\n⚠️  Decryption has issues. Some fields may not be properly decrypted.');
    }
    
  } catch (error) {
    console.error('❌ Error testing decryption:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDecryption();

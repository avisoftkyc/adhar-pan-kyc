const mongoose = require('mongoose');
const crypto = require('crypto');

const PanKycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  batchId: {
    type: String,
    required: true,
    index: true,
  },
  panNumber: {
    type: String,
    required: true,
    encrypted: true,
  },
  name: {
    type: String,
    required: true,
    encrypted: true,
  },
  dateOfBirth: {
    type: String,
    encrypted: true,
  },
  fatherName: {
    type: String,
    encrypted: true,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'error'],
    default: 'pending',
  },
  verificationDetails: {
    apiResponse: {
      type: mongoose.Schema.Types.Mixed,
      encrypted: true,
    },
    verifiedName: {
      type: String,
      encrypted: true,
    },
    verifiedDob: {
      type: String,
      encrypted: true,
    },
    verifiedFatherName: {
      type: String,
      encrypted: true,
    },
    verificationDate: Date,
    remarks: String,
  },
  apiAttempts: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'timeout'],
    },
    response: mongoose.Schema.Types.Mixed,
    error: String,
  }],
  fileUpload: {
    originalName: String,
    fileName: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  processingTime: {
    type: Number, // in milliseconds
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  lastRetryAt: Date,
  isProcessed: {
    type: Boolean,
    default: false,
  },
  processedAt: Date,
  errorMessage: String,
}, {
  timestamps: true,
});

// Indexes for better query performance
PanKycSchema.index({ userId: 1, createdAt: -1 });
PanKycSchema.index({ batchId: 1 });
PanKycSchema.index({ status: 1 });
PanKycSchema.index({ isProcessed: 1 });
PanKycSchema.index({ createdAt: -1 });

// Virtual for processing duration
PanKycSchema.virtual('processingDuration').get(function() {
  if (this.createdAt && this.processedAt) {
    return this.processedAt - this.createdAt;
  }
  return null;
});

// Pre-validate middleware to ensure required fields are present
PanKycSchema.pre('validate', function(next) {
  // Ensure required fields are present before validation
  if (!this.name || this.name.trim() === '') {
    return next(new Error('name: Path `name` is required.'));
  }
  if (!this.panNumber || this.panNumber.trim() === '') {
    return next(new Error('panNumber: Path `panNumber` is required.'));
  }
  next();
});

// Pre-save middleware to encrypt sensitive data
PanKycSchema.pre('save', function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return next(new Error('Encryption key not configured'));
  }

  // Only encrypt if this is a new document or if fields have been modified
  if (this.isNew || this.isModified()) {
    // Encrypt sensitive fields
    const fieldsToEncrypt = ['panNumber', 'name', 'dateOfBirth', 'fatherName', 'verificationDetails'];
    
    fieldsToEncrypt.forEach(field => {
      if (this[field] && typeof this[field] === 'string' && this[field].trim() !== '') {
        // Skip encryption if already encrypted (hex string)
        if (!/^[0-9a-fA-F]+$/.test(this[field])) {
          try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(encryptionKey, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(this[field], 'utf8', 'hex');
            encrypted += cipher.final('hex');
            this[field] = iv.toString('hex') + ':' + encrypted;
          } catch (error) {
            console.error(`Error encrypting field ${field}:`, error);
            // Don't fail the save if encryption fails
          }
        }
      } else if (this[field] === '') {
        // Set empty strings to null to avoid encryption issues
        this[field] = null;
      }
    });

    // Handle nested objects like verificationDetails
    if (this.verificationDetails && typeof this.verificationDetails === 'object') {
      try {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(this.verificationDetails), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        this.verificationDetails = iv.toString('hex') + ':' + encrypted;
      } catch (error) {
        console.error('Error encrypting verificationDetails:', error);
        // Don't fail the save if encryption fails
      }
    }
  }

  next();
});

// Method to decrypt sensitive data
PanKycSchema.methods.decryptData = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const decrypted = this.toObject();
  const fieldsToDecrypt = ['panNumber', 'name', 'dateOfBirth', 'fatherName', 'verificationDetails'];

  fieldsToDecrypt.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        // Check if it's the new format (iv:encrypted) or old format (just encrypted)
        if (decrypted[field].includes(':')) {
          // New format with IV
          const algorithm = 'aes-256-cbc';
          const key = crypto.scryptSync(encryptionKey, 'salt', 32);
          const [ivHex, encrypted] = decrypted[field].split(':');
          const iv = Buffer.from(ivHex, 'hex');
          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          let decryptedField = decipher.update(encrypted, 'hex', 'utf8');
          decryptedField += decipher.final('utf8');
          decrypted[field] = decryptedField;
        } else {
          // Old format - try to decrypt with old method
          const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
          let decryptedField = decipher.update(decrypted[field], 'hex', 'utf8');
          decryptedField += decipher.final('utf8');
          decrypted[field] = decryptedField;
        }
      } catch (error) {
        decrypted[field] = '[ENCRYPTED]';
      }
    } else if (decrypted[field] === null) {
      // Handle null values (empty fields)
      decrypted[field] = '';
    }
  });

  // Handle nested objects
  if (decrypted.verificationDetails && typeof decrypted.verificationDetails === 'string') {
    try {
      // Check if it's the new format (iv:encrypted) or old format (just encrypted)
      if (decrypted.verificationDetails.includes(':')) {
        // New format with IV
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const [ivHex, encrypted] = decrypted.verificationDetails.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decryptedDetails = decipher.update(encrypted, 'hex', 'utf8');
        decryptedDetails += decipher.final('utf8');
        decrypted.verificationDetails = JSON.parse(decryptedDetails);
      } else {
        // Old format - try to decrypt with old method
        const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
        let decryptedDetails = decipher.update(decrypted.verificationDetails, 'hex', 'utf8');
        decryptedDetails += decipher.final('utf8');
        decrypted.verificationDetails = JSON.parse(decryptedDetails);
      }
    } catch (error) {
      decrypted.verificationDetails = '[ENCRYPTED]';
    }
  }

  return decrypted;
};

// Static method to get batch statistics
PanKycSchema.statics.getBatchStats = async function(batchId) {
  const stats = await this.aggregate([
    { $match: { batchId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    error: 0,
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Static method to get user statistics
PanKycSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    error: 0,
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

module.exports = mongoose.model('PanKyc', PanKycSchema);

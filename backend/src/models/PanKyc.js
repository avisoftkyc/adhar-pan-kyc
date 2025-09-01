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

// Pre-save middleware to encrypt sensitive data
PanKycSchema.pre('save', function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return next(new Error('Encryption key not configured'));
  }

  // Encrypt sensitive fields
  const fieldsToEncrypt = ['panNumber', 'name', 'dateOfBirth', 'fatherName', 'verificationDetails'];
  
  fieldsToEncrypt.forEach(field => {
    if (this[field] && typeof this[field] === 'string') {
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encrypted = cipher.update(this[field], 'utf8', 'hex');
      encrypted += cipher.final('hex');
      this[field] = encrypted;
    }
  });

  // Handle nested objects like verificationDetails
  if (this.verificationDetails && typeof this.verificationDetails === 'object') {
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(JSON.stringify(this.verificationDetails), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.verificationDetails = encrypted;
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
        const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
        let decryptedField = decipher.update(decrypted[field], 'hex', 'utf8');
        decryptedField += decipher.final('utf8');
        decrypted[field] = decryptedField;
      } catch (error) {
        decrypted[field] = '[ENCRYPTED]';
      }
    }
  });

  // Handle nested objects
  if (decrypted.verificationDetails && typeof decrypted.verificationDetails === 'string') {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decryptedDetails = decipher.update(decrypted.verificationDetails, 'hex', 'utf8');
      decryptedDetails += decipher.final('utf8');
      decrypted.verificationDetails = JSON.parse(decryptedDetails);
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
        userId: mongoose.Types.ObjectId(userId),
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

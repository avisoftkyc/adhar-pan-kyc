const mongoose = require('mongoose');
const crypto = require('crypto');

const AadhaarPanSchema = new mongoose.Schema({
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
  aadhaarNumber: {
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
  gender: {
    type: String,
    enum: ['M', 'F', 'O'],
    encrypted: true,
  },
  status: {
    type: String,
    enum: ['pending', 'linked', 'not-linked', 'invalid', 'error'],
    default: 'pending',
  },
  linkingDetails: {
    apiResponse: {
      type: mongoose.Schema.Types.Mixed,
      encrypted: true,
    },
    linkingDate: Date,
    linkingStatus: {
      type: String,
      enum: ['linked', 'not-linked', 'invalid'],
    },
    remarks: String,
    lastChecked: Date,
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
AadhaarPanSchema.index({ userId: 1, createdAt: -1 });
AadhaarPanSchema.index({ batchId: 1 });
AadhaarPanSchema.index({ status: 1 });
AadhaarPanSchema.index({ isProcessed: 1 });
AadhaarPanSchema.index({ createdAt: -1 });

// Virtual for processing duration
AadhaarPanSchema.virtual('processingDuration').get(function() {
  if (this.createdAt && this.processedAt) {
    return this.processedAt - this.createdAt;
  }
  return null;
});

// Pre-validate middleware to ensure required fields are present
AadhaarPanSchema.pre('validate', function(next) {
  // Ensure required fields are present before validation
  if (!this.name || this.name.trim() === '') {
    return next(new Error('name: Path `name` is required.'));
  }
  if (!this.panNumber || this.panNumber.trim() === '') {
    return next(new Error('panNumber: Path `panNumber` is required.'));
  }
  if (!this.aadhaarNumber || this.aadhaarNumber.trim() === '') {
    return next(new Error('aadhaarNumber: Path `aadhaarNumber` is required.'));
  }
  next();
});

// Pre-save middleware to encrypt sensitive data
AadhaarPanSchema.pre('save', function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return next(new Error('Encryption key not configured'));
  }

  // Only encrypt if this is a new document or if fields have been modified
  if (this.isNew || this.isModified()) {
    // Encrypt sensitive fields
    const fieldsToEncrypt = ['panNumber', 'aadhaarNumber', 'name', 'dateOfBirth', 'gender', 'linkingDetails'];
    
    fieldsToEncrypt.forEach(field => {
      if (this[field] && typeof this[field] === 'string' && this[field].trim() !== '') {
        // Skip encryption if already encrypted (hex string)
        if (!/^[0-9a-fA-F]+$/.test(this[field])) {
          try {
            const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
            let encrypted = cipher.update(this[field], 'utf8', 'hex');
            encrypted += cipher.final('hex');
            this[field] = encrypted;
          } catch (error) {
            console.error(`Error encrypting field ${field}:`, error);
            // Don't fail the save if encryption fails
          }
        }
      }
    });

    // Handle nested objects like linkingDetails
    if (this.linkingDetails && typeof this.linkingDetails === 'object') {
      try {
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        let encrypted = cipher.update(JSON.stringify(this.linkingDetails), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        this.linkingDetails = encrypted;
      } catch (error) {
        console.error('Error encrypting linkingDetails:', error);
        // Don't fail the save if encryption fails
      }
    }
  }

  next();
});

// Method to decrypt sensitive data
AadhaarPanSchema.methods.decryptData = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const decrypted = this.toObject();
  const fieldsToDecrypt = ['panNumber', 'aadhaarNumber', 'name', 'dateOfBirth', 'gender', 'linkingDetails'];

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
  if (decrypted.linkingDetails && typeof decrypted.linkingDetails === 'string') {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decryptedDetails = decipher.update(decrypted.linkingDetails, 'hex', 'utf8');
      decryptedDetails += decipher.final('utf8');
      decrypted.linkingDetails = JSON.parse(decryptedDetails);
    } catch (error) {
      decrypted.linkingDetails = '[ENCRYPTED]';
    }
  }

  return decrypted;
};

// Static method to get batch statistics
AadhaarPanSchema.statics.getBatchStats = async function(batchId) {
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
    linked: 0,
    'not-linked': 0,
    invalid: 0,
    error: 0,
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Static method to get user statistics
AadhaarPanSchema.statics.getUserStats = async function(userId, days = 30) {
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
    linked: 0,
    'not-linked': 0,
    invalid: 0,
    error: 0,
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

module.exports = mongoose.model('AadhaarPan', AadhaarPanSchema);

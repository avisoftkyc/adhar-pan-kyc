const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Audit = require('../models/Audit');
const PanKyc = require('../models/PanKyc');
const AadhaarPan = require('../models/AadhaarPan');
const { logEvent } = require('../services/auditService');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Admin middleware - check if user is admin
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all users (admin only)
router.get('/users', protect, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Create new user (admin only)
router.post('/users', protect, adminAuth, async (req, res) => {
  try {
    const { name, email, password, role, moduleAccess, status } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'user',
      moduleAccess: moduleAccess || [],
      status: status || 'active'
    });

    await user.save();

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'user_created',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        createdUserEmail: user.email,
        role: user.role,
        moduleAccess: user.moduleAccess
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        moduleAccess: user.moduleAccess,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user (admin only)
router.put('/users/:id', protect, adminAuth, async (req, res) => {
  try {
    const { name, email, role, moduleAccess, status } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    const oldData = {
      name: user.name,
      email: user.email,
      role: user.role,
      moduleAccess: user.moduleAccess,
      status: user.status
    };

    // Update user
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.moduleAccess = moduleAccess || user.moduleAccess;
    user.status = status || user.status;

    await user.save();

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'user_updated',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        oldData,
        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
          moduleAccess: user.moduleAccess,
          status: user.status
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        moduleAccess: user.moduleAccess,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'user_deleted',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        deletedUserEmail: user.email,
        deletedUserName: user.name
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', protect, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, module = '', action = '', userId = '', startDate = '', endDate = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (module) query.module = module;
    if (action) query.action = action;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await Audit.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Audit.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// Get system statistics (admin only)
router.get('/stats', protect, adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });

    // PAN KYC statistics
    const panKycStats = await PanKyc.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Aadhaar-PAN statistics
    const aadhaarPanStats = await AadhaarPan.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Activity statistics
    const activityStats = await Audit.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Daily activity for the last 7 days
    const dailyActivity = await Audit.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers
        },
        panKyc: panKycStats,
        aadhaarPan: aadhaarPanStats,
        activity: activityStats,
        dailyActivity
      }
    });
  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics'
    });
  }
});

// Get user statistics (admin only)
router.get('/user-stats', protect, adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // User registration stats
    const userRegistrationStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User role distribution
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // User status distribution
    const statusDistribution = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent user activity
    const recentUserActivity = await Audit.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          module: { $in: ['auth', 'user_management'] }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1, count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        userRegistration: userRegistrationStats,
        roleDistribution,
        statusDistribution,
        recentActivity: recentUserActivity
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Get API usage statistics (admin only)
router.get('/api-usage-stats', protect, adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // API endpoint usage
    const apiUsage = await Audit.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          module: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            module: '$module',
            action: '$action'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Daily API usage
    const dailyApiUsage = await Audit.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Hourly API usage for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hourlyApiUsage = await Audit.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%H:00", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top users by API usage
    const topUsersByUsage = await Audit.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          email: '$user.email',
          name: '$user.name',
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        apiUsage,
        dailyUsage: dailyApiUsage,
        hourlyUsage: hourlyApiUsage,
        topUsers: topUsersByUsage
      }
    });
  } catch (error) {
    logger.error('Error fetching API usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API usage statistics'
    });
  }
});

// Get system health (admin only)
router.get('/health', protect, adminAuth, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        fileSystem: 'accessible',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Check database connection
    try {
      await User.findOne().limit(1);
      health.services.database = 'connected';
    } catch (error) {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }

    // Check file system
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(__dirname, '../../uploads');
      fs.accessSync(uploadDir, fs.constants.W_OK);
      health.services.fileSystem = 'accessible';
    } catch (error) {
      health.services.fileSystem = 'inaccessible';
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health'
    });
  }
});

// Get system settings (admin only)
router.get('/settings', protect, adminAuth, async (req, res) => {
  try {
    const settings = {
      environment: process.env.NODE_ENV,
      apiVersion: '1.0.0',
      features: {
        panKyc: true,
        aadhaarPan: true,
        auditLogging: true,
        fileUpload: true,
        emailNotifications: !!process.env.EMAIL_SERVICE,
        twoFactorAuth: true
      },
      limits: {
        maxFileSize: '10MB',
        maxRecordsPerBatch: 1000,
        apiRateLimit: '100 requests per minute'
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings'
    });
  }
});

// Update user module access (admin only)
router.patch('/users/:id/module-access', protect, adminAuth, async (req, res) => {
  try {
    const { moduleAccess } = req.body;
    
    if (!moduleAccess || !Array.isArray(moduleAccess)) {
      return res.status(400).json({
        success: false,
        message: 'moduleAccess must be an array'
      });
    }

    // Validate module names
    const validModules = ['pan-kyc', 'aadhaar-pan'];
    const invalidModules = moduleAccess.filter(module => !validModules.includes(module));
    
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid modules: ${invalidModules.join(', ')}. Valid modules are: ${validModules.join(', ')}`
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old module access for audit
    const oldModuleAccess = user.moduleAccess;

    // Update module access
    user.moduleAccess = moduleAccess;
    await user.save();

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'module_access_updated',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        targetUserEmail: user.email,
        oldModuleAccess,
        newModuleAccess: moduleAccess
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User module access updated successfully',
      data: {
        id: user._id,
        email: user.email,
        moduleAccess: user.moduleAccess
      }
    });
  } catch (error) {
    logger.error('Error updating user module access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user module access'
    });
  }
});

// Get available modules (admin only)
router.get('/modules', protect, adminAuth, async (req, res) => {
  try {
    const modules = [
      {
        id: 'pan-kyc',
        name: 'PAN KYC',
        description: 'PAN verification and KYC processing',
        features: ['File upload', 'Batch processing', 'Verification', 'Reports']
      },
      {
        id: 'aadhaar-pan',
        name: 'Aadhaar-PAN Linking',
        description: 'Aadhaar and PAN number linking verification',
        features: ['File upload', 'Single verification', 'Batch processing', 'Reports']
      }
    ];

    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    logger.error('Error fetching modules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules'
    });
  }
});

// Update user branding (admin only)
router.patch('/users/:id/branding', protect, adminAuth, async (req, res) => {
  try {
    const { companyName, displayName, address, gstNumber } = req.body;

    if (!companyName && !displayName && !address && !gstNumber) {
      return res.status(400).json({
        success: false,
        message: 'At least one branding field must be provided'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old branding for audit
    const oldBranding = {
      companyName: user.branding?.companyName || '',
      displayName: user.branding?.displayName || '',
      address: user.branding?.address || '',
      gstNumber: user.branding?.gstNumber || ''
    };

    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 DEBUG: Original user.branding:', JSON.stringify(user.branding, null, 2));

    // Build update object
    const updateData = {};
    if (companyName !== undefined) updateData['branding.companyName'] = companyName;
    if (displayName !== undefined) updateData['branding.displayName'] = displayName;
    if (address !== undefined) updateData['branding.address'] = address;
    if (gstNumber !== undefined) updateData['branding.gstNumber'] = gstNumber;

    console.log('🔍 DEBUG: Update data:', JSON.stringify(updateData, null, 2));

    // Use findByIdAndUpdate for more reliable updates
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('🔍 DEBUG: Updated user.branding:', JSON.stringify(updatedUser.branding, null, 2));

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'user_branding_updated',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        targetUserEmail: user.email,
        oldBranding,
        newBranding: {
          companyName: updatedUser.branding.companyName,
          displayName: updatedUser.branding.displayName,
          address: updatedUser.branding.address,
          gstNumber: updatedUser.branding.gstNumber
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log('🔍 DEBUG: Response branding:', JSON.stringify(updatedUser.branding, null, 2));
    
    res.json({
      success: true,
      message: 'User branding updated successfully',
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        branding: updatedUser.branding
      }
    });
  } catch (error) {
    logger.error('Error updating user branding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user branding'
    });
  }
});

// Upload user logo (admin only)
router.post('/users/:id/logo', protect, adminAuth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old logo info for audit
    const oldLogo = user.branding?.logo || null;

    // Update logo information
    if (!user.branding) user.branding = {};
    user.branding.logo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    await user.save();

    // Log the event
    await logEvent({
      userId: req.user.id,
      action: 'user_logo_updated',
      module: 'admin',
      resource: 'user',
      resourceId: user._id,
      details: {
        targetUserEmail: user.email,
        oldLogo: oldLogo ? oldLogo.filename : null,
        newLogo: req.file.filename
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User logo updated successfully',
      data: {
        id: user._id,
        email: user.email,
        logo: user.branding.logo
      }
    });
  } catch (error) {
    logger.error('Error updating user logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user logo'
      });
  }
});

// Test endpoint to check if branding fields can be saved
router.post('/test-branding/:id', protect, adminAuth, async (req, res) => {
  try {
    console.log('🧪 TEST: Testing branding save...');
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('🧪 TEST: Original branding:', JSON.stringify(user.branding, null, 2));

    // Try to save a simple test value
    const testResult = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          'branding.testField': 'test-value',
          'branding.address': 'test address',
          'branding.gstNumber': 'test-gst'
        } 
      },
      { new: true, runValidators: true }
    );

    console.log('🧪 TEST: After update:', JSON.stringify(testResult.branding, null, 2));

    res.json({
      success: true,
      message: 'Test completed',
      data: {
        original: user.branding,
        updated: testResult.branding
      }
    });
  } catch (error) {
    console.error('🧪 TEST: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Get user logo (public endpoint)
router.get('/users/:id/logo', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.branding?.logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      });
    }

    const logoPath = user.branding.logo.path;
    
    // Set CORS headers for image serving
    res.set({
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    });
    
    res.sendFile(logoPath, { root: '.' });
  } catch (error) {
    logger.error('Error serving user logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve logo'
    });
  }
});

module.exports = router;

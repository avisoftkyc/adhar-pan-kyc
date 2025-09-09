const PanKyc = require('../models/PanKyc');
const AadhaarPan = require('../models/AadhaarPan');
const User = require('../models/User');
const logger = require('../utils/logger');

// Helper function to determine activity type based on status and module
const getActivityType = (status, module) => {
  if (module === 'pan-kyc') {
    switch (status) {
      case 'verified':
      case 'valid':
        return 'verification_success';
      case 'pending':
        return 'verification_pending';
      case 'failed':
      case 'invalid':
      case 'error':
        return 'verification_failed';
      default:
        return 'document_uploaded';
    }
  } else {
    switch (status) {
      case 'linked':
        return 'linking_success';
      case 'not-linked':
        return 'linking_failed';
      case 'pending':
        return 'linking_pending';
      default:
        return 'document_uploaded';
    }
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get PAN KYC statistics (excluding pending records)
    const panKycStats = await PanKyc.aggregate([
      { $match: { userId: userId, status: { $ne: 'pending' } } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          verifiedRecords: {
            $sum: {
              $cond: [
                { $in: ['$status', ['verified', 'valid']] },
                1,
                0
              ]
            }
          },
          pendingRecords: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          },
          failedRecords: {
            $sum: {
              $cond: [
                { $in: ['$status', ['failed', 'invalid', 'error']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get Aadhaar-PAN statistics (excluding pending records)
    const aadhaarPanStats = await AadhaarPan.aggregate([
      { $match: { userId: userId, status: { $ne: 'pending' } } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          linkedRecords: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'linked'] },
                1,
                0
              ]
            }
          },
          notLinkedRecords: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'not-linked'] },
                1,
                0
              ]
            }
          },
          pendingRecords: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent activity with more dynamic data (last 15 records from both modules)
    const recentPanKyc = await PanKyc.find({ userId: userId })
      .sort({ updatedAt: -1 }) // Sort by updatedAt for more dynamic results
      .limit(8)
      .select('batchId status createdAt updatedAt processedAt name panNumber')
      .lean();

    const recentAadhaarPan = await AadhaarPan.find({ userId: userId })
      .sort({ updatedAt: -1 }) // Sort by updatedAt for more dynamic results
      .limit(8)
      .select('batchId status createdAt updatedAt processedAt name aadhaarNumber panNumber')
      .lean();

    // Combine and enhance recent activity with more dynamic information
    const recentActivity = [
      ...recentPanKyc.map(record => ({
        ...record,
        module: 'PAN KYC',
        type: 'pan-kyc',
        displayName: record.name || 'Unknown',
        identifier: record.panNumber || record.batchId,
        lastActivity: record.updatedAt || record.processedAt || record.createdAt,
        activityType: getActivityType(record.status, 'pan-kyc')
      })),
      ...recentAadhaarPan.map(record => ({
        ...record,
        module: 'Aadhaar-PAN',
        type: 'aadhaar-pan',
        displayName: record.name || 'Unknown',
        identifier: record.aadhaarNumber || record.panNumber || record.batchId,
        lastActivity: record.updatedAt || record.processedAt || record.createdAt,
        activityType: getActivityType(record.status, 'aadhaar-pan')
      }))
    ]
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
    .slice(0, 12); // Show more recent activities

    // Format response
    const panKycData = panKycStats[0] || {
      totalRecords: 0,
      verifiedRecords: 0,
      pendingRecords: 0,
      failedRecords: 0
    };

    const aadhaarPanData = aadhaarPanStats[0] || {
      totalRecords: 0,
      linkedRecords: 0,
      notLinkedRecords: 0,
      pendingRecords: 0
    };

    // Calculate totals (pending records are already excluded from the aggregation)
    // PAN KYC total = verified + failed (no pending)
    // Aadhaar-PAN total = linked + not-linked (no pending)
    const totalRecords = panKycData.totalRecords + aadhaarPanData.totalRecords;
    const totalVerified = panKycData.verifiedRecords + aadhaarPanData.linkedRecords;

    const stats = {
      totalRecords,
      panKycRecords: panKycData.totalRecords,
      aadhaarPanRecords: aadhaarPanData.totalRecords,
      verifiedRecords: totalVerified,
      panKyc: {
        total: panKycData.totalRecords,
        verified: panKycData.verifiedRecords,
        pending: panKycData.pendingRecords,
        failed: panKycData.failedRecords
      },
      aadhaarPan: {
        total: aadhaarPanData.totalRecords,
        linked: aadhaarPanData.linkedRecords,
        notLinked: aadhaarPanData.notLinkedRecords,
        pending: aadhaarPanData.pendingRecords
      },
      recentActivity
    };

    logger.info(`Dashboard stats fetched for user ${userId}:`, {
      totalRecords,
      panKycRecords: panKycData.totalRecords,
      aadhaarPanRecords: aadhaarPanData.totalRecords
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

// @desc    Get module-specific statistics
// @route   GET /api/dashboard/stats/:module
// @access  Private
const getModuleStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { module } = req.params;

    let stats = {};

    if (module === 'pan-kyc') {
      const panKycStats = await PanKyc.aggregate([
        { $match: { userId: userId, status: { $ne: 'pending' } } },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            verifiedRecords: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['verified', 'valid']] },
                  1,
                  0
                ]
              }
            },
            pendingRecords: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'pending'] },
                  1,
                  0
                ]
              }
            },
            failedRecords: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['failed', 'invalid', 'error']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      stats = panKycStats[0] || {
        totalRecords: 0,
        verifiedRecords: 0,
        pendingRecords: 0,
        failedRecords: 0
      };
    } else if (module === 'aadhaar-pan') {
      const aadhaarPanStats = await AadhaarPan.aggregate([
        { $match: { userId: userId, status: { $ne: 'pending' } } },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            linkedRecords: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'linked'] },
                  1,
                  0
                ]
              }
            },
            notLinkedRecords: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'not-linked'] },
                  1,
                  0
                ]
              }
            },
            pendingRecords: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'pending'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      stats = aadhaarPanStats[0] || {
        totalRecords: 0,
        linkedRecords: 0,
        notLinkedRecords: 0,
        pendingRecords: 0
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid module specified'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Error fetching ${req.params.module} stats:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch module statistics'
    });
  }
};

// @desc    Get recent activity only
// @route   GET /api/dashboard/recent-activity
// @access  Private
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get recent activity with more dynamic data
    const recentPanKyc = await PanKyc.find({ userId: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('batchId status createdAt updatedAt processedAt name panNumber')
      .lean();

    const recentAadhaarPan = await AadhaarPan.find({ userId: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('batchId status createdAt updatedAt processedAt name aadhaarNumber panNumber')
      .lean();

    // Combine and enhance recent activity
    const recentActivity = [
      ...recentPanKyc.map(record => ({
        ...record,
        module: 'PAN KYC',
        type: 'pan-kyc',
        displayName: record.name || 'Unknown',
        identifier: record.panNumber || record.batchId,
        lastActivity: record.updatedAt || record.processedAt || record.createdAt,
        activityType: getActivityType(record.status, 'pan-kyc')
      })),
      ...recentAadhaarPan.map(record => ({
        ...record,
        module: 'Aadhaar-PAN',
        type: 'aadhaar-pan',
        displayName: record.name || 'Unknown',
        identifier: record.aadhaarNumber || record.panNumber || record.batchId,
        lastActivity: record.updatedAt || record.processedAt || record.createdAt,
        activityType: getActivityType(record.status, 'aadhaar-pan')
      }))
    ]
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
    .slice(0, 15);

    res.json({
      success: true,
      data: recentActivity
    });

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
};

module.exports = {
  getDashboardStats,
  getModuleStats,
  getRecentActivity
};

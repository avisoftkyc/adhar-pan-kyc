const PanKyc = require('../models/PanKyc');
const AadhaarPan = require('../models/AadhaarPan');
const User = require('../models/User');
const logger = require('../utils/logger');

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

    // Get recent activity (last 10 records from both modules)
    const recentPanKyc = await PanKyc.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('batchId status createdAt')
      .lean();

    const recentAadhaarPan = await AadhaarPan.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('batchId status createdAt')
      .lean();

    // Combine recent activity
    const recentActivity = [
      ...recentPanKyc.map(record => ({
        ...record,
        module: 'PAN KYC',
        type: 'pan-kyc'
      })),
      ...recentAadhaarPan.map(record => ({
        ...record,
        module: 'Aadhaar-PAN',
        type: 'aadhaar-pan'
      }))
    ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

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

module.exports = {
  getDashboardStats,
  getModuleStats
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  UserIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Stats {
  totalRecords: number;
  panKycRecords: number;
  aadhaarPanRecords: number;
  verifiedRecords: number;
  panKyc: {
    total: number;
    verified: number;
    pending: number;
    failed: number;
  };
  aadhaarPan: {
    total: number;
    linked: number;
    notLinked: number;
    pending: number;
  };
  recentActivity: Array<{
    _id: string;
    batchId: string;
    status: string;
    module: string;
    type: string;
    createdAt: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalRecords: 0,
    panKycRecords: 0,
    aadhaarPanRecords: 0,
    verifiedRecords: 0,
    panKyc: {
      total: 0,
      verified: 0,
      pending: 0,
      failed: 0
    },
    aadhaarPan: {
      total: 0,
      linked: 0,
      notLinked: 0,
      pending: 0
    },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch real stats from API
        const response = await api.get('/dashboard/stats');
        
        if (response.data.success) {
          setStats(response.data.data);
          
          // Trigger animation after data loads
          setTimeout(() => setAnimateStats(true), 300);
        } else {
          throw new Error('Failed to fetch stats');
        }
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        
        // Show error toast
        showToast({
          message: 'Failed to load dashboard statistics',
          type: 'error'
        });
        
        // Fallback to dummy data for demonstration
        const panKycRecords = 0;
        const aadhaarPanRecords = 0;
        const fallbackStats = {
          totalRecords: panKycRecords + aadhaarPanRecords,
          panKycRecords: panKycRecords,
          aadhaarPanRecords: aadhaarPanRecords,
          verifiedRecords: 0,
          panKyc: {
            total: 0,
            verified: 0,
            pending: 0,
            failed: 0
          },
          aadhaarPan: {
            total: 0,
            linked: 0,
            notLinked: 0,
            pending: 0
          },
          recentActivity: []
        };
        
        setStats(fallbackStats);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, showToast]);

  const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => (
    <span className={`transition-all duration-1000 ease-out ${className}`}>
      {value}
    </span>
  );

  // Chart data
  const totalRecordsData = [
    { name: 'PAN KYC', value: stats.panKycRecords, color: '#3b82f6' },
    { name: 'Aadhaar-PAN', value: stats.aadhaarPanRecords, color: '#10b981' }
  ];

  const panKycData = [
    { name: 'Total Records', value: stats.panKycRecords, color: '#3b82f6' }
  ];

  const aadhaarPanData = [
    { name: 'Total Records', value: stats.aadhaarPanRecords, color: '#10b981' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Loading */}
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-3xl w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-3xl h-32"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-200 rounded-3xl h-64"></div>
              <div className="bg-gray-200 rounded-3xl h-64"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with staggered animation */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight drop-shadow-lg">
            Welcome back, {user?.branding?.displayName || user?.name || 'User'}! 👋
          </h1>
          <p className="mt-2 text-slate-600 font-medium">
            Here's what's happening with your KYC Aadhaar System today
          </p>
        </div>

        {/* Stats Cards with staggered animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Total Records</p>
                <AnimatedNumber 
                  value={stats.totalRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalRecordsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {totalRecordsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {totalRecordsData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PAN KYC Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">PAN KYC Records</p>
                <AnimatedNumber 
                  value={stats.panKycRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={panKycData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {panKycData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {panKycData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aadhaar-PAN Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Aadhaar-PAN Records</p>
                <AnimatedNumber 
                  value={stats.aadhaarPanRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aadhaarPanData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {aadhaarPanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {aadhaarPanData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions and Recent Activity with staggered animations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mr-3">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                Upload PAN KYC Document
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                Upload Aadhaar-PAN Document
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                View All Records
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mr-3">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 5).map((activity, index) => {
                  const getStatusColor = (status: string, module: string) => {
                    if (module === 'PAN KYC') {
                      switch (status) {
                        case 'verified':
                        case 'valid':
                          return 'from-green-50 to-emerald-50';
                        case 'pending':
                          return 'from-yellow-50 to-orange-50';
                        case 'failed':
                        case 'invalid':
                        case 'error':
                          return 'from-red-50 to-pink-50';
                        default:
                          return 'from-blue-50 to-purple-50';
                      }
                    } else {
                      switch (status) {
                        case 'linked':
                          return 'from-green-50 to-emerald-50';
                        case 'not-linked':
                          return 'from-red-50 to-pink-50';
                        case 'pending':
                          return 'from-yellow-50 to-orange-50';
                        default:
                          return 'from-blue-50 to-purple-50';
                      }
                    }
                  };

                  const getIconColor = (status: string, module: string) => {
                    if (module === 'PAN KYC') {
                      switch (status) {
                        case 'verified':
                        case 'valid':
                          return 'bg-green-500';
                        case 'pending':
                          return 'bg-yellow-500';
                        case 'failed':
                        case 'invalid':
                        case 'error':
                          return 'bg-red-500';
                        default:
                          return 'bg-blue-500';
                      }
                    } else {
                      switch (status) {
                        case 'linked':
                          return 'bg-green-500';
                        case 'not-linked':
                          return 'bg-red-500';
                        case 'pending':
                          return 'bg-yellow-500';
                        default:
                          return 'bg-blue-500';
                      }
                    }
                  };

                  const getStatusText = (status: string, module: string) => {
                    if (module === 'PAN KYC') {
                      switch (status) {
                        case 'verified':
                        case 'valid':
                          return 'PAN KYC verified successfully';
                        case 'pending':
                          return 'PAN KYC verification pending';
                        case 'failed':
                        case 'invalid':
                        case 'error':
                          return 'PAN KYC verification failed';
                        default:
                          return 'PAN KYC document uploaded';
                      }
                    } else {
                      switch (status) {
                        case 'linked':
                          return 'Aadhaar-PAN linked successfully';
                        case 'not-linked':
                          return 'Aadhaar-PAN linking failed';
                        case 'pending':
                          return 'Aadhaar-PAN linking pending';
                        default:
                          return 'Aadhaar-PAN document uploaded';
                      }
                    }
                  };

                  const formatTimeAgo = (dateString: string) => {
                    const now = new Date();
                    const date = new Date(dateString);
                    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
                    
                    if (diffInMinutes < 1) return 'Just now';
                    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
                    
                    const diffInHours = Math.floor(diffInMinutes / 60);
                    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
                    
                    const diffInDays = Math.floor(diffInHours / 24);
                    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
                  };

                  return (
                    <div 
                      key={activity._id}
                      className={`flex items-center p-3 bg-gradient-to-r ${getStatusColor(activity.status, activity.module)} rounded-2xl hover:bg-gradient-to-r hover:from-opacity-80 hover:to-opacity-80 transition-all duration-200 ease-out cursor-pointer group`}
                    >
                      <div className={`p-2 ${getIconColor(activity.status, activity.module)} rounded-2xl mr-3 group-hover:scale-110 transition-transform duration-200`}>
                        {activity.module === 'PAN KYC' ? (
                          <DocumentTextIcon className="h-4 w-4 text-white" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {getStatusText(activity.status, activity.module)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                      <div className={`w-2 h-2 ${getIconColor(activity.status, activity.module)} rounded-full animate-pulse`}></div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 bg-gray-100 rounded-2xl inline-block mb-3">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">Upload documents to see activity here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

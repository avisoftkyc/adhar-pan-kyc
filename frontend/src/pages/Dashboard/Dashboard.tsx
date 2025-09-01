import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentTextIcon,
  IdentificationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  panKyc: {
    total: number;
    verified: number;
    rejected: number;
    pending: number;
    error: number;
  };
  aadhaarPan: {
    total: number;
    linked: number;
    notLinked: number;
    pending: number;
    invalid: number;
    error: number;
  };
  activity: {
    totalActions: number;
    lastActivity: string;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const fetchStats = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          panKyc: {
            total: 1250,
            verified: 980,
            rejected: 45,
            pending: 180,
            error: 45,
          },
          aadhaarPan: {
            total: 890,
            linked: 720,
            notLinked: 95,
            pending: 50,
            invalid: 15,
            error: 10,
          },
          activity: {
            totalActions: 45,
            lastActivity: '2 hours ago',
          },
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const panKycData = [
    { name: 'Verified', value: stats?.panKyc.verified || 0, color: '#22c55e' },
    { name: 'Pending', value: stats?.panKyc.pending || 0, color: '#f59e0b' },
    { name: 'Rejected', value: stats?.panKyc.rejected || 0, color: '#ef4444' },
    { name: 'Error', value: stats?.panKyc.error || 0, color: '#6b7280' },
  ];

  const aadhaarPanData = [
    { name: 'Linked', value: stats?.aadhaarPan.linked || 0, color: '#22c55e' },
    { name: 'Not Linked', value: stats?.aadhaarPan.notLinked || 0, color: '#ef4444' },
    { name: 'Pending', value: stats?.aadhaarPan.pending || 0, color: '#f59e0b' },
    { name: 'Invalid', value: stats?.aadhaarPan.invalid || 0, color: '#6b7280' },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'pan_kyc_upload',
      description: 'Uploaded PAN KYC batch with 50 records',
      timestamp: '2 hours ago',
      status: 'success',
    },
    {
      id: 2,
      type: 'aadhaar_pan_verification',
      description: 'Completed Aadhaar-PAN verification for 25 records',
      timestamp: '4 hours ago',
      status: 'success',
    },
    {
      id: 3,
      type: 'pan_kyc_api_error',
      description: 'API error occurred during PAN verification',
      timestamp: '6 hours ago',
      status: 'error',
    },
    {
      id: 4,
      type: 'report_downloaded',
      description: 'Downloaded PAN KYC verification report',
      timestamp: '1 day ago',
      status: 'success',
    },
  ];

  const quickActions = [
    {
      name: 'Upload PAN KYC',
      description: 'Upload Excel file for PAN verification',
      href: '/pan-kyc',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      available: user?.role === 'admin' || user?.moduleAccess?.includes('pan-kyc'),
    },
    {
      name: 'Upload Aadhaar-PAN',
      description: 'Upload Excel file for Aadhaar-PAN linking',
      href: '/aadhaar-pan',
      icon: IdentificationIcon,
      color: 'bg-green-500',
      available: user?.role === 'admin' || user?.moduleAccess?.includes('aadhaar-pan'),
    },
    {
      name: 'View Reports',
      description: 'Access verification reports and analytics',
      href: '/reports',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      available: true,
    },
    {
      name: 'User Management',
      description: 'Manage users and permissions',
      href: '/admin',
      icon: UserGroupIcon,
      color: 'bg-orange-500',
      available: user?.role === 'admin',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-primary-100 mt-1">
          Here's what's happening with your KYC verification system today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">PAN KYC Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.panKyc.total || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IdentificationIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Aadhaar-PAN Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.aadhaarPan.total || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+8%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats ? Math.round(((stats.panKyc.verified + stats.aadhaarPan.linked) / (stats.panKyc.total + stats.aadhaarPan.total)) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+5%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(stats?.panKyc.pending || 0) + (stats?.aadhaarPan.pending || 0)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-600">-3%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAN KYC Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">PAN KYC Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={panKycData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
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
          <div className="mt-4 grid grid-cols-2 gap-4">
            {panKycData.map((item) => (
              <div key={item.name} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aadhaar-PAN Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Aadhaar-PAN Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aadhaarPanData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
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
          <div className="mt-4 grid grid-cols-2 gap-4">
            {aadhaarPanData.map((item) => (
              <div key={item.name} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              action.available && (
                <Link
                  key={action.name}
                  to={action.href}
                  className="group relative rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center">
                    <div className={`${action.color} p-2 rounded-lg`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600">
                        {action.name}
                      </p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </Link>
              )
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {activity.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : activity.status === 'error' ? (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              to="/activity"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all activity →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

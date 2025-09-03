import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { 
  UserGroupIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  moduleAccess: string[];
  status: string;
  branding?: {
    logo?: {
      filename: string;
      originalName: string;
      path: string;
      mimetype: string;
      size: number;
    };
    companyName?: string;
    displayName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  action: string;
  module: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  status: string;
  createdAt: string;
}

interface SystemStats {
  users: {
    total: number;
    active: number;
    new: number;
    inactive: number;
    suspended: number;
    premium: number;
    basic: number;
    lastActive: Array<{ _id: string; count: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    moduleAccessStats: Array<{ module: string; count: number }>;
  };
  panKyc: Array<{ _id: string; count: number }>;
  aadhaarPan: Array<{ _id: string; count: number }>;
  activity: Array<{ _id: string; count: number }>;
  dailyActivity: Array<{ _id: string; count: number }>;
  userPerformance: {
    topPerformers: Array<{ userId: string; name: string; count: number; module: string }>;
    recentActivity: Array<{ userId: string; name: string; action: string; timestamp: string }>;
    userEngagement: Array<{ userId: string; name: string; loginCount: number; lastLogin: string }>;
  };
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModuleAccess, setShowModuleAccess] = useState(false);
  const [selectedUserForModules, setSelectedUserForModules] = useState<User | null>(null);
  const [showBranding, setShowBranding] = useState(false);
  const [selectedUserForBranding, setSelectedUserForBranding] = useState<User | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    companyName: '',
    displayName: '',
    logoFile: null as File | null
  });
  const [brandingLoading, setBrandingLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    moduleAccess: [] as string[],
    status: 'active'
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchSystemStats();
      fetchUserStats();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit-logs');
      setAuditLogs(response.data.data.logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setSystemStats(response.data.data);
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/admin/user-stats');
      setUserStats(response.data.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/admin/users', formData);
      setSuccess('User created successfully');
      setShowCreateUser(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        moduleAccess: [],
        status: 'active'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setLoading(true);
      const { password, ...updateData } = formData;
      const dataToSend = password ? formData : updateData;
      
      await api.put(`/admin/users/${editingUser._id}`, dataToSend);
      setSuccess('User updated successfully');
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        moduleAccess: [],
        status: 'active'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      await api.delete(`/admin/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleManageModuleAccess = (user: User) => {
    setSelectedUserForModules(user);
    setShowModuleAccess(true);
  };

  const handleUpdateModuleAccess = async (userId: string, moduleAccess: string[]) => {
    try {
      await api.patch(`/admin/users/${userId}/module-access`, { moduleAccess });
      setSuccess('User module access updated successfully');
      setShowModuleAccess(false);
      setSelectedUserForModules(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating module access:', error);
      setError(error.response?.data?.message || 'Failed to update module access');
    }
  };

  const handleManageBranding = (user: User) => {
    setSelectedUserForBranding(user);
    setBrandingForm({
      companyName: user.branding?.companyName || '',
      displayName: user.branding?.displayName || '',
      logoFile: null
    });
    setShowBranding(true);
  };

  const handleUpdateBranding = async (userId: string) => {
    try {
      setBrandingLoading(true);
      
      // Update branding text fields
      if (brandingForm.companyName || brandingForm.displayName) {
        await api.patch(`/admin/users/${userId}/branding`, {
          companyName: brandingForm.companyName,
          displayName: brandingForm.displayName
        });
      }

      // Upload logo if selected
      if (brandingForm.logoFile) {
        const formData = new FormData();
        formData.append('logo', brandingForm.logoFile);
        await api.post(`/admin/users/${userId}/logo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSuccess('User branding updated successfully');
      setShowBranding(false);
      setSelectedUserForModules(null);
      setBrandingForm({ companyName: '', displayName: '', logoFile: null });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating branding:', error);
      setError(error.response?.data?.message || 'Failed to update branding');
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      moduleAccess: user.moduleAccess,
      status: user.status
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'suspended':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('login')) return 'bg-green-100 text-green-800';
    if (action.includes('delete') || action.includes('failed')) return 'bg-red-100 text-red-800';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Admin Header */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
                      <div className="flex items-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl flex items-center justify-center mr-8 shadow-2xl border border-white/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CogIcon className="h-10 w-10 text-white relative z-10 group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-3xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                <p className="text-purple-100 text-lg mt-2">
                  Manage users, view system statistics, and monitor audit logs
                </p>
              </div>
            </div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced System Statistics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-blue-200 cursor-pointer group">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <UserGroupIcon className="h-7 w-7 text-white relative z-10" />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors duration-300">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{systemStats.users.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-emerald-200 cursor-pointer group">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CheckCircleIcon className="h-7 w-7 text-white relative z-10" />
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-emerald-600 transition-colors duration-300">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">{systemStats.users.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-purple-200 cursor-pointer group">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <PlusIcon className="h-7 w-7 text-white relative z-10" />
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors duration-300">New Users (30d)</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">{systemStats.users.new}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-orange-200 cursor-pointer group">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <ChartBarIcon className="h-7 w-7 text-white relative z-10" />
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-orange-600 transition-colors duration-300">Total Activity</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                  {systemStats.activity.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg ring-2 ring-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-md active:scale-95'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Users
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              fetchAuditLogs();
            }}
            className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg ring-2 ring-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-md active:scale-95'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg ring-2 ring-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-md active:scale-95'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg ring-2 ring-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-md active:scale-95'
            }`}
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            User Analytics
          </button>
        </nav>
      </div>

      {/* Enhanced Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <UserGroupIcon className="h-6 w-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              </div>
              <button
                onClick={() => setShowCreateUser(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-300 ring-2 ring-purple-200/50 hover:ring-purple-300/50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {users.map((user) => (
                  <div key={user._id} className="p-6 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg relative overflow-hidden group cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="text-lg font-bold text-white relative z-10 group-hover:scale-110 transition-transform duration-300">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-lg font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex items-center mt-2 space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {user.role}
                            </span>
                            <div className="flex items-center">
                              {getStatusIcon(user.status)}
                              <span className={`ml-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center mt-3">
                            <span className="text-xs text-gray-500 mr-2">Modules:</span>
                            {user.moduleAccess.length > 0 ? (
                              user.moduleAccess.map((module) => (
                                <span
                                  key={module}
                                  className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 mr-2"
                                >
                                  {module === 'pan-kyc' ? 'PAN KYC' : 'Aadhaar-PAN'}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No modules assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleManageModuleAccess(user)}
                          className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-md relative overflow-hidden group"
                          title="Manage Module Access"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          <CogIcon className="h-5 w-5 relative z-10 group-hover:rotate-180 transition-transform duration-500 ease-in-out" />
                        </button>
                        <button
                          onClick={() => handleManageBranding(user)}
                          className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-md relative overflow-hidden group"
                          title="Manage Branding"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          <svg className="h-5 w-5 relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-md relative overflow-hidden group"
                          title="Edit User"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          <PencilIcon className="h-5 w-5 relative z-10 group-hover:rotate-12 transition-transform duration-300 ease-in-out" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-md relative overflow-hidden group"
                          title="Delete User"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          <TrashIcon className="h-5 w-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Audit Logs</h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <li key={log._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <EyeIcon className="h-4 w-4 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {log.userId?.name || 'System'} - {log.action}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.module} • {log.resource} • {new Date(log.createdAt).toLocaleString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            {log.ipAddress && (
                              <span className="ml-2 text-xs text-gray-500">
                                IP: {log.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && systemStats && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">System Statistics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PAN KYC Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">PAN KYC Statistics</h3>
              <div className="space-y-2">
                {systemStats.panKyc.map((stat) => (
                  <div key={stat._id} className="flex justify-between">
                    <span className="text-sm text-gray-600 capitalize">{stat._id}</span>
                    <span className="text-sm font-medium text-gray-900">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aadhaar-PAN Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Aadhaar-PAN Statistics</h3>
              <div className="space-y-2">
                {systemStats.aadhaarPan.map((stat) => (
                  <div key={stat._id} className="flex justify-between">
                    <span className="text-sm text-gray-600 capitalize">{stat._id}</span>
                    <span className="text-sm font-medium text-gray-900">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {systemStats.activity.slice(0, 10).map((stat) => (
                <div key={stat._id} className="flex justify-between">
                  <span className="text-sm text-gray-600 capitalize">{stat._id.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="h-6 w-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">User Analytics Dashboard</h2>
            </div>

            {/* Enhanced User Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900">{systemStats?.users.total || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Active Users</p>
                    <p className="text-2xl font-bold text-emerald-900">{systemStats?.users.active || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">New Users (30d)</p>
                    <p className="text-2xl font-bold text-purple-900">{systemStats?.users.new || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <PlusIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Inactive Users</p>
                    <p className="text-2xl font-bold text-orange-900">{systemStats?.users.inactive || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* User Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Performers */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {systemStats?.userPerformance?.topPerformers?.slice(0, 5).map((performer, index) => (
                    <div key={performer.userId} className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{performer.name}</p>
                          <p className="text-sm text-gray-600">{performer.module}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{performer.count}</p>
                        <p className="text-xs text-gray-500">records</p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p>No performance data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent User Activity */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent User Activity
                </h3>
                <div className="space-y-3">
                  {systemStats?.userPerformance?.recentActivity?.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.name}</p>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>No recent activity data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Engagement Metrics */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                User Engagement Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{(systemStats?.users.total || 0) - (systemStats?.users.inactive || 0)}</p>
                  <p className="text-sm text-gray-600">Engaged Users</p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{Math.round(((systemStats?.users.active || 0) / (systemStats?.users.total || 1)) * 100)}%</p>
                  <p className="text-sm text-gray-600">Active Rate</p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{systemStats?.users.new || 0}</p>
                  <p className="text-sm text-gray-600">New This Month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {(showCreateUser || editingUser) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUser(false);
                      setEditingUser(null);
                      setFormData({
                        name: '',
                        email: '',
                        password: '',
                        role: 'user',
                        moduleAccess: [],
                        status: 'active'
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Module Access Management Modal */}
      {showModuleAccess && selectedUserForModules && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manage Module Access for {selectedUserForModules.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Access</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUserForModules.moduleAccess.includes('pan-kyc')}
                        onChange={(e) => {
                          const newModuleAccess = e.target.checked
                            ? [...selectedUserForModules.moduleAccess, 'pan-kyc']
                            : selectedUserForModules.moduleAccess.filter(m => m !== 'pan-kyc');
                          setSelectedUserForModules({
                            ...selectedUserForModules,
                            moduleAccess: newModuleAccess
                          });
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">PAN KYC</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUserForModules.moduleAccess.includes('aadhaar-pan')}
                        onChange={(e) => {
                          const newModuleAccess = e.target.checked
                            ? [...selectedUserForModules.moduleAccess, 'aadhaar-pan']
                            : selectedUserForModules.moduleAccess.filter(m => m !== 'aadhaar-pan');
                          setSelectedUserForModules({
                            ...selectedUserForModules,
                            moduleAccess: newModuleAccess
                          });
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Aadhaar-PAN Linking</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModuleAccess(false);
                      setSelectedUserForModules(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateModuleAccess(selectedUserForModules._id, selectedUserForModules.moduleAccess)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Update Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branding Management Modal */}
      {showBranding && selectedUserForBranding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manage Branding for {selectedUserForBranding.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={brandingForm.companyName || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={brandingForm.displayName || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="flex items-center space-x-3">
                    {selectedUserForBranding.branding?.logo && (
                      <img
                        src={`/api/admin/users/${selectedUserForBranding._id}/logo`}
                        alt="Current logo"
                        className="w-12 h-12 object-contain border border-gray-300 rounded"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBrandingForm({ ...brandingForm, logoFile: file });
                        }
                      }}
                      className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBranding(false);
                      setSelectedUserForBranding(null);
                      setBrandingForm({ companyName: '', displayName: '', logoFile: null });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateBranding(selectedUserForBranding._id)}
                    disabled={brandingLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {brandingLoading ? 'Updating...' : 'Update Branding'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

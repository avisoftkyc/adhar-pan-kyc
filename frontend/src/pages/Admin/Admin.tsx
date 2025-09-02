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
  };
  panKyc: Array<{ _id: string; count: number }>;
  aadhaarPan: Array<{ _id: string; count: number }>;
  activity: Array<{ _id: string; count: number }>;
  dailyActivity: Array<{ _id: string; count: number }>;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModuleAccess, setShowModuleAccess] = useState(false);
  const [selectedUserForModules, setSelectedUserForModules] = useState<User | null>(null);

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
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-purple-100 mt-1">
          Manage users, view system statistics, and monitor audit logs
        </p>
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

      {/* System Statistics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.users.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.users.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <PlusIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">New Users (30d)</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.users.new}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Activity</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemStats.activity.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              fetchAuditLogs();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 inline mr-2" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 inline mr-2" />
            Statistics
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">User Management</h2>
            <button
              onClick={() => setShowCreateUser(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {users.map((user) => (
                  <li key={user._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              {user.role}
                            </span>
                            <div className="flex items-center">
                              {getStatusIcon(user.status)}
                              <span className={`ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center mt-2">
                            <span className="text-xs text-gray-500 mr-2">Modules:</span>
                            {user.moduleAccess.length > 0 ? (
                              user.moduleAccess.map((module) => (
                                <span
                                  key={module}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1"
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleManageModuleAccess(user)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Manage Module Access"
                        >
                          <CogIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit User"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete User"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
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
    </div>
  );
};

export default Admin;

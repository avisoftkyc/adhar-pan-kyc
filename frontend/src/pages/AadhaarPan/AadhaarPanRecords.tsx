import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AadhaarPanRecord {
  _id: string;
  batchId: string;
  aadhaarNumber: string;
  panNumber: string;
  name: string;
  fatherName?: string;
  dateOfBirth?: string;
  gender?: string;
  status: 'pending' | 'linked' | 'not-linked' | 'invalid' | 'error';
  linkingDetails?: {
    apiResponse?: any;
    linkingDate?: string;
    linkingStatus?: string;
    remarks?: string;
    lastChecked?: string;
  };
  apiAttempts?: Array<{
    timestamp: string;
    status: 'success' | 'failed' | 'timeout';
    response?: any;
    error?: string;
  }>;
  fileUpload?: {
    originalName: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
  };
  processingTime?: number;
  retryCount?: number;
  lastRetryAt?: string;
  isProcessed: boolean;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface RecordsStats {
  total: number;
  pending: number;
  linked: number;
  'not-linked': number;
  invalid: number;
  error: number;
}

const AadhaarPanRecords: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [records, setRecords] = useState<AadhaarPanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RecordsStats>({
    total: 0,
    pending: 0,
    linked: 0,
    'not-linked': 0,
    invalid: 0,
    error: 0
  });

  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Fetch all records
  const fetchRecords = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      showToast({
        message: 'Please log in to view records',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/aadhaar-pan/records');
      if (response.data.success) {
        setRecords(response.data.data);
        calculateStats(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        showToast({
          message: 'Authentication failed. Please log in again.',
          type: 'error'
        });
        console.error('Authentication error:', error);
      } else {
        showToast({
          message: 'Failed to fetch records',
          type: 'error'
        });
        console.error('Error fetching records:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: AadhaarPanRecord[]) => {
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      linked: data.filter(r => r.status === 'linked').length,
      'not-linked': data.filter(r => r.status === 'not-linked').length,
      invalid: data.filter(r => r.status === 'invalid').length,
      error: data.filter(r => r.status === 'error').length
    };
    setStats(stats);
  };

  // Filter records based on search and filters
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.aadhaarNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.panNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.batchId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const recordDate = new Date(record.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = diffDays === 0;
          break;
        case 'week':
          matchesDate = diffDays <= 7;
          break;
        case 'month':
          matchesDate = diffDays <= 30;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Download CSV
  const downloadCSV = () => {
    const headers = [
      'Batch ID',
      'Aadhaar Number',
      'PAN Number',
      'Name',
      'Father Name',
      'Date of Birth',
      'Gender',
      'Status',
      'Processing Time (ms)',
      'Retry Count',
      'Created At',
      'Processed At',
      'Error Message'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.batchId,
        record.aadhaarNumber,
        record.panNumber,
        record.name,
        record.fatherName || '',
        record.dateOfBirth || '',
        record.gender || '',
        record.status,
        record.processingTime || '',
        record.retryCount || 0,
        new Date(record.createdAt).toLocaleString(),
        record.processedAt ? new Date(record.processedAt).toLocaleString() : '',
        record.errorMessage || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aadhaar-pan-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast({
      message: 'CSV downloaded successfully',
      type: 'success'
    });
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'linked':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'not-linked':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'invalid':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'linked':
        return 'bg-green-100 text-green-800';
      case 'not-linked':
        return 'bg-red-100 text-red-800';
      case 'invalid':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRecords();
    }
  }, [isAuthenticated, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Aadhaar-PAN Linking Records</h1>
            <p className="text-green-100 mt-1">
              View and manage all Aadhaar-PAN linking verification records
            </p>
          </div>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-600"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Linked</p>
              <p className="text-2xl font-bold text-green-600">{stats.linked}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Not Linked</p>
              <p className="text-2xl font-bold text-red-600">{stats['not-linked']}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Invalid</p>
              <p className="text-2xl font-bold text-orange-600">{stats.invalid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Error</p>
              <p className="text-2xl font-bold text-gray-600">{stats.error}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Aadhaar, PAN, Name, or Batch ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="linked">Linked</option>
              <option value="not-linked">Not Linked</option>
              <option value="invalid">Invalid</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:w-48">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Records ({filteredRecords.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading records...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      {/* Basic Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {record.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Aadhaar: {record.aadhaarNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            PAN: {record.panNumber}
                          </div>
                          {record.fatherName && (
                            <div className="text-sm text-gray-500">
                              Father: {record.fatherName}
                            </div>
                          )}
                          {record.dateOfBirth && (
                            <div className="text-sm text-gray-500">
                              DOB: {record.dateOfBirth}
                            </div>
                          )}
                          {record.gender && (
                            <div className="text-sm text-gray-500">
                              Gender: {record.gender}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                        {record.errorMessage && (
                          <div className="mt-1 text-xs text-red-600 max-w-xs truncate" title={record.errorMessage}>
                            {record.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Processing */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {record.processingTime && (
                            <div className="text-sm text-gray-900">
                              {record.processingTime}ms
                            </div>
                          )}
                          {record.retryCount !== undefined && (
                            <div className="text-sm text-gray-500">
                              Retries: {record.retryCount}
                            </div>
                          )}
                          {record.lastRetryAt && (
                            <div className="text-sm text-gray-500">
                              Last retry: {formatDate(record.lastRetryAt)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* File Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">
                            Batch: {record.batchId}
                          </div>
                          {record.fileUpload && (
                            <>
                              <div className="text-sm text-gray-500">
                                File: {record.fileUpload.originalName}
                              </div>
                              <div className="text-sm text-gray-500">
                                Size: {(record.fileUpload.fileSize / 1024).toFixed(1)} KB
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Timestamps */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">
                            Created: {formatDate(record.createdAt)}
                          </div>
                          {record.processedAt && (
                            <div className="text-sm text-gray-500">
                              Processed: {formatDate(record.processedAt)}
                            </div>
                          )}
                          {record.linkingDetails?.lastChecked && (
                            <div className="text-sm text-gray-500">
                              Last checked: {formatDate(record.linkingDetails.lastChecked)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            className="text-green-600 hover:text-green-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {record.status === 'pending' && (
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              title="Verify Now"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AadhaarPanRecords;

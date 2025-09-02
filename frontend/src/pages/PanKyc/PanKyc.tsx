import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Batch {
  _id: string;
  totalRecords: number;
  pendingRecords: number;
  verifiedRecords: number;
  rejectedRecords: number;
  errorRecords: number;
  createdAt: string;
  updatedAt: string;
}

interface BatchDetail {
  batchId: string;
  records: any[];
  stats: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    error: number;
  };
}

interface Record {
  _id: string;
  panNumber: string;
  name: string;
  fatherName?: string;
  dateOfBirth?: string;
  status: 'pending' | 'verified' | 'rejected' | 'error';
  processedAt?: string;
  verificationResult?: any;
}

const PanKyc: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyingRecords, setVerifyingRecords] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 5;
  const [newlyUploadedBatchId, setNewlyUploadedBatchId] = useState<string | null>(null);
  const batchDetailsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Table pagination and search
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableRecordsPerPage, setTableRecordsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'single'>('upload');
  
  // Reset file input when switching tabs
  const handleTabChange = (tab: 'upload' | 'single') => {
    setActiveTab(tab);
    if (tab === 'upload') {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Single KYC form state
  const [singleKycForm, setSingleKycForm] = useState({
    panNumber: '',
    name: '',
    dateOfBirth: ''
  });
  const [singleKycVerifying, setSingleKycVerifying] = useState(false);
  const [singleKycResult, setSingleKycResult] = useState<any>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  // Reset to first page when batches change
  useEffect(() => {
    setCurrentPage(1);
  }, [batches.length]);



  // Filter and paginate records when selectedBatch or search changes
  useEffect(() => {
    if (selectedBatch) {
      const filtered = selectedBatch.records.filter(record => {
        const searchLower = searchTerm.toLowerCase();
        return (
          record.panNumber?.toLowerCase().includes(searchLower) ||
          record.name?.toLowerCase().includes(searchLower) ||
          record.dateOfBirth?.toLowerCase().includes(searchLower) ||
          record.status?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredRecords(filtered);
      setTableCurrentPage(1); // Reset to first page when search changes
    }
  }, [selectedBatch, searchTerm]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pan-kyc/batches');
      setBatches(response.data.data);
          } catch (error) {
        console.error('Error fetching batches:', error);
        showToast({
          type: 'error',
          message: 'Failed to fetch batches'
        });
      } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/pan-kyc/batch/${batchId}`);
      setSelectedBatch(response.data.data);
      
      // Scroll to the top of the batch details section
      setTimeout(() => {
        if (batchDetailsRef.current) {
          batchDetailsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
        
        // Also scroll the table to the top if it exists
        const tableElement = document.querySelector('.overflow-x-auto');
        if (tableElement) {
          tableElement.scrollTop = 0;
        }
      }, 100);
          } catch (error) {
        console.error('Error fetching batch details:', error);
        showToast({
          type: 'error',
          message: 'Failed to fetch batch details'
        });
      } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);
    console.log('File type:', file?.type);
    
    if (file) {
      const allowedTypes = ['.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      console.log('File extension:', fileExtension);
      
      if (!allowedTypes.includes(fileExtension)) {
        showToast({
          type: 'error',
          message: 'Please select an Excel file (.xlsx or .xls)'
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        showToast({
          type: 'error',
          message: 'File size must be less than 10MB'
        });
        return;
      }
      
      setSelectedFile(file);
      console.log('File set successfully:', file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({
        type: 'error',
        message: 'Please select a file to upload'
      });
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      console.log('Selected file before FormData:', selectedFile);
      console.log('Selected file name:', selectedFile?.name);
      console.log('Selected file size:', selectedFile?.size);
      formData.append('file', selectedFile);
      console.log('FormData created');
      console.log('FormData entries:');
      formData.forEach((value, key) => {
        console.log(key, value);
      });
      const response = await api.post('/pan-kyc/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      showToast({
        type: 'success',
        message: `Successfully uploaded ${response.data.data.recordCount} records`
      });
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Reset the file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Fetch updated batches list
      await fetchBatches();
      
      // Automatically fetch and display the newly uploaded batch
      if (response.data.data.batchId) {
        setNewlyUploadedBatchId(response.data.data.batchId);
        await fetchBatchDetails(response.data.data.batchId);
        
        // Scroll to the top of the batch details section
        setTimeout(() => {
          if (batchDetailsRef.current) {
            batchDetailsRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
          
          // Also scroll the table to the top if it exists
          const tableElement = document.querySelector('.overflow-x-auto');
          if (tableElement) {
            tableElement.scrollTop = 0;
          }
        }, 100);
        
        // Clear the "new upload" indicator after 5 seconds
        setTimeout(() => {
          setNewlyUploadedBatchId(null);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to upload file'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = async (batchId: string) => {
    try {
      const response = await api.get(`/pan-kyc/batch/${batchId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${batchId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast({
        type: 'error',
        message: 'Failed to download report'
      });
    }
  };

  const handleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBatch) {
      const pendingRecordIds = filteredRecords
        .filter(record => record.status === 'pending')
        .map(record => record._id);
      
      setSelectedRecords(prev => 
        prev.length === pendingRecordIds.length ? [] : pendingRecordIds
      );
    }
  };

  const handleVerifySelected = async () => {
    if (selectedRecords.length === 0) {
      showToast({
        type: 'error',
        message: 'Please select records to verify'
      });
      return;
    }

    try {
      setVerifying(true);
      setVerifyingRecords(new Set(selectedRecords));
      const response = await api.post('/pan-kyc/verify', {
        recordIds: selectedRecords
      });
      
      showToast({
        type: 'success',
        message: `Successfully verified ${selectedRecords.length} records`
      });
      setSelectedRecords([]);
      
      // Refresh batch details
      if (selectedBatch) {
        await fetchBatchDetails(selectedBatch.batchId);
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error verifying records:', error);
      showToast({
        type: 'error',
        message: 'Failed to verify selected records'
      });
    } finally {
      setVerifying(false);
      setVerifyingRecords(new Set());
    }
  };

  const handleVerifySingle = async (recordId: string) => {
    // Find the record to show confirmation details
    const record = selectedBatch?.records.find(r => r._id === recordId);
    if (!record) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to verify this record?\n\n` +
      `PAN: ${record.panNumber}\n` +
      `Name: ${record.name}\n` +
      `DOB: ${record.dateOfBirth || 'N/A'}`
    );

    if (!confirmed) return;

    try {
      setVerifyingRecords(new Set([recordId]));
      const response = await api.post('/pan-kyc/verify', {
        recordIds: [recordId]
      });
      
      showToast({
        type: 'success',
        message: 'Record verified successfully'
      });
      
      // Refresh batch details
      if (selectedBatch) {
        await fetchBatchDetails(selectedBatch.batchId);
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error verifying record:', error);
      showToast({
        type: 'error',
        message: 'Failed to verify record'
      });
    } finally {
      setVerifyingRecords(new Set());
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/pan-kyc/batch/${batchId}`);
      
      showToast({
        type: 'success',
        message: `Successfully deleted batch with ${response.data.data.deletedRecords} records`
      });
      
      // Clear selected batch if it was the one deleted
      if (selectedBatch && selectedBatch.batchId === batchId) {
        setSelectedBatch(null);
        setSelectedRecords([]); // Clear selected records
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete batch'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTableData = () => {
    if (!selectedBatch || filteredRecords.length === 0) {
      showToast({
        type: 'error',
        message: 'No data to download'
      });
      return;
    }

    try {
      // Create CSV content
      const headers = ['PAN Number', 'Name', 'Date of Birth', 'Processed At'];
      const csvContent = [
        headers.join(','),
        ...filteredRecords.map(record => [
          record.panNumber || '',
          record.name || '',
          record.dateOfBirth || '',
          record.processedAt ? new Date(record.processedAt).toLocaleString() : ''
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedBatch.batchId}_table_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        message: 'Table data downloaded successfully'
      });
    } catch (error) {
      console.error('Error downloading table data:', error);
      showToast({
        type: 'error',
        message: 'Failed to download table data'
      });
    }
  };

  // Single KYC form functions
  const handleSingleKycFormChange = (field: string, value: string) => {
    setSingleKycForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSingleKycForm = () => {
    if (!singleKycForm.panNumber.trim()) {
      showToast({
        type: 'error',
        message: 'PAN Number is required'
      });
      return false;
    }
    if (!singleKycForm.name.trim()) {
      showToast({
        type: 'error',
        message: 'Name is required'
      });
      return false;
    }
    if (!singleKycForm.dateOfBirth.trim()) {
      showToast({
        type: 'error',
        message: 'Date of Birth is required'
      });
      return false;
    }
    
    // Validate PAN format (basic validation)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(singleKycForm.panNumber.toUpperCase())) {
      showToast({
        type: 'error',
        message: 'Please enter a valid PAN number (e.g., ABCDE1234F)'
      });
      return false;
    }

    return true;
  };

  const handleSingleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSingleKycForm()) {
      return;
    }

    try {
      setSingleKycVerifying(true);
      setSingleKycResult(null);

      // Create a temporary record for verification
      const tempRecord = {
        panNumber: singleKycForm.panNumber.toUpperCase(),
        name: singleKycForm.name.trim(),
        dateOfBirth: singleKycForm.dateOfBirth.trim()
      };

      // Call the verification API
      const response = await api.post('/pan-kyc/verify-single', tempRecord);
      
      setSingleKycResult(response.data.data);
      showToast({
        type: 'success',
        message: 'KYC verification completed successfully'
      });
      
      // Reset form
      setSingleKycForm({
        panNumber: '',
        name: '',
        dateOfBirth: ''
      });
    } catch (error: any) {
      console.error('Error verifying single KYC:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to verify KYC'
      });
    } finally {
      setSingleKycVerifying(false);
    }
  };

  const resetSingleKycForm = () => {
    setSingleKycForm({
      panNumber: '',
      name: '',
      dateOfBirth: ''
    });
    setSingleKycResult(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PAN KYC Verification</h1>
            <p className="text-blue-100 mt-1">
              Upload Excel files and verify PAN details in bulk
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/verification-records'}
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View All Records
          </button>
        </div>
      </div>



      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CloudArrowUpIcon className="h-5 w-5" />
              <span>Upload File</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('single')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Single KYC</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Upload Tab Content */}
      {activeTab === 'upload' && (
        <>
          {/* File Upload Section */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload PAN KYC Data</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File (.xlsx, .xls)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  File should contain columns: panNumber, name, dateOfBirth (all required)
                </p>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                        <p className="text-sm text-blue-700">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <CloudArrowUpIcon className="h-4 w-4 mr-2 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Batches List */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {batches
                    .slice((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage)
                    .map((batch) => (
                    <div
                      key={batch._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedBatch && selectedBatch.batchId === batch._id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => fetchBatchDetails(batch._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {selectedBatch && selectedBatch.batchId === batch._id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{batch._id}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(batch.createdAt).toLocaleDateString()} - {batch.totalRecords} records
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {batch.pendingRecords} Pending
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {batch.verifiedRecords} Verified
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {batch.rejectedRecords} Rejected
                            </span>
                            {batch.errorRecords > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {batch.errorRecords} Error
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadReport(batch._id);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <DocumentArrowDownIcon className="h-3 w-3 mr-1" />
                              Download
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBatch(batch._id);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {batches.length > documentsPerPage && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * documentsPerPage) + 1} to {Math.min(currentPage * documentsPerPage, batches.length)} of {batches.length} documents
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {currentPage} of {Math.ceil(batches.length / documentsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(batches.length / documentsPerPage)))}
                        disabled={currentPage === Math.ceil(batches.length / documentsPerPage)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Batch Details */}
          {selectedBatch && (
            <div className="card" ref={batchDetailsRef}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Document Details: {selectedBatch.batchId}
                </h2>
                {newlyUploadedBatchId === selectedBatch.batchId && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                    ✨ New Upload
                  </span>
                )}
              </div>
              
              <div className="mb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">{selectedBatch.stats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-900">{selectedBatch.stats.pending}</div>
                    <div className="text-sm text-blue-500">Pending</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-900">{selectedBatch.stats.verified}</div>
                    <div className="text-sm text-green-500">Verified</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-900">{selectedBatch.stats.rejected}</div>
                    <div className="text-sm text-red-500">Rejected</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-900">{selectedBatch.stats.error}</div>
                    <div className="text-sm text-yellow-500">Error</div>
                  </div>
                </div>
              </div>

              {/* Table Controls - Search, Pagination, Download */}
              <div className="mb-4 space-y-4">
                {/* Search and Actions Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by PAN, Name, DOB, or Status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-80"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Records per page selector */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Show:</label>
                      <select
                        value={tableRecordsPerPage}
                        onChange={(e) => {
                          setTableRecordsPerPage(Number(e.target.value));
                          setTableCurrentPage(1);
                        }}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-sm text-gray-700">records</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Download CSV Button */}
                    <button
                      onClick={handleDownloadTableData}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Download CSV
                    </button>

                    {/* Verify Selected Button */}
                    {selectedRecords.length > 0 && (
                      <button
                        onClick={handleVerifySelected}
                        disabled={verifying}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {verifying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Verify Selected ({selectedRecords.length})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Select All and Results Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Select all pending</span>
                    </label>
                  </div>
                  <div className="text-sm text-gray-700">
                    {selectedRecords.length} of {filteredRecords.length} records selected
                    {searchTerm && ` (filtered from ${selectedBatch.records.length} total)`}
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PAN Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Birth
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords
                      .slice((tableCurrentPage - 1) * tableRecordsPerPage, tableCurrentPage * tableRecordsPerPage)
                      .map((record) => (
                                              <tr key={record._id} className={`hover:bg-gray-50 ${record.status === 'verified' ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(record.status === 'pending' || record.status === 'rejected' || record.status === 'error') && (
                            <input
                              type="checkbox"
                              checked={selectedRecords.includes(record._id)}
                              onChange={() => handleRecordSelection(record._id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.panNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.dateOfBirth || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.status === 'pending' ? (
                            <button
                              onClick={() => handleVerifySingle(record._id)}
                              disabled={verifyingRecords.has(record._id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                              title={`Verify ${record.name} (${record.panNumber})`}
                            >
                              {verifyingRecords.has(record._id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </button>
                          ) : record.status === 'rejected' || record.status === 'error' ? (
                            <button
                              onClick={() => handleVerifySingle(record._id)}
                              disabled={verifyingRecords.has(record._id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                              title={`Re-verify ${record.name} (${record.panNumber})`}
                            >
                              {verifyingRecords.has(record._id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Re-verifying...
                                </>
                              ) : (
                                <>
                                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                                  Re-verify
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center text-sm text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Pagination */}
              {filteredRecords.length > tableRecordsPerPage && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    Showing {((tableCurrentPage - 1) * tableRecordsPerPage) + 1} to {Math.min(tableCurrentPage * tableRecordsPerPage, filteredRecords.length)} of {filteredRecords.length} results
                    {searchTerm && ` (filtered from ${selectedBatch.records.length} total)`}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setTableCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={tableCurrentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Page {tableCurrentPage} of {Math.ceil(filteredRecords.length / tableRecordsPerPage)}
                    </span>
                    <button
                      onClick={() => setTableCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredRecords.length / tableRecordsPerPage)))}
                      disabled={tableCurrentPage === Math.ceil(filteredRecords.length / tableRecordsPerPage)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Single KYC Tab Content */}
      {activeTab === 'single' && (
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Single KYC Verification</h2>
          
          <div className="max-w-2xl">
            <form onSubmit={handleSingleKycSubmit} className="space-y-6">
              <div>
                <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number *
                </label>
                <input
                  type="text"
                  id="panNumber"
                  value={singleKycForm.panNumber}
                  onChange={(e) => handleSingleKycFormChange('panNumber', e.target.value)}
                  placeholder="e.g., ABCDE1234F"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  maxLength={10}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter PAN number in format: ABCDE1234F
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={singleKycForm.name}
                  onChange={(e) => handleSingleKycFormChange('name', e.target.value)}
                  placeholder="Enter full name as per PAN"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="text"
                  id="dateOfBirth"
                  value={singleKycForm.dateOfBirth}
                  onChange={(e) => handleSingleKycFormChange('dateOfBirth', e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter date in DD/MM/YYYY format
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  disabled={singleKycVerifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {singleKycVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Verify KYC
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={resetSingleKycForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Reset Form
                </button>
              </div>
            </form>

            {/* Single KYC Result */}
            {singleKycResult && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Result</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">PAN Number</p>
                    <p className="text-sm text-gray-900">{singleKycResult.panNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{singleKycResult.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                    <p className="text-sm text-gray-900">{singleKycResult.dateOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="flex items-center">
                      {getStatusIcon(singleKycResult.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(singleKycResult.status)}`}>
                        {singleKycResult.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processing Time</p>
                    <p className="text-sm text-gray-900">{singleKycResult.processingTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processed At</p>
                    <p className="text-sm text-gray-900">
                      {singleKycResult.processedAt ? new Date(singleKycResult.processedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                {singleKycResult.verificationDetails && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Verification Details</p>
                    <div className="bg-white p-4 rounded border">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                        {JSON.stringify(singleKycResult.verificationDetails, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanKyc;

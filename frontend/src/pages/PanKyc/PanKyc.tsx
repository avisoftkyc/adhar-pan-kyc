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
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon
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
  const documentsPerPage = 3;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="relative z-10 space-y-8 p-6">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 backdrop-blur-xl relative overflow-hidden">
          {/* Header Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
                      <div>
              <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg">PAN KYC Verification</h1>
              <p className="text-blue-100 mt-3 text-lg font-medium">
                Upload Excel files and verify PAN details in bulk with advanced verification
              </p>
            </div>
                      <button
              onClick={() => window.location.href = '/pan-kyc-records'}
              className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent border border-white/30 hover:border-white/50 hover:scale-105 transform"
            >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View All Records
          </button>
        </div>
      </div>



      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-xl border border-white/20">
        <nav className="flex space-x-2">
          <button
            onClick={() => handleTabChange('upload')}
            className={`py-3 px-6 rounded-2xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border border-white/30'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CloudArrowUpIcon className="h-5 w-5" />
              <span>Upload File</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('single')}
            className={`py-3 px-6 rounded-2xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'single'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border border-white/30'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50/80'
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
          {/* Enhanced File Upload Section */}
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-3xl p-8 shadow-2xl border border-blue-100/50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-200/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">

              {/* File Input Area */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-dashed border-blue-300/50 hover:border-blue-400/70 transition-all duration-300 mb-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Select Excel File
                  </h3>
                  <p className="text-blue-600/70 mb-4">
                    Supports .xlsx and .xls formats
                  </p>
                  
                  {/* Centered File Input */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-input"
                      />
                      <label
                        htmlFor="file-input"
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-400/30"
                      >
                        <DocumentTextIcon className="h-6 w-6 mr-3" />
                        Choose File
                      </label>
                    </div>
                  </div>
                  
                  <p className="mt-3 text-sm text-blue-500/70">
                    Required columns: <span className="font-semibold">panNumber</span>, <span className="font-semibold">name</span>, <span className="font-semibold">dateOfBirth</span>
                  </p>
                </div>
              </div>


              {/* Selected File Display */}
              {selectedFile && (
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-200/50 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                        <DocumentTextIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-blue-900">{selectedFile.name}</p>
                        <p className="text-blue-700">
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
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-white/80 rounded-2xl p-6 border border-blue-200/50 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-blue-800">Uploading...</span>
                    <span className="text-lg font-bold text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="text-center">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="inline-flex items-center px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-6 w-6 mr-3" />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Batches List */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <DocumentTextIcon className="h-7 w-7 text-emerald-500 mr-3" />
              Uploaded Documents
            </h2>
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search batches by ID, date, or records..."
                  className="w-full px-4 py-3 pl-10 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No Documents Yet</h3>
                <p className="text-slate-500 mb-4">Upload your first PAN KYC document to get started</p>
                <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
                  <CloudArrowUpIcon className="h-5 w-4 mr-2" />
                  Upload First Document
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {batches
                    .slice((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage)
                    .map((batch) => (
                    <div
                      key={batch._id}
                      className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                        selectedBatch && selectedBatch.batchId === batch._id
                          ? 'ring-2 ring-blue-500/50 bg-gradient-to-r from-blue-50/80 to-purple-50/80 shadow-xl'
                          : 'border border-white/40 hover:border-blue-200/50 hover:shadow-lg'
                      } ${newlyUploadedBatchId === batch._id ? 'animate-pulse ring-2 ring-emerald-500/50' : ''}`}
                      onClick={() => fetchBatchDetails(batch._id)}
                    >
                      {/* Active Indicator */}
                      {selectedBatch && selectedBatch.batchId === batch._id && (
                        <div className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <DocumentTextIcon className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {batch._id.split('_')[0]}
                                </h3>
                                <p className="text-sm text-slate-500">
                                  Uploaded {new Date(batch.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            
                            {/* Stats Display - Moved to the right side */}
                            <div className="flex items-center gap-3">
                              <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{batch.totalRecords}</div>
                                <div className="text-xs text-blue-600 font-medium">Total</div>
                              </div>
                              <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{batch.verifiedRecords}</div>
                                <div className="text-xs text-green-600 font-medium">Verified</div>
                              </div>
                              <div className="text-center p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                                <div className="text-lg font-bold text-yellow-600">{batch.pendingRecords}</div>
                                <div className="text-xs text-yellow-600 font-medium">Pending</div>
                              </div>
                              <div className="text-center p-2 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                                <div className="text-lg font-bold text-red-600">{batch.rejectedRecords + batch.errorRecords}</div>
                                <div className="text-xs text-red-600 font-medium">Issues</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadReport(batch._id);
                            }}
                            className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-110"
                            title="Download Report"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBatch(batch._id);
                            }}
                            className="p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-110"
                            title="Delete Batch"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar for Processing */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                          <span>Processing Progress</span>
                          <span>{Math.round(((batch.verifiedRecords + batch.rejectedRecords + batch.errorRecords) / batch.totalRecords) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500" 
                               style={{ width: `${((batch.verifiedRecords + batch.rejectedRecords + batch.errorRecords) / batch.totalRecords) * 100}%` }}>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Enhanced Pagination */}
                {batches.length > documentsPerPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
                    <div className="text-sm text-slate-600 mb-4 sm:mb-0">
                      {currentPage === 1 ? (
                        <>Showing latest <span className="font-semibold text-slate-800">{Math.min(documentsPerPage, batches.length)}</span> of <span className="font-semibold text-slate-800">{batches.length}</span> documents</>
                      ) : (
                        <>Showing <span className="font-semibold text-slate-800">{((currentPage - 1) * documentsPerPage) + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(currentPage * documentsPerPage, batches.length)}</span> of <span className="font-semibold text-slate-800">{batches.length}</span> documents</>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-white/40 bg-white/60 backdrop-blur-sm text-slate-700 hover:bg-white/80 hover:border-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        ← Previous
                      </button>
                      <div className="px-4 py-2 text-sm font-medium text-slate-700 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                        Page {currentPage} of {Math.ceil(batches.length / documentsPerPage)}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(batches.length / documentsPerPage)))}
                        disabled={currentPage === Math.ceil(batches.length / documentsPerPage)}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-white/40 bg-white/60 backdrop-blur-sm text-slate-700 hover:bg-white/80 hover:border-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Next →
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

              {/* Enhanced Table Controls */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-white focus:ring-blue-500"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedRecords.length} of {filteredRecords.length} selected
                      </span>
                    </div>
                    {selectedRecords.length > 0 && (
                      <button
                        onClick={handleVerifySelected}
                        disabled={verifying}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by PAN, Name, DOB, or Status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-600">Show:</label>
                      <select
                        value={tableRecordsPerPage}
                        onChange={(e) => {
                          setTableRecordsPerPage(Number(e.target.value));
                          setTableCurrentPage(1);
                        }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <button
                      onClick={handleDownloadTableData}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Download CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Records Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span>Select</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span>PAN Number</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span>Name</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span>Date of Birth</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span>Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords
                        .slice((tableCurrentPage - 1) * tableRecordsPerPage, tableCurrentPage * tableRecordsPerPage)
                        .map((record) => (
                          <tr key={record._id} className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 ${record.status === 'verified' ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(record.status === 'pending' || record.status === 'rejected' || record.status === 'error') && (
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedRecords.includes(record._id)}
                                    onChange={() => handleRecordSelection(record._id)}
                                    className="w-4 h-4 rounded border-gray-300 text-white focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                                {record.panNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                                {record.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                                {record.dateOfBirth || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.status === 'pending' ? (
                                <button
                                  onClick={() => handleVerifySingle(record._id)}
                                  disabled={verifyingRecords.has(record._id)}
                                  className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-xl shadow-md hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={`Verify ${record.name} (${record.panNumber})`}
                                >
                                  {verifyingRecords.has(record._id) ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
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
                                  className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium rounded-xl shadow-md hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={`Re-verify ${record.name} (${record.panNumber})`}
                                >
                                  {verifyingRecords.has(record._id) ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
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
                                <span className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-xl">
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
              </div>
              
              {/* Enhanced Table Pagination */}
              {filteredRecords.length > tableRecordsPerPage && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{((tableCurrentPage - 1) * tableRecordsPerPage) + 1}</span> to{' '}
                      <span className="font-semibold">{Math.min(tableCurrentPage * tableRecordsPerPage, filteredRecords.length)}</span> of{' '}
                      <span className="font-semibold">{filteredRecords.length}</span> results
                      {searchTerm && (
                        <span className="text-gray-500"> (filtered from {selectedBatch.records.length} total)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setTableCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={tableCurrentPage === 1}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl">
                        {tableCurrentPage} of {Math.ceil(filteredRecords.length / tableRecordsPerPage)}
                      </span>
                      <button
                        onClick={() => setTableCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredRecords.length / tableRecordsPerPage)))}
                        disabled={tableCurrentPage === Math.ceil(filteredRecords.length / tableRecordsPerPage)}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
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
    </div>
  );
};

export default PanKyc;

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  LinkIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Batch {
  _id: string;
  totalRecords: number;
  pendingRecords: number;
  linkedRecords: number;
  notLinkedRecords: number;
  createdAt: string;
  updatedAt: string;
}

interface BatchDetail {
  batchId: string;
  records: any[];
  stats: {
    total: number;
    pending: number;
    linked: number;
    'not-linked': number;
  };
}

interface Record {
  _id: string;
  aadhaarNumber: string;
  panNumber: string;
  name: string;
  status: string;
  verificationDetails?: any;
  processedAt?: string;
  processingTime?: number;
}

const AadhaarPan: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 3;
  const [newlyUploadedBatchId, setNewlyUploadedBatchId] = useState<string | null>(null);
  const batchDetailsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Enhanced features from PAN KYC
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);
  const [verifyingRecords, setVerifyingRecords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTablePage, setCurrentTablePage] = useState(1);
  const recordsPerPage = 10;
  
  // Tab UI state
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
  
  // Single verification form state
  const [singleVerificationForm, setSingleVerificationForm] = useState({
    aadhaarNumber: '',
    panNumber: '',
    name: ''
  });
  const [singleVerificationVerifying, setSingleVerificationVerifying] = useState(false);
  const [singleVerificationResult, setSingleVerificationResult] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');

  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const showLoader = (message: string) => {
    setLoaderMessage(message);
    setShowFullScreenLoader(true);
  };

  const hideLoader = () => {
    setShowFullScreenLoader(false);
    setLoaderMessage('');
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Reset to first page when batches change
  useEffect(() => {
    setCurrentPage(1);
  }, [batches.length]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      showLoader('Loading Aadhaar-PAN records...');
      
      // Ensure minimum loading time for better UX
      const [response] = await Promise.all([
        api.get('/aadhaar-pan/batches'),
        new Promise(resolve => setTimeout(resolve, 800)) // Minimum 800ms loading time
      ]);
      
      console.log('Aadhaar-PAN batches response:', response.data);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      showToast({
        type: 'error',
        message: 'Failed to fetch batches'
      });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/aadhaar-pan/batch/${batchId}`);
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
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({
        type: 'error',
        message: 'Please select a file'
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await api.post('/aadhaar-pan/upload', formData, {
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
        message: 'File uploaded successfully!'
      });
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Reset the file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Store the newly uploaded batch ID
      if (response.data.data && response.data.data.batchId) {
        setNewlyUploadedBatchId(response.data.data.batchId);
      }
      
      // Refresh batches list
      await fetchBatches();
      
      // Auto-select the newly uploaded batch
      if (response.data.data && response.data.data.batchId) {
        await fetchBatchDetails(response.data.data.batchId);
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

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/aadhaar-pan/batch/${batchId}`);
      showToast({
        type: 'success',
        message: 'Batch deleted successfully'
      });
      
      // Refresh batches list
      await fetchBatches();
      
      // Clear selected batch if it was the deleted one
      if (selectedBatch && selectedBatch.batchId === batchId) {
        setSelectedBatch(null);
      }
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete batch'
      });
    }
  };

  const downloadBatchData = (batchId: string, records: any[]) => {
    const csvContent = [
      ['Aadhaar Number', 'PAN Number', 'Name', 'Processed At'],
      ...records.map(record => [
        record.aadhaarNumber || '',
        record.panNumber || '',
        record.name || '',
        record.processedAt ? new Date(record.processedAt).toLocaleString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aadhaar-pan-batch-${batchId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Enhanced features from PAN KYC
  const handleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBatch && selectedBatch.records) {
      if (selectedRecords.size === selectedBatch.records.length) {
        setSelectedRecords(new Set());
      } else {
        setSelectedRecords(new Set(selectedBatch.records.map(record => record._id)));
      }
    }
  };

  const handleVerifySelected = async () => {
    if (selectedRecords.size === 0) {
      showToast({
        type: 'error',
        message: 'Please select at least one record to verify'
      });
      return;
    }
    
    showConfirmation(
      `Are you sure you want to verify ${selectedRecords.size} selected record(s)?`,
      async () => {
        try {
          setVerifying(true);
          setVerifyingRecords(new Set(Array.from(selectedRecords)));
          showLoader(`Verifying ${selectedRecords.size} selected records...`);
          const response = await api.post('/aadhaar-pan/status', {
            recordIds: Array.from(selectedRecords)
          });

          showToast({
            type: 'success',
            message: `Successfully verified ${response.data.data.length} records`
          });
          setSelectedRecords(new Set());
          
          // Refresh batch details
          if (selectedBatch) {
            await fetchBatchDetails(selectedBatch.batchId);
          }
        } catch (error: any) {
          console.error('Error verifying records:', error);
          showToast({
            type: 'error',
            message: error.response?.data?.message || 'Failed to verify records'
          });
        } finally {
          setVerifying(false);
          setVerifyingRecords(new Set());
          hideLoader();
        }
      }
    );
  };

  const handleVerifySingle = async (recordId: string) => {
    showConfirmation(
      'Are you sure you want to verify this record?',
      async () => {
        try {
          setVerifyingRecords(new Set([recordId]));
          const response = await api.post('/aadhaar-pan/status', {
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
        } catch (error: any) {
          console.error('Error verifying record:', error);
          showToast({
            type: 'error',
            message: error.response?.data?.message || 'Failed to verify record'
          });
        } finally {
          setVerifyingRecords(new Set());
        }
      }
    );
  };

  // Single verification form functions
  const handleSingleVerificationFormChange = (field: string, value: string) => {
    setSingleVerificationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSingleVerificationForm = () => {
    const { aadhaarNumber, panNumber, name } = singleVerificationForm;
    
    if (!aadhaarNumber.trim()) {
      showToast({
        type: 'error',
        message: 'Aadhaar Number is required'
      });
      return false;
    }
    
    if (!panNumber.trim()) {
      showToast({
        type: 'error',
        message: 'PAN Number is required'
      });
      return false;
    }
    
    if (!name.trim()) {
      showToast({
        type: 'error',
        message: 'Name is required'
      });
      return false;
    }
    
    // Validate Aadhaar format (12 digits)
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ''))) {
      showToast({
        type: 'error',
        message: 'Aadhaar Number must be 12 digits'
      });
      return false;
    }
    
    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber.toUpperCase())) {
      showToast({
        type: 'error',
        message: 'Invalid PAN number format'
      });
      return false;
    }
    
    return true;
  };

  const handleSingleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSingleVerificationForm()) {
      return;
    }
    
    try {
      setSingleVerificationVerifying(true);
      
      const response = await api.post('/aadhaar-pan/verify-single', {
        aadhaarNumber: singleVerificationForm.aadhaarNumber.replace(/\s/g, ''),
        panNumber: singleVerificationForm.panNumber.toUpperCase(),
        name: singleVerificationForm.name.trim()
      });
      
      setSingleVerificationResult(response.data.data);
      showToast({
        type: 'success',
        message: 'Aadhaar-PAN linking verification completed'
      });
      
    } catch (error: any) {
      console.error('Error in single verification:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to verify Aadhaar-PAN linking'
      });
    } finally {
      setSingleVerificationVerifying(false);
    }
  };

  const resetSingleVerificationForm = () => {
    setSingleVerificationForm({
      aadhaarNumber: '',
      panNumber: '',
      name: ''
    });
    setSingleVerificationResult(null);
  };

  // Utility functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'linked':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'not-linked':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
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
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and paginate records
  const filteredRecords = selectedBatch?.records.filter(record =>
    record.aadhaarNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.panNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const paginatedRecords = filteredRecords.slice(
    (currentTablePage - 1) * recordsPerPage,
    currentTablePage * recordsPerPage
  );

  const totalTablePages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Pagination for batches
  const indexOfLastDocument = currentPage * documentsPerPage;
  const indexOfFirstDocument = indexOfLastDocument - documentsPerPage;
  const currentBatches = batches.slice(indexOfFirstDocument, indexOfLastDocument);
  const totalPages = Math.ceil(batches.length / documentsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="relative z-10 space-y-8 p-6">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-2xl border border-white/20 backdrop-blur-xl relative overflow-hidden">
          {/* Header Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg">Aadhaar-PAN Linking</h1>
            <p className="text-emerald-100 mt-3 text-lg font-medium">
              Upload Excel files and verify Aadhaar-PAN linking in bulk with advanced verification
            </p>
          </div>
                      <button
              onClick={() => window.location.href = '/aadhaar-pan-records'}
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
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border border-white/30'
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
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border border-white/30'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Single Linking</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Upload Tab Content */}
      {activeTab === 'upload' && (
        <>
          {/* File Upload Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
            {/* Card Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-200/30 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">

              {/* File Upload Area */}
              <div className="space-y-6">
                {/* File Input Card */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-dashed border-emerald-200 hover:border-emerald-300 transition-all duration-300">
                  <div className="text-center">
                    <DocumentTextIcon className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <span className="text-lg font-semibold text-emerald-700">
                          {selectedFile ? 'File Selected' : 'Choose Excel File'}
                        </span>
                        <p className="text-sm text-emerald-600">
                          {selectedFile ? selectedFile.name : 'or drag and drop here'}
                        </p>
                        <p className="text-xs text-emerald-500">
                          Supports .xlsx and .xls files
                        </p>
                      </div>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* File Requirements Card */}
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">File Requirements</h3>
                      <div className="text-sm text-blue-800">
                        <span>Must contain columns: </span>
                        <code className="bg-blue-100 px-2 py-1 rounded">aadhaarNumber</code>
                        <span>, </span>
                        <code className="bg-blue-100 px-2 py-1 rounded">panNumber</code>
                        <span>, </span>
                        <code className="bg-blue-100 px-2 py-1 rounded">name</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                          <DocumentTextIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-900">{selectedFile.name}</h3>
                          <p className="text-sm text-green-700">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-xl transition-colors duration-200"
                        title="Clear file"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                        <span className="text-sm font-medium text-gray-900">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="text-center">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Processing Upload...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-6 w-6 mr-3" />
                        {selectedFile ? 'Upload & Process File' : 'Select File First'}
                      </>
                    )}
                  </button>
                  {!selectedFile && (
                    <p className="text-sm text-gray-500 mt-3">
                      Please select a file to enable upload
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Batches List */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
            {/* Card Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-gray-50/50"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-200/30 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl mr-3 shadow-lg">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Uploaded Documents</h2>
              </div>
            
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading batches...</p>
                  </div>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <DocumentTextIcon className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Documents Yet</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Upload your first Excel file to get started with Aadhaar-PAN linking verification.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentBatches.map((batch) => (
                    <div
                      key={batch._id}
                      className={`bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 ${
                        selectedBatch?.batchId === batch._id
                          ? 'border-emerald-500 bg-emerald-50/30 shadow-emerald-100'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => fetchBatchDetails(batch._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            selectedBatch?.batchId === batch._id ? 'bg-emerald-500 scale-125' : 'bg-slate-300'
                          }`}></div>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                              <DocumentTextIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">{batch._id}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>{batch.totalRecords} records</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>{formatDate(batch.createdAt)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadBatchData(batch._id, selectedBatch?.records || []);
                            }}
                            className="p-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200"
                            title="Download batch data"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBatch(batch._id);
                            }}
                            className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Delete batch"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Enhanced Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 mt-8">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-semibold">{indexOfFirstDocument + 1}</span> to{' '}
                          <span className="font-semibold">{Math.min(indexOfLastDocument, batches.length)}</span> of{' '}
                          <span className="font-semibold">{batches.length}</span> documents
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl">
                            {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
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
            </div>
          </div>

          {/* Batch Details */}
          {selectedBatch && (
            <div className="card" ref={batchDetailsRef}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Batch Details: {selectedBatch.batchId}
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => downloadBatchData(selectedBatch.batchId, selectedBatch.records)}
                    className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transform hover:scale-105 transition-all duration-300 border border-emerald-400/20 hover:border-emerald-300/40"
                  >
                    <div className="relative">
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:translate-y-0.5" />
                      <div className="absolute inset-0 w-5 h-5 bg-white/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
                    </div>
                    <span className="relative z-10">Download Data</span>
                    <div className="ml-2 w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                  </button>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedBatch.stats.total}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedBatch.stats.pending}</div>
                  <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedBatch.stats.linked}</div>
                  <div className="text-sm text-gray-500">Linked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedBatch.stats['not-linked']}</div>
                  <div className="text-sm text-gray-500">Not Linked</div>
                </div>
              </div>

              {/* Enhanced Table Controls */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedRecords.size === selectedBatch.records.length && selectedBatch.records.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-white focus:ring-green-500"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedRecords.size} of {selectedBatch.records.length} selected
                      </span>
                    </div>
                    {selectedRecords.size > 0 && (
                      <button
                        onClick={handleVerifySelected}
                        disabled={verifying}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Verify Selected ({selectedRecords.size})
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
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Records Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                            <span>Select</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                            <span>Aadhaar Number</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                            <span>PAN Number</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                            <span>Name</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                            <span>Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedRecords.map((record) => (
                        <tr key={record._id} className={`hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 ${record.status === 'linked' ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(record.status === 'pending' || record.status === 'not-linked') && (
                              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRecords.has(record._id)}
                                  onChange={() => handleRecordSelection(record._id)}
                                  className="w-4 h-4 rounded border-gray-300 text-white focus:ring-green-500"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                              {record.aadhaarNumber}
                            </div>
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
                            {record.status === 'pending' ? (
                              <button
                                onClick={() => handleVerifySingle(record._id)}
                                disabled={verifyingRecords.has(record._id)}
                                className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {verifyingRecords.has(record._id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                    Verifying...
                                  </>
                                ) : (
                                  'Verify'
                                )}
                              </button>
                            ) : record.status === 'not-linked' ? (
                              <button
                                onClick={() => handleVerifySingle(record._id)}
                                disabled={verifyingRecords.has(record._id)}
                                className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium rounded-xl shadow-md hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {verifyingRecords.has(record._id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                    Re-verifying...
                                  </>
                                ) : (
                                  'Re-verify'
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl">
                                <CheckIcon className="h-4 w-4 mr-2" />
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
              {totalTablePages > 1 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{((currentTablePage - 1) * recordsPerPage) + 1}</span> to{' '}
                      <span className="font-semibold">{Math.min(currentTablePage * recordsPerPage, filteredRecords.length)}</span> of{' '}
                      <span className="font-semibold">{filteredRecords.length}</span> records
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setCurrentTablePage(currentTablePage - 1)}
                        disabled={currentTablePage === 1}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl">
                        {currentTablePage} of {totalTablePages}
                      </span>
                      <button
                        onClick={() => setCurrentTablePage(currentTablePage + 1)}
                        disabled={currentTablePage === totalTablePages}
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

      {/* Single Linking Tab Content */}
      {activeTab === 'single' && (
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Single Aadhaar-PAN Linking Verification</h2>

          <div className="max-w-2xl">
            <form onSubmit={handleSingleVerificationSubmit} className="space-y-6">
              <div>
                <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number *
                </label>
                <input
                  type="text"
                  id="aadhaarNumber"
                  value={singleVerificationForm.aadhaarNumber}
                  onChange={(e) => handleSingleVerificationFormChange('aadhaarNumber', e.target.value)}
                  placeholder="e.g., 123456789012"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  maxLength={12}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter 12-digit Aadhaar number
                </p>
              </div>

              <div>
                <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number *
                </label>
                <input
                  type="text"
                  id="panNumber"
                  value={singleVerificationForm.panNumber}
                  onChange={(e) => handleSingleVerificationFormChange('panNumber', e.target.value)}
                  placeholder="e.g., ABCDE1234F"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                  value={singleVerificationForm.name}
                  onChange={(e) => handleSingleVerificationFormChange('name', e.target.value)}
                  placeholder="Enter full name as per Aadhaar"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  disabled={singleVerificationVerifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {singleVerificationVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Verify Linking
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSingleVerificationForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Reset Form
                </button>
              </div>
            </form>

            {/* Single Verification Result */}
            {singleVerificationResult && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Result</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Aadhaar Number</p>
                    <p className="text-sm text-gray-900">{singleVerificationResult.aadhaarNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">PAN Number</p>
                    <p className="text-sm text-gray-900">{singleVerificationResult.panNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{singleVerificationResult.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="flex items-center">
                      {getStatusIcon(singleVerificationResult.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(singleVerificationResult.status)}`}>
                        {singleVerificationResult.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processing Time</p>
                    <p className="text-sm text-gray-900">{singleVerificationResult.processingTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processed At</p>
                    <p className="text-sm text-gray-900">
                      {singleVerificationResult.processedAt ? new Date(singleVerificationResult.processedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                {singleVerificationResult.verificationDetails && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Verification Details</p>
                    <div className="bg-white p-4 rounded border">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                        {JSON.stringify(singleVerificationResult.verificationDetails, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Beautiful Confirmation Modal */}
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">Confirm Action</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 text-center leading-relaxed">
                {confirmMessage}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 rounded-b-2xl p-6 flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transform hover:scale-105"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Beautiful Full-Screen Loader */}
      {showFullScreenLoader && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
            {/* Loader Content */}
            <div className="text-center">
              {/* Animated Spinner */}
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400 mx-auto"></div>
              </div>
              
              {/* Loading Message */}
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing...</h3>
              <p className="text-gray-600 leading-relaxed">
                {loaderMessage}
              </p>
              
              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
};

export default AadhaarPan;

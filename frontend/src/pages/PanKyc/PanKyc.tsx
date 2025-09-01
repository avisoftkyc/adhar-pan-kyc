import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
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
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 5;
  const [newlyUploadedBatchId, setNewlyUploadedBatchId] = useState<string | null>(null);
  const batchDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  // Reset to first page when batches change
  useEffect(() => {
    setCurrentPage(1);
  }, [batches.length]);

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pan-kyc/batches');
      setBatches(response.data.data);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError('Failed to fetch batches');
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
      setError('Failed to fetch batch details');
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
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      console.log('File set successfully:', file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

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

      setSuccess(`Successfully uploaded ${response.data.data.recordCount} records`);
      setSelectedFile(null);
      setUploadProgress(0);
      
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
      setError(error.response?.data?.message || 'Failed to upload file');
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
      setError('Failed to download report');
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
      const pendingRecordIds = selectedBatch.records
        .filter(record => record.status === 'pending')
        .map(record => record._id);
      
      setSelectedRecords(prev => 
        prev.length === pendingRecordIds.length ? [] : pendingRecordIds
      );
    }
  };

  const handleVerifySelected = async () => {
    if (selectedRecords.length === 0) {
      setError('Please select records to verify');
      return;
    }

    try {
      setVerifying(true);
      const response = await api.post('/pan-kyc/verify', {
        recordIds: selectedRecords
      });
      
      setSuccess(`Successfully verified ${selectedRecords.length} records`);
      setSelectedRecords([]);
      
      // Refresh batch details
      if (selectedBatch) {
        await fetchBatchDetails(selectedBatch.batchId);
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error verifying records:', error);
      setError('Failed to verify selected records');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifySingle = async (recordId: string) => {
    try {
      setVerifying(true);
      const response = await api.post('/pan-kyc/verify', {
        recordIds: [recordId]
      });
      
      setSuccess('Record verified successfully');
      
      // Refresh batch details
      if (selectedBatch) {
        await fetchBatchDetails(selectedBatch.batchId);
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error verifying record:', error);
      setError('Failed to verify record');
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/pan-kyc/batch/${batchId}`);
      
      setSuccess(`Successfully deleted batch with ${response.data.data.deletedRecords} records`);
      
      // Clear selected batch if it was the one deleted
      if (selectedBatch && selectedBatch.batchId === batchId) {
        setSelectedBatch(null);
        setSelectedRecords([]); // Clear selected records
      }
      
      // Refresh batches list
      await fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      setError('Failed to delete batch');
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold">PAN KYC Verification</h1>
        <p className="text-blue-100 mt-1">
          Upload Excel files and verify PAN details in bulk
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

      {/* File Upload Section */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload PAN KYC Data</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File (.xlsx, .xls)
            </label>
            <input
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
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-sm text-blue-700">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
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



          {/* Selection Controls */}
          {selectedBatch.records.some(record => record.status === 'pending') && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBatch.records.filter(r => r.status === 'pending').length === selectedRecords.length && selectedRecords.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Select All Pending</span>
                </label>
                {selectedRecords.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedRecords.length} record(s) selected
                  </span>
                )}
              </div>
              
              {selectedRecords.length > 0 && (
                <button
                  onClick={handleVerifySelected}
                  disabled={verifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedBatch.records.filter(r => r.status === 'pending').length === selectedRecords.length && selectedRecords.length > 0}
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedBatch.records.map((record, index) => (
                  <tr key={record._id || index} className={selectedRecords.includes(record._id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.status === 'pending' && (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.status === 'pending' && (
                        <button
                          onClick={() => handleVerifySingle(record._id)}
                          disabled={verifying}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {verifying ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                      {record.status === 'verified' && (
                        <div className="text-green-600 text-xs">
                          ✓ Verified
                        </div>
                      )}
                      {record.status === 'rejected' && (
                        <div className="text-red-600 text-xs">
                          ✗ Rejected
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanKyc;

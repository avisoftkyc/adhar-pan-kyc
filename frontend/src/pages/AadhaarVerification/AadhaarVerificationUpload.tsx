import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  CloudArrowUpIcon, 
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  TableCellsIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UploadStep {
  step: 'upload' | 'processing' | 'success' | 'error';
  data?: any;
}

const AadhaarVerificationUpload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState<UploadStep>({ step: 'upload' });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setCurrentStep({ step: 'processing' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/aadhaar-verification/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep({ step: 'success', data: data.data });
        toast.success(`Successfully uploaded ${data.data.totalRecords} records`);
      } else {
        setCurrentStep({ step: 'error', data: { message: data.message } });
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setCurrentStep({ step: 'error', data: { message: 'Failed to upload file. Please try again.' } });
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to initial state
  const resetUpload = () => {
    setCurrentStep({ step: 'upload' });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download sample file
  const downloadSampleFile = () => {
    // Create sample data with proper typing
    const sampleData: Record<string, string>[] = [
      {
        'Aadhaar Number': '123456789012',
        'Name': 'John Doe',
        'Date of Birth': '15/08/1985',
        'Gender': 'M',
        'Address': '123 Main Street, City',
        'Pin Code': '110001',
        'State': 'Delhi',
        'District': 'New Delhi'
      },
      {
        'Aadhaar Number': '987654321098',
        'Name': 'Jane Smith',
        'Date of Birth': '22/03/1990',
        'Gender': 'F',
        'Address': '456 Oak Avenue, Town',
        'Pin Code': '400001',
        'State': 'Maharashtra',
        'District': 'Mumbai'
      }
    ];

    // Convert to CSV
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_aadhaar_verification.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Aadhaar Verification File</h1>
          <p className="text-gray-600 mb-4">Upload an Excel file with Aadhaar details for batch verification</p>
          
          {/* Navigation Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/aadhaar-verification')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Verification
            </button>
            <button
              onClick={() => navigate('/aadhaar-verification-records')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <TableCellsIcon className="w-4 h-4 mr-2" />
              View Records
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Main Upload Area */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Step 1: Upload */}
              {currentStep.step === 'upload' && (
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upload Excel File</h2>
                  
                  {/* File Format Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 mb-2">Required File Format</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• File format: Excel (.xlsx or .xls)</p>
                      <p>• Maximum file size: 10MB</p>
                      <p>• Required columns: Aadhaar Number, Name, Date of Birth</p>
                      <p>• Optional columns: Gender, Address, Pin Code, State, District</p>
                    </div>
                    <button
                      onClick={downloadSampleFile}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Download sample file
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50'
                          : selectedFile
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="space-y-4">
                          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
                          <div>
                            <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto" />
                          <div>
                            <p className="text-lg font-medium text-gray-900">
                              Drop your Excel file here, or{' '}
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                browse
                              </button>
                            </p>
                            <p className="text-sm text-gray-500">
                              Supports .xlsx and .xls files up to 10MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <button
                      type="submit"
                      disabled={!selectedFile || isLoading}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                          Uploading...
                        </div>
                      ) : (
                        'Upload File'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: Processing */}
              {currentStep.step === 'processing' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <ArrowPathIcon className="w-16 h-16 text-blue-500 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Processing File</h2>
                  <p className="text-gray-600 mb-6">
                    Please wait while we process your file and extract the Aadhaar details...
                  </p>
                </div>
              )}

              {/* Step 3: Success */}
              {currentStep.step === 'success' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <CheckCircleIcon className="w-16 h-16 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upload Successful!</h2>
                  <p className="text-gray-600 mb-6">
                    Your file has been processed successfully.
                  </p>
                  
                  {currentStep.data && (
                    <div className="bg-green-50 rounded-lg p-6 mb-6 text-left">
                      <h3 className="font-medium text-green-800 mb-3">Upload Summary:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">Batch ID:</span>
                          <span className="font-mono text-xs">{currentStep.data.batchId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Total Records:</span>
                          <span>{currentStep.data.totalRecords}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Total Rows:</span>
                          <span>{currentStep.data.totalRows}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Skipped Rows:</span>
                          <span>{currentStep.data.skippedRows}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">File Name:</span>
                          <span>{currentStep.data.batchName}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-4 justify-center">
                    <button
                      onClick={resetUpload}
                      className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={() => navigate('/aadhaar-verification-records')}
                      className="bg-gray-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      View Records
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Error */}
              {currentStep.step === 'error' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <XCircleIcon className="w-16 h-16 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upload Failed</h2>
                  <p className="text-gray-600 mb-6">
                    {currentStep.data?.message || 'An error occurred during upload.'}
                  </p>
                  
                  <button
                    onClick={resetUpload}
                    className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AadhaarVerificationUpload;

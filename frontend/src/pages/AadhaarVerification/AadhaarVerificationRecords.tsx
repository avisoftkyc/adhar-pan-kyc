import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  IdentificationIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface VerificationRecord {
  _id: string;
  batchId: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  aadhaarNumber: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  pinCode?: string;
  state?: string;
  district?: string;
  careOf?: string;
  photo?: string;
  verificationDetails?: {
    apiResponse?: any;
    verificationDate?: string;
    remarks?: string;
    source?: string;
    confidence?: number;
    dataMatch?: boolean;
    nameMatch?: boolean;
    dobMatch?: boolean;
    genderMatch?: boolean;
    addressMatch?: boolean;
    transactionId?: string;
    fullAddress?: string;
    careOf?: string;
    photo?: string;
    emailHash?: string;
    mobileHash?: string;
    yearOfBirth?: string;
    shareCode?: string;
  };
  processingTime?: number;
  errorMessage?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const AadhaarVerificationRecords: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load verification records
  const loadRecords = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/aadhaar-verification/records`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRecords(data.data);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalRecords: data.data.length,
          hasNext: false,
          hasPrev: false
        });
      } else {
        toast.error(data.message || 'Failed to load verification records');
      }
    } catch (error) {
      console.error('Error loading verification records:', error);
      toast.error('Failed to load verification records');
    } finally {
      setIsLoading(false);
    }
  };

  // Load records on component mount
  useEffect(() => {
    loadRecords();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'otp_sent':
        return <ExclamationTriangleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'otp_sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      case 'otp_sent':
        return 'OTP Sent';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const handlePageChange = (page: number) => {
    loadRecords(page);
  };

  const handleViewDetails = (record: VerificationRecord) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
    setShowDetails(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <IdentificationIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aadhaar Verification Records</h1>
          <p className="text-gray-600 mb-4">View your Aadhaar verification history and details</p>
          
          {/* Back to Verification Button */}
          <button
            onClick={() => navigate('/aadhaar-verification')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Verification
          </button>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading verification records...</span>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <IdentificationIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No verification records found</h3>
              <p className="text-gray-500">You haven't performed any Aadhaar verifications yet.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" id="aadhaarTable">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S. No.
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aadhaar Number
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Of Birth
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        District
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Care Of
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Photo
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(pagination.currentPage - 1) * 10 + index + 1}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(record.status)}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {getStatusText(record.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {record.aadhaarNumber ? 
                            record.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 
                            '-'
                          }
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.name || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.gender === 'M' ? 'Male' : record.gender === 'F' ? 'Female' : 'Other'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.dateOfBirth || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.district || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.state || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {record.address || '-'}
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {record.careOf || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.photo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <img 
                                src={`data:image/jpeg;base64,${record.photo}`} 
                                alt="Photo" 
                                className="w-6 h-8 object-cover rounded mr-1"
                              />
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleViewDetails(record)}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {records.map((record, index) => (
                  <div key={record._id} className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">
                        #{(pagination.currentPage - 1) * 10 + index + 1}
                      </span>
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-1 font-medium">{record.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender:</span>
                        <span className="ml-1 font-medium">{record.gender === 'M' ? 'Male' : record.gender === 'F' ? 'Female' : 'Other'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">DOB:</span>
                        <span className="ml-1 font-medium">{record.dateOfBirth || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">State:</span>
                        <span className="ml-1 font-medium">{record.state || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Care Of:</span>
                        <span className="ml-1 font-medium">{record.careOf || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Photo:</span>
                        <span className="ml-1 font-medium">
                          {record.photo ? (
                            <span className="inline-flex items-center text-green-600">
                              <img 
                                src={`data:image/jpeg;base64,${record.photo}`} 
                                alt="Photo" 
                                className="w-4 h-6 object-cover rounded mr-1"
                              />
                              Available
                            </span>
                          ) : (
                            'Not Available'
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>Date: {formatDate(record.createdAt)}</span>
                      </div>
                      {record.aadhaarNumber && (
                        <div>
                          <span className="text-gray-500">Aadhaar:</span>
                          <span className="ml-1 font-mono">
                            {record.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                          </span>
                        </div>
                      )}
                      <div className="pt-2">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                        <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalRecords} total records)
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Record Details Modal */}
        {showDetails && selectedRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Verification Details</h3>
                  <button
                    onClick={handleCloseDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Status and Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 flex items-center">
                        {getStatusIcon(selectedRecord.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRecord.status)}`}>
                          {getStatusText(selectedRecord.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRecord.createdAt)}</p>
                    </div>
                    
                    {selectedRecord.processedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Processed At</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRecord.processedAt)}</p>
                      </div>
                    )}
                    
                    {selectedRecord.processingTime && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Processing Time</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.processingTime}ms</p>
                      </div>
                    )}
                    
                  </div>

                  {/* Aadhaar Information */}
                  <div className="border-t pt-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Aadhaar Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">
                          {selectedRecord.aadhaarNumber ? 
                            selectedRecord.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 
                            '-'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.name || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.gender === 'M' ? 'Male' : selectedRecord.gender === 'F' ? 'Female' : 'Other'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.dateOfBirth || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">District</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.district || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.state || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pin Code</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.pinCode || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.address || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Care Of</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedRecord.careOf || '-'}</p>
                      </div>
                      {selectedRecord.photo && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Photo</label>
                          <div className="mt-1">
                            <img 
                              src={`data:image/jpeg;base64,${selectedRecord.photo}`} 
                              alt="Aadhaar Photo" 
                              className="w-24 h-32 object-cover border rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Details */}
                  {selectedRecord.verificationDetails && (
                    <div className="border-t pt-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Verification Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedRecord.verificationDetails.source && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Source</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRecord.verificationDetails.source}</p>
                          </div>
                        )}
                        {selectedRecord.verificationDetails.confidence && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Confidence</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRecord.verificationDetails.confidence}%</p>
                          </div>
                        )}
                        {selectedRecord.verificationDetails.dataMatch !== undefined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Data Match</label>
                            <div className="mt-1 flex items-center">
                              {selectedRecord.verificationDetails.dataMatch ? (
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircleIcon className="w-4 h-4 text-red-500" />
                              )}
                              <span className="ml-1 text-sm text-gray-900">
                                {selectedRecord.verificationDetails.dataMatch ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        )}
                        {selectedRecord.verificationDetails.remarks && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Remarks</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRecord.verificationDetails.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleCloseDetails}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AadhaarVerificationRecords;

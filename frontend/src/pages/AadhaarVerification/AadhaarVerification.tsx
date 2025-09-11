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
  DocumentTextIcon,
  CloudArrowUpIcon,
  TableCellsIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface VerificationStep {
  step: 'enter-details' | 'success' | 'error';
  data?: any;
}

const AadhaarVerification: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<VerificationStep>({ step: 'enter-details' });
  const [isLoading, setIsLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('M');
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');

  // Validate Aadhaar number format
  const validateAadhaarNumber = (number: string) => {
    const cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
    return /^\d{12}$/.test(cleaned);
  };

  // Format Aadhaar number for display
  const formatAadhaarNumber = (number: string) => {
    const cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAadhaarNumber(aadhaarNumber)) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter the name');
      return;
    }

    if (!dateOfBirth.trim()) {
      toast.error('Please enter the date of birth');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/aadhaar-verification/verify-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          aadhaarNumber: aadhaarNumber.replace(/\s+/g, '').replace(/-/g, ''),
          name: name.trim(),
          dateOfBirth: dateOfBirth.trim(),
          gender: gender
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep({ step: 'success', data: data.data });
        toast.success('Aadhaar verification completed successfully!');
      } else {
        setCurrentStep({ step: 'error', data: { message: data.message } });
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying Aadhaar:', error);
      setCurrentStep({ step: 'error', data: { message: 'Failed to verify Aadhaar. Please try again.' } });
      toast.error('Failed to verify Aadhaar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to initial state
  const resetVerification = () => {
    setCurrentStep({ step: 'enter-details' });
    setAadhaarNumber('');
    setName('');
    setDateOfBirth('');
    setGender('M');
    setAddress('');
    setPinCode('');
    setState('');
    setDistrict('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <IdentificationIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aadhaar Verification</h1>
          <p className="text-gray-600 mb-4">Verify Aadhaar details using Sandbox API</p>
          
          {/* Navigation Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/aadhaar-verification-records')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              View Records
            </button>
            <button
              onClick={() => navigate('/aadhaar-verification-upload')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Upload File
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Main Verification Area */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Step 1: Enter Details */}
              {currentStep.step === 'enter-details' && (
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Enter Aadhaar Details</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Aadhaar Number *
                      </label>
                      <input
                        type="text"
                        id="aadhaarNumber"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="1234 5678 9012"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        maxLength={12}
                        required
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Enter your 12-digit Aadhaar number
                      </p>
                    </div>

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name as per Aadhaar *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="text"
                        id="dateOfBirth"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        required
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Format: DD/MM/YYYY (e.g., 15/08/1985)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                        Address (Optional)
                      </label>
                      <textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter full address"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-2">
                          Pin Code
                        </label>
                        <input
                          type="text"
                          id="pinCode"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="110001"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="Delhi"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
                          District
                        </label>
                        <input
                          type="text"
                          id="district"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="New Delhi"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !validateAadhaarNumber(aadhaarNumber) || !name.trim() || !dateOfBirth.trim()}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                          Verifying...
                        </div>
                      ) : (
                        'Verify Aadhaar'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: Success */}
              {currentStep.step === 'success' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <CheckCircleIcon className="w-16 h-16 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verification Successful!</h2>
                  <p className="text-gray-600 mb-6">
                    Your Aadhaar details have been successfully verified.
                  </p>
                  
                  {currentStep.data && (
                    <div className="bg-green-50 rounded-lg p-6 mb-6 text-left">
                      <h3 className="font-medium text-green-800 mb-3">Verification Details:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <IdentificationIcon className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Aadhaar Number:</span>
                          <span className="ml-2 font-mono">{formatAadhaarNumber(currentStep.data.aadhaarNumber)}</span>
                        </div>
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Name:</span>
                          <span className="ml-2">{currentStep.data.name}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Date of Birth:</span>
                          <span className="ml-2">{currentStep.data.dateOfBirth}</span>
                        </div>
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Gender:</span>
                          <span className="ml-2">{currentStep.data.gender === 'M' ? 'Male' : currentStep.data.gender === 'F' ? 'Female' : 'Other'}</span>
                        </div>
                        {currentStep.data.verificationDetails && (
                          <>
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />
                              <span className="font-medium">Status:</span>
                              <span className="ml-2 capitalize">{currentStep.data.status}</span>
                            </div>
                            <div className="flex items-center">
                              <ClockIcon className="w-4 h-4 mr-2 text-green-600" />
                              <span className="font-medium">Processing Time:</span>
                              <span className="ml-2">{currentStep.data.processingTime}ms</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-4 justify-center">
                    <button
                      onClick={resetVerification}
                      className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Verify Another
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

              {/* Step 3: Error */}
              {currentStep.step === 'error' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <XCircleIcon className="w-16 h-16 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verification Failed</h2>
                  <p className="text-gray-600 mb-6">
                    {currentStep.data?.message || 'An error occurred during verification.'}
                  </p>
                  
                  <button
                    onClick={resetVerification}
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

export default AadhaarVerification;
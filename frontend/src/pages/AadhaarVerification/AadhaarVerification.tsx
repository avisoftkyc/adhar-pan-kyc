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
  step: 'enter-details' | 'otp-verification' | 'success' | 'error';
  data?: any;
}

const AadhaarVerification: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<VerificationStep>({ step: 'enter-details' });
  const [isLoading, setIsLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [location, setLocation] = useState('');
  const [dummyField1, setDummyField1] = useState('');
  const [dummyField2, setDummyField2] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [otp, setOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer effect for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendCooldown]);

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

    if (!location.trim()) {
      toast.error('Please enter the location');
      return;
    }

    if (!consentAccepted) {
      toast.error('Please accept the consent to proceed');
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
          location: location.trim(),
          dummyField1: dummyField1.trim(),
          dummyField2: dummyField2.trim(),
          consentAccepted: consentAccepted
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.otpSent) {
          setTransactionId(data.data.transactionId);
          setCurrentStep({ step: 'otp-verification', data: data.data });
          setResendCooldown(30); // Start 30-second countdown
          setCanResend(false);
          toast.success('OTP sent successfully! Please check your registered mobile number.');
        } else {
          setCurrentStep({ step: 'success', data: data.data });
          toast.success('Aadhaar verification completed successfully!');
        }
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

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/aadhaar-verification/verify-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
          location: location.trim(),
          dummyField1: dummyField1.trim(),
          dummyField2: dummyField2.trim(),
          consentAccepted: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setTransactionId(data.data.transactionId);
        setResendCooldown(30); // Reset countdown
        setCanResend(false);
        toast.success('OTP resent successfully!');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/aadhaar-verification/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNumber.replace(/\s+/g, '').replace(/-/g, ''),
          otp: otp.trim(),
          transactionId: transactionId
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep({ step: 'success', data: data.data });
        toast.success('Aadhaar verification completed successfully!');
      } else {
        setCurrentStep({ step: 'error', data: { message: data.message } });
        toast.error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setCurrentStep({ step: 'error', data: { message: 'Failed to verify OTP. Please try again.' } });
      toast.error('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to initial state
  const resetVerification = () => {
    setCurrentStep({ step: 'enter-details' });
    setAadhaarNumber('');
    setLocation('');
    setDummyField1('');
    setDummyField2('');
    setConsentAccepted(false);
    setOtp('');
    setTransactionId('');
    setResendCooldown(0);
    setCanResend(false);
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
                    {/* Form Fields in One Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Aadhaar Number Field */}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        maxLength={12}
                        required
                      />
                    </div>

                      {/* Location Field */}
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Enter location"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          required
                        />
                      </div>

                      {/* Dummy Field 1 */}
                      <div>
                        <label htmlFor="dummyField1" className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Info 1
                        </label>
                        <input
                          type="text"
                          id="dummyField1"
                          value={dummyField1}
                          onChange={(e) => setDummyField1(e.target.value)}
                          placeholder="Additional info"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Dummy Field 2 */}
                      <div>
                        <label htmlFor="dummyField2" className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Info 2
                        </label>
                        <input
                          type="text"
                          id="dummyField2"
                          value={dummyField2}
                          onChange={(e) => setDummyField2(e.target.value)}
                          placeholder="Additional info"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                          </div>
                        </div>

                    {/* Consent Checkbox */}
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                          <input
                          id="consent"
                            type="checkbox"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          required
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="consent" className="font-medium text-gray-700">
                          I consent to the verification process *
                          </label>
                        <p className="text-gray-500">
                          By checking this box, I agree to the terms and conditions and consent to the Aadhaar verification process.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !validateAadhaarNumber(aadhaarNumber) || !location.trim() || !consentAccepted}
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

              {/* Step 2: OTP Verification */}
              {currentStep.step === 'otp-verification' && (
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Enter OTP</h2>
                  <p className="text-gray-600 mb-6">
                    We have sent a 6-digit OTP to your registered mobile number. Please enter it below to complete the verification.
                  </p>
                  
                  <form onSubmit={handleOtpVerification} className="space-y-6">
                    <div>
                      <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                        OTP *
                      </label>
                      <input
                        type="text"
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center tracking-widest"
                        maxLength={6}
                        required
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Enter the 6-digit OTP sent to your mobile number
                      </p>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 6}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                          Verifying OTP...
                        </div>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </form>
                  
                  <div className="mt-6 text-center space-y-3">
                    <button
                      onClick={() => setCurrentStep({ step: 'enter-details' })}
                      className="text-blue-600 hover:text-blue-800 text-sm underline block"
                    >
                      Back to form
                    </button>
                    
                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-600 mb-2">
                        Didn't receive the OTP?
                      </p>
                      <button
                        onClick={handleResendOtp}
                        disabled={!canResend || isLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          canResend && !isLoading
                            ? 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                            Resending...
                          </div>
                        ) : resendCooldown > 0 ? (
                          `Resend OTP in ${resendCooldown}s`
                        ) : (
                          'Resend OTP'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
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
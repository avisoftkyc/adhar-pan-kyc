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
  TableCellsIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { validateAadhaar, filterAadhaarInput, getValidationStatus } from '../../utils/validation';

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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [otp, setOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [dynamicFields, setDynamicFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Predefined field options
  const fieldOptions = [
    { value: 'empCode', label: 'Emp Code' },
    { value: 'location', label: 'Location' },
    { value: 'branch', label: 'Branch' },
    { value: 'plantName', label: 'Plant Name' },
    { value: 'phoneNo', label: 'Phone No' },
    { value: 'email', label: 'Email' },
    { value: 'otherDetails', label: 'Other Details' }
  ];

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the dropdown button or dropdown content
      if (showFieldDropdown && !target.closest('.dropdown-container')) {
        setShowFieldDropdown(false);
      }
    };

    if (showFieldDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFieldDropdown]);

  // Add dynamic field
  const addDynamicField = (fieldType: string) => {
    console.log('Adding field type:', fieldType);
    const selectedOption = fieldOptions.find(option => option.value === fieldType);
    if (!selectedOption) {
      console.log('Option not found for:', fieldType);
      return;
    }

    // Check if this field type is already added
    const existingField = dynamicFields.find(field => field.label === selectedOption.label);
    if (existingField) {
      toast.error(`${selectedOption.label} field already exists`);
      return;
    }

    const newField = {
      id: `field_${Date.now()}`,
      label: selectedOption.label,
      value: ''
    };
    console.log('Adding new field:', newField);
    setDynamicFields([...dynamicFields, newField]);
    setShowFieldDropdown(false);
  };

  // Remove dynamic field
  const removeDynamicField = (id: string) => {
    setDynamicFields(dynamicFields.filter(field => field.id !== id));
  };

  // Update dynamic field value
  const updateDynamicField = (id: string, value: string) => {
    setDynamicFields(dynamicFields.map(field => 
      field.id === id ? { ...field, value } : field
    ));
  };

  // Get Aadhaar validation status for UI
  const getAadhaarValidationStatus = () => {
    return getValidationStatus(aadhaarNumber, validateAadhaar);
  };

  // Format Aadhaar number for display
  const formatAadhaarNumber = (number: string) => {
    const cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const aadhaarValidation = validateAadhaar(aadhaarNumber);
    if (!aadhaarValidation.isValid) {
      toast.error(aadhaarValidation.message || 'Please enter a valid Aadhaar number');
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://adhar-pan-kyc-1.onrender.com/api' : 'http://localhost:3002/api')}/aadhaar-verification/verify-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          aadhaarNumber: aadhaarNumber.replace(/\s+/g, '').replace(/-/g, ''),
          location: location.trim(),
          dynamicFields: dynamicFields.map(field => ({
            id: field.id,
            value: field.value.trim()
          })),
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
          dynamicFields: dynamicFields.map(field => ({
            id: field.id,
            value: field.value.trim()
          })),
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://adhar-pan-kyc-1.onrender.com/api' : 'http://localhost:3002/api')}/aadhaar-verification/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNumber.replace(/\s+/g, '').replace(/-/g, ''),
          otp: otp.trim(),
          transactionId: transactionId,
          dynamicFields: dynamicFields
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
    setConsentAccepted(false);
    setOtp('');
    setTransactionId('');
    setResendCooldown(0);
    setCanResend(false);
    setDynamicFields([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-visible">
      {/* Subtle Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ overflow: 'visible' }}>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <div className="relative p-4 bg-white rounded-full shadow-2xl border-4 border-white/50 transform group-hover:scale-110 transition-transform duration-300">
                <IdentificationIcon className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 animate-pulse">
            Aadhaar Verification
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            🔐 Secure OTP-based verification with real-time validation and comprehensive data retrieval
          </p>
          
          {/* Navigation Buttons */}
          <div className="flex justify-center space-x-6">
          <button
            onClick={() => navigate('/aadhaar-verification-records')}
              className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <DocumentTextIcon className="w-6 h-6 mr-3 relative z-10" />
              <span className="relative z-10 text-lg">View Records</span>
          </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Main Verification Area */}
          <div>
            <div className="bg-white/95 backdrop-blur-lg border border-white/50 rounded-3xl shadow-2xl p-8 lg:p-12 transform hover:scale-[1.02] transition-transform duration-300" style={{ overflow: 'visible' }}>
              {/* Step 1: Enter Details */}
              {currentStep.step === 'enter-details' && (
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8 text-center">
                    ✨ Enter Aadhaar Details
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ overflow: 'visible' }}>
                      {/* Aadhaar Number Field */}
                      <div className="group">
                        <label htmlFor="aadhaarNumber" className="block text-xs font-bold text-gray-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Aadhaar Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="aadhaarNumber"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(filterAadhaarInput(e.target.value))}
                          placeholder="1234 5678 9012"
                          className={`w-full px-3 py-3 pr-10 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 text-base font-medium transition-all duration-300 group-hover:shadow-lg ${
                            aadhaarNumber.length === 0 
                              ? 'border-gray-200 focus:border-blue-500' 
                              : aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'valid'
                              ? 'border-green-500 focus:border-green-500 bg-green-50'
                              : aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'invalid'
                              ? 'border-red-500 focus:border-red-500 bg-red-50'
                              : 'border-yellow-500 focus:border-yellow-500 bg-yellow-50'
                          }`}
                          maxLength={12}
                          required
                        />
                        {aadhaarNumber.length > 0 && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'valid' ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'invalid' ? (
                              <XCircleIcon className="w-5 h-5 text-red-500" />
                            ) : (
                              <ClockIcon className="w-5 h-5 text-yellow-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-center">
                        {aadhaarNumber.length === 0 ? (
                          <span className="text-gray-500">Enter 12-digit Aadhaar number</span>
                        ) : aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'valid' ? (
                          <span className="text-green-600 font-medium">✓ Valid Aadhaar format</span>
                        ) : aadhaarNumber.length === 12 && getAadhaarValidationStatus().status === 'invalid' ? (
                          <span className="text-red-600 font-medium">✗ Invalid Aadhaar format</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">
                            {aadhaarNumber.length}/12 digits
                          </span>
                        )}
                      </div>
                      </div>

                      {/* Location Field with Plus Icon */}
                      <div className="group">
                        <label htmlFor="location" className="block text-xs font-bold text-gray-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                          Location *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter location"
                            className="flex-1 px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-base font-medium transition-all duration-300 group-hover:border-purple-300 group-hover:shadow-lg"
                            required
                          />
                          <div className="relative dropdown-container">
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Plus button clicked, current state:', showFieldDropdown);
                                setShowFieldDropdown(!showFieldDropdown);
                              }}
                              className={`group flex items-center justify-center px-3 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                                showFieldDropdown 
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                              } text-white`}
                              title="Add additional field"
                            >
                              <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showFieldDropdown && (
                              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999]" 
                                   style={{ 
                                     zIndex: 9999,
                                     position: 'absolute',
                                     top: '100%',
                                     right: '0',
                                     marginTop: '8px'
                                   }}>
                                <div className="py-2">
                                  {/* Dropdown Header */}
                                  <div className="px-4 py-2 border-b border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                      Select to add additional field
                                    </h4>
                                  </div>
                                  {fieldOptions.map((option) => {
                                    const isAlreadyAdded = dynamicFields.some(field => field.label === option.label);
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Dropdown option clicked:', option.value);
                                          addDynamicField(option.value);
                                        }}
                                        disabled={isAlreadyAdded}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200 ${
                                          isAlreadyAdded 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-gray-700 hover:text-indigo-600'
                                        }`}
                                      >
                                        {option.label}
                                        {isAlreadyAdded && <span className="text-xs text-gray-400 ml-2">(Added)</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>


                    {/* Dynamic Fields */}
                    {dynamicFields.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                          Additional Fields ({dynamicFields.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {dynamicFields.map((field, index) => (
                            <div key={field.id} className="group relative">
                              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                                {field.label}
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateDynamicField(field.id, e.target.value)}
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                  className="w-full px-3 py-2 pr-10 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all duration-300 group-hover:border-indigo-300 group-hover:shadow-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeDynamicField(field.id)}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg"
                                  title="Remove field"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                          </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consent Checkbox */}
                    <div className="flex items-start bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-100">
                      <div className="flex items-center h-5">
                          <input
                          id="consent"
                            type="checkbox"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                          required
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="consent" className="font-bold text-gray-700 cursor-pointer">
                          ✅ Aadhaar Consent Declaration *
                          </label>
                        <div className="text-gray-600 mt-1 text-xs space-y-2">
                          <p className="font-semibold">I hereby voluntarily provide my Aadhaar details to {user?.branding?.companyName || 'the Company'} for the purpose of employee verification, statutory compliance, and internal record maintenance.</p>
                          
                          <p className="font-semibold">I confirm and acknowledge that:</p>
                          
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>My Aadhaar information will be used only for official and lawful purposes, including identity verification and compliance with applicable laws.</li>
                            <li>The company shall ensure the confidentiality and security of my Aadhaar details, in accordance with the Aadhaar Act, 2016 and relevant data protection regulations.</li>
                            <li>I am submitting this information willingly and without any coercion or undue pressure.</li>
                            <li>I authorize {user?.branding?.companyName || 'the Company'} to use, store, and process the provided Aadhaar details solely for the purposes stated above.</li>
                            <li>The information I have provided is true and correct to the best of my knowledge.</li>
                          </ul>
                          
                          <p className="font-semibold">I have read and understood the above declaration and provide my consent.</p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !validateAadhaar(aadhaarNumber).isValid || !location.trim() || !consentAccepted}
                      className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      {isLoading ? (
                        <div className="flex items-center justify-center relative z-10">
                          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-base">Sending OTP...</span>
                        </div>
                      ) : (
                        <span className="relative z-10 flex items-center justify-center">
                          <span className="mr-2">🚀</span>
                          Send OTP
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {currentStep.step === 'otp-verification' && (
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-8 text-center">
                    📱 Enter OTP
                  </h2>
                  <p className="text-xl text-gray-600 mb-10 text-center max-w-2xl mx-auto">
                    🔐 We have sent a 6-digit OTP to your registered mobile number. Please enter it below to complete the verification.
                  </p>
                  
                  <form onSubmit={handleOtpVerification} className="space-y-8">
                    <div className="group">
                      <label htmlFor="otp" className="block text-lg font-bold text-gray-700 mb-4 text-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2 inline-block"></span>
                        OTP Code *
                      </label>
                      <input
                        type="text"
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full px-6 py-6 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 text-2xl text-center tracking-widest font-bold transition-all duration-300 group-hover:border-green-300 group-hover:shadow-lg"
                        maxLength={6}
                        required
                      />
                      <p className="mt-4 text-center text-gray-600 font-medium">
                        📲 Enter the 6-digit OTP sent to your mobile number
                      </p>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 6}
                      className="group relative w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-5 px-8 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      {isLoading ? (
                        <div className="flex items-center justify-center relative z-10">
                          <ArrowPathIcon className="w-6 h-6 animate-spin mr-3" />
                          <span className="text-lg">Verifying OTP...</span>
                        </div>
                      ) : (
                        <span className="relative z-10 flex items-center justify-center">
                          <span className="mr-2">✅</span>
                          Verify OTP
                        </span>
                      )}
                    </button>
                  </form>
                  
                  <div className="mt-8 text-center space-y-4">
                      <button
                      onClick={() => setCurrentStep({ step: 'enter-details' })}
                      className="group inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                      >
                      <span className="mr-2">←</span>
                      Back to form
                      </button>
                    
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-2xl border-2 border-yellow-100">
                      <p className="text-lg font-semibold text-gray-700 mb-4 text-center">
                        📱 Didn't receive the OTP?
                      </p>
                      <button
                        onClick={handleResendOtp}
                        disabled={!canResend || isLoading}
                        className={`group relative w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                          canResend && !isLoading
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-500/20'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${!canResend || isLoading ? 'hidden' : ''}`}></div>
                        {isLoading ? (
                          <div className="flex items-center justify-center relative z-10">
                            <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                            <span>Resending...</span>
                          </div>
                        ) : resendCooldown > 0 ? (
                          <span className="relative z-10">⏰ Resend OTP in {resendCooldown}s</span>
                        ) : (
                          <span className="relative z-10 flex items-center justify-center">
                            <span className="mr-2">🔄</span>
                            Resend OTP
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {currentStep.step === 'success' && (
                <div className="text-center">
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-400 rounded-full blur-lg opacity-60 animate-pulse"></div>
                      <div className="relative p-6 bg-white rounded-full shadow-2xl border-4 border-green-100">
                        <CheckCircleIcon className="w-20 h-20 text-green-500" />
                      </div>
                    </div>
                  </div>
                  <h2 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
                    🎉 Verification Successful!
                  </h2>
                  <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    ✅ Your Aadhaar details have been successfully verified and stored securely.
                  </p>
                  
                  {currentStep.data && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 mb-8 border-2 border-green-100 shadow-xl">
                      <h3 className="text-2xl font-bold text-green-800 mb-6 text-center">📋 Verification Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                        <div className="flex items-center bg-white/50 p-3 rounded-xl">
                          <IdentificationIcon className="w-5 h-5 mr-3 text-blue-600" />
                          <span className="font-bold text-gray-700">Aadhaar Number:</span>
                          <span className="ml-2 font-mono text-lg font-bold text-blue-600">{formatAadhaarNumber(currentStep.data.aadhaarNumber)}</span>
                        </div>
                        <div className="flex items-center bg-white/50 p-3 rounded-xl">
                          <UserIcon className="w-5 h-5 mr-3 text-purple-600" />
                          <span className="font-bold text-gray-700">Name:</span>
                          <span className="ml-2 text-lg font-bold text-purple-600">{currentStep.data.name}</span>
                        </div>
                        <div className="flex items-center bg-white/50 p-3 rounded-xl">
                          <CalendarIcon className="w-5 h-5 mr-3 text-green-600" />
                          <span className="font-bold text-gray-700">Date of Birth:</span>
                          <span className="ml-2 text-lg font-bold text-green-600">{currentStep.data.dateOfBirth}</span>
                        </div>
                        <div className="flex items-center bg-white/50 p-3 rounded-xl">
                          <UserIcon className="w-5 h-5 mr-3 text-pink-600" />
                          <span className="font-bold text-gray-700">Gender:</span>
                          <span className="ml-2 text-lg font-bold text-pink-600">{currentStep.data.gender === 'M' ? 'Male' : currentStep.data.gender === 'F' ? 'Female' : 'Other'}</span>
                        </div>
                        {currentStep.data.verificationDetails && (
                          <>
                            <div className="flex items-center bg-white/50 p-3 rounded-xl">
                              <CheckCircleIcon className="w-5 h-5 mr-3 text-green-600" />
                              <span className="font-bold text-gray-700">Status:</span>
                              <span className="ml-2 text-lg font-bold text-green-600 capitalize">{currentStep.data.status}</span>
                            </div>
                            <div className="flex items-center bg-white/50 p-3 rounded-xl">
                              <ClockIcon className="w-5 h-5 mr-3 text-orange-600" />
                              <span className="font-bold text-gray-700">Processing Time:</span>
                              <span className="ml-2 text-lg font-bold text-orange-600">{currentStep.data.processingTime}ms</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
                  <button
                    onClick={resetVerification}
                      className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center">
                        <span className="mr-2">🔄</span>
                        Verify Another
                      </span>
                    </button>
                    <button
                      onClick={() => navigate('/aadhaar-verification-records')}
                      className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center">
                        <span className="mr-2">📋</span>
                        View Records
                      </span>
                  </button>
                  </div>
                </div>
              )}

              {/* Step 3: Error */}
              {currentStep.step === 'error' && (
                <div className="text-center">
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-400 rounded-full blur-lg opacity-60 animate-pulse"></div>
                      <div className="relative p-6 bg-white rounded-full shadow-2xl border-4 border-red-100">
                        <XCircleIcon className="w-20 h-20 text-red-500" />
                      </div>
                    </div>
                  </div>
                  <h2 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-6">
                    ❌ Verification Failed
                  </h2>
                  <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    {currentStep.data?.message || 'An error occurred during verification.'}
                  </p>
                  
                  <button
                    onClick={resetVerification}
                    className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center">
                      <span className="mr-2">🔄</span>
                    Try Again
                    </span>
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
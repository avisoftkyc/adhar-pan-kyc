import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, EnvelopeIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface LoginFormData {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup.string().email('Please enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
}).required();

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { login, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, user]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(''); // Clear any previous errors
    try {
      await login(data.email, data.password);
    } catch (error: any) {
      console.error('Login error:', error);
      // Set user-friendly error message
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black relative overflow-hidden">
      {/* Enhanced Cosmic Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Stars */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-white rounded-full animate-pulse opacity-80 shadow-lg shadow-white/50"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-blue-300 rounded-full animate-pulse opacity-90 shadow-lg shadow-blue-300/50"></div>
        <div className="absolute bottom-32 left-32 w-2.5 h-2.5 bg-purple-300 rounded-full animate-pulse opacity-80 shadow-lg shadow-purple-300/50"></div>
        <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse opacity-70 shadow-lg shadow-cyan-300/50"></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-pink-300 rounded-full animate-pulse opacity-80 shadow-lg shadow-pink-300/50"></div>
        
        {/* Additional Cosmic Elements */}
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse opacity-60 shadow-lg shadow-yellow-200/50"></div>
        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse opacity-70 shadow-lg shadow-emerald-300/50"></div>
        
        {/* Large Nebula Effect */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      {/* Centered Form */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Enhanced Header */}
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-gradient-to-br from-purple-500 via-indigo-500 to-cyan-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-purple-500/30 transform hover:scale-110 transition-transform duration-300">
              <SparklesIcon className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
            <h2 className="mt-8 text-6xl font-black text-white tracking-tight drop-shadow-2xl">
              Welcome back
            </h2>
            <p className="mt-4 text-xl text-purple-100 font-medium drop-shadow-lg">
              Sign in to your KYC Aadhaar System account
            </p>
          </div>

          {/* Enhanced Form Container */}
          <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] p-10 shadow-2xl shadow-purple-500/20 border border-white/50 transform hover:scale-[1.02] transition-all duration-500">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Enhanced Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-3">
                  Email address
                </label>
                <div className="relative group">
                  <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-purple-500 transition-colors duration-300 group-focus-within:text-purple-600" />
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white/90"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-2 ml-1">{errors.email.message}</p>
                )}
              </div>

              {/* Enhanced Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-3">
                  Password
                </label>
                <div className="relative group">
                  <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-purple-500 transition-colors duration-300 group-focus-within:text-purple-600" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="block w-full pl-12 pr-16 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white/90"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors duration-300 p-1 rounded-lg hover:bg-purple-50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-2 ml-1">{errors.password.message}</p>
                )}
              </div>

              {/* Error Message Display */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center group">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-5 w-5 text-purple-600 focus:ring-4 focus:ring-purple-500/20 border-2 border-gray-300 rounded-xl transition-all duration-300 hover:border-purple-400"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">
                    Remember me
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors duration-300 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Magnificent Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-4 px-6 border border-transparent rounded-2xl shadow-2xl shadow-purple-500/30 text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:via-indigo-700 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:opacity-50 transform hover:scale-[1.02] hover:shadow-3xl hover:shadow-purple-500/40 transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Enhanced Footer */}
          <div className="text-center">
            <p className="text-sm text-purple-100 drop-shadow-lg">
              By signing in, you agree to our{' '}
              <a href="#" className="text-purple-200 hover:text-purple-100 font-medium transition-colors duration-300 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-purple-200 hover:text-purple-100 font-medium transition-colors duration-300 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with longer timeout for API calls
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://www.avihridsys.in/api' : 'http://localhost:3002/api'),
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
});

// Retry configuration for connection errors (Render free tier sleep issue)
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

// Helper function to check if error is retryable (connection errors)
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network errors or connection closed errors
    const errorCode = (error as any).code;
    const errorMessage = error.message || '';
    return (
      errorCode === 'ECONNABORTED' || // Timeout errors
      errorCode === 'ECONNRESET' || // Connection reset
      errorCode === 'ETIMEDOUT' || // Timeout
      errorMessage.includes('timeout') || // Timeout message
      errorMessage.includes('ERR_CONNECTION_CLOSED') ||
      errorMessage.includes('Network Error') ||
      errorMessage.includes('ERR_NETWORK')
    );
  }
  return false;
};

// Helper function to get token from storage (same as AuthContext)
const getStoredToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Initialize retry count if not present
    if (!(config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount) {
      (config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount = 0;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to retry on connection errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;
    
    if (!config) {
      return Promise.reject(error);
    }

    const retryCount = config._retryCount || 0;

    // Retry on connection errors
    if (isRetryableError(error) && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      
      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(`🔄 Connection error detected, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(config);
    }

    return Promise.reject(error);
  }
);

// Note: Response interceptor for 401 handling is managed in AuthContext.tsx
// to avoid conflicts and ensure proper token refresh flow

export default api;

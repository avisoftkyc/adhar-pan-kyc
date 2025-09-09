import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  moduleAccess: string[];
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  profile?: {
    phone?: string;
    company?: string;
    designation?: string;
    address?: string;
  };
  branding?: {
    logo?: {
      filename: string;
      originalName: string;
      path: string;
      mimetype: string;
      size: number;
    };
    companyName?: string;
    displayName?: string;
    address?: string;
    gstNumber?: string;
  };
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
    };
    theme: 'light' | 'dark';
  };
  createdAt: string;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshToken: () => Promise<void>;
  refreshUserData: () => Promise<User | undefined>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Helper function to get token from storage
const getStoredToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Initial state
const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  loading: true,
  isAuthenticated: !!getStoredToken(), // Start as true if token exists
};

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_LOADING'; payload: boolean };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredToken();
      console.log('🔍 Initializing auth with token:', token ? 'exists' : 'none');
      
      if (token) {
        try {
          console.log('🔍 Attempting to validate token...');
          dispatch({ type: 'AUTH_START' });
          const response = await api.get('/auth/me', {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          console.log('✅ Token validation successful:', response.data);
          
          // Check if response has data
          if (response.data && response.data.success && response.data.data) {
            console.log('✅ Dispatching AUTH_SUCCESS with user:', response.data.data);
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user: response.data.data, token },
            });
          } else {
            console.error('❌ Invalid response format:', response.data);
            throw new Error('Invalid response format');
          }
        } catch (error) {
          console.error('❌ Token validation failed:', error);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
          dispatch({ type: 'AUTH_FAILURE' });
        }
      } else {
        console.log('🔍 No token found, setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Set loading to false if no token exists
  useEffect(() => {
    if (!state.token && state.loading) {
      console.log('🔍 No token found, setting loading to false');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.token, state.loading]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 Auth state changed:', {
      user: !!state.user,
      token: !!state.token,
      loading: state.loading,
      isAuthenticated: state.isAuthenticated,
      userDetails: state.user ? { id: state.user._id, name: state.user.name, email: state.user.email } : null
    });
  }, [state.user, state.token, state.loading, state.isAuthenticated]);

  // Login function
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await api.post('/auth/login', { email, password, rememberMe });
      const { user, token } = response.data;

      // Store token based on rememberMe preference
      if (rememberMe) {
        localStorage.setItem('token', token);
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Use sessionStorage for temporary sessions
        sessionStorage.setItem('token', token);
        localStorage.removeItem('rememberMe');
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
      });

      toast.success('Login successful!');
      // Redirect admin users to admin panel, others to dashboard
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' });
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
      });

      toast.success('Registration successful! Please check your email for verification.');
      // Redirect admin users to admin panel, others to dashboard
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' });
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  // Refresh current user data
  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data && response.data.success && response.data.data) {
        dispatch({
          type: 'UPDATE_USER',
          payload: response.data.data,
        });
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: state.user!, token },
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  // Set up axios interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            return api(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [state.token]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

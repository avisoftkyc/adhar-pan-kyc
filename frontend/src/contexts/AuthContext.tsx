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
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  isAuthenticated: !!localStorage.getItem('token'), // Set to true if token exists
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
      const token = localStorage.getItem('token');
      console.log('🔍 Initializing auth with token:', token ? 'exists' : 'none');
      
      if (token) {
        try {
          console.log('🔍 Attempting to validate token...');
          dispatch({ type: 'AUTH_START' });
          const response = await api.get('/auth/me');
          console.log('✅ Token validation successful:', response.data);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.data, token },
          });
        } catch (error) {
          console.error('❌ Token validation failed:', error);
          localStorage.removeItem('token');
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
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.token, state.loading]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
      });

      toast.success('Login successful!');
      navigate('/dashboard');
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
      navigate('/dashboard');
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' });
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
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

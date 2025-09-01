import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import VerifyEmail from './pages/Auth/VerifyEmail';
import Dashboard from './pages/Dashboard/Dashboard';
import PanKyc from './pages/PanKyc/PanKyc';
import AadhaarPan from './pages/AadhaarPan/AadhaarPan';
import Profile from './pages/Profile/Profile';
import Admin from './pages/Admin/Admin';
import NotFound from './pages/NotFound/NotFound';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  console.log('🔒 ProtectedRoute state:', { user: !!user, loading, isAuthenticated });

  if (loading) {
    console.log('🔒 ProtectedRoute: Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('🔒 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    console.log('🔒 ProtectedRoute: Role mismatch, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🔒 ProtectedRoute: Access granted');
  return <>{children}</>;
};

// Module Access Route Component
const ModuleRoute: React.FC<{ 
  children: React.ReactNode; 
  module: string;
}> = ({ children, module }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to all modules
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Check if user has access to the specific module
  if (!user.moduleAccess || !user.moduleAccess.includes(module)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Component
const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/pan-kyc" element={
            <ModuleRoute module="pan-kyc">
              <Layout>
                <PanKyc />
              </Layout>
            </ModuleRoute>
          } />

          <Route path="/aadhaar-pan" element={
            <ModuleRoute module="aadhaar-pan">
              <Layout>
                <AadhaarPan />
              </Layout>
            </ModuleRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Admin />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
  );
};

// Root App Component with Providers
const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;

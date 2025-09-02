import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  IdentificationIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);



  // Memoize the logo URL to avoid unnecessary re-renders
  const logoUrl = useMemo(() => {
    if (user?.branding?.logo && user?._id) {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
      const url = `${baseUrl.replace('/api', '')}/api/admin/users/${user._id}/logo`;
      // Add cache busting parameter based on logo filename to ensure fresh image loads
      const cacheBuster = user.branding.logo.filename ? `?v=${user.branding.logo.filename}` : '';
      return `${url}${cacheBuster}`;
    }
    return null;
  }, [user?.branding?.logo, user?._id]);



  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard',
    },
    {
      name: 'PAN KYC',
      href: '/pan-kyc',
      icon: DocumentTextIcon,
      current: location.pathname === '/pan-kyc',
      module: 'pan-kyc',
    },
    {
      name: 'Aadhaar-PAN',
      href: '/aadhaar-pan',
      icon: IdentificationIcon,
      current: location.pathname === '/aadhaar-pan',
      module: 'aadhaar-pan',
    },
    ...(user?.role === 'admin' ? [{
      name: 'Admin',
      href: '/admin',
      icon: Cog6ToothIcon,
      current: location.pathname === '/admin',
    }] : []),
  ];

  const filteredNavigation = navigation.filter(item => {
    if (item.module) {
      return user?.moduleAccess?.includes(item.module);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Sidebar for mobile */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white/90 backdrop-blur-xl shadow-2xl border-r border-white/20">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
            <div className="flex items-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="h-8 w-8 object-contain rounded-xl shadow-lg"
                  onError={(e) => {
                    console.error('Failed to load logo:', logoUrl);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
              )}
              <span className="ml-2 text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {user?.branding?.displayName || user?.branding?.companyName || 'KYC System'}
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50 transition-all duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-2 px-3 py-6">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  item.current
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 shadow-lg border border-blue-200/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800 hover:shadow-md'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                  item.current 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white'
                }`}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                </div>
                {item.name}
              </Link>
            ))}
          </nav>
          
          {/* Mobile Profile Section */}
          <div className="border-t border-white/20 px-3 py-4 bg-gradient-to-r from-slate-50/50 to-blue-50/50">
            <div className="flex items-center px-3 py-3 bg-white/60 rounded-xl backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-slate-800">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Link
                to="/profile"
                className="flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-white/60 hover:text-slate-800 rounded-xl transition-all duration-200"
                onClick={() => setSidebarOpen(false)}
              >
                <UserCircleIcon className="mr-3 h-5 w-5 text-slate-400" />
                Profile
              </Link>

              <button
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 rounded-xl transition-all duration-200"
              >
                <svg className="mr-3 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white/90 backdrop-blur-xl shadow-2xl border-r border-white/20">
          <div className="flex h-16 items-center px-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company Logo"
                className="h-8 w-8 object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  console.error('Failed to load logo:', logoUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">K</span>
              </div>
            )}
            <span className="ml-2 text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {user?.branding?.displayName || user?.branding?.companyName || 'KYC System'}
            </span>
          </div>
          <nav className="flex-1 space-y-2 px-3 py-6">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  item.current
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 shadow-lg border border-blue-200/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800 hover:shadow-md'
                }`}
              >
                <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                  item.current 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white'
                }`}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                </div>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/20 bg-white/80 backdrop-blur-xl px-4 shadow-lg sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>

              {/* Notifications */}
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 relative">
                <BellIcon className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              </button>

              {/* Profile dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-x-3 p-2 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                    {user?.branding?.companyName && (
                      <div className="text-xs text-slate-400">{user.branding.companyName}</div>
                    )}
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                </button>

                {/* Dropdown menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl ring-1 ring-black/5 z-50 border border-white/20 animate-fade-in-up">
                    <div className="py-1">
                      {/* Profile link */}
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-slate-400" />
                        Profile
                      </Link>
                      
                      {/* Logout button */}
                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
                      >
                        <svg className="mr-3 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  UserIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Stats {
  totalRecords: number;
  panKycRecords: number;
  aadhaarPanRecords: number;
  verifiedRecords: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRecords: 0,
    panKycRecords: 0,
    aadhaarPanRecords: 0,
    verifiedRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use dummy data for demonstration
        const newStats = {
          totalRecords: 1250,
          panKycRecords: 750,
          aadhaarPanRecords: 500,
          verifiedRecords: 980
        };

        setStats(newStats);
        
        // Trigger animation after data loads
        setTimeout(() => setAnimateStats(true), 300);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => (
    <span className={`transition-all duration-1000 ease-out ${className}`}>
      {value}
    </span>
  );

  // Chart data
  const totalRecordsData = [
    { name: 'PAN KYC', value: stats.panKycRecords, color: '#3b82f6' },
    { name: 'Aadhaar-PAN', value: stats.aadhaarPanRecords, color: '#10b981' }
  ];

  const panKycData = [
    { name: 'Total Records', value: stats.panKycRecords, color: '#3b82f6' }
  ];

  const aadhaarPanData = [
    { name: 'Total Records', value: stats.aadhaarPanRecords, color: '#10b981' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Loading */}
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-3xl w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-3xl h-32"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-200 rounded-3xl h-64"></div>
              <div className="bg-gray-200 rounded-3xl h-64"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with staggered animation */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight drop-shadow-lg">
            Welcome back, {user?.branding?.displayName || user?.name || 'User'}! 👋
          </h1>
          <p className="mt-2 text-slate-600 font-medium">
            Here's what's happening with your KYC Aadhaar System today
          </p>
        </div>

        {/* Stats Cards with staggered animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Total Records</p>
                <AnimatedNumber 
                  value={stats.totalRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalRecordsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {totalRecordsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {totalRecordsData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PAN KYC Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">PAN KYC Records</p>
                <AnimatedNumber 
                  value={stats.panKycRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={panKycData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {panKycData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {panKycData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aadhaar-PAN Records */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Aadhaar-PAN Records</p>
                <AnimatedNumber 
                  value={stats.aadhaarPanRecords} 
                  className="text-2xl font-bold text-slate-900"
                />
              </div>
            </div>
            {/* Pie Chart */}
            <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aadhaarPanData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {aadhaarPanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 space-y-1">
              {aadhaarPanData.map((item) => (
                <div key={item.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions and Recent Activity with staggered animations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mr-3">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                Upload PAN KYC Document
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                Upload Aadhaar-PAN Document
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 ease-out shadow-lg hover:shadow-xl">
                View All Records
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/30 animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mr-3">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-all duration-200 ease-out cursor-pointer group">
                <div className="p-2 bg-blue-500 rounded-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  <DocumentTextIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">New PAN KYC document uploaded</p>
                  <p className="text-xs text-slate-500">2 minutes ago</p>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 transition-all duration-200 ease-out cursor-pointer group">
                <div className="p-2 bg-green-500 rounded-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  <CheckCircleIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">5 records verified successfully</p>
                  <p className="text-xs text-slate-500">15 minutes ago</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="flex items-center p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 transition-all duration-200 ease-out cursor-pointer group">
                <div className="p-2 bg-orange-500 rounded-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">Aadhaar-PAN linking completed</p>
                  <p className="text-xs text-slate-500">1 hour ago</p>
                </div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

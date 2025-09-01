import React from 'react';

const PanKyc: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">PAN KYC Verification</h1>
        <p className="text-blue-100 mt-1">
          Upload Excel files and verify PAN details in bulk
        </p>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload PAN KYC Data</h2>
        <p className="text-gray-600">PAN KYC verification functionality will be implemented here.</p>
        <p className="text-gray-600 mt-2">Features will include:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Excel file upload (.xlsx, .xls)</li>
          <li>Bulk PAN verification</li>
          <li>Real-time status tracking</li>
          <li>Download verification reports</li>
          <li>Audit logging</li>
        </ul>
      </div>
    </div>
  );
};

export default PanKyc;

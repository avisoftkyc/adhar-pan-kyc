import React from 'react';

const AadhaarPan: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Aadhaar-PAN Linking</h1>
        <p className="text-green-100 mt-1">
          Upload Excel files and check Aadhaar-PAN linking status in bulk
        </p>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Aadhaar-PAN Data</h2>
        <p className="text-gray-600">Aadhaar-PAN linking verification functionality will be implemented here.</p>
        <p className="text-gray-600 mt-2">Features will include:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Excel file upload (.xlsx, .xls)</li>
          <li>Bulk Aadhaar-PAN linking check</li>
          <li>Real-time status tracking</li>
          <li>Download linking status reports</li>
          <li>Audit logging</li>
        </ul>
      </div>
    </div>
  );
};

export default AadhaarPan;

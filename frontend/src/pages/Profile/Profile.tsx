import React from 'react';

const Profile: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">User Profile</h1>
        <p className="text-purple-100 mt-1">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
        <p className="text-gray-600">Profile management functionality will be implemented here.</p>
        <p className="text-gray-600 mt-2">Features will include:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Update personal information</li>
          <li>Change password</li>
          <li>Two-factor authentication</li>
          <li>Notification preferences</li>
          <li>Theme settings</li>
        </ul>
      </div>
    </div>
  );
};

export default Profile;

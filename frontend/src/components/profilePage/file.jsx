// import React from 'react';
import { useAuth } from '../Contexts/auth.jsx';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return <div>Please login</div>;
  return (
    <div className="p-6 bg-white rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold">Profile</h2>
      <div className="mt-4">
        <div><strong>Name:</strong> {user.name}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div className="mt-3 text-sm text-gray-500">Manage API keys and billing in the admin panel.</div>
      </div>
    </div>
  );
}
// import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';

export default function ProfilePage() {
  // const { user, loading, logout } = useAuth();
  const { values: { data, functions } } = useAuth();
  // const user = JSON.parse(localStorage.getItem("user"));
  // console.log(data)

  // if (!user) return <div>Please login</div>;

  return (
    <>
      <div className="p-6 bg-white rounded-lg max-w-2xl mx-auto">
        <Link to="/" onClick={functions.logout} className="text-blue-500 hover:underline">Logout</Link>
      </div>
      <div className="p-6 bg-white rounded-lg max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold">Profile</h2>
        <div className="mt-4">
          <div><strong>Name:</strong> {data.user.name}</div>
          <div><strong>Email:</strong> {data.user.email}</div>
          <div><strong>Role:</strong> {data.user.role}</div>
          <div className="mt-3 text-sm text-gray-500">Manage API keys and billing in the admin panel.</div>
          {/* <p>{user?.name}</p> */}
          {/* <p>{user?.email}</p> */}
        </div>
      </div>
    </>
  );
}
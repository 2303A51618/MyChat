import React, { useState } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../Store/useAuthStore';
import toast from 'react-hot-toast';

const AddFriendModal = ({ onClose, onFriendAdded }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const authFetchFriends = useAuthStore((s) => s.fetchFriends);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return setResults([]);
    setLoading(true);
    try {
  const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
  const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
  setResults(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error('Search users error', err);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (id) => {
    try {
      const res = await axiosInstance.post(`/users/${id}/request`);
      toast.success('Friend request sent');
      authFetchFriends?.();
      if (onFriendAdded) onFriendAdded(res.data || {});
      onClose();
    } catch (err) {
      console.error('Send friend request error', err);
      toast.error(err.response?.data?.message || 'Failed to send request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-60 w-full max-w-md bg-white rounded shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Add a friend</h3>
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            className="flex-1 input input-bordered"
            placeholder="Search by name, email or username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">{loading ? '...' : 'Search'}</button>
        </form>

        <div className="max-h-56 overflow-y-auto">
          {results && results.length > 0 ? (
            results.map((u) => (
              <div key={u._id} className="flex items-center justify-between gap-2 p-2 border-b">
                <div className="flex items-center gap-2">
                  <img src={u.profilePhoto || '/avatar.png'} alt="" className="w-10 h-10 rounded-full" />
                  <div className="text-sm">
                    <div className="font-medium">{u.fullName || u.username || u.email}</div>
                    <div className="text-xs text-gray-500">{u.email || ''}</div>
                  </div>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline" onClick={() => sendRequest(u._id)}>Send Request</button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No user found</div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;

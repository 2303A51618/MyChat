import React, { useEffect } from 'react';
import { useAuthStore } from '../Store/useAuthStore';

const StatusPage = () => {
  const { friends, fetchFriends, onlineUsers } = useAuthStore();

  useEffect(() => { fetchFriends?.(); }, [fetchFriends]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Status / Updates</h2>
      <p className="text-sm text-gray-600 mb-4">See who recently posted a status and who's currently online.</p>

      <div className="grid gap-3">
        {(friends || []).length === 0 && <div className="text-sm text-gray-500">No friends yet</div>}
        {(friends || []).map(f => (
          <div key={f._id} className="p-3 border rounded flex items-center justify-between section-card">
            <div className="flex items-center gap-3">
              <img src={f.profilePhoto || '/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-medium">{f.fullName || f.username}</div>
                <div className="text-xs text-gray-500">{f.email || ''}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              {(onlineUsers || []).includes(f._id) ? <span className="text-green-600 font-semibold">Online</span> : <span className="text-gray-500">Offline</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusPage;

import React, { useEffect } from "react";
import { useAuthStore } from "../Store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const FriendsPage = () => {
  const { friends, pendingReceived, pendingSent, fetchFriends } = useAuthStore();

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const accept = async (id) => {
    try {
      await axiosInstance.post(`/users/${id}/accept`);
      toast.success("Friend request accepted");
      fetchFriends();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const decline = async (id) => {
    try {
      await axiosInstance.post(`/users/${id}/decline`);
      toast.success("Friend request declined");
      fetchFriends();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const removeFriend = async (id) => {
    try {
      await axiosInstance.post(`/users/${id}/remove`);
      toast.success("Friend removed");
      fetchFriends();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Pending Requests</h2>
      {pendingReceived.length === 0 && <p className="text-sm text-gray-500">No pending requests</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {pendingReceived.map(u => (
          <li key={u._id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-3">
              <img src={u.profilePhoto||'/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-semibold">{u.username || u.fullName}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => accept(u._id)} className="btn btn-sm btn-primary">Accept</button>
              <button onClick={() => decline(u._id)} className="btn btn-sm btn-ghost">Decline</button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mt-6">Sent Requests</h2>
      {pendingSent.length === 0 && <p className="text-sm text-gray-500">No sent requests</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {pendingSent.map(u => (
          <li key={u._id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-3">
              <img src={u.profilePhoto||'/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-semibold">{u.username || u.fullName}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
            <div>
              <button className="btn btn-sm btn-ghost" disabled>Requested</button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mt-6">Friends</h2>
      {friends.length === 0 && <p className="text-sm text-gray-500">No friends yet</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {friends.map(u => (
          <li key={u._id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-3">
              <img src={u.profilePhoto||'/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-semibold">{u.username || u.fullName}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
            <div>
              <button onClick={() => removeFriend(u._id)} className="btn btn-sm btn-ghost">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendsPage;

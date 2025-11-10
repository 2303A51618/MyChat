import React, { useState } from "react";
import avatarFor from "../lib/avatar";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../Store/useAuthStore";
import { useChatStore } from "../Store/useChatStore";
import toast from "react-hot-toast";

const UserSearch = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { authUser } = useAuthStore();

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!q || !q.trim()) return setResults([]);
    setLoading(true);
    try {
  const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(q)}`);
  const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
  setResults(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // direct chat: use setSelectedUser to start a conversation

  const { setSelectedUser } = useChatStore();

  return (
    <div className="p-4">
      <form onSubmit={doSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username, name or email"
          className="input input-bordered flex-1"
        />
        <button className={`btn btn-primary ${loading ? 'loading' : ''}`} type="submit">Search</button>
      </form>

      <div className="mt-4">
        {results.length === 0 && <p className="text-sm text-gray-500">No results</p>}
        <ul className="flex flex-col gap-2 mt-2">
          {results.map(u => (
            <li key={u._id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-3">
                <img src={avatarFor(u)} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <div className="font-semibold">{u.username || u.fullName}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </div>
              <div>
                {u._id === authUser?._id ? (
                  <span className="text-sm text-gray-500">You</span>
                ) : (
                  <button onClick={() => setSelectedUser(u)} className="btn btn-sm btn-ghost">Chat</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserSearch;

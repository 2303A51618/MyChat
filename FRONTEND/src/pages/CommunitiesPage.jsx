import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../Store/useAuthStore';

const CommunitiesPage = () => {
  const [groups, setGroups] = useState([
    { id: 1, name: 'React Devs', members: 12, membersList: [] },
    { id: 2, name: 'Project Chat', members: 6, membersList: [] },
  ]);
  const [name, setName] = useState('');
  const [openGroup, setOpenGroup] = useState(null); // group object when opened
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const socket = useAuthStore((s) => s.socket);

  // create group with subtle animation
  const createGroup = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    (async () => {
      try {
        const res = await axiosInstance.post('/groups', { name: name.trim() });
        const created = res.data;
        // normalize and add to list
        setGroups(g => [{ ...created, membersList: [] }, ...g]);
        setName('');
        // open group details
        setTimeout(() => setOpenGroup(created), 180);
      } catch (err) {
        console.error('create group err', err);
        // fallback to local create
        const newG = { id: Date.now(), name: name.trim(), members: 1, membersList: [] };
        setGroups(g => [newG, ...g]);
        setName('');
        setTimeout(() => setOpenGroup(newG), 180);
      }
    })();
  };

  // search users to add to community
  const searchUsers = async (q) => {
    if (!q || q.trim().length < 1) return setSearchResults([]);
    try {
      const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
      const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
      setSearchResults(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error('search users err', err);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQ), 250);
    return () => clearTimeout(t);
  }, [searchQ]);

  // fetch real groups from server on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get('/groups');
        if (!mounted) return;
        // merge server groups with local ones, prefer server objects
        const server = Array.isArray(res.data) ? res.data : (res.data.groups || []);
        setGroups(server.map((g) => ({ ...g, membersList: g.members || [] })));
      } catch (err) {
        console.error('fetch groups err', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // real-time updates via socket
  useEffect(() => {
    if (!socket) return;
    const onGroupCreated = (group) => {
      setGroups(prev => [{ ...group, membersList: group.members || [] }, ...prev.filter(g => String(g._id) !== String(group._id))]);
    };
    const onGroupAdded = (group) => {
      setGroups(prev => prev.map(g => (String(g._id) === String(group._id) ? { ...g, members: group.members.length } : g)));
    };

    try {
      socket.on('group:created', onGroupCreated);
      socket.on('group:added', onGroupAdded);
    } catch (err) {
      console.error('socket group listeners err', err);
    }

    return () => {
      try {
        socket.off('group:created', onGroupCreated);
        socket.off('group:added', onGroupAdded);
      } catch {
        /* ignore cleanup errors */
      }
    };
  }, [socket]);

  const addMemberToGroup = async (groupId, user) => {
    setAdding(true);
    try {
      // prefer server-side add if available
      // groupId can be a number (local-only) or an ObjectId string (_id)
      const idForApi = String(groupId);
      const res = await axiosInstance.post(`/groups/${encodeURIComponent(idForApi)}/members`, { userId: user._id });
      const updatedGroup = res.data;

      // Update local UI: if backend returns members array length, use it; otherwise increment
      setGroups(prev => prev.map(g => {
        if (String(g._id) === String(updatedGroup._id) || String(g.id) === String(updatedGroup._id) || String(g.id) === idForApi) {
          // keep membersList populated locally for UX
          return { ...g, ...{ _id: updatedGroup._id, members: updatedGroup.members ? updatedGroup.members.length : ((g.members||0)+1), membersList: [...(g.membersList||[]), user] } };
        }
        return g;
      }));

      // if openGroup is the same, update it
      setOpenGroup(prev => {
        if (!prev) return prev;
        if (String(prev._id) === String(updatedGroup._id) || String(prev.id) === String(updatedGroup._id) || String(prev.id) === idForApi) {
          return { ...prev, members: updatedGroup.members ? updatedGroup.members.length : ((prev.members||0)+1), membersList: [...(prev.membersList||[]), user] };
        }
        return prev;
      });

      setSearchQ('');
      setSearchResults([]);
    } catch (err) {
      console.error('add member err', err);
      // fallback: local update to avoid blocking UX
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: (g.members||0)+1, membersList: [...(g.membersList||[]), user] } : g));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Communities</h2>
          <p className="text-sm text-gray-500">Create or manage communities. Hover cards for quick actions.</p>
        </div>
        <form onSubmit={createGroup} className="flex gap-2 items-center">
          <input value={name} onChange={(e)=>setName(e.target.value)} className="input input-bordered px-3 py-2 rounded-full shadow-sm" placeholder="New community name" />
          <button className="btn btn-primary transition-transform transform hover:scale-105" type="submit">Create</button>
        </form>
      </div>

      <div className="grid gap-4">
        {groups.map(g => (
          <div key={g.id}
            className="p-4 rounded-lg section-card flex items-center justify-between hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1 hover:scale-[1.01]"
            style={{borderLeftColor: 'rgba(99,102,241,0.12)'}}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg animate-pulse/10">{g.name.charAt(0)}</div>
              <div>
                <div className="font-medium text-lg">{g.name}</div>
                <div className="text-xs text-gray-500">{g.members} members</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setOpenGroup(g)} className="px-3 py-1 rounded-md border border-transparent hover:border-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.18)] transition-all bg-white/20">Open</button>
              <button className="px-3 py-1 rounded-md bg-indigo-600 text-white hover:shadow-[0_0_12px_rgba(99,102,241,0.28)] transition-all">Join</button>
            </div>
          </div>
        ))}
      </div>

      {/* Group details modal (re-uses dashboard look) */}
      {openGroup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpenGroup(null)} />
          <div className="relative z-60 w-full max-w-3xl bg-white rounded-lg shadow-xl p-6 section-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{openGroup.name}</h3>
                <div className="text-sm text-gray-500">{openGroup.members || 0} members</div>
              </div>
              <div>
                <button onClick={()=>setOpenGroup(null)} className="btn">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <h4 className="font-medium mb-2">Members</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto p-2 bg-white/50 rounded-md border">
                  {(openGroup.membersList || []).length === 0 && <div className="text-sm text-gray-500">No members yet</div>}
                  {(openGroup.membersList || []).map(m => (
                    <div key={m._id || m.email || Math.random()} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                      <img src={m.profilePhoto || '/avatar.png'} className="w-8 h-8 rounded-full" alt="" />
                      <div>
                        <div className="font-medium text-sm">{m.fullName || m.username || m.email}</div>
                        <div className="text-xs text-gray-500">{m.email || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Add members</h4>
                <input placeholder="Search users to add" value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} className="input input-bordered w-full mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.length === 0 && <div className="text-sm text-gray-500">Type to search users</div>}
                  {searchResults.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <img src={u.profilePhoto || '/avatar.png'} className="w-8 h-8 rounded-full" alt="" />
                        <div className="text-sm">{u.fullName || u.username || u.email}</div>
                      </div>
                      <button disabled={adding} onClick={()=>addMemberToGroup(openGroup.id, u)} className="btn btn-sm btn-outline">Add</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitiesPage;

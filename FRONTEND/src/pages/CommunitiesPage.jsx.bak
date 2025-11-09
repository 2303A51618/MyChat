import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../Store/useAuthStore';
import { useChatStore } from '../Store/useChatStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CommunitiesPage = () => {
  const [groups, setGroups] = useState([
    { id: 1, name: 'React Devs', members: 12, membersList: [] },
    { id: 2, name: 'Project Chat', members: 6, membersList: [] },
  ]);
  const [name, setName] = useState('');
  const [openGroup, setOpenGroup] = useState(null); // group object when opened
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersHasMore, setMembersHasMore] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [deviceTokenInput, setDeviceTokenInput] = useState('');
  const [notifications, setNotifications] = useState([]);
  const socket = useAuthStore((s) => s.socket);
  const authUser = useAuthStore((s) => s.authUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const navigate = useNavigate();

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
        // ensure new group appears in sidebar for creator
        try {
          const groupObj = { _id: created._id || created.id, fullName: created.name, isGroup: true, name: created.name, rawGroup: created };
          useChatStore.setState(prev => {
            const existing = prev.users || [];
            if (existing.find(x => String(x._id) === String(groupObj._id))) return prev;
            return { users: [groupObj, ...existing] };
          });
        } catch (err) { console.debug('add created group to sidebar failed', err); }
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

  // fetch group members from server when memberSearch changes (server-side search)
  const fetchGroupMembers = async (groupId, q = '', page = 1, append = false) => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const res = await axiosInstance.get(`/groups/${encodeURIComponent(groupId)}/members?q=${encodeURIComponent(q || '')}&page=${page}&limit=20`);
      const data = res.data || {};
      const members = Array.isArray(data.members) ? data.members : [];
      setMembersPage(data.page || page);
      setMembersHasMore(((data.page || page) * (data.limit || 20)) < (data.total || 0));
      if (append) setMemberResults(prev => [...prev, ...members]); else setMemberResults(members);
    } catch (err) {
      console.error('fetch group members err', err);
      setMemberResults([]);
      setMembersHasMore(false);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    const id = openGroup && (openGroup._id || openGroup.id);
    if (!id) return setMemberResults([]);
    // debounce input
    const t = setTimeout(() => {
      if (!memberSearch || memberSearch.trim().length === 0) {
        // clear server results, keep client-side membersList
        setMemberResults([]);
        setMembersPage(1);
        setMembersHasMore(false);
      } else {
        fetchGroupMembers(id, memberSearch.trim(), 1, false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, openGroup]);

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
      socket.on('group:updated', (data) => {
        // update local group name/avatar
        setGroups(prev => prev.map(g => (String(g._id || g.id) === String(data.groupId) ? { ...g, name: data.name || g.name, profilePhoto: data.avatar || g.profilePhoto } : g)));
        setOpenGroup(prev => (prev && String(prev._id || prev.id) === String(data.groupId)) ? { ...prev, name: data.name || prev.name, avatar: data.avatar || prev.avatar } : prev);
      });
    } catch (err) {
      console.error('socket group listeners err', err);
    }

    // listen for notifications
    const onNotification = (n) => {
      setNotifications(prev => [n, ...(prev || [])]);
      try { toast.success(n.title || n.body || 'New notification'); } catch (err) { console.debug('toast failed', err); }
    };
    try { socket.on('notification', onNotification); } catch (err) { console.debug('socket on notification failed', err); }

    return () => {
      try {
        socket.off('group:created', onGroupCreated);
        socket.off('group:added', onGroupAdded);
      } catch {
        /* ignore cleanup errors */
      }
  try { socket.off('notification'); } catch (err) { console.debug('socket off notification failed', err); }
    };
  }, [socket]);

  const addMemberToGroup = async (groupId, user) => {
    setAdding(true);
    try {
      // prefer server-side add if available
      // groupId can be a number (local-only) or an ObjectId string (_id)
      const idForApi = String(groupId || (openGroup?._id || openGroup?.id));
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
      setGroups(prev => prev.map(g => (String(g._id) === String(groupId) || g.id === groupId) ? { ...g, members: (g.members||0)+1, membersList: [...(g.membersList||[]), user] } : g));
    } finally {
      setAdding(false);
    }
  };

  const createInviteForGroup = async (role = 'member') => {
    if (!openGroup || !(openGroup._id || openGroup.id)) return toast.error('Open a group first');
    try {
      const id = openGroup._id || openGroup.id;
      const res = await axiosInstance.post(`/groups/${encodeURIComponent(id)}/invites`, { role });
      const token = res.data?.token;
      setInviteToken(token || '');
      toast.success('Invite created');
    } catch (err) {
      console.error('create invite err', err);
      toast.error(err.response?.data?.message || 'Failed to create invite');
    }
  };

  const joinWithInviteToken = async () => {
    const token = (joinToken || '').trim();
    if (!token) return toast.error('Enter invite token');
    try {
      const res = await axiosInstance.post(`/groups/invites/${encodeURIComponent(token)}/join`);
      toast.success(res.data?.message || 'Joined group');
      // refresh groups
      const groupsRes = await axiosInstance.get('/groups');
      const server = Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data.groups || []);
      setGroups(server.map((g) => ({ ...g, membersList: g.members || [] })));
      setJoinToken('');
    } catch (err) {
      console.error('join invite err', err);
      toast.error(err.response?.data?.message || 'Failed to join');
    }
  };

  const registerDeviceToken = async () => {
    const token = (deviceTokenInput || '').trim();
    if (!token) return toast.error('Enter device token');
    try {
      const res = await axiosInstance.post('/notifications/device', { token, platform: 'web' });
      toast.success(res.data?.message || 'Registered device');
      setDeviceTokenInput('');
    } catch (err) {
      console.error('register device err', err);
      toast.error(err.response?.data?.message || 'Failed to register device');
    }
  };

  const handleExitGroup = async () => {
    if (!openGroup || !(openGroup._id || openGroup.id)) return;
    const id = openGroup._id || openGroup.id;
    if (!confirm('Are you sure you want to exit this community?')) return;
    try {
      await axiosInstance.delete(`/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(useAuthStore.getState().authUser._id)}`);
      // remove group from local lists
      setGroups(prev => prev.filter(g => String(g._id || g.id) !== String(id)));
      // also remove from chat sidebar
      try { useChatStore.setState(prev => ({ users: (prev.users || []).filter(u => String(u._id) !== String(id)) })); } catch (err) { console.debug('remove from sidebar failed', err); }
      setOpenGroup(null);
    } catch (err) {
      console.error('exit group err', err);
      alert('Failed to exit community');
    }
  };

  const handleUpdateGroupName = async (newName) => {
    if (!openGroup) return;
    try {
      const id = openGroup._id || openGroup.id;
      const res = await axiosInstance.patch(`/groups/${encodeURIComponent(id)}`, { name: newName });
      const updated = res.data;
      setOpenGroup(updated);
      setGroups(prev => prev.map(g => (String(g._id || g.id) === String(updated._id) ? { ...g, name: updated.name } : g)));
      // also update sidebar
      try { useChatStore.setState(prev => ({ users: (prev.users || []).map(u => (String(u._id) === String(updated._id) ? { ...u, fullName: updated.name } : u)) })); } catch (err) { console.debug('update sidebar name failed', err); }
    } catch (err) {
      console.error('update group name err', err);
      alert('Failed to update name');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold text-blue-1000">Communities</h2>
          <p className="text-sm text-blue-600">Create or manage communities. Hover a card for quick actions.</p>
        </div>
        <div className="flex gap-2 items-center">
          <form onSubmit={createGroup} className="flex gap-2 items-center">
            <input value={name} onChange={(e)=>setName(e.target.value)} className="input input-bordered px-3 py-2 rounded-full shadow-sm bg-white" placeholder="New community name" />
            <button className="btn btn-primary transition-transform transform hover:scale-105" type="submit">Create</button>
          </form>
          <div className="flex items-center gap-2">
            <input value={joinToken} onChange={(e)=>setJoinToken(e.target.value)} placeholder="Invite token" className="input input-sm" />
            <button onClick={joinWithInviteToken} className="btn btn-sm">Join</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(g => (
          <div key={g._id || g.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              // open the community chat in main dashboard while keeping sidebar (explicit group route)
              const id = g._id || g.id;
              const groupObj = { _id: id, fullName: g.name || 'Community', isGroup: true, name: g.name, rawGroup: g };
              try { setSelectedUser(groupObj); } catch (err) { console.debug('setSelectedUser failed', err); }
              navigate(`/chat/group/${encodeURIComponent(id)}`);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { const groupObj = { _id: g._id || g.id, fullName: g.name || g.title || 'Community', isGroup: true, name: g.name }; try { setSelectedUser(groupObj); } catch (err) { console.debug('setSelectedUser failed onKey', err); } navigate('/'); } }}
            className="p-4 rounded-lg bg-white border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1 cursor-pointer"
            style={{borderLeftWidth: 4, borderLeftColor: 'rgba(99,102,241,0.12)'}}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">{(g.name||'').charAt(0)}</div>
              <div>
                <div className="font-medium text-lg text-gray-900">{g.name}</div>
                <div className="text-sm text-gray-600">{Array.isArray(g.members) ? g.members.length : (g.members || 0)} members</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e)=>{ e.stopPropagation(); setOpenGroup(g); }} className="px-3 py-1 rounded-md border border-transparent hover:border-indigo-300 transition-all text-indigo-700 bg-indigo-50">Details</button>
            </div>
          </div>
        ))}
      </div>

      {/* Group details modal (re-uses dashboard look) */}
      {openGroup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpenGroup(null)} />
          <div className="relative z-60 w-full max-w-4xl bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">{openGroup.name}</h3>
                <div className="text-sm text-gray-600">{Array.isArray(openGroup.members) ? openGroup.members.length : (openGroup.members || 0)} members</div>
                <div className="text-xs text-gray-500">Created: {openGroup.createdAt ? new Date(openGroup.createdAt).toLocaleString() : (openGroup.createdOn ? new Date(openGroup.createdOn).toLocaleString() : '—')}</div>
                {openGroup.admins && openGroup.admins.length > 0 && (
                  <div className="text-xs text-gray-500">Admin: {openGroup.admins[0].fullName || openGroup.admins[0].username || openGroup.admins[0]._id}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const isAdmin = Boolean(authUser && openGroup && (
                    String(openGroup?.createdBy?._id || openGroup?.createdBy || openGroup?.owner || openGroup?.owner?._id || '') === String(authUser._id)
                  ));
                  if (isAdmin) {
                    return (
                      <>
                        <button onClick={() => { const n = prompt('New community name', openGroup.name); if (n && n.trim() && n.trim() !== openGroup.name) handleUpdateGroupName(n.trim()); }} className="btn btn-sm btn-outline">Edit</button>
                        <button onClick={() => createInviteForGroup('member')} className="btn btn-sm btn-primary">Create Invite</button>
                      </>
                    );
                  }
                  return null;
                })()}
                <button onClick={()=>setOpenGroup(null)} className="btn btn-ghost">Close</button>
                <button onClick={handleExitGroup} className="btn btn-outline btn-sm text-red-600">Exit</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                <h4 className="font-medium mb-2 text-gray-800">Members</h4>
                <div className="mb-2">
                  <input value={memberSearch} onChange={(e)=>setMemberSearch(e.target.value)} placeholder="Search members" className="input input-bordered w-full" />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto p-3 bg-gray-50 rounded-md border border-gray-100">
                        {/* decide data source: server results if searching, otherwise local membersList */}
                        {(() => {
                          const source = (memberSearch && memberSearch.trim().length > 0) ? memberResults : (openGroup.membersList || []);
                          if (membersLoading) return <div className="text-sm text-gray-500">Loading members...</div>;
                          if (!source || source.length === 0) return <div className="text-sm text-gray-500">No members found</div>;
                          return source.map(m => (
                            <div key={m._id || m.email || Math.random()} className="flex items-center gap-3 p-2 rounded hover:bg-white transition-colors justify-between member-enter">
                              <div className="flex items-center gap-3">
                                <img src={m.profilePhoto || '/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
                                <div>
                                  <div className="font-medium text-sm text-gray-900">{m.fullName || m.username || ''}</div>
                                </div>
                              </div>
                                            <div className="ml-4 flex items-center gap-2">
                                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">Member</span>
                                              {(() => {
                                                const isAdmin = Boolean(authUser && openGroup && (
                                                  String(openGroup?.createdBy?._id || openGroup?.createdBy || openGroup?.owner || openGroup?.owner?._id || '') === String(authUser._id)
                                                ));
                                                if (!isAdmin) return null;
                                                return (
                                                  <div className="flex items-center gap-2">
                                                    {/* promote */}
                                                    <button onClick={async (ev) => { ev.stopPropagation(); try { await axiosInstance.post(`/groups/${encodeURIComponent(openGroup._id || openGroup.id)}/members/${encodeURIComponent(m._id)}/promote`); toast?.success && toast.success('Promoted to admin'); } catch (err) { console.error('promote err', err); toast?.error && toast.error('Promote failed'); } }} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Promote</button>
                                                    {/* remove */}
                                                    <button onClick={async (ev) => { ev.stopPropagation(); if (!confirm('Remove this member from the community?')) return; try { await axiosInstance.delete(`/groups/${encodeURIComponent(openGroup._id || openGroup.id)}/members/${encodeURIComponent(m._id)}`); // optimistic UI
                                                          setOpenGroup(prev => ({ ...prev, membersList: (prev.membersList || []).filter(x => String(x._id || x) !== String(m._id)) }));
                                                          setGroups(prev => prev.map(g => (String(g._id || g.id) === String(openGroup._id || openGroup.id)) ? { ...g, members: (g.members || 1) - 1, membersList: (g.membersList || []).filter(x => String(x._id || x) !== String(m._id)) } : g));
                                                          toast?.success && toast.success('Member removed');
                                                        } catch (err) { console.error('remove member err', err); toast?.error && toast.error('Remove failed'); } }} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Remove</button>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                            </div>
                          ));
                        })()}
                        {/* pagination / load more for server results */}
                        {memberSearch && memberSearch.trim().length > 0 && membersHasMore && (
                          <div className="flex justify-center mt-2">
                            <button onClick={() => { const id = openGroup && (openGroup._id || openGroup.id); if (!id) return; fetchGroupMembers(id, memberSearch.trim(), membersPage + 1, true); }} className="btn btn-sm">Load more</button>
                          </div>
                        )}
                </div>
              </div>

                    <div className="lg:col-span-1">
                      <h4 className="font-medium mb-2 text-gray-800">Invite</h4>
                      {inviteToken ? (
                        <div className="p-3 bg-gray-50 rounded border border-gray-100">
                          <div className="text-sm text-gray-700 break-all">Token: {inviteToken}</div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => { navigator.clipboard?.writeText(inviteToken); toast.success('Copied token'); }} className="btn btn-sm">Copy</button>
                            <button onClick={() => { const link = `${window.location.origin}/join/${inviteToken}`; navigator.clipboard?.writeText(link); toast.success('Copied link'); }} className="btn btn-sm btn-ghost">Copy Link</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded border border-gray-100">
                          <div className="text-sm text-gray-500">Create an invite link to share with others.</div>
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="font-medium mb-2 text-gray-800">Device registration</h4>
                        <div className="flex gap-2">
                          <input value={deviceTokenInput} onChange={(e)=>setDeviceTokenInput(e.target.value)} placeholder="Device token (paste)" className="input input-sm" />
                          <button onClick={registerDeviceToken} className="btn btn-sm">Register</button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-medium mb-2 text-gray-800">In-app notifications</h4>
                        <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border border-gray-100">
                          {notifications.length === 0 ? <div className="text-sm text-gray-500">No notifications</div> : notifications.map((n, i) => (
                            <div key={i} className="p-2 border-b last:border-b-0">
                              <div className="font-medium text-sm">{n.title || 'Notification'}</div>
                              <div className="text-xs text-gray-600">{n.body || JSON.stringify(n.data || {})}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 text-gray-800">Add members</h4>
                      {/* only show add UI if current user is group creator/owner */}
                      {(() => {
                        const isAdmin = Boolean(authUser && openGroup && (
                          String(openGroup?.createdBy?._id || openGroup?.createdBy || openGroup?.owner || openGroup?.owner?._id || '') === String(authUser._id)
                        ));
                        if (!isAdmin) {
                          return <div className="text-sm text-gray-500">Only community admins can add members</div>;
                        }
                        return (
                          <>
                            <input placeholder="Search users to add" value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} className="input input-bordered w-full mb-2" />
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {searchResults.length === 0 && <div className="text-sm text-gray-500">Type to search users</div>}
                              {searchResults.map(u => (
                                <div key={u._id} className="flex items-center justify-between p-2 rounded hover:bg-white transition-colors">
                                  <div className="flex items-center gap-3">
                                    <img src={u.profilePhoto || '/avatar.png'} className="w-10 h-10 rounded-full" alt="" />
                                    <div className="text-sm">
                                      <div className="font-medium truncate max-w-[160px] text-gray-900">{u.fullName || u.username || ''}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <button
                                      disabled={adding}
                                      onClick={() => addMemberToGroup(openGroup?._id || openGroup?.id, u)}
                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-green-600 text-white hover:bg-green-700 shadow-sm transition transform hover:scale-110"
                                      title="Add member"
                                    >
                                      <span className="text-lg">+</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitiesPage;

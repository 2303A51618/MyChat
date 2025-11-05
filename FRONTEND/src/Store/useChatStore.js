import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../Store/useAuthStore";

export const useChatStore=create((set,get)=>({
    // per-user local nicknames (userId -> nickname) persisted in localStorage
    nicknames: (typeof window !== 'undefined' && localStorage.getItem('chat_nicknames')) ? JSON.parse(localStorage.getItem('chat_nicknames')) : {},

    setNickname: (userId, nickname) => {
      if (!userId) return;
      set(state => {
        const next = { ...(state.nicknames || {}), [userId]: nickname };
  try { if (typeof window !== 'undefined') localStorage.setItem('chat_nicknames', JSON.stringify(next)); } catch { /* ignore */ }
        return { nicknames: next };
      });
    },

    getNickname: (userId) => {
      const s = get();
      return (s.nicknames && s.nicknames[userId]) || null;
    },
    messages:[],
    users:[],
    selectedUser:null,
    isUsersLoading:false,
    isMessagesLoading:false,

    // showImage holds modal state: { visible: boolean, anchor: { top,left,bottom,right,width,height }, mode?: 'profile'|'preview' }
    showImage: { visible: false, anchor: null, mode: 'profile' },
  setShowImage: (payload) => {
    // payload can be boolean or an object
    if (typeof payload === 'boolean') return set({ showImage: { visible: payload, anchor: null, mode: 'profile' } });
    return set({ showImage: { ...(payload || {}), visible: !!payload.visible } });
  },

    getUsers:async()=>{
        set({isUsersLoading:true});
        try {
            const res=await axiosInstance.get("/messages/users");
            let users = Array.isArray(res.data) ? res.data : (res.data?.users || []);

            // Try to also fetch groups the current user belongs to and show them in sidebar as group chats
            try {
              const auth = useAuthStore.getState().authUser;
              const groupsRes = await axiosInstance.get('/groups');
              const groups = Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data?.groups || []);
              // filter groups where current user is a member
              const myGroups = groups.filter(g => {
                const members = Array.isArray(g.members) ? g.members : (g.membersList || []);
                try {
                  if (!auth || !auth._id) return false;
                  return members.some(m => String(m._id || m) === String(auth._id)) || String(g.createdBy?._id || g.createdBy || '') === String(auth._id);
                } catch { return false; }
              }).map(g => ({
                _id: g._id || g.id,
                fullName: g.name,
                profilePhoto: g.profilePhoto || null,
                isGroup: true,
                members: Array.isArray(g.members) ? g.members.length : (g.members || 0),
                rawGroup: g,
              }));

              // prepend groups to users list (avoid duplicates)
              const filteredUsers = users.filter(u => !myGroups.find(g => String(g._id) === String(u._id)));
              users = [...myGroups, ...filteredUsers];
            } catch (err) {
              console.debug('fetch groups for sidebar failed', err);
            }

            set({users});
      // ensure users have bookkeeping fields (lastMessageAt, unreadCount, hasUnread)
      const normalized = users.map(u => ({ lastMessageAt: u.lastMessageAt || Date.now(), unreadCount: u.unreadCount || 0, hasUnread: !!u.hasUnread, ...u }));
      set({users: normalized});
        } catch (error) {
            toast.error(error.response.data.message);
        } finally{
            set({isUsersLoading:false});
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: res.data });
        } catch (error) {
          toast.error(error.response.data.message);
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser || !selectedUser._id) {
          toast.error("No user selected");
          return;
        }
        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
          set({ messages: [...messages, res.data] });
          return res.data;
        } catch (error) {
          console.error("Send Message Error:", error); // Add this

          toast.error(error.response?.data?.message|| "Something went wrong.");
          // rethrow so callers (UI) can decide whether to clear inputs
          throw error;
        }
      },

      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        // Handle incoming messages and update sidebar ordering and unread indicators
        socket.on('newMessage', (newMessage) => {
          try {
            const authUser = useAuthStore.getState().authUser;
            const myId = authUser?._id;
            const selId = get().selectedUser?._id;

            const isGroupMessage = !!newMessage.isGroup;

            // determine counterpart id used in users list
            let counterpartId;
            if (isGroupMessage) {
              counterpartId = newMessage.chatId; // group id
            } else {
              // for 1:1 chats, the counterpart is the other participant
              counterpartId = (String(newMessage.sender) === String(myId)) ? String(newMessage.chatId) : String(newMessage.sender);
            }

            // if the message belongs to currently opened chat, append to messages
            const belongsToSelectedChat = isGroupMessage ? String(newMessage.chatId) === String(selId) : (String(counterpartId) === String(selId));
            if (belongsToSelectedChat) {
              set({ messages: [...get().messages, newMessage] });
              // clear unread for this chat since user is viewing it
              set({ users: get().users.map(u => (String(u._id) === String(selId) ? { ...u, unreadCount: 0, hasUnread: false, lastMessageAt: newMessage.createdAt || Date.now() } : u)) });
              return;
            }

            // Update users list: mark unread and move to top
            const users = Array.isArray(get().users) ? [...get().users] : [];
            const idx = users.findIndex(u => String(u._id) === String(counterpartId));
            const now = newMessage.createdAt || Date.now();
            if (idx >= 0) {
              const found = users[idx];
              const updated = { ...found, lastMessageAt: now, unreadCount: (found.unreadCount || 0) + 1, hasUnread: true };
              // remove from current position and move to front
              users.splice(idx, 1);
              users.unshift(updated);
            } else {
              // not found in sidebar yet: prepend a minimal entry
              const minimal = { _id: counterpartId, fullName: newMessage.isGroup ? (newMessage.groupName || 'Group') : (newMessage.senderName || 'Unknown'), isGroup: !!newMessage.isGroup, lastMessageAt: now, unreadCount: 1, hasUnread: true };
              users.unshift(minimal);
            }
            set({ users });
          } catch (err) {
            console.error('Error handling newMessage:', err);
          }
        });

        // reaction updates
        socket.on('message:reaction', ({ messageId, reactions }) => {
          set({ messages: get().messages.map(m => m._id === messageId ? { ...m, reactions } : m) });
        });
        // status updates (delivered/read)
        socket.on('message:status', ({ messageId, status }) => {
          set({ messages: get().messages.map(m => m._id === messageId ? { ...m, status } : m) });
        });
      },
    //if you logout and close window then message are of
      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off('newMessage');
        socket.off('message:reaction');
        socket.off('message:status');
      },
    
      setSelectedUser: async (selectedUser) => {
        const prev = get().selectedUser;
        const socket = useAuthStore.getState().socket;
        // leave previous room
        if (socket && prev) {
          try { socket.emit('leaveRoom', prev._id); } catch { /* ignore */ }
        }

        set({ selectedUser });

        // join new room and fetch messages
        if (socket && selectedUser) {
          try { socket.emit('joinRoom', selectedUser._id); } catch { /* ignore */ }
        }
        // load messages for the selected chat
        if (selectedUser && selectedUser._id) {
          // clear unread marker for this chat and move it to top of sidebar
          try {
            const users = Array.isArray(get().users) ? [...get().users] : [];
            const idx = users.findIndex(u => String(u._id) === String(selectedUser._id));
            if (idx >= 0) {
              const found = users[idx];
              const updated = { ...found, unreadCount: 0, hasUnread: false, lastMessageAt: found.lastMessageAt || Date.now() };
              users.splice(idx, 1);
              users.unshift(updated);
              set({ users });
            }
          } catch (err) {
            console.debug('clear unread failed', err);
          }
          await get().getMessages(selectedUser._id);
          // ensure we are subscribed to socket events
          get().unsubscribeFromMessages();
          get().subscribeToMessages();
        }
      },

      reactToMessage: async (messageId, emoji) => {
        try {
          const res = await axiosInstance.post(`/messages/${messageId}/reaction`, { emoji });
          // optimistic update handled by socket event, but update here too
          set({ messages: get().messages.map(m => m._id === messageId ? { ...m, reactions: res.data } : m) });
        } catch (err) {
          console.error('React error', err);
        }
      },
    }));
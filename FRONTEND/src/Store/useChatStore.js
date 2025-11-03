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
            set({users:res.data});
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
        } catch (error) {
          console.error("Send Message Error:", error); // Add this

          toast.error(error.response?.data?.message|| "Something went wrong.");
        }
      },

      subscribeToMessages: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on('newMessage', (newMessage) => {
          try {
            const authUser = useAuthStore.getState().authUser;
            const myId = authUser?._id;
            const selId = selectedUser._id;

            const isGroupMessage = newMessage.isGroup;

            const belongsToSelectedChat = isGroupMessage
              ? newMessage.chatId === selId
              : (
                  (newMessage.sender === selId && newMessage.chatId === myId) ||
                  (newMessage.sender === myId && newMessage.chatId === selId)
                );

            if (!belongsToSelectedChat) return;

            set({ messages: [...get().messages, newMessage] });
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
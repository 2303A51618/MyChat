import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  friends: [],
  pendingSent: [],
  pendingReceived: [],
  socket: null,

  fetchFriends: async () => {
    try {
      const res = await axiosInstance.get('/users/friends');
      set({ friends: res.data.friends || [], pendingSent: res.data.pendingSent || [], pendingReceived: res.data.pendingReceived || [] });
    } catch (error) {
      console.error('fetchFriends error', error);
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket?.();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  updateUserInfo: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-info", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update");
    }
  },
  
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;
    const socket = io(import.meta.env.VITE_API_URL || BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
    });

    socket.connect();
    set({ socket });

    socket.on('connect', () => {
      // refresh friends/pending lists when socket connects
      get().fetchFriends?.();
    });

    // presence updates (server emits incremental updates)
    socket.on('presence:update', ({ userId, online }) => {
      const prev = get().onlineUsers || [];
      const s = new Set(prev);
      if (online) s.add(userId); else s.delete(userId);
      set({ onlineUsers: [...s] });
    });

    // initial online list (backwards compatibility)
    socket.on('getOnlineUsers', (userIds) => set({ onlineUsers: userIds }));

    // Friend request notifications
    socket.on('friend:request', ({ from }) => {
      // add to pendingReceived if not present
      set((state) => {
        const exists = state.pendingReceived.some((u) => String(u._id) === String(from._id));
        if (exists) return {};
        const pending = [from, ...(state.pendingReceived || [])];
        return { pendingReceived: pending };
      });
      toast.success(`${from.username || from.fullName} sent you a friend request`);
    });

    socket.on('friend:request:accepted', ({ by }) => {
      // move from pending to friends
      set((state) => {
        const pendingReceived = (state.pendingReceived || []).filter((u) => String(u._id) !== String(by._id));
        const friends = state.friends ? [by, ...state.friends.filter(f => String(f._id)!==String(by._id))] : [by];
        return { pendingReceived, friends };
      });
      toast.success(`${by.username || by.fullName} accepted your friend request`);
    });

    socket.on('friend:request:declined', ({ by }) => {
      set((state) => {
        const pendingSent = (state.pendingSent || []).filter((u) => String(u._id) !== String(by._id));
        return { pendingSent };
      });
      toast(`${by.username || by.fullName} declined your friend request`);
    });

    socket.on('friend:removed', ({ by }) => {
      set((state) => ({ friends: (state.friends || []).filter(f => String(f._id)!==String(by._id)) }));
      toast(`${by.username || by.fullName} removed you`);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error', err);
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
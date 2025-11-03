import React from "react";
import {  useState, useRef, useEffect } from "react";
import { useAuthStore } from "../Store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../Store/useChatStore";
import Chatheader from "./Chatheader"
import { Link } from "react-router-dom";
import MiddleContainer from "./MiddleContainer"
import MessageInput from "./MessageInput";
import EmojiPicker from "./EmojiPicker";
import { X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from 'react-hot-toast';
// search handled in MiddleContainer; no inline axios/toast needed here


const Whatsapp = () => {
  const {
    messages,
    getMessages,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    showImage,
    setShowImage,
  } = useChatStore();
  const messageEndRef = useRef(null);
  const { authUser } = useAuthStore();
  const setNickname = useChatStore((s) => s.setNickname);
  const getNickname = useChatStore((s) => s.getNickname);
  const isBlocked = Array.isArray(authUser?.blockedUsers) && selectedUser ? authUser.blockedUsers.some(b => String(b) === String(selectedUser._id)) : false;
  const displayName = selectedUser ? (getNickname(selectedUser._id) || selectedUser.fullName) : '';
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [selectedImg, _setSelectedImg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLogout, setIsLogout] = useState(false);
  const popupRef = useRef(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  const closeLogoutDropdown = () => {
    setIsLogout(false);
  };
  useEffect(() => {
    if (!selectedUser?._id) return;

    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    try {
      const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsTouchDevice(!!touch);
    } catch {
      setIsTouchDevice(false);
    }
  }, []);

  const mutualFriends = React.useMemo(() => {
    try {
      const my = (authUser?.friends || []).map(f => (typeof f === 'string' ? f : f._id));
      const theirs = (selectedUser?.friends || []).map(f => (typeof f === 'string' ? f : f._id));
      const mySet = new Set(my);
      const mutualIds = theirs.filter(id => mySet.has(id));
      const mutualObjs = (authUser?.friends || []).filter(u => mutualIds.includes(typeof u === 'string' ? u : u._id));
      return mutualObjs;
    } catch {
      return [];
    }
  }, [authUser, selectedUser]);

  // focus trap + escape handling for popup
  useEffect(() => {
    if (!showImage?.visible) return;
    const node = popupRef.current;
    if (node) node.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowImage(false);
        setShowPreview(false);
      }
      if (e.key === 'Tab' && node) {
        const focusable = node.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showImage, popupRef, setShowImage]);

  // sync nickname input when popup opens
  useEffect(() => {
    if (showImage?.visible && selectedUser) {
      const existing = getNickname(selectedUser._id) || '';
      setNicknameInput(existing);
      setEditingNickname(false);
    }
  }, [showImage?.visible, selectedUser, getNickname]);


  const handleBlock = async () => {
    if (!selectedUser?._id) return;
    try {
      await axiosInstance.post(`/users/${selectedUser._id}/block`);
      toast.success('User blocked');
      setShowImage(false);
      // refresh users list to reflect block
  try { await useChatStore.getState().getUsers(); } catch (err) { console.debug('refresh users failed', err); };
    } catch (err) {
      console.error('block error', err);
      toast.error(err?.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblock = async () => {
    if (!selectedUser?._id) return;
    try {
      await axiosInstance.post(`/users/${selectedUser._id}/unblock`);
      toast.success('User unblocked');
      setShowImage(false);
  try { await useChatStore.getState().getUsers(); } catch (err) { console.debug('refresh users failed', err); };
    } catch (err) {
      console.error('unblock error', err);
      toast.error(err?.response?.data?.message || 'Failed to unblock user');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedUser?._id) return;
    if (!confirm('Delete this chat and remove the user from your view? This will attempt to delete messages and may remove the user.')) return;
    try {
      const res = await axiosInstance.post('/messages/delete-chats', { userIds: [selectedUser._id] });
      toast.success(res?.data?.message || 'Chat deleted');
      // clear selected chat and refresh sidebar
  try { useChatStore.getState().setSelectedUser(null); await useChatStore.getState().getUsers(); } catch (err) { console.debug('post-delete refresh failed', err); };
      setShowImage(false);
    } catch (err) {
      console.error('delete chat error', err);
      toast.error(err?.response?.data?.message || 'Failed to delete chat');
    }
  };

  const handleSaveNickname = async () => {
    if (!selectedUser?._id) return;
    // local-only nickname mapping persisted to localStorage via store
    try {
      setNickname(selectedUser._id, nicknameInput || '');
      toast.success('Nickname saved');
      setEditingNickname(false);
    } catch (err) {
      console.error('save nickname error', err);
      toast.error('Failed to save nickname');
    }
  };

  // reaction picker state
  const [openPickerFor, setOpenPickerFor] = useState(null); // messageId or null
  const reactToMessage = useChatStore((s) => s.reactToMessage);

  const handleSelectEmojiForMessage = async (messageId, emoji) => {
    try {
      await reactToMessage(messageId, emoji);
      setOpenPickerFor(null);
    } catch (err) {
      console.error('React error', err);
    }
  };

  // cache for user info to show reactor names
  const userCache = useRef({});
  const [hoveredReactors, setHoveredReactors] = useState(null); // { messageId, emoji, users: [] }
  const [reactorModal, setReactorModal] = useState(null); // { messageId, emoji, users: [] }

  const fetchUsersByIds = async (ids) => {
    // return from cache where possible, fetch missing
    const missing = ids.filter(id => !userCache.current[id]);
    if (missing.length > 0) {
      try {
        const res = await axiosInstance.get(`/users/batch?ids=${missing.join(',')}`);
        (res.data.users || []).forEach(u => { userCache.current[String(u._id)] = u; });
      } catch (err) {
        console.error('Failed to fetch users for reactors', err);
      }
    }
    return ids.map(id => userCache.current[id]).filter(Boolean);
  };

  const handleHoverReactors = async (userIds = [], messageId, emoji) => {
    if (!userIds || userIds.length === 0) return setHoveredReactors(null);
    const users = await fetchUsersByIds(userIds.map(String));
    setHoveredReactors({ messageId, emoji, users });
  };

  const openReactorModal = async (userIds = [], messageId, emoji) => {
    const users = await fetchUsersByIds(userIds.map(String));
    setReactorModal({ messageId, emoji, users });
  };
  
  // setSelectedUser is used from MiddleContainer via store when a user is selected
  
  return (
    <>
      <section className="flex w-screen">
        {/* First container */}
        <div className="sticky top-0 left-0 hidden w-[65px] h-screen bg-white border border-y-0 border-l-0 border-r-gray-100 xl:flex flex-col justify-between">
{/* Upper assets */}
          <div className="flex flex-col items-center gap-1 mt-2">
            {/* Icon 1  - Chats */}
            <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg
                viewBox="0 0 24 24"
                height="24"
                width="24"
                preserveAspectRatio="xMidYMid meet"
                className=""
                fill="black"
              >
                <title>chat-filled-refreshed</title>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M22.0002 6.66667C22.0002 5.19391 20.8062 4 19.3335 4H1.79015C1.01286 4 0.540213 4.86348 0.940127 5.53L3.00016 9V17.3333C3.00016 18.8061 4.19406 20 5.66682 20H19.3335C20.8062 20 22.0002 18.8061 22.0002 17.3333V6.66667ZM7.00016 10C7.00016 9.44772 7.44787 9 8.00016 9H17.0002C17.5524 9 18.0002 9.44772 18.0002 10C18.0002 10.5523 17.5524 11 17.0002 11H8.00016C7.44787 11 7.00016 10.5523 7.00016 10ZM8.00016 13C7.44787 13 7.00016 13.4477 7.00016 14C7.00016 14.5523 7.44787 15 8.00016 15H14.0002C14.5524 15 15.0002 14.5523 15.0002 14C15.0002 13.4477 14.5524 13 14.0002 13H8.00016Z"
                  fill="black"
                ></path>
              </svg>
            </Link>
            {/* Icon 2 */}
            <Link to="/status" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg
                viewBox="0 0 24 24"
                height="24"
                width="24"
                preserveAspectRatio="xMidYMid meet"
                className=""
                fill="black"
              >
                <title>status-refreshed</title>
                <path
                  d="M13.5628 3.13661C13.6587 2.59272 14.1794 2.22464 14.711 2.37436C15.7905 2.6784 16.8135 3.16254 17.736 3.80856C18.9323 4.64623 19.9305 5.73573 20.6606 7.00048C21.3907 8.26524 21.8349 9.67455 21.962 11.1294C22.0601 12.2513 21.9677 13.3794 21.6911 14.4662C21.5549 15.0014 20.9758 15.2682 20.4568 15.0792C19.9378 14.8903 19.677 14.317 19.7998 13.7785C19.9843 12.9693 20.0422 12.1343 19.9696 11.3035C19.8679 10.1396 19.5126 9.01217 18.9285 8.00036C18.3444 6.98856 17.5458 6.11696 16.5888 5.44682C15.9057 4.96842 15.1536 4.60099 14.3606 4.35609C13.8329 4.19312 13.4669 3.6805 13.5628 3.13661Z"
                  fill="black"
                ></path>
                <path
                  d="M18.8944 17.785C19.3175 18.14 19.3759 18.7749 18.9804 19.1604C18.1774 19.9433 17.2466 20.5872 16.2259 21.0631C14.9023 21.6802 13.4597 22 11.9993 21.9999C10.5389 21.9998 9.09633 21.6798 7.77287 21.0625C6.7522 20.5864 5.82149 19.9424 5.01855 19.1594C4.62314 18.7739 4.68167 18.1389 5.10479 17.784C5.52792 17.4291 6.15484 17.4898 6.55976 17.8654C7.16828 18.4298 7.86245 18.8974 8.61829 19.25C9.67707 19.7438 10.8312 19.9998 11.9994 19.9999C13.1677 20 14.3218 19.7442 15.3807 19.2505C16.1366 18.898 16.8308 18.4304 17.4394 17.8661C17.8444 17.4906 18.4713 17.43 18.8944 17.785Z"
                  fill="black"
                ></path>
                <path
                  d="M3.54277 15.0781C3.02379 15.267 2.4447 15.0001 2.30857 14.4649C2.03215 13.3781 1.9399 12.2501 2.03806 11.1283C2.16533 9.6736 2.60965 8.26443 3.33978 6.99982C4.06991 5.73521 5.06815 4.64585 6.26432 3.8083C7.1868 3.16239 8.20975 2.67832 9.28915 2.37433C9.82075 2.22461 10.3414 2.59269 10.4373 3.13659C10.5332 3.68048 10.1672 4.1931 9.6395 4.35605C8.84657 4.60092 8.09458 4.9683 7.41146 5.44662C6.45452 6.11666 5.65593 6.98815 5.07183 7.99983C4.48772 9.01152 4.13226 10.1389 4.03045 11.3026C3.95776 12.1334 4.01559 12.9683 4.19998 13.7774C4.3227 14.3159 4.06175 14.8892 3.54277 15.0781Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12.0001 16C14.2092 16 16.0001 14.2091 16.0001 12C16.0001 9.79086 14.2092 8 12.0001 8C9.79092 8 8.00006 9.79086 8.00006 12C8.00006 14.2091 9.79092 16 12.0001 16ZM12.0001 18C15.3138 18 18.0001 15.3137 18.0001 12C18.0001 8.68629 15.3138 6 12.0001 6C8.68635 6 6.00006 8.68629 6.00006 12C6.00006 15.3137 8.68635 18 12.0001 18Z"
                  fill="black"
                ></path>
              </svg>
            </Link>
            {/* Icon 3 */}
            <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg
                viewBox="0 0 24 24"
                height="24"
                width="24"
                preserveAspectRatio="xMidYMid meet"
                className=""
                fill="black"
              >
                <title>newsletter-outline</title>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.8301 8.63404C16.3081 8.35745 16.9198 8.52076 17.1964 8.9988C17.7077 9.88244 18 10.9086 18 12C18 13.0914 17.7077 14.1176 17.1964 15.0012C16.9198 15.4792 16.3081 15.6425 15.8301 15.366C15.352 15.0894 15.1887 14.4776 15.4653 13.9996C15.8052 13.4122 16 12.7304 16 12C16 11.2696 15.8052 10.5878 15.4653 10.0004C15.1887 9.52237 15.352 8.91063 15.8301 8.63404ZM8.16995 8.63404C8.64798 8.91063 8.81129 9.52237 8.5347 10.0004C8.19484 10.5878 8 11.2696 8 12C8 12.7304 8.19484 13.4122 8.5347 13.9996C8.81129 14.4776 8.64798 15.0894 8.16995 15.366C7.69191 15.6425 7.08017 15.4792 6.80358 15.0012C6.29231 14.1176 6 13.0914 6 12C6 10.9086 6.29231 9.88244 6.80358 8.9988C7.08017 8.52076 7.69191 8.35745 8.16995 8.63404Z"
                  fill="black"
                ></path>
                <path
                  d="M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.33243 16.4826L5.09622 17.2728C4.86428 18.0487 4.62086 18.8707 4.41748 19.5825C5.12931 19.3791 5.95126 19.1357 6.72722 18.9038L7.51743 18.6676L8.24444 19.057C9.36447 19.6571 10.6412 20 12 20C16.4154 20 20 16.4154 20 12C20 7.58457 16.4154 4 12 4C7.58457 4 4 7.58457 4 12C4 13.3588 4.34295 14.6355 4.94296 15.7556L5.33243 16.4826ZM3.18 16.7C2.63 18.54 2 20.69 2 21C2 21.55 2.45 22 3 22C3.31 22 5.46 21.37 7.3 20.82C8.7 21.57 10.3 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 13.7 2.43 15.3 3.18 16.7Z"
                  fill="black"
                ></path>
              </svg>
            </Link>
            {/* Icon 4 - Communities */}
            <Link to="/communities" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg
                viewBox="0 0 32 32"
                height="32"
                width="32"
                preserveAspectRatio="xMidYMid meet"
                className=""
                fill="none"
              >
                <title>community-refreshed-32</title>
                <path
                  d="M7.85445 17.0075C7.73851 17.0026 7.62033 17 7.50003 17C6.60797 17 5.83268 17.1426 5.22106 17.3148C4.69554 17.4627 4.0988 17.7054 3.5974 18.0919C3.08634 18.4858 2.62143 19.0755 2.52966 19.8877C2.48679 20.2672 2.50003 21.0796 2.51038 21.5399C2.52882 22.3601 3.20095 23 4.00656 23H7.35217C7.15258 22.5784 7.03459 22.1084 7.01993 21.6087C7.01572 21.4651 7.00943 21.25 7.00505 21H4.50165C4.49773 20.6191 4.50034 20.2599 4.51702 20.1123C4.5308 19.9903 4.59776 19.846 4.81844 19.6759C5.04878 19.4983 5.38363 19.3468 5.7631 19.2399C6.12883 19.137 6.57191 19.0478 7.07407 19.0142C7.12499 18.6798 7.20695 18.3652 7.31207 18.0721C7.45559 17.6719 7.64219 17.3186 7.85445 17.0075Z"
                  fill="black"
                ></path>
                <path
                  d="M24.6478 23H27.9935C28.7991 23 29.4712 22.3601 29.4897 21.5399C29.5 21.0796 29.5133 20.2672 29.4704 19.8877C29.3786 19.0755 28.9137 18.4858 28.4027 18.0919C27.9013 17.7054 27.3045 17.4627 26.779 17.3148C26.1674 17.1426 25.3921 17 24.5 17C24.3797 17 24.2615 17.0026 24.1456 17.0075C24.3578 17.3186 24.5444 17.6719 24.6879 18.0721C24.793 18.3652 24.875 18.6798 24.9259 19.0142C25.4281 19.0478 25.8712 19.1369 26.237 19.2399C26.6164 19.3468 26.9513 19.4983 27.1816 19.6759C27.4023 19.846 27.4693 19.9903 27.483 20.1123C27.4997 20.2599 27.5023 20.6191 27.4984 21H24.9949C24.9906 21.25 24.9843 21.4651 24.9801 21.6087C24.9654 22.1084 24.8474 22.5784 24.6478 23Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16 18C14.6099 18 13.4517 18.2363 12.6506 18.4683C12.2195 18.5931 11.8437 18.7329 11.5552 18.9105C11.275 19.0829 11.1382 19.2525 11.0772 19.4224C11.0547 19.4853 11.0366 19.5555 11.0259 19.6343C10.9955 19.8585 10.996 20.4459 11.0064 21H20.9936C21.004 20.4459 21.0045 19.8585 20.9741 19.6343C20.9634 19.5555 20.9453 19.4853 20.9228 19.4224C20.8618 19.2525 20.725 19.0829 20.4448 18.9105C20.1563 18.7329 19.7805 18.5931 19.3494 18.4683C18.5483 18.2363 17.3901 18 16 18ZM12.0944 16.5472C13.0378 16.274 14.3855 16 16 16C17.6145 16 18.9622 16.274 19.9056 16.5472C20.392 16.688 20.9732 16.8873 21.493 17.2071C22.0211 17.532 22.5438 18.0181 22.8053 18.7473C22.8735 18.9373 22.9259 19.1436 22.956 19.3657C23.0234 19.8633 22.9976 20.9826 22.9809 21.5501C22.957 22.3659 22.287 23 21.4851 23H10.5149C9.71301 23 9.043 22.3659 9.01907 21.5501C9.00243 20.9826 8.97657 19.8633 9.04404 19.3657C9.07414 19.1436 9.1265 18.9373 9.19466 18.7473C9.45616 18.0181 9.97894 17.532 10.507 17.2071C11.0268 16.8873 11.608 16.688 12.0944 16.5472Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M24.5 12C23.9477 12 23.5 12.4477 23.5 13C23.5 13.5523 23.9477 14 24.5 14C25.0523 14 25.5 13.5523 25.5 13C25.5 12.4477 25.0523 12 24.5 12ZM21.5 13C21.5 11.3431 22.8431 10 24.5 10C26.1569 10 27.5 11.3431 27.5 13C27.5 14.6569 26.1569 16 24.5 16C22.8431 16 21.5 14.6569 21.5 13Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16 9C14.8954 9 14 9.89543 14 11C14 12.1046 14.8954 13 16 13C17.1046 13 18 12.1046 18 11C18 9.89543 17.1046 9 16 9ZM12 11C12 8.79086 13.7909 7 16 7C18.2091 7 20 8.79086 20 11C20 13.2091 18.2091 15 16 15C13.7909 15 12 13.2091 12 11Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.5 12C6.94772 12 6.5 12.4477 6.5 13C6.5 13.5523 6.94772 14 7.5 14C8.05228 14 8.5 13.5523 8.5 13C8.5 12.4477 8.05228 12 7.5 12ZM4.5 13C4.5 11.3431 5.84315 10 7.5 10C9.15685 10 10.5 11.3431 10.5 13C10.5 14.6569 9.15685 16 7.5 16C5.84315 16 4.5 14.6569 4.5 13Z"
                  fill="black"
                ></path>
              </svg>
            </Link>
            <div className="mt-[10px] mb-[10px] w-10 border border-black"></div>
            <Link to="/calls" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg viewBox="0 0 24 24" height="20" width="20" fill="none"><path d="M6.6 10.2a15.1 15.1 0 006.2 6.2l2.1-2.1a1 1 0 011.0-.2c1.1.4 2.3.6 3.5.6a1 1 0 011 1v3.5a1 1 0 01-1 1C10.7 21 3 13.3 3 3.5A1 1 0 014 2.5H7.5a1 1 0 011 1c0 1.2.2 2.4.6 3.5.2.4 0 .9-.2 1.1L6.6 10.2z" fill="black"/></svg>
            </Link>
          </div>
{/* Bottom assets */}
          <div className="flex flex-col items-center mb-[10px]">
            {/* Icon 5 */}
            <div className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg
                viewBox="0 0 24 24"
                height="24"
                width="24"
                preserveAspectRatio="xMidYMid meet"
                className=""
                fill="none"
              >
                <title>settings-refreshed</title>
                <path
                  d="M10.825 22C10.375 22 9.98748 21.85 9.66248 21.55C9.33748 21.25 9.14165 20.8833 9.07498 20.45L8.84998 18.8C8.63331 18.7167 8.42915 18.6167 8.23748 18.5C8.04581 18.3833 7.85831 18.2583 7.67498 18.125L6.12498 18.775C5.70831 18.9583 5.29165 18.975 4.87498 18.825C4.45831 18.675 4.13331 18.4083 3.89998 18.025L2.72498 15.975C2.49165 15.5917 2.42498 15.1833 2.52498 14.75C2.62498 14.3167 2.84998 13.9583 3.19998 13.675L4.52498 12.675C4.50831 12.5583 4.49998 12.4458 4.49998 12.3375V11.6625C4.49998 11.5542 4.50831 11.4417 4.52498 11.325L3.19998 10.325C2.84998 10.0417 2.62498 9.68333 2.52498 9.25C2.42498 8.81667 2.49165 8.40833 2.72498 8.025L3.89998 5.975C4.13331 5.59167 4.45831 5.325 4.87498 5.175C5.29165 5.025 5.70831 5.04167 6.12498 5.225L7.67498 5.875C7.85831 5.74167 8.04998 5.61667 8.24998 5.5C8.44998 5.38333 8.64998 5.28333 8.84998 5.2L9.07498 3.55C9.14165 3.11667 9.33748 2.75 9.66248 2.45C9.98748 2.15 10.375 2 10.825 2H13.175C13.625 2 14.0125 2.15 14.3375 2.45C14.6625 2.75 14.8583 3.11667 14.925 3.55L15.15 5.2C15.3666 5.28333 15.5708 5.38333 15.7625 5.5C15.9541 5.61667 16.1416 5.74167 16.325 5.875L17.875 5.225C18.2916 5.04167 18.7083 5.025 19.125 5.175C19.5416 5.325 19.8666 5.59167 20.1 5.975L21.275 8.025C21.5083 8.40833 21.575 8.81667 21.475 9.25C21.375 9.68333 21.15 10.0417 20.8 10.325L19.475 11.325C19.4916 11.4417 19.5 11.5542 19.5 11.6625V12.3375C19.5 12.4458 19.4833 12.5583 19.45 12.675L20.775 13.675C21.125 13.9583 21.35 14.3167 21.45 14.75C21.55 15.1833 21.4833 15.5917 21.25 15.975L20.05 18.025C19.8166 18.4083 19.4916 18.675 19.075 18.825C18.6583 18.975 18.2416 18.9583 17.825 18.775L16.325 18.125C16.1416 18.2583 15.95 18.3833 15.75 18.5C15.55 18.6167 15.35 18.7167 15.15 18.8L14.925 20.45C14.8583 20.8833 14.6625 21.25 14.3375 21.55C14.0125 21.85 13.625 22 13.175 22H10.825ZM11 20H12.975L13.325 17.35C13.8416 17.2167 14.3208 17.0208 14.7625 16.7625C15.2041 16.5042 15.6083 16.1917 15.975 15.825L18.45 16.85L19.425 15.15L17.275 13.525C17.3583 13.2917 17.4166 13.0458 17.45 12.7875C17.4833 12.5292 17.5 12.2667 17.5 12C17.5 11.7333 17.4833 11.4708 17.45 11.2125C17.4166 10.9542 17.3583 10.7083 17.275 10.475L19.425 8.85L18.45 7.15L15.975 8.2C15.6083 7.81667 15.2041 7.49583 14.7625 7.2375C14.3208 6.97917 13.8416 6.78333 13.325 6.65L13 4H11.025L10.675 6.65C10.1583 6.78333 9.67915 6.97917 9.23748 7.2375C8.79581 7.49583 8.39165 7.80833 8.02498 8.175L5.54998 7.15L4.57498 8.85L6.72498 10.45C6.64165 10.7 6.58331 10.95 6.54998 11.2C6.51665 11.45 6.49998 11.7167 6.49998 12C6.49998 12.2667 6.51665 12.525 6.54998 12.775C6.58331 13.025 6.64165 13.275 6.72498 13.525L4.57498 15.15L5.54998 16.85L8.02498 15.8C8.39165 16.1833 8.79581 16.5042 9.23748 16.7625C9.67915 17.0208 10.1583 17.2167 10.675 17.35L11 20Z"
                  fill="black"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 13.5C12.4364 13.5 12.7527 13.3689 13.0608 13.0608C13.3689 12.7527 13.5 12.4364 13.5 12C13.5 11.5636 13.3689 11.2473 13.0608 10.9392C12.7527 10.6311 12.4364 10.5 12 10.5C11.5371 10.5 11.2247 10.6376 10.9354 10.9305C10.6328 11.2368 10.5 11.5557 10.5 12C10.5 12.4443 10.6328 12.7632 10.9354 13.0695C11.2247 13.3624 11.5371 13.5 12 13.5ZM14.475 14.475C13.7917 15.1583 12.9667 15.5 12 15.5C11.0167 15.5 10.1875 15.1583 9.5125 14.475C8.8375 13.7917 8.5 12.9667 8.5 12C8.5 11.0333 8.8375 10.2083 9.5125 9.525C10.1875 8.84167 11.0167 8.5 12 8.5C12.9667 8.5 13.7917 8.84167 14.475 9.525C15.1583 10.2083 15.5 11.0333 15.5 12C15.5 12.9667 15.1583 13.7917 14.475 14.475Z"
                  fill="black"
                ></path>
              </svg>
            </div>
            {/* Icon 6 */}
            <div
              className=" flex items-center justify-center rounded-full hover:bg-gray-100"
            >
                <Link to="/profilepage">             
                <img src={selectedImg || authUser.profilePhoto || "/avatar.png"} className="w-[50px] h-[50px] rounded-full" alt="" />
</Link>
             
            </div>
          </div>
        </div>
        <MiddleContainer isLogout={isLogout} setIsLogout={setIsLogout} />
        {/* First container for small sizes */}
        <div className="fixed border border-t-gray-100 bg-white bottom-0  pt-[15px] pb-[10px] px-[30px] w-screen xl:hidden flex items-center justify-between">
          {/* First icon */}
          <div className="flex gap-2.5 flex-col items-center">
            <svg
              viewBox="0 0 24 24"
              height="24"
              width="24"
              preserveAspectRatio="xMidYMid meet"
              className=""
              fill="none"
            >
              <title>chat-filled-refreshed</title>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M22.0002 6.66667C22.0002 5.19391 20.8062 4 19.3335 4H1.79015C1.01286 4 0.540213 4.86348 0.940127 5.53L3.00016 9V17.3333C3.00016 18.8061 4.19406 20 5.66682 20H19.3335C20.8062 20 22.0002 18.8061 22.0002 17.3333V6.66667ZM7.00016 10C7.00016 9.44772 7.44787 9 8.00016 9H17.0002C17.5524 9 18.0002 9.44772 18.0002 10C18.0002 10.5523 17.5524 11 17.0002 11H8.00016C7.44787 11 7.00016 10.5523 7.00016 10ZM8.00016 13C7.44787 13 7.00016 13.4477 7.00016 14C7.00016 14.5523 7.44787 15 8.00016 15H14.0002C14.5524 15 15.0002 14.5523 15.0002 14C15.0002 13.4477 14.5524 13 14.0002 13H8.00016Z"
                fill="black"
              ></path>
            </svg>
            <p className="text-black text-sm font-semibold">Chats</p>
          </div>
          {/* <!-- Second icon  --> */}
          <div className="flex gap-2.5 flex-col items-center"
          >
            <svg
              viewBox="0 0 24 24"
              height="24"
              width="24"
              preserveAspectRatio="xMidYMid meet"
              className=""
              fill="none"
            >
              <title>status-refreshed</title>
              <path
                d="M13.5628 3.13661C13.6587 2.59272 14.1794 2.22464 14.711 2.37436C15.7905 2.6784 16.8135 3.16254 17.736 3.80856C18.9323 4.64623 19.9305 5.73573 20.6606 7.00048C21.3907 8.26524 21.8349 9.67455 21.962 11.1294C22.0601 12.2513 21.9677 13.3794 21.6911 14.4662C21.5549 15.0014 20.9758 15.2682 20.4568 15.0792C19.9378 14.8903 19.677 14.317 19.7998 13.7785C19.9843 12.9693 20.0422 12.1343 19.9696 11.3035C19.8679 10.1396 19.5126 9.01217 18.9285 8.00036C18.3444 6.98856 17.5458 6.11696 16.5888 5.44682C15.9057 4.96842 15.1536 4.60099 14.3606 4.35609C13.8329 4.19312 13.4669 3.6805 13.5628 3.13661Z"
                fill="black"
              ></path>
              <path
                d="M18.8944 17.785C19.3175 18.14 19.3759 18.7749 18.9804 19.1604C18.1774 19.9433 17.2466 20.5872 16.2259 21.0631C14.9023 21.6802 13.4597 22 11.9993 21.9999C10.5389 21.9998 9.09633 21.6798 7.77287 21.0625C6.7522 20.5864 5.82149 19.9424 5.01855 19.1594C4.62314 18.7739 4.68167 18.1389 5.10479 17.784C5.52792 17.4291 6.15484 17.4898 6.55976 17.8654C7.16828 18.4298 7.86245 18.8974 8.61829 19.25C9.67707 19.7438 10.8312 19.9998 11.9994 19.9999C13.1677 20 14.3218 19.7442 15.3807 19.2505C16.1366 18.898 16.8308 18.4304 17.4394 17.8661C17.8444 17.4906 18.4713 17.43 18.8944 17.785Z"
                fill="black"
              ></path>
              <path
                d="M3.54277 15.0781C3.02379 15.267 2.4447 15.0001 2.30857 14.4649C2.03215 13.3781 1.9399 12.2501 2.03806 11.1283C2.16533 9.6736 2.60965 8.26443 3.33978 6.99982C4.06991 5.73521 5.06815 4.64585 6.26432 3.8083C7.1868 3.16239 8.20975 2.67832 9.28915 2.37433C9.82075 2.22461 10.3414 2.59269 10.4373 3.13659C10.5332 3.68048 10.1672 4.1931 9.6395 4.35605C8.84657 4.60092 8.09458 4.9683 7.41146 5.44662C6.45452 6.11666 5.65593 6.98815 5.07183 7.99983C4.48772 9.01152 4.13226 10.1389 4.03045 11.3026C3.95776 12.1334 4.01559 12.9683 4.19998 13.7774C4.3227 14.3159 4.06175 14.8892 3.54277 15.0781Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.0001 16C14.2092 16 16.0001 14.2091 16.0001 12C16.0001 9.79086 14.2092 8 12.0001 8C9.79092 8 8.00006 9.79086 8.00006 12C8.00006 14.2091 9.79092 16 12.0001 16ZM12.0001 18C15.3138 18 18.0001 15.3137 18.0001 12C18.0001 8.68629 15.3138 6 12.0001 6C8.68635 6 6.00006 8.68629 6.00006 12C6.00006 15.3137 8.68635 18 12.0001 18Z"
                fill="black"
              ></path>
            </svg>
            <p className="text-black text-sm font-semibold">Updates</p>
          </div>
          {/* Third icon */}
          <div className="-mt-1 gap-2.5 flex flex-col items-center">
            <svg
              viewBox="0 0 32 32"
              height="32"
              width="32"
              preserveAspectRatio="xMidYMid meet"
              className=""
              fill="none"
            >
              <title>community-refreshed-32</title>
              <path
                d="M7.85445 17.0075C7.73851 17.0026 7.62033 17 7.50003 17C6.60797 17 5.83268 17.1426 5.22106 17.3148C4.69554 17.4627 4.0988 17.7054 3.5974 18.0919C3.08634 18.4858 2.62143 19.0755 2.52966 19.8877C2.48679 20.2672 2.50003 21.0796 2.51038 21.5399C2.52882 22.3601 3.20095 23 4.00656 23H7.35217C7.15258 22.5784 7.03459 22.1084 7.01993 21.6087C7.01572 21.4651 7.00943 21.25 7.00505 21H4.50165C4.49773 20.6191 4.50034 20.2599 4.51702 20.1123C4.5308 19.9903 4.59776 19.846 4.81844 19.6759C5.04878 19.4983 5.38363 19.3468 5.7631 19.2399C6.12883 19.137 6.57191 19.0478 7.07407 19.0142C7.12499 18.6798 7.20695 18.3652 7.31207 18.0721C7.45559 17.6719 7.64219 17.3186 7.85445 17.0075Z"
                fill="black"
              ></path>
              <path
                d="M24.6478 23H27.9935C28.7991 23 29.4712 22.3601 29.4897 21.5399C29.5 21.0796 29.5133 20.2672 29.4704 19.8877C29.3786 19.0755 28.9137 18.4858 28.4027 18.0919C27.9013 17.7054 27.3045 17.4627 26.779 17.3148C26.1674 17.1426 25.3921 17 24.5 17C24.3797 17 24.2615 17.0026 24.1456 17.0075C24.3578 17.3186 24.5444 17.6719 24.6879 18.0721C24.793 18.3652 24.875 18.6798 24.9259 19.0142C25.4281 19.0478 25.8712 19.1369 26.237 19.2399C26.6164 19.3468 26.9513 19.4983 27.1816 19.6759C27.4023 19.846 27.4693 19.9903 27.483 20.1123C27.4997 20.2599 27.5023 20.6191 27.4984 21H24.9949C24.9906 21.25 24.9843 21.4651 24.9801 21.6087C24.9654 22.1084 24.8474 22.5784 24.6478 23Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16 18C14.6099 18 13.4517 18.2363 12.6506 18.4683C12.2195 18.5931 11.8437 18.7329 11.5552 18.9105C11.275 19.0829 11.1382 19.2525 11.0772 19.4224C11.0547 19.4853 11.0366 19.5555 11.0259 19.6343C10.9955 19.8585 10.996 20.4459 11.0064 21H20.9936C21.004 20.4459 21.0045 19.8585 20.9741 19.6343C20.9634 19.5555 20.9453 19.4853 20.9228 19.4224C20.8618 19.2525 20.725 19.0829 20.4448 18.9105C20.1563 18.7329 19.7805 18.5931 19.3494 18.4683C18.5483 18.2363 17.3901 18 16 18ZM12.0944 16.5472C13.0378 16.274 14.3855 16 16 16C17.6145 16 18.9622 16.274 19.9056 16.5472C20.392 16.688 20.9732 16.8873 21.493 17.2071C22.0211 17.532 22.5438 18.0181 22.8053 18.7473C22.8735 18.9373 22.9259 19.1436 22.956 19.3657C23.0234 19.8633 22.9976 20.9826 22.9809 21.5501C22.957 22.3659 22.287 23 21.4851 23H10.5149C9.71301 23 9.043 22.3659 9.01907 21.5501C9.00243 20.9826 8.97657 19.8633 9.04404 19.3657C9.07414 19.1436 9.1265 18.9373 9.19466 18.7473C9.45616 18.0181 9.97894 17.532 10.507 17.2071C11.0268 16.8873 11.608 16.688 12.0944 16.5472Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24.5 12C23.9477 12 23.5 12.4477 23.5 13C23.5 13.5523 23.9477 14 24.5 14C25.0523 14 25.5 13.5523 25.5 13C25.5 12.4477 25.0523 12 24.5 12ZM21.5 13C21.5 11.3431 22.8431 10 24.5 10C26.1569 10 27.5 11.3431 27.5 13C27.5 14.6569 26.1569 16 24.5 16C22.8431 16 21.5 14.6569 21.5 13Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16 9C14.8954 9 14 9.89543 14 11C14 12.1046 14.8954 13 16 13C17.1046 13 18 12.1046 18 11C18 9.89543 17.1046 9 16 9ZM12 11C12 8.79086 13.7909 7 16 7C18.2091 7 20 8.79086 20 11C20 13.2091 18.2091 15 16 15C13.7909 15 12 13.2091 12 11Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.5 12C6.94772 12 6.5 12.4477 6.5 13C6.5 13.5523 6.94772 14 7.5 14C8.05228 14 8.5 13.5523 8.5 13C8.5 12.4477 8.05228 12 7.5 12ZM4.5 13C4.5 11.3431 5.84315 10 7.5 10C9.15685 10 10.5 11.3431 10.5 13C10.5 14.6569 9.15685 16 7.5 16C5.84315 16 4.5 14.6569 4.5 13Z"
                fill="black"
              ></path>
            </svg>
            <p className="text-black -mt-1 text-sm font-semibold">Communities</p>
          </div>
          {/* Fourth icon */}
          <div className="flex gap-2.5 flex-col items-center">
            <img className="mb-1 w-[24px] h-[24px]" src="./image.png" alt="" />
            <p className="text-black -mt-1 text-sm font-semibold">Calls</p>
          </div>
        </div>

       
{/* Big right container */}
         {!selectedUser ? (<section className="bg-white hidden xl:block flex-1 section-card">
            {/* <!-- last container --> */}
            <div className="sticky top-0 h-screen flex flex-col justify-center items-center">
              {/* <!-- whatsapp computer image --> */}
              <img className="w-[320px]" src="./whatsappimage.png" alt="" />
              {/* <!-- heading line --> */}
              <h1 className="mt-[30px] text-4xl text-black">Download WhatsApp for Mac</h1>
              <p className="mt-[15px] text-black">
                Make calls and get a faster experience when you download the Mac
                app.
              </p>
              {/* <!-- button line --> */}
              <button className="bg-green-500 rounded-full text-sm mt-[25px] pl-[25px] pr-[25px] pt-[9px] pb-[9px]">
                Get from App Store
              </button>
              {/* <!-- footer line --> */}
              <div className="absolute bottom-10 flex items-center">
                <svg
                  viewBox="0 0 24 24"
                  height="20"
                  width="20"
                  preserveAspectRatio="xMidYMid meet"
                  className=""
                  fill="none"
                >
                  <title>lock-outline</title>
                  <path
                    d="M6.793 22.4C6.29767 22.4 5.875 22.2237 5.525 21.8712C5.175 21.5187 5 21.095 5 20.6V11C5 10.505 5.17625 10.0813 5.52875 9.72875C5.88125 9.37625 6.305 9.2 6.8 9.2H7.4V6.8C7.4 5.472 7.86858 4.34 8.80575 3.404C9.74275 2.468 10.8761 2 12.2057 2C13.5352 2 14.6667 2.468 15.6 3.404C16.5333 4.34 17 5.472 17 6.8V9.2H17.6C18.095 9.2 18.5187 9.37625 18.8712 9.72875C19.2237 10.0813 19.4 10.505 19.4 11V20.6C19.4 21.095 19.2237 21.5187 18.871 21.8712C18.5183 22.2237 18.0943 22.4 17.599 22.4H6.793ZM6.8 20.6H17.6V11H6.8V20.6ZM12.2052 17.6C12.7017 17.6 13.125 17.4233 13.475 17.0698C13.825 16.7163 14 16.2913 14 15.7948C14 15.2983 13.8232 14.875 13.4697 14.525C13.1162 14.175 12.6912 14 12.1947 14C11.6982 14 11.275 14.1767 10.925 14.5302C10.575 14.8837 10.4 15.3087 10.4 15.8052C10.4 16.3017 10.5767 16.725 10.9302 17.075C11.2837 17.425 11.7087 17.6 12.2052 17.6ZM9.2 9.2H15.2V6.8C15.2 5.96667 14.9083 5.25833 14.325 4.675C13.7417 4.09167 13.0333 3.8 12.2 3.8C11.3667 3.8 10.6583 4.09167 10.075 4.675C9.49167 5.25833 9.2 5.96667 9.2 6.8V9.2Z"
                    fill="black"
                  ></path>
                </svg>
                <p className="text-sm text-black">
                  Your personal messages are end-to-end encrypted
                </p>
              </div>
            </div>
          </section>):(<section className="flex-1 xl:block hidden h-full bg-white">
            {/* Profile popup anchored under clicked avatar */}
            {showImage?.visible && (showImage.mode === 'profile' || showImage.mode === 'mobile') && (
              <div>
                {/* backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowImage(false)} />

                {/* anchored popup or mobile-centered */}
                <div
                  ref={popupRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${displayName} profile`}
                  tabIndex={-1}
                  className={`fixed z-50 bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-200 ${showImage.mode === 'mobile' ? 'mx-4' : ''}`}
                  style={{
                    width: showImage?.mode === 'mobile' ? 'calc(100% - 2rem)' : '500px',
                    height: showImage?.mode === 'mobile' ? 'auto' : '550px',
                    left: showImage?.mode === 'mobile' ? '50%' : (() => {
                      const a = showImage?.anchor;
                      if (!a) return '8px';
                      const left = a.left;
                      const maxLeft = window.innerWidth - 520;
                      return Math.min(left, Math.max(8, maxLeft)) + 'px';
                    })(),
                    top: (() => {
                      const a = showImage?.anchor;
                      if (!a) return '10%';
                      if (showImage?.mode === 'mobile') return '10%';
                      const top = a.bottom + 8; // place below avatar
                      const maxTop = window.innerHeight - 820;
                      return Math.min(top, Math.max(8, maxTop)) + 'px';
                    })(),
                    transform: showImage?.mode === 'mobile' ? 'translate(-50%,0)' : undefined,
                  }}
                >
                  {/* header - rounded top and actions */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <img
                        onClick={() => setShowPreview(true)}
                        src={selectedUser?.profilePhoto || '/avatar.png'}
                        alt="profile"
                        className="w-16 h-16 rounded-full object-cover cursor-pointer border"
                      />
                      <div>
                        <div className="font-semibold">{displayName}</div>
                        <div className="text-xs text-gray-500">{selectedUser?.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      {!editingNickname ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Edit name: light green background to stand out */}
                          <button
                            className="btn btn-sm px-3 py-1 bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                            onClick={() => { setEditingNickname(true); }}
                            aria-label="Edit display name"
                          >
                            Edit name
                          </button>

                          {/* Block / Unblock */}
                          {isBlocked ? (
                            <button className="btn btn-ghost btn-sm" onClick={handleUnblock}>Unblock</button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" onClick={handleBlock}>Block</button>
                          )}

                          {/* Delete chat - red */}
                          <button className="btn btn-sm btn-error" onClick={handleDeleteChat}>Delete chat</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} className="input input-sm border rounded px-2 py-1" placeholder="Nickname" />
                          <button className="btn btn-primary btn-sm" onClick={handleSaveNickname}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingNickname(false); setNicknameInput(getNickname(selectedUser?._id) || ''); }}>Cancel</button>
                        </div>
                      )}

                      {/* Close placed at the end for clarity */}
                      <div className="ml-auto">
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowImage(false)} aria-label="Close profile">Close</button>
                      </div>
                    </div>
                  </div>

                  {/* body */}
                  <div className="p-4 h-full flex flex-col">
                    <div className="mb-3">
                      <div className="text-sm text-gray-700">{selectedUser?.about || selectedUser?.description || 'No description available.'}</div>
                    </div>

                    {/* mutual friends */}
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold mb-2">Mutual friends</h4>
                      <div className="flex gap-2 items-center">
                        {mutualFriends && mutualFriends.length > 0 ? (
                          mutualFriends.slice(0,6).map(u => (
                            <div key={u._id} className="flex flex-col items-center text-xs">
                              <img src={u.profilePhoto || '/avatar.png'} alt="mf" className="w-10 h-10 rounded-full" />
                              <div className="mt-1">{u.fullName || u.username}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No mutual friends</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 px-2 flex-1 overflow-y-auto">
                      {/* additional details area; keeps layout balanced */}
                      <div className="text-xs text-gray-500">Joined: {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 500x500 square preview when image clicked inside popup */}
            {showPreview && (
              <div className="fixed inset-0 z-60 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70" onClick={() => setShowPreview(false)} />
                <div className="relative z-70 bg-white shadow-lg rounded-md transform transition-all duration-200 scale-95">
                  <img src={selectedUser?.profilePhoto || '/avatar.png'} alt="preview" style={{ width: '500px', height: '500px', objectFit: 'cover' }} />
                  <button onClick={() => setShowPreview(false)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-200">
                    <X className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
            )}
          <div className="sticky top-0 z-10">
          <Chatheader closeLogoutDropdown={closeLogoutDropdown} />
</div>
            {/* Scrolling chat box */}
            <div className=" w-full px-3 pb-[80px] h-screen flex flex-col overflow-y-scroll ">
             
              {messages.map((message) => {
          const senderId = message.sender?._id || message.sender;
          const isMine = senderId === authUser?._id;
          const attachment = message.attachments && message.attachments.length ? message.attachments[0] : null;
          return (
            <div key={message._id} className={`chat ${isMine ? 'chat-end' : 'chat-start'}`} ref={messageEndRef}>
              <div className="relative group" onClick={(e) => { if (isTouchDevice) { e.stopPropagation(); setOpenPickerFor(openPickerFor === message._id ? null : message._id); } }}>
                <div className={`chat-bubble ${isMine ? 'bg-green-300 text-white' : 'bg-gray-100 text-black'} flex flex-col`}>
                  {attachment && attachment.type?.startsWith('image') && (
                    <img src={attachment.url} alt={attachment.filename || 'Attachment'} className="sm:max-w-[200px] rounded-md mb-2" />
                  )}
                  {message.content && <p>{message.content}</p>}
                  <div className="chat-header mb-1 flex justify-end">
                    <time className="text-xs">{formatMessageTime(message.createdAt)}</time>
                  </div>
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 items-center">
                      {message.reactions.map(r => {
                        const reactedByMe = Array.isArray(r.userIds) && r.userIds.some(u => String(u) === String(authUser?._id));
                        const key = `${message._id}-${r.emoji}`;
                        return (
                          <div
                            key={key}
                            onMouseEnter={() => handleHoverReactors(r.userIds, message._id, r.emoji)}
                            onMouseLeave={() => setHoveredReactors(null)}
                            onClick={() => openReactorModal(r.userIds, message._id, r.emoji)}
                            onDoubleClick={(ev) => {
                              // allow user to double-click their own reaction to toggle it off
                              ev.stopPropagation();
                              if (reactedByMe) {
                                reactToMessage(message._id, r.emoji);
                              }
                            }}
                            className={`relative text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer ${reactedByMe ? 'bg-green-200 text-black border border-green-300' : 'bg-white/20 text-black'} hover:opacity-90`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.userIds?.length || 0}</span>

                            {/* inline tooltip showing first few reactor names on hover */}
                            {hoveredReactors && hoveredReactors.messageId === message._id && hoveredReactors.emoji === r.emoji && hoveredReactors.users && hoveredReactors.users.length > 0 && (
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                                {hoveredReactors.users.slice(0,3).map(u => u.username || u.email).join(', ')}{hoveredReactors.users.length > 3 ? ` +${hoveredReactors.users.length - 3}` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* emoji bar shown on hover with quick reactions and a + button for full picker */}
                <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${isMine ? 'right-0' : 'left-full -translate-x-2'}`}>
                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                    {['👍','❤️','😂','😮','😢','👏','🎉','🔥'].map((e) => (
                      <button
                        key={e}
                        onClick={(ev) => { ev.stopPropagation(); handleSelectEmojiForMessage(message._id, e); }}
                        className="text-base px-1 py-0.5 hover:bg-gray-100 rounded"
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setOpenPickerFor(openPickerFor === message._id ? null : message._id); }}
                      className="text-sm px-2 py-0.5 hover:bg-gray-100 rounded"
                      title="More emojis"
                    >
                      +
                    </button>
                  </div>

                  {openPickerFor === message._id && (
                    <div className={`${isMine ? 'absolute right-0 top-full mt-2 z-50' : 'absolute left-0 top-full mt-2 z-50'}`}>
                      <EmojiPicker onSelect={(emoji) => { handleSelectEmojiForMessage(message._id, emoji); setOpenPickerFor(null); }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
            </div>
          {/* Inline search removed - search is now handled in the left/top sidebar (MiddleContainer) */}
           <div className="h-24" />

           {/* Reactor modal - shows full list when reaction badge clicked (also useful on touch) */}
           {reactorModal && (
             <div className="fixed inset-0 z-60 flex items-center justify-center">
               <div className="absolute inset-0 bg-black opacity-40" onClick={() => setReactorModal(null)} />
               <div className="relative z-70 bg-white rounded shadow-lg p-4 w-[320px] max-w-[90%]">
                 <div className="mb-2">
                   <h3 className="font-semibold">Reacted with {reactorModal.emoji}</h3>
                   <div className="text-sm text-gray-500">{reactorModal.users ? reactorModal.users.length : 0} people</div>
                 </div>
                 <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                   {/* No avatars / per-user details shown by design (privacy) */}
                   {reactorModal.users && reactorModal.users.length > 0 ? (
                     <div className="text-sm text-gray-700">{reactorModal.users.map(u => u.username || u.email).join(', ')}</div>
                   ) : (
                     <div className="text-sm text-gray-500">No users</div>
                   )}
                 </div>
               </div>
             </div>
           )}

           <MessageInput/>
          </section>)}
         
      </section>
    </>
  );
};

export default Whatsapp;

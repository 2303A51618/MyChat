import React from "react";
import { useEffect,useRef,useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../Store/useChatStore";
import { useAuthStore } from "../Store/useAuthStore";
import toast from "react-hot-toast";
import { Image, Send, X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import useDebounce from "../lib/useDebounce";



const Chatpage = () => {
  const { selectedUser } = useChatStore();
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const params = useParams();
  const navigate = useNavigate();
    const { onlineUsers } = useAuthStore();
    const [showName, setShowName]=useState(false);
const [showImage,setShowImage]=useState(false);
  const {
    messages,
  } = useChatStore();
  const messageEndRef = useRef(null);
  const { authUser } = useAuthStore();
  const [text, setText] = useState("");
  // search state
  const [searchQ, setSearchQ] = useState("");
  const debouncedQ = useDebounce(searchQ, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleShowName=()=>{
    setShowName(!showName);
  }
  const handleShowImage=()=>{
    setShowImage(!showImage);
    setShowName(false);
  }

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // If route contains group id, fetch group details and open it
  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    // avoid reloading if selectedUser is already set to this group
    if (selectedUser && (String(selectedUser._id) === String(id) || (selectedUser.isGroup && String(selectedUser._id) === String(id)))) return;
    (async () => {
      try {
        const res = await axiosInstance.get(`/groups/${encodeURIComponent(id)}`);
        const g = res.data && (res.data.group || res.data) ? (res.data.group || res.data) : null;
        if (!g) return;
        const groupObj = { _id: g._id || g.id, fullName: g.name, isGroup: true, name: g.name, rawGroup: g };
        await setSelectedUser(groupObj);
      } catch (err) {
        console.error('Failed to open group from route', err);
        // if group not found, navigate back to home
        navigate('/');
      }
    })();
  }, [params?.id, navigate, selectedUser, setSelectedUser]);

  useEffect(() => {
    const q = debouncedQ?.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsSearching(true);
      try {
    const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(q)}`);
    if (cancelled) return;
    const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
    const safeUsers = Array.isArray(users) ? users : [];
    setSearchResults(safeUsers);
    setHighlightedIndex(safeUsers.length ? 0 : -1);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search users error', err);
        toast.error('Search failed');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedQ]);

  const handleSelectSearchUser = async (user) => {
    try {
      // set selected user which will load messages and join room
      await setSelectedUser(user);
      setSearchQ("");
      setSearchResults([]);
      setShowSearchResults(false);
      // focus the message input so user can type immediately
      setTimeout(() => {
        if (messageInputRef.current && typeof messageInputRef.current.focus === 'function') {
          messageInputRef.current.focus();
        }
      }, 50);
    } catch (err) {
      console.error('Select user error', err);
      toast.error('Could not open chat');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchResults) return;
    const max = (searchResults && searchResults.length) - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < max ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : max));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      const user = searchResults[idx];
      if (user) {
        handleSelectSearchUser(user);
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  
  return (
    <section className="flex-1 block xl:hidden h-screen bg-white overflow-y-scroll">
    <div className="sticky top-0 z-10">

      {/* Chatheader Area of Scrolling Box */}
      <div className="flex justify-between items-center pl-[15px] pt-[10px] pb-[10px] bg-white z-10">
              {/* <!-- Left Content Box --> */}
              <div className="flex items-center gap-4">
                {/* <!-- Image Box --> */}
                <div onClick={handleShowImage}>
                <img  className="w-[35px] h-[35px] rounded-full" src= {selectedUser?.profilePhoto || "/avatar.png"} alt="" />
                </div>
                
                 
                {/* <!-- Name Box --> */}
                <div onClick={handleShowName}>
                  <h1 className="text-black truncate max-w-[120px]">{selectedUser?.fullName}</h1>
                  <div className="text-black text-xs"> {onlineUsers?.includes(selectedUser?._id) ? "Online" : "Offline"}</div>

                </div>
                
              </div>
              {/* <!--  right box --> */}
              <div className="flex items-center gap-[20px] mr-[20px]">
                {/* <!-- video camera box --> */}
                <div className="flex gap-[2px]">
                  {/* <!-- video camera icon --> */}
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    className=""
                    fill="none"
                  >
                    <title>video-call-refreshed</title>
                    <path
                      d="M4 20C3.45 20 2.97917 19.8042 2.5875 19.4125C2.19583 19.0208 2 18.55 2 18V6C2 5.45 2.19583 4.97917 2.5875 4.5875C2.97917 4.19583 3.45 4 4 4H16C16.55 4 17.0208 4.19583 17.4125 4.5875C17.8042 4.97917 18 5.45 18 6V10.5L21.15 7.35C21.3167 7.18333 21.5 7.14167 21.7 7.225C21.9 7.30833 22 7.46667 22 7.7V16.3C22 16.5333 21.9 16.6917 21.7 16.775C21.5 16.8583 21.3167 16.8167 21.15 16.65L18 13.5V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H4ZM4 18H16V6H4V18Z"
                      fill="black"
                    ></path>
                  </svg>
                  {/* <!-- down arrow icon --> */}
                  <svg
                    viewBox="0 0 20 20"
                    height="20"
                    preserveAspectRatio="xMidYMid meet"
                    className=""
                    fill="none"
                  >
                    <title>ic-chevron-down-menu</title>
                    <path
                      d="M9.99971 12.1L14.8997 7.2C15.083 7.01667 15.3164 6.925 15.5997 6.925C15.883 6.925 16.1164 7.01667 16.2997 7.2C16.483 7.38333 16.5747 7.61667 16.5747 7.9C16.5747 8.18333 16.483 8.41667 16.2997 8.6L10.6997 14.2C10.4997 14.4 10.2664 14.5 9.99971 14.5C9.73304 14.5 9.49971 14.4 9.29971 14.2L3.69971 8.6C3.51637 8.41667 3.42471 8.18333 3.42471 7.9C3.42471 7.61667 3.51637 7.38333 3.69971 7.2C3.88304 7.01667 4.11637 6.925 4.39971 6.925C4.68304 6.925 4.91637 7.01667 5.09971 7.2L9.99971 12.1Z"
                      fill="black"
                    ></path>
                  </svg>
                </div>
                  {/* Search input */}
                <div className="relative w-[200px]">
                  <form onSubmit={(e) => e.preventDefault()} className="w-full">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onFocus={() => setShowSearchResults(true)}
                      onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search user..."
                      className="bg-gray-100 w-[200px] h-[36px] rounded-full pl-3 pr-3 border outline-none text-sm"
                    />
                  </form>

                  {/* results dropdown */}
                  {showSearchResults && (searchResults.length > 0 || isSearching) && (
                    <div className="absolute left-0 top-full mt-2 bg-white border rounded-md shadow-md w-[220px] z-50 max-h-52 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-2 text-sm text-gray-500">Searching...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No users</div>
                      ) : (
                          searchResults.map((u, idx) => (
                            <button
                              key={u._id}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                              onClick={() => handleSelectSearchUser(u)}
                              className={`w-full text-left p-2 hover:bg-gray-50 flex items-center gap-2 ${highlightedIndex === idx ? 'bg-gray-100' : ''}`}
                            >
                              <img src={u.profilePhoto || '/avatar.png'} alt="" className="w-8 h-8 rounded-full" />
                              <div className="text-sm">
                                <div className="font-medium">{u.username || u.fullName || u.email}</div>
                                <div className="text-xs text-gray-500">{u.email}</div>
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
                  {/* <!-- three dots icon --> */}
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    className=""
                    fill="none"
                  >
                    <title>more-refreshed</title>
                    <path
                      d="M12 20C11.45 20 10.9792 19.8042 10.5875 19.4125C10.1958 19.0208 10 18.55 10 18C10 17.45 10.1958 16.9792 10.5875 16.5875C10.9792 16.1958 11.45 16 12 16C12.55 16 13.0208 16.1958 13.4125 16.5875C13.8042 16.9792 14 17.45 14 18C14 18.55 13.8042 19.0208 13.4125 19.4125C13.0208 19.8042 12.55 20 12 20ZM12 14C11.45 14 10.9792 13.8042 10.5875 13.4125C10.1958 13.0208 10 12.55 10 12C10 11.45 10.1958 10.9792 10.5875 10.5875C10.9792 10.1958 11.45 10 12 10C12.55 10 13.0208 10.1958 13.4125 10.5875C13.8042 10.9792 14 11.45 14 12C14 12.55 13.8042 13.0208 13.4125 13.4125C13.0208 13.8042 12.55 14 12 14ZM12 8C11.45 8 10.9792 7.80417 10.5875 7.4125C10.1958 7.02083 10 6.55 10 6C10 5.45 10.1958 4.97917 10.5875 4.5875C10.9792 4.19583 11.45 4 12 4C12.55 4 13.0208 4.19583 13.4125 4.5875C13.8042 4.97917 14 5.45 14 6C14 6.55 13.8042 7.02083 13.4125 7.4125C13.0208 7.80417 12.55 8 12 8Z"
                      fill="black"
                    ></path>
                  </svg>
                 

                </div>
              </div>
              </div>
{/* Toggle Full Name Bar */}
<div className={`absolute transition-all duration-300 ${showName ? "opacity-100 translate-y-0":"opacity-0 -translate-y-full"}`}>
<div  className="border w-fit ml-16 p-2 rounded-lg shadow-md">
{selectedUser?.fullName}
              </div>
              </div>
              {/* Centered Image With Darker Overlay */}
<div className={`fixed inset-0 flex items-center justify-center z-20 transition-all duration-300 ${showImage?"opacity-100 scale-100":"opacity-0 scale-0"}`}>
  {/* Overlay With Higher Opacity And Blur */}
  <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm"></div>

  {/* Image Box */}
  <div className="relative z-30">
    <img
      className="w-[300px] h-[300px] rounded-full"
      src={selectedUser?.profilePhoto || "/avatar.png"}
      alt=""
    />
    <button
      onClick={() => setShowImage(false)}
      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-200"
    >
      <X className="w-5 h-5 text-black" />
    </button>
  </div>
</div>

        

        {/* Scrolling Chat Box (messages start below an absolute banner) */}
      <div className="w-full px-3 pb-[80px] pt-[72px] relative flex flex-col justify-end overflow-y-scroll">

        {/* Absolute top-center encryption banner (green box area) */}
        {(!messages || messages.length === 0) && (
          <div className="absolute left-1/2 transform -translate-x-1/2 top-4 z-10">
            <div role="status" aria-live="polite" className="flex items-center gap-3 bg-white px-4 py-2 rounded-md shadow-sm">
              <svg
                viewBox="0 0 24 24"
                height="18"
                width="18"
                preserveAspectRatio="xMidYMid meet"
                className="text-green-700"
                fill="none"
              >
                <title>lock-outline</title>
                <path
                  d="M6.793 22.4C6.29767 22.4 5.875 22.2237 5.525 21.8712C5.175 21.5187 5 21.095 5 20.6V11C5 10.505 5.17625 10.0813 5.52875 9.72875C5.88125 9.37625 6.305 9.2 6.8 9.2H7.4V6.8C7.4 5.472 7.86858 4.34 8.80575 3.404C9.74275 2.468 10.8761 2 12.2057 2C13.5352 2 14.6667 2.468 15.6 3.404C16.5333 4.34 17 5.472 17 6.8V9.2H17.6C18.095 9.2 18.5187 9.37625 18.8712 9.72875C19.2237 10.0813 19.4 10.505 19.4 11V20.6C19.4 21.095 19.2237 21.5187 18.871 21.8712C18.5183 22.2237 18.0943 22.4 17.599 22.4H6.793ZM6.8 20.6H17.6V11H6.8V20.6ZM12.2052 17.6C12.7017 17.6 13.125 17.4233 13.475 17.0698C13.825 16.7163 14 16.2913 14 15.7948C14 15.2983 13.8232 14.875 13.4697 14.525C13.1162 14.175 12.6912 14 12.1947 14C11.6982 14 11.275 14.1767 10.925 14.5302C10.575 14.8837 10.4 15.3087 10.4 15.8052C10.4 16.3017 10.5767 16.725 10.9302 17.075C11.2837 17.425 11.7087 17.6 12.2052 17.6ZM9.2 9.2H15.2V6.8C15.2 5.96667 14.9083 5.25833 14.325 4.675C13.7417 4.09167 13.0333 3.8 12.2 3.8C11.3667 3.8 10.6583 4.09167 10.075 4.675C9.49167 5.25833 9.2 5.96667 9.2 6.8V9.2Z"
                  fill="darkgreen"
                ></path>
              </svg>
              <p className="text-sm text-black">
                Your personal messages are <span className="text-green-800 font-bold">end-to-end encrypted</span>
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const senderId = message.sender?._id || message.sender;
          const isMine = senderId === authUser?._id;
          const attachment = message.attachments && message.attachments.length ? message.attachments[0] : null;
          return (
            <div key={message._id} className={`chat ${isMine ? 'chat-end' : 'chat-start'}`} ref={messageEndRef}>
              <div className={`chat-bubble ${isMine ? 'bg-green-300 text-white' : 'bg-gray-100 text-black'} flex flex-col`}>
                {attachment && attachment.type?.startsWith('image') && (
                  <img src={attachment.url} alt={attachment.filename || 'Attachment'} className="max-w-[200px] rounded-md mb-2" />
                )}
                {message.content && <p>{message.content}</p>}
                <div className="chat-header mb-1 flex justify-end">
                  <time className="text-xs">{formatMessageTime(message.createdAt)}</time>
                </div>
                {/* reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {message.reactions.map(r => (
                      <div key={r.emoji} className="text-xs bg-white/20 px-2 py-1 rounded-full">{r.emoji} {r.userIds?.length || 0}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input for Phone */}

      <div>
      <div className="">
      {imagePreview && (
  <div className="fixed bottom-[70px] left-1/2 transform -translate-x-1/2 z-20">
    <div className="relative bg-green-400 rounded-md p-2 border">
      <img
        src={imagePreview}
        alt="Preview"
        className="w-32 h-32 object-cover rounded-md"
      />
      <button
        onClick={removeImage}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow hover:bg-gray-200"
      >
        <X className="w-4 h-4 text-black" />
      </button>
    </div>
  </div>
)}
      </div>
      
       {/* Bottom message */}
       <div className="fixed w-full bottom-3 pl-[10px] pr-[10px] flex justify-center">
       
      <form className="w-full" onSubmit={handleSendMessage}>
              <div className="relative w-full">
                {/* <!-- Left SVG inside input --> */}
                <div 
                     className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 ">
                  <svg 
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    
                    fill="none"
                  >
                    <title>expressions</title>
                    <path
                      d="M8.49893 10.2521C9.32736 10.2521 9.99893 9.5805 9.99893 8.75208C9.99893 7.92365 9.32736 7.25208 8.49893 7.25208C7.6705 7.25208 6.99893 7.92365 6.99893 8.75208C6.99893 9.5805 7.6705 10.2521 8.49893 10.2521Z"
                      fill="black"
                    ></path>
                    <path
                      d="M17.0011 8.75208C17.0011 9.5805 16.3295 10.2521 15.5011 10.2521C14.6726 10.2521 14.0011 9.5805 14.0011 8.75208C14.0011 7.92365 14.6726 7.25208 15.5011 7.25208C16.3295 7.25208 17.0011 7.92365 17.0011 8.75208Z"
                      fill="black"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.8221 19.9799C15.5379 21.2537 13.8087 21.9781 12 22H9.27273C5.25611 22 2 18.7439 2 14.7273V9.27273C2 5.25611 5.25611 2 9.27273 2H14.7273C18.7439 2 22 5.25611 22 9.27273V11.8141C22 13.7532 21.2256 15.612 19.8489 16.9776L16.8221 19.9799ZM14.7273 4H9.27273C6.36068 4 4 6.36068 4 9.27273V14.7273C4 17.6393 6.36068 20 9.27273 20H11.3331C11.722 19.8971 12.0081 19.5417 12.0058 19.1204L11.9935 16.8564C11.9933 16.8201 11.9935 16.784 11.9941 16.7479C11.0454 16.7473 10.159 16.514 9.33502 16.0479C8.51002 15.5812 7.84752 14.9479 7.34752 14.1479C7.24752 13.9479 7.25585 13.7479 7.37252 13.5479C7.48919 13.3479 7.66419 13.2479 7.89752 13.2479L13.5939 13.2479C14.4494 12.481 15.5811 12.016 16.8216 12.0208L19.0806 12.0296C19.5817 12.0315 19.9889 11.6259 19.9889 11.1248V9.07648H19.9964C19.8932 6.25535 17.5736 4 14.7273 4ZM14.0057 19.1095C14.0066 19.2605 13.9959 19.4089 13.9744 19.5537C14.5044 19.3124 14.9926 18.9776 15.4136 18.5599L18.4405 15.5576C18.8989 15.1029 19.2653 14.5726 19.5274 13.996C19.3793 14.0187 19.2275 14.0301 19.0729 14.0295L16.8138 14.0208C15.252 14.0147 13.985 15.2837 13.9935 16.8455L14.0057 19.1095Z"
                      fill="black"
                    ></path>
                  </svg>
                  
                </div>
                

                {/* Right svg inside input */}
                <div onClick={() => fileInputRef.current?.click()} className={`absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}>
                  <svg
                    viewBox=" 0 0 24 24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    className="x11xpdln x1d8287x x1h4ghdb"
                    fill="none"
                  >
                    <title>plus-rounded</title>
                    <path
                      d="M11 13H5.5C4.94772 13 4.5 12.5523 4.5 12C4.5 11.4477 4.94772 11 5.5 11H11V5.5C11 4.94772 11.4477 4.5 12 4.5C12.5523 4.5 13 4.94772 13 5.5V11H18.5C19.0523 11 19.5 11.4477 19.5 12C19.5 12.5523 19.0523 13 18.5 13H13V18.5C13 19.0523 12.5523 19.5 12 19.5C11.4477 19.5 11 19.0523 11 18.5V13Z"
                      fill="black"
                    ></path>
                  </svg>
                </div>
                {/* Mic icon svg */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {(text.trim() || imagePreview) ? (
    <button
      type="submit"
      className="btn btn-sm btn-circle text-white shadow-none bg-green-400 border-none"
      disabled={!text.trim() && !imagePreview}

    >
      <Send size={22} />
    </button>
  ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      preserveAspectRatio="xMidYMid meet"
                      className=""
                    >
                      <title>mic-outlined</title>
                      <path
                        d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM12 21C11.4477 21 11 20.5523 11 20V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.78727 14.5396 5.24207 13.3387 5.06441 11.9973C4.9919 11.4498 5.44772 11 6 11C6.55228 11 6.98782 11.4518 7.0905 11.9945C7.27271 12.9574 7.73004 13.805 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.27 13.805 16.7273 12.9574 16.9095 11.9945C17.0122 11.4518 17.4477 11 18 11C18.5523 11 19.0081 11.4498 18.9356 11.9973C18.7579 13.3387 18.2127 14.5396 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V20C13 20.5523 12.5523 21 12 21ZM12 12C12.2833 12 12.5208 11.9042 12.7125 11.7125C12.9042 11.5208 13 11.2833 13 11V5C13 4.71667 12.9042 4.47917 12.7125 4.2875C12.5208 4.09583 12.2833 4 12 4C11.7167 4 11.4792 4.09583 11.2875 4.2875C11.0958 4.47917 11 4.71667 11 5V11C11 11.2833 11.0958 11.5208 11.2875 11.7125C11.4792 11.9042 11.7167 12 12 12Z"
                        fill=""
                      ></path>
                    </svg>
                  </div>
  )}
                </div>
                <input ref={messageInputRef} onChange={(e) => setText(e.target.value)}
                  type="text"
                  value={text}
                  className="h-[55px] pl-[95px] w-full pr-[50px] border rounded-full bg-white text-black"
                  placeholder="Type a message"
                />
                 <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          /></div>
                
              </form>
            </div>
    </div>
    </section>
  );
};

export default Chatpage;

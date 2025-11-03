import React from 'react'
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../Store/useAuthStore';
import { useChatStore } from "../Store/useChatStore";
import { Link } from "react-router-dom";
import axios from "axios";
import AddFriendModal from './AddFriendModal';


const MiddleContainer = ({isLogout, setIsLogout}) => {
  const {getUsers, users, setSelectedUser } = useChatStore();
  const [showAddFriend, setShowAddFriend] = useState(false);

    const { onlineUsers } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedChats, setSelectedChats] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
const [filteredUsers, setFilteredUsers] = useState([]);
const dropdownRef = useRef(null); // ✅ Ref for dropdown

useEffect(() => {
  let filtered = users;

  // 🔍 Filter by search term (both online & offline users)
  if (searchTerm.trim() !== "") {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(user =>
      (user && (user.fullName || "")).toLowerCase().includes(q)
    );
  }

  // 🟢 If "Show Online Only" toggle is active
  if (showOnlineOnly) {
    filtered = filtered.filter(user => (onlineUsers || []).includes(user._id));
  }

  setFilteredUsers(filtered);
}, [users, showOnlineOnly, onlineUsers, searchTerm]);

    useEffect(() => {
        getUsers();
      }, [getUsers]);
      useEffect(() => {
        setFilteredUsers(showOnlineOnly ? users.filter(u => (onlineUsers || []).includes(u._id)) : users);
      }, [users, showOnlineOnly, onlineUsers]);
      useEffect(() => {
        const handleClickOutside = (event) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsLogout(false); // hide dropdown
          }
        };
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, [setIsLogout]);
    const { logout } = useAuthStore();

    const handleLogoutState=()=>{
        setIsLogout(!isLogout);
      }  

      const handleOnlineUsers=()=>{
        setShowOnlineOnly(!showOnlineOnly);
      }

      const toggleDeleteMode=()=>{
        setIsDeleteMode(!isDeleteMode);
        setSelectedChats([]);
      }

      const handleCheckboxChange = (userId) => {
        if (selectedChats.includes(userId)) {
          setSelectedChats(selectedChats.filter((id) => id !== userId));
        } else {
          setSelectedChats([...selectedChats, userId]);
        }
      };
     
      const handleDeleteSelected = async () => {
        try {
          if (!selectedChats.length) return;
      
          // Prefer explicit VITE_API_URL in production; otherwise fall back to localhost in dev
          const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5001" : window.location.origin);

    const response = await axios.post(
      `${baseURL}/api/messages/delete-chats`,
      { userIds: selectedChats },
      { withCredentials: true }
    );
      
          if (!response || response.status !== 200 || !response.data) {
            console.error("Deletion failed: invalid response", response);
            return;
          }
      
          const deletedIds = response.data.deletedUserIds || [];
      
          const updatedUsers = users.filter(user => !deletedIds.includes(user._id));
          useChatStore.setState({ users: updatedUsers });
      
          const updatedFiltered = showOnlineOnly
            ? updatedUsers.filter(u => (onlineUsers || []).includes(u._id))
            : updatedUsers;
          setFilteredUsers(updatedFiltered);
      
          setSelectedChats([]);
          setIsDeleteMode(false);
      
          console.log("✅ Deleted chat cards and messages:", deletedIds);
        } catch (error) {
          console.error("❌ Error deleting chats:", error);
          alert("Failed to delete chats. Check server logs.");
        }
      };
      
  return (
    <>
    {/* Middle container */}
  <div className="sticky top-0 h-screen overflow-y-scroll pb-[200px] w-screen xl:w-[430px] bg-white border border-l-0 border-r-gray-100 border-y-0 section-card">
    {/* Upper container */}
    <div className="sticky top-0 bg-white border border-x-0 border-t-0 border-b-gray-100 pt-4 pb-[5px] px-3">
    
      {/* Upper bar */}
      <div className="flex justify-between items-center h-[30px] ">
        {/* Left whatsapp logo */}
        <div>
          <svg
            viewBox="0 0 104 28"
            height="28"
            width="104"
            preserveAspectRatio="xMidYMid meet"
            className=""
            fill="none"
          >
            <title>wa-wordmark-refreshed</title>
            <path
              d="m13.07 21.343-2.681-10.767h-.045L7.708 21.343H4.186L0 5.523h2.981L5.84 17.621h.05L8.973 5.523h2.828l2.997 12.098h.019L17.86 5.523h2.915l-4.252 15.82h-3.456zm21.602-9.771q.486-.732 1.24-1.173a5.4 5.4 0 0 1 1.696-.632c.626-.125 1.079-.188 1.713-.188q.863 0 1.749.122c.59.081.965.24 1.453.476q.729.356 1.194.987.466.63.466 1.672v5.96q0 .778.09 1.484.086.71.31 1.063H41.56a4 4 0 0 1-.144-.543 5 5 0 0 1-.078-.565 4.1 4.1 0 0 1-1.773 1.088 7.1 7.1 0 0 1-2.08.309c-.547 0-.891-.066-1.364-.2a3.5 3.5 0 0 1-1.24-.622 2.9 2.9 0 0 1-.83-1.064q-.3-.642-.3-1.529 0-.975.342-1.606.344-.632.886-1.01.544-.377 1.241-.563c.465-.126.769-.225 1.241-.3q.71-.108 1.395-.178c.458-.043 1.03-.109 1.384-.198q.532-.132.84-.389.31-.254.288-.742 0-.507-.167-.808-.165-.3-.443-.466c-.185-.11-.565-.183-.808-.221a5 5 0 0 0-.786-.055c-.622 0-1.246.132-1.6.398q-.532.4-.622 1.33h-2.827q.066-1.107.553-1.839zm6.034 4.442a5 5 0 0 1-.643.167q-.342.065-.72.111t-.752.11c-.236.045-.635.105-.863.178a2.1 2.1 0 0 0-.598.299q-.256.19-.41.476-.154.287-.155.732c0 .296.053.515.155.707a1.2 1.2 0 0 0 .422.455q.264.166.62.23.355.069.73.069c.621 0 1.43-.104 1.77-.311q.508-.31.753-.742.244-.43.3-.876.056-.44.056-.709v-1.173c-.134.119-.465.21-.663.276zm32.818-.899L71.26 8.523h-.076l-2.337 6.587 4.679.005zm-.816-9.592 5.913 15.82h-2.955l-1.43-4.215h-6.098l-1.482 4.215h-2.909l5.98-15.82zM86.179 18.97q.522-.308.842-.807.32-.498.455-1.164.13-.665.13-1.35.001-.686-.143-1.353a3.6 3.6 0 0 0-.476-1.185 2.64 2.64 0 0 0-.853-.841q-.52-.323-1.275-.323c-.502 0-.948.11-1.293.323q-.523.32-.843.83a3.5 3.5 0 0 0-.455 1.174q-.133.664-.132 1.374c0 .474.046.907.144 1.35q.144.664.464 1.163.323.5.853.808.532.31 1.284.311c.502 0 .949-.104 1.294-.31zm-4.074-9.082v1.463h.044q.575-.93 1.461-1.352c.59-.281 1.075-.42 1.784-.42.9 0 1.508.169 2.16.509q.975.509 1.616 1.352t.953 1.96q.309 1.12.31 2.338-.001 1.152-.31 2.217a5.7 5.7 0 0 1-.942 1.882 4.65 4.65 0 0 1-1.573 1.307c-.628.324-1.197.488-2.038.488-.709 0-1.198-.146-1.794-.433a3.7 3.7 0 0 1-1.475-1.273h-.043v5.43h-2.827V9.89h2.67zm16.278 9.082a2.5 2.5 0 0 0 .843-.807q.32-.498.454-1.164.131-.665.131-1.35a6.3 6.3 0 0 0-.144-1.353 3.6 3.6 0 0 0-.475-1.185 2.64 2.64 0 0 0-.853-.841q-.52-.323-1.275-.323c-.502 0-.948.11-1.293.323q-.524.32-.844.83a3.5 3.5 0 0 0-.454 1.174q-.133.664-.132 1.374c0 .474.046.907.144 1.35q.144.664.464 1.163.323.5.853.808.531.31 1.284.311c.502 0 .948-.104 1.294-.31zM94.31 9.889v1.463h.044q.575-.93 1.461-1.352c.59-.281 1.074-.42 1.783-.42.901 0 1.509.169 2.16.509q.976.509 1.616 1.352.642.843.954 1.96.308 1.12.309 2.338 0 1.152-.309 2.217a5.7 5.7 0 0 1-.942 1.882 4.64 4.64 0 0 1-1.573 1.307c-.628.324-1.197.488-2.038.488-.709 0-1.198-.146-1.795-.433a3.7 3.7 0 0 1-1.474-1.273h-.043v5.43h-2.828V9.89h2.671zm-38.355 8.705q.21.367.544.598.33.233.765.344c.287.074.874.11 1.185.11.221 0 .495-.026.74-.077.243-.051.587-.132.788-.243q.3-.165.498-.443c.133-.185.198-.444.198-.725 0-.428-.436-.898-1.064-1.134q-.94-.356-2.626-.709a15 15 0 0 1-1.339-.367 4.5 4.5 0 0 1-1.163-.553 2.7 2.7 0 0 1-.819-.865q-.31-.52-.31-1.274 0-1.107.433-1.816a3.2 3.2 0 0 1 1.142-1.119 5 5 0 0 1 1.595-.577 8.2 8.2 0 0 1 1.65-.165c.622 0 1.055.058 1.639.177a4.8 4.8 0 0 1 1.561.598q.687.421 1.14 1.117.456.699.542 1.762h-2.659c-.043-.605-.272-1.08-.686-1.292-.414-.215-1.046-.344-1.608-.344-.176 0-.664.04-.862.068s-.43.086-.6.158q-.255.112-.433.322c-.119.141-.177.392-.177.629q-.001.42.31.685.309.268.807.433.499.166 1.142.3c.428.089 1.167.295 1.608.4.458.104.739.227 1.175.375q.652.223 1.164.588.509.367.82.909.309.541.309 1.34 0 1.13-.453 1.896-.455.765-1.185 1.23c-.488.31-.88.39-1.508.515a10 10 0 0 1-1.917.188 8 8 0 0 1-1.781-.2 5.2 5.2 0 0 1-1.696-.664q-.742-.465-1.218-1.23c-.319-.509-.49-1.148-.522-1.917h2.66c0 .34.07.73.21.974zm-3.751-8.698v1.939H49.9v6.002q0 .799.264 1.064.266.266 1.064.267.266-.001.51-.023t.465-.067v2.273a7 7 0 0 1-.885.089q-.488.02-.954.021c-.486 0-.95-.033-1.383-.099a2.07 2.07 0 0 1-.998-.396 1.9 1.9 0 0 1-.635-.82 3.5 3.5 0 0 1-.274-1.396v-6.923H45.17V9.888h1.904V6.454l2.828.008v3.434zM24.65 5.523v5.902h.065c.398-.664 1.03-1.17 1.65-1.472.621-.305 1.27-.376 1.86-.376.841 0 1.202.114 1.74.342q.81.344 1.273.954.466.61.654 1.484.189.877.189 1.939v7.045h-2.815v-6.47q.001-1.419-.442-2.116c-.296-.466-.822-.81-1.572-.864-.967-.07-1.643.324-2.026.833-.385.51-.577 1.444-.577 2.611v6.004h-2.828V5.523z"
              fill="currentColor"
              className="text-green-600"
            ></path>
          </svg>
        </div>

{/* Right assets */}
        <div className="flex gap-3">
          {/* <!-- Right first icon --> */}
          <div onClick={() => setShowAddFriend(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
            <svg
              viewBox="0 0 24 24"
              height="24"
              width="24"
              preserveAspectRatio="xMidYMid meet"
              className=""
              fill="none"
            >
              <title>new-chat-outline</title>
              <path
                d="M9.53277 12.9911H11.5086V14.9671C11.5086 15.3999 11.7634 15.8175 12.1762 15.9488C12.8608 16.1661 13.4909 15.6613 13.4909 15.009V12.9911H15.4672C15.9005 12.9911 16.3181 12.7358 16.449 12.3226C16.6659 11.6381 16.1606 11.0089 15.5086 11.0089H13.4909V9.03332C13.4909 8.60007 13.2361 8.18252 12.8233 8.05119C12.1391 7.83391 11.5086 8.33872 11.5086 8.991V11.0089H9.49088C8.83941 11.0089 8.33411 11.6381 8.55097 12.3226C8.68144 12.7358 9.09947 12.9911 9.53277 12.9911Z"
                fill="black"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.944298 5.52617L2.99998 8.84848V17.3333C2.99998 18.8061 4.19389 20 5.66665 20H19.3333C20.8061 20 22 18.8061 22 17.3333V6.66667C22 5.19391 20.8061 4 19.3333 4H1.79468C1.01126 4 0.532088 4.85997 0.944298 5.52617ZM4.99998 8.27977V17.3333C4.99998 17.7015 5.29845 18 5.66665 18H19.3333C19.7015 18 20 17.7015 20 17.3333V6.66667C20 6.29848 19.7015 6 19.3333 6H3.58937L4.99998 8.27977Z"
                fill="black"
              ></path>
            </svg>
          </div>
          {showAddFriend && (
            <AddFriendModal
              onClose={() => setShowAddFriend(false)}
              onFriendAdded={(u) => {
                // Add new user to chat store if not present
                if (u && u._id) {
                  const existing = useChatStore.getState().users || [];
                  if (!existing.find(x => String(x._id) === String(u._id))) {
                    useChatStore.setState({ users: [u, ...existing] });
                    setFilteredUsers([u, ...filteredUsers]);
                  }
                }
              }}
            />
          )}
          {/* Right second icon */}
          <div onClick={handleLogoutState} className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
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
          {/* Toggle state */}

         <div ref={dropdownRef} className={`absolute right-0 top-10 z-10 bg-white text-black border rounded-lg py-3 pl-4 w-[150px] trasition-all transform origin-top duration-300 cursor-pointer ${isLogout?"scale-y-100":"scale-y-0"}`}>
            <ul>
              <li onClick={logout}>Logout</li>
              <li onClick={handleOnlineUsers}>
              {showOnlineOnly?"Show All":"Show Online"}</li>
            <Link to="/profilepage"> <li className=" xl:hidden flex">Settings</li></Link>
            {!isDeleteMode?(<li onClick={toggleDeleteMode}>Delete</li>):(<><li onClick={handleDeleteSelected}>Delete Selected</li>    <li onClick={toggleDeleteMode}>Cancel</li>
</>)}
            </ul>
          </div>
          </div>
        </div>
      </div>
{/* Search area */}
      <div className="relative mt-[15px]">
        <svg
          className="absolute left-3 top-2.5"
          viewBox="0 0 20 20"
          height="20"
          width="20"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <title>search-refreshed-thin</title>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M4.36653 4.3664C5.36341 3.36953 6.57714 2.87 8.00012 2.87C9.42309 2.87 10.6368 3.36953 11.6337 4.3664C12.6306 5.36329 13.1301 6.57724 13.1301 8.00062C13.1301 8.57523 13.0412 9.11883 12.8624 9.63057C12.6972 10.1038 12.4733 10.5419 12.1909 10.9444L16.5712 15.3247C16.7454 15.4989 16.8385 15.7046 16.8385 15.9375C16.8385 16.1704 16.7454 16.3761 16.5712 16.5503C16.396 16.7254 16.1866 16.8175 15.948 16.8175C15.7095 16.8175 15.5001 16.7254 15.3249 16.5503L10.9448 12.1906C10.5421 12.4731 10.104 12.697 9.63069 12.8623C9.11895 13.041 8.57535 13.13 8.00074 13.13C6.57736 13.13 5.36341 12.6305 4.36653 11.6336C3.36965 10.6367 2.87012 9.42297 2.87012 8C2.87012 6.57702 3.36965 5.36328 4.36653 4.3664ZM8.00012 4.63C7.06198 4.63 6.26877 4.95685 5.61287 5.61275C4.95698 6.26865 4.63012 7.06186 4.63012 8C4.63012 8.93813 4.95698 9.73134 5.61287 10.3872C6.26877 11.0431 7.06198 11.37 8.00012 11.37C8.93826 11.37 9.73146 11.0431 10.3874 10.3872C11.0433 9.73134 11.3701 8.93813 11.3701 8C11.3701 7.06186 11.0433 6.26865 10.3874 5.61275C9.73146 4.95685 8.93826 4.63 8.00012 4.63Z"
            fill="darkgray"
          ></path>
        </svg>
        <form
          className="w-full"
        >
         <input
  style={{ fontFamily: 'inherit', color: 'black' }}
  className="bg-gray-100 w-full h-[40px] rounded-full pl-10 border outline-none"
  type="text"
  placeholder="Search user..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>


        </form>
      </div>
      
      {/* Message type area */}
      <div className="flex gap-[8px] xl:mt-[12px] mt-[22px]">
        <p className="border text-gray-600 flex-1 flex justify-center xl:flex-none rounded-full ml-1 px-[7px] py-[4px] xl:py-[4px] hover:bg-gray-100">
          All
        </p>
        <p className="border text-gray-600 flex-1 flex justify-center xl:flex-none rounded-full px-[7px] py-[4px] xl:py-[4px] hover:bg-gray-100">
          Unread
        </p>
        <p className="border text-gray-600 flex-1 flex justify-center xl:flex-none rounded-full px-[7px] py-[4px] xl:py-[4px] hover:bg-gray-100">
          Favourites
        </p>
        <p className="border text-gray-600 flex-1 flex justify-center xl:flex-none rounded-full px-[7px] py-[4px] xl:py-[4px] hover:bg-gray-100">
          Groups
        </p>
        <p className="border text-gray-600 flex-1 flex justify-center xl:hidden rounded-full mr-1 px-[7px] py-[4px] xl:py-[4px] hover:bg-gray-100">
          +
        </p>
      </div>
    </div>

    {/* Chats area for laptop */}
    <div className="xl:flex flex-col overflow-y-scroll hidden ml-2 mr-2 bg-white">
      {/* <!-- cards area --> */}
      <div className="flex-1">
        {/* <!-- card 1 --> */}
        {filteredUsers.map((user) => (     
          <div
          key={user._id}
          onClick={() => setSelectedUser(user)}         
            className={"w-full rounded-lg h-[65px] flex items-center gap-4 border mt-3 pl-[10px] hover:bg-gray-100 transition-all duration-200"}
          >
            {/* Checkbox when delete mode is active */}
            {isDeleteMode && (
              <input
                type="checkbox"
                checked={selectedChats.includes(user._id)}
                onChange={() => handleCheckboxChange(user._id)}
                className="w-4 h-4 ml-2 cursor-pointer accent-green-400"
              />
            )}
            {/* <!--left image box --> */}
            <div >
              
                 <img
                 src={user.profilePhoto || "/avatar.png"}
                 alt={user.name}
                  className="w-[60px] h-[50px] rounded-full"
                                />

            </div>
            {/* Right card box */}
            <div className="flex justify-between w-full pr-[10px]">
              <div className="">
                <h3 className="text-black font-semibold mb-[5px] h-[21px] w-[255px] overflow-x-hidden overflow-y-hidden">
                  {user.fullName}
                </h3>

                <p className="text-gray-500">
                  {(onlineUsers || []).includes(user._id) ? "Online" : "offline"}
                </p>
               
        
              </div>
              
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-4">
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
                    fill="darkgreen"
                  ></path>
                </svg>
    <p className="text-black text-sm">
                  Your personal messages are <span className="text-green-800 font-bold"> end-to-end encrypted</span>
                </p>
     </div>
    </div>

     {/* Chats area for phone */}
     <div className="xl:hidden w-full flex flex-col overflow-y-scroll overflow-x-hidden pl-2 pr-2 ">
      {/* Cards area */}
      <div className="flex-1">
        {/* Card 1 */}
        {filteredUsers.map((user) => (
          <Link to="/chatpage"
          key={user._id}           onClick={() => setSelectedUser(user)}

            className={`w-full rounded-lg h-[65px] flex items-center gap-4 border mt-3 pl-[10px] hover:bg-gray-100 transition-all duration-200`}
          >

            {/* Checkbox when delete mode is active */}
  {isDeleteMode && (
    <input
      type="checkbox"
      checked={selectedChats.includes(user._id)}
      onClick={(e) => e.stopPropagation()} // Stop link click
      onChange={() => handleCheckboxChange(user._id)} // Handle toggle
      className="w-4 h-4 ml-2 cursor-pointer accent-green-400 bg-white"
    />
  )}         
            {/* Left image box */}
            <div >
              
                 <img
                 src={user.profilePhoto || "/avatar.png"}
                 alt={user.name}
                  className="w-[60px] h-[50px] rounded-full"
                                />

            </div>
            {/* Right card box */}
            <div className="w-full">
              <div >
                <h3 className="text-black font-semibold mb-[5px] h-[21px] w-fit overflow-x-hidden overflow-y-hidden">
                  {user.fullName}
                </h3>

                <p className="text-gray-500">
                  {(onlineUsers || []).includes(user._id) ? "Online" : "offline"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-center mt-4">
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
                    fill="darkgreen"
                  ></path>
                </svg>
    <p className="text-black text-sm">
                  Your personal messages are <span className="text-green-800 font-bold"> end-to-end encrypted</span>
                </p>
     </div>
    </div>
   
     </div>
  </>
  )
}

export default MiddleContainer

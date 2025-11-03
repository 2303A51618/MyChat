import React from 'react'
// removed unused useState
import { X } from "lucide-react";
import { useAuthStore } from "../Store/useAuthStore";
import { useChatStore } from "../Store/useChatStore";
// axiosInstance and toast not needed in this component

const Chatheader = ({ closeLogoutDropdown }) => {
  const { selectedUser, setShowImage} = useChatStore();
  const imgRef = React.useRef(null);
    const { onlineUsers } = useAuthStore();
 
  return (
    <div>
        {/* <!-- upper box --> */}
        <div className="flex justify-between items-center pl-[15px] pt-[10px] pb-[10px] bg-white z-10 ">
              {/* <!-- left content box --> */}
              <div className="flex items-center gap-4">
                {/* <!-- image box --> */}   
                <img ref={imgRef} onClick={() => {
                  // compute anchor rect and pass to store so popup can align below this image
                  const rect = imgRef.current?.getBoundingClientRect?.();
                  // detect small screens and prefer a centered/mobile tooltip
                  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
                  setShowImage({ visible: true, anchor: rect, mode: isMobile ? 'mobile' : 'profile' });
                  closeLogoutDropdown();
                }} className="w-[35px] h-[35px] rounded-full cursor-pointer" src={selectedUser?.profilePhoto || "/avatar.png"} alt="" />
                {/* <!-- name box --> */}
                <div>
                  <h1 className="text-black">{selectedUser?.fullName}</h1>
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
                {/* <!-- magnifying icon & three dots box --> */}
                <div className="flex gap-[20px]">
                  {/* <!-- magnifying icon --> */}
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    className=""
                    fill="none"
                  >
                    <title>search-refreshed</title>
                    <path
                      d="M9.5 16C7.68333 16 6.14583 15.3708 4.8875 14.1125C3.62917 12.8542 3 11.3167 3 9.5C3 7.68333 3.62917 6.14583 4.8875 4.8875C6.14583 3.62917 7.68333 3 9.5 3C11.3167 3 12.8542 3.62917 14.1125 4.8875C15.3708 6.14583 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L20.3 18.9C20.4833 19.0833 20.575 19.3167 20.575 19.6C20.575 19.8833 20.4833 20.1167 20.3 20.3C20.1167 20.4833 19.8833 20.575 19.6 20.575C19.3167 20.575 19.0833 20.4833 18.9 20.3L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16ZM9.5 14C10.75 14 11.8125 13.5625 12.6875 12.6875C13.5625 11.8125 14 10.75 14 9.5C14 8.25 13.5625 7.1875 12.6875 6.3125C11.8125 5.4375 10.75 5 9.5 5C8.25 5 7.1875 5.4375 6.3125 6.3125C5.4375 7.1875 5 8.25 5 9.5C5 10.75 5.4375 11.8125 6.3125 12.6875C7.1875 13.5625 8.25 14 9.5 14Z"
                      fill="black"
                    ></path>
                  </svg>
                  {/* <!-- three dots icon --> */}
                  <div>
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
              </div>
  
              
    </div>
  )
}

export default Chatheader

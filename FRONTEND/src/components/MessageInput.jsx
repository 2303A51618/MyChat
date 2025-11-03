import { useRef, useState } from "react";
import { useChatStore } from "../Store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "./EmojiPicker";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();

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

  // emoji picker for input
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSelectEmojiToInput = (emoji) => {
    setText((t) => t + emoji);
    setShowEmojiPicker(false);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (!selectedUser) {
      toast.error('Select a user to send a message');
      return;
    }

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

  // no friend-request functionality here; direct chat allowed

  return (
    <div>
      
       {/* Bottom message */}
       <div className="fixed bottom-3 pl-[10px] pr-[10px] flex justify-center">
       
  <form onSubmit={handleSendMessage}>
              <div className="relative">
           {/* Left svg inside input */}
           <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 ">
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
                {/* Emoji picker toggle */}
                <div className="absolute left-20 top-1/2 -translate-y-1/2 text-gray-500 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                  <button type="button" onClick={() => setShowEmojiPicker(v => !v)} className="text-xl">🙂</button>
                </div>
                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-4 z-50">
                    <EmojiPicker onSelect={handleSelectEmojiToInput} />
                  </div>
                )}
                
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
                {/* Send button and Mic icon svg toggle */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {(text.trim() || imagePreview) ? (
    <button
      type="submit"
      className="btn btn-sm btn-circle text-white shadow-none bg-green-400 border-none"
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
                <div>
                <input onChange={(e) => setText(e.target.value)}
                  type="text"
                  value={text}
                  className="h-[55px] pl-[95px] pr-[50px] border w-[925px] rounded-full bg-white text-black"
                  placeholder={"Type a message"}
                />
                </div>
                <div className="">
      {imagePreview && (
        <div className=" ">
          <div className="absolute bottom-14 left-[100px] bg-green-400 border p-5 rounded-md ">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-40 h-40 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}
      </div>
                 <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
                
              </div>
              </form>
            {/* direct chat enabled - no add friend UI here */}
            </div>
    </div>
  )
}

export default MessageInput

import React, { useState, useEffect, useRef } from "react";
import avatarFor from "../lib/avatar";

/**
 * ChatHeaderAndProfile
 * - Header with search + menu (no video icon)
 * - Expandable search with debounce and highlight
 * - Profile side panel (card-style)
 *
 * Props:
 * - messages: [{ id, text, sender, timestamp }]
 * - user: { fullName, status, email, profilePhoto, joinedAt, mutualFriends }
 */
export default function ChatHeaderAndProfile({ user = {}, onSearch = () => {} }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef(null);

  // profile panel removed — keep header only

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // notify parent about debounced search query so it can filter / highlight messages
  useEffect(() => {
    if (typeof onSearch === "function") onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  // highlightText removed — parent will perform highlighting when rendering messages

  const searchInputRef = useRef(null);
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between px-3 py-2 border-b bg-white">
              <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img src={avatarFor(user)} alt={user.fullName || 'User avatar'} className="h-10 w-10 rounded-full object-cover ring-2 ring-green-200" />
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-800">{user.fullName || "Unknown"}</div>
                <div className="text-xs text-gray-400">{user.status || "offline"}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setSearchOpen((s) => !s)} className="p-2 rounded hover:bg-gray-100 focus:outline-none">
                {/* stylish search icon */}
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  <circle cx="11" cy="11" r="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className={`absolute right-0 top-10 z-30 flex items-center bg-white rounded-md border shadow-sm transition-all duration-300 overflow-hidden ${searchOpen ? "w-72 opacity-100 scale-100" : "w-0 opacity-0 scale-95 pointer-events-none"}`} style={{ minWidth: searchOpen ? undefined : 0 }}>
                <input ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="px-3 py-2 w-full text-sm placeholder-gray-400 focus:outline-none" />
                <button onClick={() => { setSearchQuery(""); setDebouncedQuery(""); setSearchOpen(false); }} className="px-2 py-2 text-sm text-red-500 hover:bg-red-50">✕</button>
              </div>
            </div>

            <div>
              <button className="p-2 rounded hover:bg-gray-100 focus:outline-none" aria-label="More options">
                <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* parent component will render the chat messages; this component only handles header and profile UI + search input */}
      </div>

      {/* Profile side panel removed per design — header only component now */}
    </div>
  );
}

// Profile card and related UI removed per design

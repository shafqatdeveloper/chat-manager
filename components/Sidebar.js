"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  LogOut,
  User,
  Search,
  Plus,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({
  user,
  conversations,
  onSelectConversation,
  selectedConversationId,
  onStartNewChat,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (isSearching) fetchUsers();
  }, [isSearching]);

  const filteredUsers = users?.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery?.toLowerCase()),
  );

  return (
    <div className="w-full md:w-96 h-full bg-black border-r border-zinc-900 flex flex-col z-20">
      <header className="p-6 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Direct
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSearching(!isSearching)}
              className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-all"
            >
              {isSearching ? (
                <ArrowLeft className="w-6 h-6" />
              ) : (
                <Plus className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {!isSearching && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              readOnly
              onClick={() => setIsSearching(true)}
              placeholder="Search people..."
              className="w-full bg-zinc-900 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 cursor-pointer"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-2"
            >
              <div className="px-2 pb-4">
                <input
                  autoFocus
                  placeholder="Who are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {filteredUsers.map((u) => (
                <div
                  key={u._id}
                  onClick={() => {
                    onStartNewChat(u._id);
                    setIsSearching(false);
                  }}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-900 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-linear-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-zinc-800">
                    <User className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-sm text-zinc-500">{u.email}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              {conversations?.map((conv) => {
                const otherUser = conv.participants.find(
                  (p) => p._id !== user.id,
                );
                const isSelected = selectedConversationId === conv._id;
                const hasUnread =
                  conv.lastMessage &&
                  conv.lastMessage.sender?._id !== user.id &&
                  !conv.lastMessage.readBy?.includes(user.id);

                return (
                  <div
                    key={conv._id}
                    onClick={() => onSelectConversation(conv._id)}
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all relative ${
                      isSelected ? "bg-zinc-900" : "hover:bg-zinc-950"
                    }`}
                  >
                    <div className="shrink-0 w-14 h-14 rounded-full p-[2px] bg-linear-to-tr from-yellow-400 via-red-500 to-purple-600">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                        <User className="w-7 h-7 text-zinc-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3
                          className={`font-semibold text-sm truncate ${isSelected ? "text-white" : "text-zinc-200"}`}
                        >
                          {otherUser?.name || "Deleted Account"}
                        </h3>
                        <span className="text-[10px] text-zinc-500">
                          {conv.updatedAt &&
                            new Date(conv.updatedAt).toLocaleDateString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate ${hasUnread ? "text-white font-bold" : "text-zinc-500"}`}
                      >
                        {conv.lastMessage
                          ? conv.lastMessage.content
                          : "No messages yet"}
                      </p>
                    </div>
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1 shadow-lg shadow-blue-500/50 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="p-6 border-t border-zinc-900 bg-zinc-950/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <User className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-zinc-500 truncate">Online</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

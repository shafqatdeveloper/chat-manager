"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { User, Image as ImageIcon, Heart } from "lucide-react";

export default function ChatWindow({ messages, currentUser }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-black"
    >
      <AnimatePresence initial={false}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-6">
            <div className="w-24 h-24 rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <User className="w-12 h-12 opacity-40 text-zinc-700" />
            </div>
            <div className="text-center">
              <h4 className="text-white text-lg font-bold">Your Messages</h4>
              <p className="text-sm text-zinc-500 max-w-[200px] mx-auto mt-1">
                Send private photos and messages to a friend.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
            const currentUserId = currentUser?.id || currentUser?._id;
            const isMe = String(senderId) === String(currentUserId);

            return (
              <motion.div
                key={msg._id || `msg-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isMe && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mt-auto">
                      <User className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                  <div className="group relative">
                    <div
                      className={`px-4 py-3 rounded-[22px] text-sm leading-relaxed relative ${
                        isMe
                          ? msg.status === "error"
                            ? "bg-red-500/20 text-red-200 border border-red-500/30"
                            : "bg-linear-to-tr from-purple-600 to-blue-500 text-white rounded-br-none"
                          : "bg-zinc-900 text-zinc-100 rounded-bl-none"
                      } ${msg.status === "sending" ? "opacity-70 animate-pulse" : ""}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
                <div
                  className={`mt-1 flex items-center gap-2 ${isMe ? "pr-2" : "pl-11"}`}
                >
                  <span className="text-[10px] text-zinc-600">
                    {msg.status === "sending"
                      ? "Sending..."
                      : msg.status === "error"
                        ? "Failed to send"
                        : msg.createdAt
                          ? format(new Date(msg.createdAt), "h:mm a")
                          : "Just now"}
                  </span>
                  {msg.status === "error" && (
                    <button
                      onClick={() => alert("Please delete and try again")}
                      className="text-[10px] text-red-400 font-bold hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}

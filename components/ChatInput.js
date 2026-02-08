"use client";

import { useState, useRef } from "react";
import {
  Send,
  Smile,
  Image as ImageIcon,
  Camera,
  Mic,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ChatInput({ onSendMessage }) {
  const [content, setContent] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendMessage(content);
    setContent("");
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 bg-black border-t border-zinc-900">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 bg-zinc-900 rounded-full px-4 py-2 focus-within:ring-1 focus-within:ring-zinc-700 transition-all">
          <button
            type="button"
            className="p-2 text-white hover:opacity-70 transition-all"
          >
            <Camera className="w-6 h-6" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-500 py-2.5 text-[15px]"
          />

          {!content.trim() ? (
            <div className="flex items-center">
              <button
                type="button"
                className="p-2 text-white hover:opacity-70 transition-all"
              >
                <Mic className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="p-2 text-white hover:opacity-70 transition-all"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="p-2 text-white hover:opacity-70 transition-all"
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="submit"
              className="p-2 text-blue-500 font-bold hover:text-white transition-all text-sm"
            >
              Send
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}

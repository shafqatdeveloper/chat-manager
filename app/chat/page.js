"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { getPusherClient } from "@/lib/pusher";
import { Loader2, Video, Info, Phone, Plus, User } from "lucide-react";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const pusherRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations();

      const pusher = getPusherClient();
      pusherRef.current = pusher;

      // Subscribe to personal channel for new conversation updates
      const userChannel = pusher.subscribe(`user-${session.user.id}`);
      userChannel.bind("new-conversation-update", (data) => {
        fetchConversations();
      });

      return () => {
        userChannel.unbind_all();
        userChannel.unsubscribe();
        pusher.disconnect();
      };
    }
  }, [status, session?.user?.id]);

  useEffect(() => {
    if (!selectedConversationId) return;

    console.log(
      "ChatPage: Selected conversation changed:",
      selectedConversationId,
    );
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/conversations/${selectedConversationId}/messages`,
          { cache: "no-store" },
        );
        const data = await res.json();

        if (Array.isArray(data)) {
          console.log(
            "ChatPage: Fetched messages success, count:",
            data.length,
          );
          setMessages(data);
        } else {
          console.error(
            "ChatPage: Fetched messages ERROR - not an array:",
            data,
          );
          setMessages([]);
        }

        // After fetching, refresh conversations to clear unread dots
        fetchConversations();
      } catch (error) {
        console.error("ChatPage: Error fetching messages:", error);
        setMessages([]);
      }
    };

    fetchMessages();

    // Subscribe to specific conversation channel
    const pusher = pusherRef.current;
    if (!pusher) return;

    const channel = pusher.subscribe(`conversation-${selectedConversationId}`);

    const upsertMessage = (newMessage) => {
      setMessages((prev) => {
        // 1. Check if we already have this message by its REAL ID
        if (prev.find((m) => m._id === newMessage._id)) return prev;

        // 2. Check if this is a message we sent optimistically (using clientMsgId)
        if (newMessage.clientMsgId) {
          const optimisticIndex = prev.findIndex(
            (m) => m._id === newMessage.clientMsgId,
          );
          if (optimisticIndex !== -1) {
            const newMessages = [...prev];
            newMessages[optimisticIndex] = { ...newMessage, status: "sent" };
            return newMessages;
          }
        }

        // 3. Fallback: if it's from me but Pusher arrives before API response
        // (This shouldn't happen often with clientMsgId but good to have)
        return [...prev, { ...newMessage, status: "sent" }];
      });
    };

    channel.bind("new-message", (newMessage) => {
      upsertMessage(newMessage);
      fetchConversations();
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [selectedConversationId]);

  const handleStartNewChat = async (userId) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const conv = await res.json();

      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
      setSelectedConversationId(conv._id);
    } catch (error) {
      console.error("Error starting new chat:", error);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversationId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      content,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        image: session.user.image,
      },
      conversationId: selectedConversationId,
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          conversationId: selectedConversationId,
          clientMsgId: tempId, // Send the client side ID
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        // Use the same upsert logic for API response
        setMessages((prev) => {
          if (prev.find((m) => m._id === newMessage._id)) {
            // We already got it from Pusher, but we might need to remove the temp one if it's still there
            return prev.filter((m) => m._id !== tempId);
          }
          const optimisticIndex = prev.findIndex((m) => m._id === tempId);
          if (optimisticIndex !== -1) {
            const newMessages = [...prev];
            newMessages[optimisticIndex] = { ...newMessage, status: "sent" };
            return newMessages;
          }
          return [...prev, newMessage];
        });
        fetchConversations();
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "error" } : m)),
      );
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin opacity-20" />
      </div>
    );
  }

  if (!session) return null;

  const selectedConversation = conversations.find(
    (c) => c._id === selectedConversationId,
  );
  const otherParticipant = selectedConversation?.participants.find(
    (p) => p._id !== session.user.id,
  );

  return (
    <div className="flex h-screen bg-black overflow-hidden text-zinc-100 font-sans selection:bg-blue-500/30">
      <Sidebar
        user={session.user}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onStartNewChat={handleStartNewChat}
      />

      <main className="flex-1 flex flex-col relative bg-black">
        {selectedConversationId ? (
          <>
            <header className="h-20 border-b border-zinc-900 flex items-center px-8 bg-black/80 backdrop-blur-xl z-10 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">
                    {otherParticipant?.name || "Member"}
                  </h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                    Active now
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-white">
                <Phone className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition-all" />
                <Video className="w-7 h-7 cursor-pointer hover:text-zinc-400 transition-all" />
                <Info className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition-all" />
              </div>
            </header>

            <ChatWindow messages={messages} currentUser={session.user} />
            <ChatInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black">
            <div className="w-24 h-24 rounded-full border-2 border-zinc-900 flex items-center justify-center mb-6">
              <Plus className="w-10 h-10 text-zinc-800" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Your Messages
            </h2>
            <p className="text-zinc-500 max-w-sm mb-8">
              Send private photos and messages to a friend or group.
            </p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all active:scale-95"
              onClick={() => {
                // This could trigger the search in sidebar if we pass a state
              }}
            >
              Send Message
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

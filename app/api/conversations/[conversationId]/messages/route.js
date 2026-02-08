import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { conversationId } = await params;
    console.log("API: Fetching messages for conversation:", conversationId);
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // DIAGNOSTIC LOGS
    console.log(`[DEBUG] Fetching messages for convo: ${conversationId}`);
    const conversation =
      await Conversation.findById(conversationId).populate("lastMessage");
    if (!conversation) {
      console.error(`[DEBUG] Conversation NOT FOUND in DB: ${conversationId}`);
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 },
      );
    }
    console.log(
      `[DEBUG] Conversation found: ${conversation._id}, LastMsg: ${conversation.lastMessage?._id}`,
    );

    const messages = await Message.find({ conversationId })
      .populate("sender", "name email image")
      .sort({ createdAt: 1 });

    console.log(`[DEBUG] Query result: Found ${messages.length} messages`);

    if (messages.length === 0) {
      // DEBUG: If count is 0, let's look for messages that might belong here but have no conversationId
      // Or were sent before the conversation was correctly linked
      const orphans = await Message.find({
        $or: [{ conversationId: { $exists: false } }, { conversationId: null }],
      }).limit(5);
      if (orphans.length > 0) {
        console.log(
          `[DEBUG] Found ${orphans.length} orphaned messages (no convoId)`,
        );
      }
    }

    // Mark messages as read by current user
    if (messages.length > 0) {
      await Message.updateMany(
        {
          conversationId,
          sender: { $ne: session.user.id },
          readBy: { $ne: session.user.id },
        },
        { $addToSet: { readBy: session.user.id } },
      );
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Fetch conversation messages error:", error);
    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

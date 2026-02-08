import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { pusherServer } from "@/lib/pusher";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { content, conversationId, clientMsgId } = await req.json();

    if (!content || !conversationId) {
      return NextResponse.json(
        { message: "Content and conversationId are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Ensure conversationId is a valid ObjectId
    const mongoose = require("mongoose");
    const validConvoId = new mongoose.Types.ObjectId(conversationId);

    const message = await Message.create({
      sender: session.user.id,
      content,
      conversationId: validConvoId,
      readBy: [session.user.id],
    });

    const populatedMessage = await message.populate(
      "sender",
      "name email image",
    );

    // Update conversation lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Trigger Pusher event on private conversation channel
    try {
      await pusherServer.trigger(
        `conversation-${conversationId}`,
        "new-message",
        {
          ...populatedMessage.toObject(),
          clientMsgId,
        },
      );

      // Also trigger a global event for the recipient to update their sidebar/inbox
      const conversation = await Conversation.findById(conversationId);
      const recipientId = conversation.participants.find(
        (p) => p.toString() !== session.user.id.toString(),
      );

      if (recipientId) {
        await pusherServer.trigger(
          `user-${recipientId}`,
          "new-conversation-update",
          {
            conversationId,
            lastMessage: populatedMessage,
          },
        );
      }
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError);
    }

    return NextResponse.json(
      {
        ...populatedMessage.toObject(),
        clientMsgId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 },
    );
  }
}

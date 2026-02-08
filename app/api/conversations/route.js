import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const conversations = await Conversation.find({
      participants: session.user.id,
    })
      .populate("participants", "name email image")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name" },
      })
      .sort({ updatedAt: -1 });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { message: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Check if conversation already exists between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [session.user.id, userId], $size: 2 },
    }).populate("participants", "name email image");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [session.user.id, userId],
      });
      await conversation.populate("participants", "name email image");
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { message: "Failed to create conversation" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import User from "@/models/User";

export async function GET() {
  try {
    await dbConnect();

    const messages = await Message.find()
      .populate("sender", "name email image")
      .sort({ createdAt: 1 })
      .limit(50);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

import { db } from "@/firebase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const querySnapshot = await db.collection("users").get();
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

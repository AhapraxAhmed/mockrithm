"use server";

import { db, auth } from "@/firebase/admin";
import { cookies, headers } from "next/headers";

const MAX_ATTEMPTS = 4;
const BAN_DURATION = 6 * 60 * 1000; // 5 minutes in ms

async function getIp() {
  const headersList = await headers();
  return headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
}

export async function checkRateLimit() {
  const ip = await getIp();
  const rateLimitRef = db.collection("rate_limits").doc(ip);
  const doc = await rateLimitRef.get();

  if (doc.exists) {
    const data = doc.data();
    if (data?.bannedUntil && data.bannedUntil.toDate() > new Date()) {
      const waitMinutes = Math.ceil((data.bannedUntil.toDate().getTime() - Date.now()) / 60000);
      return { 
        isBanned: true, 
        message: `Too many failed attempts. Your IP is banned for ${waitMinutes} more minutes.` 
      };
    }
  }
  return { isBanned: false };
}

export async function recordLoginAttempt(success: boolean) {
  const ip = await getIp();
  const rateLimitRef = db.collection("rate_limits").doc(ip);
  const doc = await rateLimitRef.get();

  if (success) {
    if (doc.exists) {
      await rateLimitRef.delete();
    }
    return;
  }

  const data = doc.data() || { attempts: 0 };
  const newAttempts = (data.attempts || 0) + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    await rateLimitRef.set({
      attempts: newAttempts,
      lastAttempt: new Date(),
      bannedUntil: new Date(Date.now() + BAN_DURATION),
    });
  } else {
    await rateLimitRef.set({
      attempts: newAttempts,
      lastAttempt: new Date(),
      bannedUntil: null,
    });
  }
}

export async function checkEmailExists(email: string) {
  try {
    await auth.getUserByEmail(email);
    return { exists: true };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return { exists: false };
    }
    throw error;
  }
}


const SESSION_DURATION = 60 * 60 * 24 * 7;

export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000,
  });
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;
  try {
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return { success: false, message: "User already exists. Please sign in." };

    await db.collection("users").doc(uid).set({ name, email });

    return { success: true, message: "Account created successfully. Please sign in." };
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      return { success: false, message: "This email is already in use" };
    }
    return { success: false, message: "Failed to create account. Please try again." };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;
  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return { success: false, message: "User does not exist. Create an account." };

    await setSessionCookie(idToken);

    // Ensure user document exists in Firestore
    const userDocRef = db.collection("users").doc(userRecord.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      const isAdmin = email === "ahmed@gmail.com";
      await userDocRef.set({
        name: userRecord.displayName || email.split("@")[0],
        email: email,
        role: isAdmin ? "Admin" : "User",
        createdAt: new Date(),
        status: "Active",
      });
    }

    await db.collection("sessions").add({
      userId: userRecord.uid,
      email,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, message: "Failed to log into account. Please try again." };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, false);
    console.log("Server session verified for UID:", decodedClaims.uid);
    const userRecord = await db.collection("users").doc(decodedClaims.uid).get();
    
    if (!userRecord.exists) {
      console.log("User record not found in Firestore for UID:", decodedClaims.uid);
      // Fallback: Return basic info from claims if document is missing
      return {
        id: decodedClaims.uid,
        email: decodedClaims.email || "",
        name: "New User",
      } as User;
    }

    const userData = { ...userRecord.data(), id: userRecord.id } as User;
    console.log("Server user data fetched:", userData.name);
    return userData;
  } catch (error: any) {
    console.error("Session verification error:", error.message);
    return null;
  }
}


export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

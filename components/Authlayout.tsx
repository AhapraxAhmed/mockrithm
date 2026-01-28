"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { usePathname } from "next/navigation";

import { auth, db } from "@/firebase/client";
import Navbar from "@/components/Navbar";

export default function AuthLayout({ 
  children,
  initialUserId,
  initialUserName
}: { 
  children: React.ReactNode;
  initialUserId?: string | null;
  initialUserName?: string;
}) {
  const [userId, setUserId] = useState<string | null>(initialUserId || null);
  const [userName, setUserName] = useState<string>(initialUserName || "");

  const pathname = usePathname();
const hideNavbar =
  pathname.startsWith("/interview/") && pathname !== "/interview" ||
  [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/verify-code",
    "/reset-password",
    // "/interview", // Let's show it on the main interview selection page if not already hidden
    "/admin"
  ].includes(pathname);

// If we have an initialUserId (from server) or a userId (from client), use it.
// Even if we are guests, we might want to show the Navbar on some pages.
const shouldShowNavbar = !hideNavbar;


  useEffect(() => {
    console.log("AuthLayout mounted. Initial Props:", { initialUserId, initialUserName });
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Firebase client auth detected user:", user.uid);
        setUserId(user.uid);

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || "User");
          } else {
            setUserName("User");
          }
        } catch (error) {
          console.error("Failed to fetch user name:", error);
          setUserName("User");
        }
      } else {
        console.log("Firebase client auth detected: No User");
        // Only clear if we don't have an initial server user.
        // This prevents the flickering Navbar issue on refresh.
        if (!initialUserId) {
          setUserId(null);
          setUserName("");
        } else {
          console.log("Retaining server-side user session:", initialUserId);
        }
      }
    });

    return () => unsubscribe();
  }, [initialUserId]);


  return (
    <>
      {shouldShowNavbar && (
        <Navbar userId={userId!} userName={userName || "User"} />
      )}
      {children}
    </>
  );
}


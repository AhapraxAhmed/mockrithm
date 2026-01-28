"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";

import { isAuthenticated } from "@/lib/actions/auth.action";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verify server-side session before redirecting to avoid loops
        const authenticated = await isAuthenticated();
        if (authenticated) {
          router.replace("/");
        } else {
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (checkingAuth) return null;

  return <div className="auth-layout">{children}</div>;
}

"use client";

import { useEffect } from "react";
import { trackSession } from "@/lib/actions/session.action";

export default function SessionTracker({ userId }: { userId: string | null }) {
  useEffect(() => {
    // Check if session has already been tracked in this browser session
    const isTracked = sessionStorage.getItem("mockrithm_session_tracked");

    if (!isTracked) {
      const recordSession = async () => {
        try {
          await trackSession(userId);
          sessionStorage.setItem("mockrithm_session_tracked", "true");
        } catch (error) {
          console.error("Failed to track session:", error);
        }
      };

      recordSession();
    }
  }, [userId]);

  return null;
}

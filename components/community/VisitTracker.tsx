"use client";

import { useEffect, useRef } from "react";
import { trackSignal } from "@/hooks/useTracking";

interface Props {
  communityId: string;
}

export function VisitTracker({ communityId }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    console.log("🎯 VisitTracker mounted, communityId:", communityId);

    if (trackedRef.current || !communityId) {
      console.log("❌ Skip: already tracked or no ID");
      return;
    }
    trackedRef.current = true;

    const timer = setTimeout(async () => {
      console.log("📡 Sending visit signal for:", communityId);
      try {
        const res = await fetch("/api/discover/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signal_type: "visit",
            entity_type: "community",
            entity_id: communityId,
          }),
        });
        const data = await res.json();
        console.log("✅ Visit response:", data);
      } catch (e) {
        console.error("❌ Visit error:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [communityId]);

  return null;
}

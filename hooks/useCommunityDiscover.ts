"use client";

import { useEffect, useState, useCallback } from "react";

export interface DiscoverCommunityCard {
  id: string;
  public_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  logo_url?: string | null;
  cover_url: string | null;
  banner_url: string | null;
  category: string | null;
  community_type: string | null;
  visibility: string;
  join_policy: string;
  status: string;
  is_verified: boolean;
  member_count: number;
  post_count: number;
  topics: string[];
  location_text: string | null;
  is_member?: boolean;
  is_following?: boolean;
  membership_status?: string | null;
  reason_codes?: string[];
  reason_text?: string | null;
}

async function fetchList(endpoint: string): Promise<DiscoverCommunityCard[]> {
  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.items ?? [];
  } catch {
    return [];
  }
}

export function useDiscoverList(endpoint: string) {
  const [items, setItems] = useState<DiscoverCommunityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchList(endpoint);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const removeItem = useCallback((communityId: string) => {
    setItems((prev) => prev.filter((c) => c.id !== communityId));
  }, []);

  const patchItem = useCallback(
    (communityId: string, patch: Partial<DiscoverCommunityCard>) => {
      setItems((prev) =>
        prev.map((c) => (c.id === communityId ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  return { items, loading, error, reload: load, removeItem, patchItem };
}

export async function trackDiscoverEvents(
  events: Array<{
    community_id: string;
    event_type:
      "IMPRESSION" | "CLICK" | "DISMISS" | "JOIN_CLICK" | "FOLLOW_CLICK";
    surface?: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  try {
    await fetch("/api/v1/community/discover/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // silent
  }
}

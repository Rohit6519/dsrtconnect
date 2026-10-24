"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useStableCallback } from "./useStableCallback";
import { useDebouncedCallback } from "./useDebouncedCallback";

export interface CommunityDetail {
  community: any;
  settings: any;
  rules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
  }>;
  admins: Array<{ identity_id: string; role_key: string; user: any }>;
  recent_members: any[];
  capabilities: {
    can_view: boolean;
    can_join: boolean;
    can_post: boolean;
    can_invite: boolean;
    can_manage_members: boolean;
    can_moderate: boolean;
    can_manage_settings: boolean;
    can_delete: boolean;
    can_transfer: boolean;
    is_owner: boolean;
    is_admin: boolean;
    is_moderator: boolean;
    is_member: boolean;
    membership_status: string | null;
  };
}

// -----------------------------------------------------------
// Module-level cache — de-duplicates concurrent useCommunityDetail(slug)
// calls that happen inside the same component tree (shell + tab router)
// -----------------------------------------------------------

interface CacheEntry {
  data: CommunityDetail | null;
  error: string | null;
  fetchedAt: number;
  inflight: Promise<void> | null;
  subscribers: Set<() => void>;
}

const cache = new Map<string, CacheEntry>();
const FRESH_MS = 2000; // Requests within 2s share the same result

function getOrCreateEntry(slug: string): CacheEntry {
  let entry = cache.get(slug);
  if (!entry) {
    entry = {
      data: null,
      error: null,
      fetchedAt: 0,
      inflight: null,
      subscribers: new Set(),
    };
    cache.set(slug, entry);
  }
  return entry;
}

function notify(entry: CacheEntry) {
  for (const fn of entry.subscribers) {
    try {
      fn();
    } catch {
      /* subscriber errors shouldn't stop others */
    }
  }
}

async function fetchAndCache(slug: string, force: boolean): Promise<void> {
  const entry = getOrCreateEntry(slug);

  // Reuse an in-flight request
  if (entry.inflight) return entry.inflight;
  // Reuse a fresh cached result unless force
  if (!force && entry.data && Date.now() - entry.fetchedAt < FRESH_MS) return;

  entry.inflight = (async () => {
    try {
      const res = await fetch(`/api/v1/community/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        entry.error = json?.error?.code || "FETCH_FAILED";
        entry.data = null;
      } else {
        entry.data = json?.data as CommunityDetail;
        entry.error = null;
      }
    } catch {
      entry.error = "NETWORK_ERROR";
      entry.data = null;
    } finally {
      entry.fetchedAt = Date.now();
      entry.inflight = null;
      notify(entry);
    }
  })();

  return entry.inflight;
}

// -----------------------------------------------------------
// useCommunityDetail (FIXED Realtime Subscription)
// -----------------------------------------------------------

export function useCommunityDetail(slug: string) {
  const entryRef = useRef<CacheEntry | null>(null);
  const [, forceRerender] = useState(0);

  // Ensure entry exists and subscribe THIS instance to notifications
  useEffect(() => {
    const entry = getOrCreateEntry(slug);
    entryRef.current = entry;
    const sub = () => forceRerender((n) => n + 1);
    entry.subscribers.add(sub);

    // Initial load — deduped if another instance is already fetching
    fetchAndCache(slug, false);

    return () => {
      entry.subscribers.delete(sub);
    };
  }, [slug]);

  const reload = useCallback(() => {
    fetchAndCache(slug, true);
  }, [slug]);

  // Realtime: debounced reconcile on ANY membership change
  const debouncedReconcile = useDebouncedCallback(() => {
    fetchAndCache(slug, true);
  }, 5000);

  const reconcileRef = useRef(debouncedReconcile);
  useEffect(() => {
    reconcileRef.current = debouncedReconcile;
  }, [debouncedReconcile]);

  const data = entryRef.current?.data ?? cache.get(slug)?.data ?? null;
  const error = entryRef.current?.error ?? cache.get(slug)?.error ?? null;
  const loading = !data && !error;

  // FIXED: Safe unique Realtime Channel creation to prevent `.on()` after `.subscribe()` error
  useEffect(() => {
    const communityId = data?.community?.id;
    if (!communityId) return;

    const supabase = createClient();
    const uniqueChannelTopic = `community_detail:${communityId}:${Math.random().toString(36).slice(2, 7)}`;

    const channel: RealtimeChannel = supabase
      .channel(uniqueChannelTopic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_memberships",
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          reconcileRef.current?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.community?.id]);

  return { data, loading, error, reload };
}

// -----------------------------------------------------------
// Overview / Events / Projects / Similar — unchanged shape
// -----------------------------------------------------------

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json?.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function useCommunityOverview(slug: string) {
  const [data, setData] = useState<{
    latest_announcement: any;
    upcoming_event: any;
    recent_members: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useStableCallback(async () => {
    setLoading(true);
    const d = await getJson<any>(
      `/api/v1/community/${encodeURIComponent(slug)}/overview`,
      null,
    );
    setData(d);
    setLoading(false);
  });

  useEffect(() => {
    load();
  }, [slug, load]);

  return { data, loading };
}

export function useCommunityMembers(
  slug: string,
  roleFilter: string | null,
  q: string,
) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);

  const load = useStableCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true);
      setItems([]);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (!reset && cursorRef.current) sp.set("cursor", cursorRef.current);
      if (roleFilter) sp.set("role", roleFilter);
      if (q.trim()) sp.set("q", q.trim());
      sp.set("limit", "30");

      const res = await fetch(
        `/api/v1/community/${encodeURIComponent(slug)}/members?${sp.toString()}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.code || "FETCH_FAILED");
        return;
      }
      const page = json?.data;
      setItems((prev) =>
        reset ? page?.items || [] : [...prev, ...(page?.items || [])],
      );
      cursorRef.current = page?.next_cursor || null;
      setHasMore(!!page?.has_more);
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  });

  useEffect(() => {
    load(true);
  }, [slug, roleFilter, q, load]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    reload: () => load(true),
    loadMore: () => {
      if (hasMore && !loadingMore) load(false);
    },
  };
}

export function useCommunityEvents(slug: string) {
  const [data, setData] = useState<{ upcoming: any[]; past: any[] }>({
    upcoming: [],
    past: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useStableCallback(async () => {
    setLoading(true);
    const d = await getJson<any>(
      `/api/v1/community/${encodeURIComponent(slug)}/events`,
      { upcoming: [], past: [] },
    );
    setData(d);
    setLoading(false);
  });

  useEffect(() => {
    load();
  }, [slug, load]);

  return { data, loading };
}

export function useCommunityProjectsRef(slug: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useStableCallback(async () => {
    setLoading(true);
    const d = await getJson<any>(
      `/api/v1/community/${encodeURIComponent(slug)}/projects-ref`,
      { items: [] },
    );
    setItems(d?.items || []);
    setLoading(false);
  });

  useEffect(() => {
    load();
  }, [slug, load]);

  return { items, loading };
}

export function useSimilarCommunities(slug: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useStableCallback(async () => {
    setLoading(true);
    const d = await getJson<any>(
      `/api/v1/community/${encodeURIComponent(slug)}/similar`,
      { items: [] },
    );
    setItems(d?.items || []);
    setLoading(false);
  });

  useEffect(() => {
    load();
  }, [slug, load]);

  return { items, loading };
}

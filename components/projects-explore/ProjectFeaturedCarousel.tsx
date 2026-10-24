"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, Play, Pause } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  title?: string;
  image_url: string;
  cta_route?: string;
}

// 🎯 ৫টি ব্যানার এবং তাদের নতুন রুট ম্যাপিং
const DEFAULT_5_BANNERS: Banner[] = [
  {
    id: "b-1",
    title: "Profile & Portfolio",
    image_url: "/banners/project-1.png",
    cta_route: "/profile", // 🎯 ১ম ব্যানার -> Profile
  },
  {
    id: "b-2",
    title: "DSRT Coco AI",
    image_url: "/banners/project-2.png",
    cta_route: "/coco", // 🎯 ২য় ব্যানার -> Coco AI (/coco)
  },
  {
    id: "b-3",
    title: "Discover Communities",
    image_url: "/banners/project-3.png",
    cta_route: "/community", // 🎯 ৩য় ব্যানার -> Discover (/community)
  },
  {
    id: "b-4",
    title: "Projects Workspace",
    image_url: "/banners/project-4.png",
    cta_route: "/projects", // 🎯 ৪র্থ ব্যানার -> Projects (/projects)
  },
  {
    id: "b-5",
    title: "Explore Ventures",
    image_url: "/banners/project-5.png",
    cta_route: "/ventures", // 🎯 ৫ম ব্যানার -> Ventures (/ventures)
  },
];

export function ProjectFeaturedCarousel({ banners }: { banners: Banner[] }) {
  const activeBanners =
    banners && banners.length > 0 ? banners : DEFAULT_5_BANNERS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch logged-in user's username for /profile/[username]
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase
          .from("users")
          .select("username")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: u }) => {
            if (u?.username) setUsername(u.username);
          });
      }
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsTabHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (isPaused || isTabHidden || activeBanners.length <= 1) return;
    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPaused, isTabHidden, activeBanners]);

  const activeBanner = activeBanners[currentIndex] || activeBanners[0];
  const bannerId = activeBanner.id || `project-banner-${currentIndex}`;
  const hasError = imageErrors[bannerId];

  const displayImageUrl = hasError
    ? DEFAULT_5_BANNERS[currentIndex % DEFAULT_5_BANNERS.length].image_url
    : activeBanner.image_url ||
      DEFAULT_5_BANNERS[currentIndex % DEFAULT_5_BANNERS.length].image_url;

  const handleImageError = () => {
    setImageErrors((prev) => ({ ...prev, [bannerId]: true }));
  };

  // 🎯 STRICT ROUTE MAPPING
  let targetRoute = "/projects";
  if (currentIndex === 0) {
    targetRoute = username ? `/profile/${username}` : "/profile";
  } else if (currentIndex === 1) {
    targetRoute = "/coco"; // 🎯 ২য় ব্যানার -> Coco AI
  } else if (currentIndex === 2) {
    targetRoute = "/community"; // 🎯 ৩য় ব্যানার -> Discover Communities
  } else if (currentIndex === 3) {
    targetRoute = "/projects"; // 🎯 ৪র্থ ব্যানার -> Projects
  } else if (currentIndex === 4) {
    targetRoute = "/ventures"; // 🎯 ৫ম ব্যানার -> Ventures
  } else {
    targetRoute =
      DEFAULT_5_BANNERS[currentIndex % DEFAULT_5_BANNERS.length]?.cta_route ||
      "/projects";
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d10] group shadow-xl mb-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 2000x400 (5:1 Aspect Ratio) Container */}
      <div className="relative w-full aspect-[2000/400] max-h-[300px] overflow-hidden bg-black flex items-center justify-center">
        {/* 🔗 ব্যানারে ক্লিক করলে নির্দিষ্ট পেজে নেভিগেট করবে */}
        <Link href={targetRoute} className="w-full h-full block cursor-pointer">
          <img
            src={displayImageUrl}
            alt={activeBanner.title || `Slide ${currentIndex + 1}`}
            onError={handleImageError}
            className="w-full h-full object-cover object-center select-none transition-all duration-500 hover:scale-[1.01]"
            draggable={false}
          />
        </Link>

        {/* স্লাইডার কন্ট্রোলস (Dots + Play/Pause) */}
        {activeBanners.length > 1 && (
          <div
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-lg scale-90 sm:scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              {activeBanners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="ml-1 text-zinc-300 hover:text-white transition-colors"
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? (
                <Play size={11} weight="fill" />
              ) : (
                <Pause size={11} weight="fill" />
              )}
            </button>
          </div>
        )}

        {/* বাম ও ডান নেভিগেশন এরো */}
        {activeBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(
                  (prev) =>
                    (prev - 1 + activeBanners.length) % activeBanners.length,
                );
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-105 z-20"
              aria-label="Previous Slide"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-105 z-20"
              aria-label="Next Slide"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

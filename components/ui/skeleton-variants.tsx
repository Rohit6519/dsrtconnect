'use client'

import { cn } from '@/lib/utils'

// ==================== BASE SKELETON ====================

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: 'shimmer 2s infinite linear'
      }}
      {...props}
    />
  )
}

// ==================== CARD SKELETONS ====================

// Community Card Skeleton (Discover)
export function CommunityCardSkeleton() {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <Skeleton className="h-20 w-full rounded-none" />
      <div className="p-4 -mt-10 relative">
        <Skeleton className="w-16 h-16 rounded-2xl border-4 border-background" />
        <Skeleton className="h-4 w-3/4 mt-3" />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-2/3 mt-1" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
          {[1,2,3,4].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="h-4 w-8 mx-auto" />
              <Skeleton className="h-2 w-full mt-1" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-8 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// Person Card Skeleton (My Network Suggested)
export function PersonCardSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex flex-col items-center text-center">
        <Skeleton className="w-20 h-20 rounded-full mb-3" />
        <Skeleton className="h-4 w-24 mt-2" />
        <Skeleton className="h-3 w-32 mt-2" />
        <Skeleton className="h-3 w-20 mt-1" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <Skeleton className="h-3 w-24 mt-2" />
        <Skeleton className="h-8 w-full mt-3 rounded-lg" />
      </div>
    </div>
  )
}

// Regular Person Card (Connections/Following)
export function PersonRowSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2 mt-2" />
          <Skeleton className="h-3 w-1/3 mt-1" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t flex gap-2">
        <Skeleton className="h-7 flex-1 rounded" />
      </div>
    </div>
  )
}

// Owned Community Card (My Communities)
export function OwnedCommunitySkeleton() {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-4 -mt-8 relative">
        <Skeleton className="w-14 h-14 rounded-xl border-4 border-background" />
        <Skeleton className="h-4 w-2/3 mt-2" />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-3/4 mt-1" />
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
          {[1,2,3,4].map(i => (
            <div key={i}>
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-2 w-full mt-1" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-7 rounded" />)}
        </div>
      </div>
    </div>
  )
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mt-3" />
      <Skeleton className="h-4 w-5/6 mt-2" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <Skeleton className="h-40 w-full mt-3 rounded-lg" />
      <div className="flex gap-4 mt-3 pt-3 border-t">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

// Stat Card Skeleton
export function StatCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-20 mt-2" />
      </div>
    </div>
  )
}

// Small Card Skeleton (Trending/Sidebar)
export function SmallCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2 mt-1" />
          <Skeleton className="h-2 w-2/3 mt-1" />
        </div>
      </div>
    </div>
  )
}

// Sidebar Row Skeleton
export function SidebarRowSkeleton() {
  return (
    <div className="p-3 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2 w-1/2 mt-1" />
      </div>
      <Skeleton className="h-6 w-14 rounded" />
    </div>
  )
}

// Category Card Skeleton
export function CategoryCardSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-4 flex flex-col items-center gap-2">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-2 w-20" />
    </div>
  )
}

// Header Skeleton
export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  )
}

// Hero Section Skeleton
export function HeroSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
        {[1,2,3,4,5].map(i => <StatCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

// ==================== PAGE-LEVEL SKELETONS ====================

// Discover Page Skeleton
export function DiscoverPageSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">
      <HeaderSkeleton />
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => <StatCardSkeleton key={i} />)}
      </div>

      {/* Search */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Tabs */}
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>

      {/* Featured Communities */}
      <div>
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <CommunityCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Categories */}
      <div>
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
          {[1,2,3,4,5,6,7].map(i => <CategoryCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Trending */}
      <div>
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <SmallCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )
}

// My Network Page Skeleton
export function MyNetworkPageSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <HeroSkeleton />
          
          <Skeleton className="h-11 w-full rounded-xl" />
          
          {/* Tabs */}
          <div className="flex gap-2">
            {[1,2,3,4,5,6].map(i => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>

          {/* Suggested People */}
          <div>
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {[1,2,3,4,5].map(i => <PersonCardSkeleton key={i} />)}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-card border rounded-2xl p-4">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-3 w-full" />)}
              </div>
            </div>
          </div>
          
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="p-4 border-b">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="divide-y">
              {[1,2,3].map(i => <SidebarRowSkeleton key={i} />)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// My Communities Page Skeleton
export function MyCommunitiesPageSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">
      <HeroSkeleton />
      
      <Skeleton className="h-11 w-full rounded-xl" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map(i => <OwnedCommunitySkeleton key={i} />)}
      </div>
    </div>
  )
}

// Profile Page Skeleton
export function ProfilePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      {/* Cover */}
      <Skeleton className="h-48 w-full rounded-2xl" />
      
      {/* Profile Info */}
      <div className="bg-card border rounded-2xl p-6 -mt-16 relative">
        <div className="flex items-end gap-4">
          <Skeleton className="w-24 h-24 rounded-2xl border-4 border-background" />
          <div className="flex-1 pb-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
            <Skeleton className="h-3 w-40 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          {[1,2,3,4].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="h-6 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-lg" />)}
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        {[1,2,3].map(i => <PostCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

// Community Detail Page Skeleton
export function CommunityDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Skeleton className="h-48 w-full rounded-none md:rounded-2xl" />
      
      <div className="px-4 md:px-6 -mt-16 relative">
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl border-4 border-background" />
            <div className="flex-1 pt-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 flex gap-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-lg" />)}
      </div>

      <div className="px-4 md:px-6 space-y-3">
        {[1,2,3].map(i => <PostCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

// Feed Page Skeleton
export function FeedSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      {[1,2,3,4,5].map(i => <PostCardSkeleton key={i} />)}
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
      <Skeleton className="h-8 w-24 rounded" />
    </div>
  )
}
'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from './FollowButton'
import { Users } from 'lucide-react'

interface UserListProps {
  title: string
  users: any[]
  currentUserId: string
  emptyMessage?: string
}

export function UserList({ title, users, currentUserId, emptyMessage }: UserListProps) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} {users.length === 1 ? 'person' : 'people'}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {emptyMessage || 'No users to show'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              className="bg-card border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <Link href={`/profile/${user.username}`}>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/profile/${user.username}`}
                  className="font-semibold text-sm hover:underline block truncate"
                >
                  {user.full_name}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                  {user.tagline && ` · ${user.tagline}`}
                </p>
                {user.brings?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.brings.slice(0, 3).map((b: string) => (
                      <span key={b} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium capitalize">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {user.id !== currentUserId && (
                <FollowButton
                  targetId={user.id}
                  initialFollowing={user.is_following}
                  size="sm"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
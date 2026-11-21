/**
 * AppHeader — top bar with search and user menu.
 */

'use client'

import { Search, Bell, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'

export function AppHeader() {
  const { user } = useAuth()
  const router = useRouter()

  return (
    <header className="flex h-14 items-center gap-4 bg-brand px-4 text-brand-foreground lg:px-6">
      {/* Search */}
      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="search"
            placeholder="Search resources, committees..."
            className="pl-10 pr-4"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/team"
          className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
        >
          My Committees
          {user?.active_team && (
            <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-brand">
              {user.active_team.name}
            </span>
          )}
        </Link>
        <Button variant="ghost" size="sm" className="h-9 w-9">
          <Bell size={18} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 px-2"
              aria-label="Open user menu"
            >
              <Avatar className="h-8 w-8">
                {user?.avatar && (
                  <AvatarImage src={user.avatar} alt={user.username} />
                )}
                <AvatarFallback>
                  {(user?.username?.charAt(0) || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {user?.username || 'User'}
              </span>
              <ChevronDown size={14} className="text-white/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {user?.first_name || user?.username}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserRound size={16} className="mr-2" /> My profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <Settings size={16} className="mr-2" /> Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => router.push('/logout')}
              className="text-destructive"
            >
              <LogOut size={16} className="mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

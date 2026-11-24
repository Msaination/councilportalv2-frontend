/**
 * AppSidebar — collapsible navigation for the ECoP dashboard.
 * Uses shadcn/ui + Radix UI primitives.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Folder,
  Inbox,
  Share2,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useEffect, useState } from 'react'

type Capability = 'view_teams' | 'share_files' | 'edit_employee_numbers' | 'manage_access'

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  capability?: Capability
  anyOf?: Capability[]
  staffOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Calendar', icon: CalendarDays, href: '/dashboard/calendar' },
  { label: 'Resources', icon: Folder, href: '/dashboard/collections' },
  // Ordinary member access (§6.5) — every ward councillor sees their own.
  { label: 'My Complaints', icon: Inbox, href: '/dashboard/complaints' },
  {
    label: 'Shared Links', icon: Share2, href: '/dashboard/shared',
    capability: 'share_files',
  },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', staffOnly: true },
  {
    label: 'Committee', icon: Users, href: '/dashboard/team',
    capability: 'view_teams',
  },
  {
    label: 'Access', icon: ShieldCheck, href: '/dashboard/access',
    anyOf: ['manage_access', 'edit_employee_numbers'],
  },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Track the `md` breakpoint explicitly: the drawer is off-canvas on small
  // screens and inline from md up. An inline style is used because the utility
  // cascade for `left` was not overriding reliably.
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const sync = () => setIsDesktop(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const visibleItems = navItems.filter((item) => {
    if (item.staffOnly && !user?.is_staff) {
      return false
    }

    if (item.href === '/dashboard/team') {
      return Boolean(user)
    }

    const hasSingle = !item.capability || user?.capabilities[item.capability]
    const hasAny = !item.anyOf ||
      item.anyOf.some((capability) => user?.capabilities[capability])
    return hasSingle && hasAny
  })

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-40 md:hidden',
          open ? 'block' : 'hidden',
        )}
        onClick={() => onOpenChange(false)}
      />

      <aside
        style={{ left: isDesktop ? 0 : open ? 0 : '-16rem' }}
        className="flex flex-col h-screen bg-card border-r z-50 w-64 fixed top-0 md:relative transition-[left] duration-300 ease-out"
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-3 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/emalahleni-logo.png" alt="ECoP — Emalahleni Council Portal" className="h-6 w-6" width={24} height={24} />
            ECoP
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => onOpenChange(false)}>
            <ChevronLeft size={20} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

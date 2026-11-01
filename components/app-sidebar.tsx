/**
 * AppSidebar — collapsible navigation for the DAM dashboard.
 * Uses shadcn/ui + Radix UI primitives.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Folder,
  FileImage,
  Share2,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/components/auth-provider'
import { useState } from 'react'

type Capability = 'view_teams' | 'share_files' | 'edit_employee_numbers' | 'manage_access'

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  capability?: Capability
  anyOf?: Capability[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Calendar', icon: CalendarDays, href: '/dashboard/calendar' },
  { label: 'Assets', icon: FileImage, href: '/dashboard/assets' },
  { label: 'Collections', icon: Folder, href: '/dashboard/collections' },
  {
    label: 'Shared Links', icon: Share2, href: '/dashboard/shared',
    capability: 'share_files',
  },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
  {
    label: 'Team', icon: Users, href: '/dashboard/team',
    capability: 'view_teams',
  },
  {
    label: 'Access', icon: ShieldCheck, href: '/dashboard/access',
    anyOf: ['manage_access', 'edit_employee_numbers'],
  },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  const visibleItems = navItems.filter((item) => {
    const hasSingle = !item.capability || user?.capabilities[item.capability]
    const hasAny = !item.anyOf ||
      item.anyOf.some((capability) => user?.capabilities[capability])
    return hasSingle && hasAny
  })

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <img src="/emalahleni-logo.png" alt="Emalahleni DAM" className="h-6 w-6" />
            Emalahleni DAM
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto block">
            <img src="/emalahleni-logo.png" alt="Emalahleni DAM" className="h-6 w-6" />
          </Link>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 p-0"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand' : 'Collapse'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1">        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Tooltip key={item.href} delayDuration={150}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-10',
                      collapsed && 'justify-center p-0',
                    )}
                  >
                    <Icon size={collapsed ? 20 : 18} />
                    {!collapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

    </aside>
  )
}

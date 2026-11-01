/**
 * Dashboard calendar — meetings month view.
 * URL: /dashboard/calendar
 */

import { CalendarApp } from '@/components/calendar-app'

export default function CalendarPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CalendarApp />
    </div>
  )
}

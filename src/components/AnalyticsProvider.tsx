import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/lib/analytics'

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  return <>{children}</>
}

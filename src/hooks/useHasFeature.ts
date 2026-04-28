// src/hooks/useHasFeature.ts
//
// Per-session feature check hook. Cache features list keyed by user_id
// trong module-level Map → tránh duplicate fetch khi nhiều component
// cùng check feature trên cùng route.
//
// Admin bypass: is_admin=true luôn return hasFeature=true, không fetch DB.

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserFeatures } from '@/lib/auth'

const cache = new Map<string, Promise<string[]>>()

function loadFeatures(userId: string): Promise<string[]> {
  let pending = cache.get(userId)
  if (!pending) {
    pending = getUserFeatures(userId)
    cache.set(userId, pending)
  }
  return pending
}

export function invalidateFeatureCache(userId?: string) {
  if (userId) cache.delete(userId)
  else cache.clear()
}

export function useHasFeature(featureId: string): { hasFeature: boolean; loading: boolean } {
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasFeature, setHasFeature] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || !profile) {
      setHasFeature(false)
      setLoading(false)
      return
    }
    if (profile.is_admin) {
      setHasFeature(true)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    loadFeatures(user.id).then(features => {
      if (cancelled) return
      setHasFeature(features.includes(featureId))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [authLoading, user, profile, featureId])

  return { hasFeature, loading }
}

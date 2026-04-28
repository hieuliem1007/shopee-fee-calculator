// src/lib/use-db-fees.ts
//
// Per-session fee loader. Calculator dùng hook này thay vì hardcode.
// Per-session: load 1 lần khi mount; không re-fetch khi admin sửa
// (user phải reload page hoặc bấm reload() nếu cần).
// KHÔNG fallback hardcode khi DB fail (Phase 3 quyết định: DB là
// source of truth → nếu DB chết thì calculator không tính được).

import { useEffect, useState, useCallback } from 'react'
import { listDefaultFees, listCategoryFees } from './fees-admin'
import { mapDbFeeToClientFee, mapDbCategoryToClientCategory } from './fees'
import type { Fee, Category } from '@/types/fees'

export interface DbFeesState {
  loading: boolean
  error: string | null
  fixedFees: Fee[]
  varFees: Fee[]
  categories: Category[]
  reload: () => void
}

export function useDbFees(): DbFeesState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fixedFees, setFixedFees] = useState<Fee[]>([])
  const [varFees, setVarFees] = useState<Fee[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([listDefaultFees(false), listCategoryFees(false)])
      .then(([defaults, cats]) => {
        if (cancelled) return

        if (defaults.length === 0 || cats.length === 0) {
          setError('Không tải được phí, vui lòng tải lại trang')
          setLoading(false)
          return
        }

        const sortedDefaults = [...defaults].sort((a, b) => {
          const da = a.display_order ?? 9999
          const db = b.display_order ?? 9999
          if (da !== db) return da - db
          return a.fee_key.localeCompare(b.fee_key)
        })

        const fixed = sortedDefaults
          .filter(f => f.category === 'shopee_fixed')
          .map(mapDbFeeToClientFee)
        const variable = sortedDefaults
          .filter(f => f.category === 'shopee_variable')
          .map(mapDbFeeToClientFee)

        const sortedCats = [...cats].sort((a, b) => {
          const da = a.display_order ?? 9999
          const db = b.display_order ?? 9999
          if (da !== db) return da - db
          return a.category_name.localeCompare(b.category_name, 'vi')
        })
        const cs = sortedCats.map(mapDbCategoryToClientCategory)

        setFixedFees(fixed)
        setVarFees(variable)
        setCategories(cs)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Không tải được phí, vui lòng tải lại trang')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  return { loading, error, fixedFees, varFees, categories, reload }
}

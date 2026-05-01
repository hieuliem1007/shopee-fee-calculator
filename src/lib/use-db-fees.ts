// src/lib/use-db-fees.ts
//
// Per-session fee loader. Calculator dùng hook này thay vì hardcode.
// Per-session: load 1 lần khi mount; không re-fetch khi admin sửa
// (user phải reload page hoặc bấm reload() nếu cần).
// KHÔNG fallback hardcode khi DB fail (Phase 3 quyết định: DB là
// source of truth → nếu DB chết thì calculator không tính được).
//
// M6.9.2 — categories filter theo shopType (mall/normal). Hook nhận
// shopType param, refetch khi đổi loại shop. Default categories load
// 'mall' để khớp default state Calculator.

import { useEffect, useState, useCallback } from 'react'
import { listDefaultFees, listCategoryFees } from './fees-admin'
import { mapDbFeeToClientFee, mapDbCategoryToClientCategory } from './fees'
import type { Fee, Category, ShopType } from '@/types/fees'

export interface DbFeesState {
  loading: boolean      // chỉ true ở initial load đầu tiên (block UI)
  refetching: boolean   // true khi đang refetch (vd đổi shopType) — UI vẫn hiển thị
  error: string | null
  fixedFees: Fee[]
  varFees: Fee[]
  categories: Category[]
  reload: () => void
}

export function useDbFees(shopType: ShopType = 'mall'): DbFeesState {
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [refetching, setRefetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixedFees, setFixedFees] = useState<Fee[]>([])
  const [varFees, setVarFees] = useState<Fee[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setRefetching(true)
    setError(null)

    Promise.all([listDefaultFees(false), listCategoryFees(false, shopType)])
      .then(([defaults, cats]) => {
        if (cancelled) return

        if (defaults.length === 0 || cats.length === 0) {
          setError('Không tải được phí, vui lòng tải lại trang')
          setRefetching(false)
          setInitialLoaded(true)
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
        setRefetching(false)
        setInitialLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setError('Không tải được phí, vui lòng tải lại trang')
        setRefetching(false)
        setInitialLoaded(true)
      })

    return () => { cancelled = true }
  }, [tick, shopType])

  // loading = true chỉ khi chưa từng load thành công lần nào.
  // Sau initial load, các refetch (đổi shopType) chỉ set refetching=true,
  // UI vẫn giữ data cũ trong lúc fetch tránh flash blank screen.
  const loading = !initialLoaded && refetching
  return { loading, refetching, error, fixedFees, varFees, categories, reload }
}

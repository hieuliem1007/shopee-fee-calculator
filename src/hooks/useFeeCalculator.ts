import { useState, useEffect, useMemo } from 'react'
import { derive, buildSyntheticFixedFee } from '@/lib/fees'
import type { Fee, Category, ShopType, TaxMode, CalcMode, CalculatorState } from '@/types/fees'

interface InitialData {
  fixedFees: Fee[]      // DB-mapped shopee_fixed (không có 'fixed' synthetic)
  varFees: Fee[]        // DB-mapped shopee_variable
  categories: Category[]
  // M6.9.2 — shopType được lift lên CalculatorApp level (driver cho useDbFees
  // refetch categories khi user đổi shop). useFeeCalculator nhận controlled
  // value + setter từ ngoài.
  shopType: ShopType
  setShopType: (v: ShopType) => void
}

// Synthetic 'fixed' fee xếp đầu fixedFees panel; rate = adj của ngành đang chọn.
function withSyntheticFixed(dbFixed: Fee[], adj: number): Fee[] {
  return [buildSyntheticFixedFee(adj), ...dbFixed]
}

export function useFeeCalculator(initial: InitialData) {
  const defaultCategoryId = initial.categories[0]?.id ?? ''
  const defaultAdj = initial.categories[0]?.adj ?? 0
  const { shopType, setShopType } = initial

  const [costPrice, setCostPrice] = useState(200000)
  const [sellPrice, setSellPrice] = useState(400000)
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState(defaultCategoryId)
  const [taxMode, setTaxMode] = useState<TaxMode>('hokd')
  const [mode, setMode] = useState<CalcMode>('forward')
  const [fixedFees, setFixedFees] = useState<Fee[]>(() =>
    withSyntheticFixed(initial.fixedFees, defaultAdj)
  )
  const [varFees, setVarFees] = useState<Fee[]>(initial.varFees)

  // Auto-update synthetic 'fixed' rate khi đổi ngành hàng.
  useEffect(() => {
    const cat = initial.categories.find(c => c.id === category)
    if (!cat) return
    setFixedFees(prev => prev.map(f =>
      f.id === 'fixed' ? { ...f, rate: cat.adj } : f
    ))
  }, [category, initial.categories])

  // M6.9.2 — khi đổi shopType, danh sách categories thay đổi (Mall vs Normal
  // có id khác nhau). Nếu category đang chọn không còn trong list mới → reset
  // về category đầu tiên của bộ mới.
  // Lưu ý: applySnapshot có thể setShopType + setCategory cùng batch với category
  // belong to NEW shopType, NHƯNG dbFees còn đang refetch (categories cũ). Nếu
  // reset vội sẽ mất category snapshot. → wait until categories match shopType.
  // Heuristic đơn giản: chỉ reset khi categories list đã có data (length > 0)
  // VÀ category id không tồn tại trong list. Race khi refetch: categories list
  // cũ vẫn có >0 items, nên có thể vẫn reset sai. Để tránh, applySnapshot sẽ set
  // category SAU khi setShopType (dbFees refetch xong) — xem CalcFlow apply.
  // Hiện tại chấp nhận trade-off: edge case applySnapshot Mall→Normal với category
  // không trùng tên ngành sẽ reset về normal[0]. User có thể pick lại.
  useEffect(() => {
    if (initial.categories.length === 0) return
    if (!category) return
    const exists = initial.categories.some(c => c.id === category)
    if (!exists) {
      setCategory(initial.categories[0].id)
    }
  }, [initial.categories, category])

  const derived = useMemo(
    () => derive(costPrice, sellPrice, fixedFees, varFees),
    [costPrice, sellPrice, fixedFees, varFees]
  )

  const reset = () => {
    const cat = initial.categories.find(c => c.id === category)
    setFixedFees(withSyntheticFixed(initial.fixedFees, cat?.adj ?? defaultAdj))
    setVarFees(initial.varFees)
  }

  const currentSnapshot: CalculatorState = {
    costPrice, sellPrice, productName,
    shopType, category, taxMode,
    fixedFees, varFees,
  }

  const applySnapshot = (snap: CalculatorState) => {
    setCostPrice(snap.costPrice)
    setSellPrice(snap.sellPrice)
    setProductName(snap.productName)
    setShopType(snap.shopType)
    setCategory(snap.category)
    setTaxMode(snap.taxMode)
    setFixedFees(snap.fixedFees)
    setVarFees(snap.varFees)
  }

  return {
    costPrice, setCostPrice,
    sellPrice, setSellPrice,
    productName, setProductName,
    shopType, setShopType,
    category, setCategory,
    taxMode, setTaxMode,
    mode, setMode,
    fixedFees, setFixedFees,
    varFees, setVarFees,
    categories: initial.categories,
    ...derived,
    reset,
    currentSnapshot,
    applySnapshot,
  }
}

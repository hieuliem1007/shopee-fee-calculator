import { useState, useEffect, useMemo } from 'react'
import { derive, buildSyntheticFixedFee } from '@/lib/fees'
import type { Fee, Category, ShopType, TaxMode, CalcMode, CalculatorState } from '@/types/fees'

interface InitialData {
  fixedFees: Fee[]      // DB-mapped shopee_fixed (không có 'fixed' synthetic)
  varFees: Fee[]        // DB-mapped shopee_variable
  categories: Category[]
}

// Synthetic 'fixed' fee xếp đầu fixedFees panel; rate = adj của ngành đang chọn.
function withSyntheticFixed(dbFixed: Fee[], adj: number): Fee[] {
  return [buildSyntheticFixedFee(adj), ...dbFixed]
}

export function useFeeCalculator(initial: InitialData) {
  const defaultCategoryId = initial.categories[0]?.id ?? ''
  const defaultAdj = initial.categories[0]?.adj ?? 0

  const [costPrice, setCostPrice] = useState(200000)
  const [sellPrice, setSellPrice] = useState(400000)
  const [productName, setProductName] = useState('')
  const [shopType, setShopType] = useState<ShopType>('mall')
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

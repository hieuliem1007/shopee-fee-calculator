import { useState, useEffect, useMemo } from 'react'
import { DEFAULT_FIXED_FEES, DEFAULT_VAR_FEES, CATEGORIES, derive } from '@/lib/fees'
import type { Fee, ShopType, TaxMode, CalcMode, CalculatorState } from '@/types/fees'

export function useFeeCalculator() {
  const [costPrice, setCostPrice] = useState(200000)
  const [sellPrice, setSellPrice] = useState(400000)
  const [productName, setProductName] = useState('')
  const [shopType, setShopType] = useState<ShopType>('mall')
  const [category, setCategory] = useState('auto')
  const [taxMode, setTaxMode] = useState<TaxMode>('hokd')
  const [mode, setMode] = useState<CalcMode>('forward')
  const [fixedFees, setFixedFees] = useState<Fee[]>(DEFAULT_FIXED_FEES)
  const [varFees, setVarFees] = useState<Fee[]>(DEFAULT_VAR_FEES)

  // Auto-update fixed platform fee when category changes
  useEffect(() => {
    const cat = CATEGORIES.find(c => c.id === category)
    if (!cat) return
    setFixedFees(prev => prev.map(f =>
      f.id === 'fixed' ? { ...f, rate: cat.adj } : f
    ))
  }, [category])

  const derived = useMemo(
    () => derive(costPrice, sellPrice, fixedFees, varFees),
    [costPrice, sellPrice, fixedFees, varFees]
  )

  const reset = () => {
    setFixedFees(DEFAULT_FIXED_FEES)
    setVarFees(DEFAULT_VAR_FEES)
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
    // inputs
    costPrice, setCostPrice,
    sellPrice, setSellPrice,
    productName, setProductName,
    shopType, setShopType,
    category, setCategory,
    taxMode, setTaxMode,
    mode, setMode,
    fixedFees, setFixedFees,
    varFees, setVarFees,
    // derived
    ...derived,
    // actions
    reset,
    currentSnapshot,
    applySnapshot,
  }
}

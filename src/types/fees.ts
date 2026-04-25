export type FeeKind = 'pct' | 'flat'

export interface Fee {
  id: string
  name: string
  kind: FeeKind
  rate: number
  on: boolean
  hint: string
  custom?: boolean
}

export type ShopType = 'mall' | 'normal'
export type TaxMode = 'hokd' | 'company' | 'personal'
export type CalcMode = 'forward' | 'reverse'

export interface Category {
  id: string
  name: string
  adj: number
}

export interface CalculatorState {
  costPrice: number
  sellPrice: number
  productName: string
  shopType: ShopType
  category: string
  taxMode: TaxMode
  fixedFees: Fee[]
  varFees: Fee[]
}

export interface FeeSnapshot extends CalculatorState {
  // same shape — used for scenario storage
}

export interface Scenario {
  id: string
  name: string
  ts: number
  snapshot: FeeSnapshot
}

export interface DerivedFees {
  revenue: number
  fixedTotal: number
  varTotal: number
  feeTotal: number
  profit: number
  profitPct: number
}

// Original Shopee Fee Calculator UI — served at /app/shopee-calculator
// Phase 3: data-driven (DB-backed). Per-session load.
import { useEffect, useRef, useState } from 'react'
import type { ShopType, TaxMode } from './types/fees'
import { trackCalculatorUsed } from './lib/analytics'
import { SectionHeader } from './components/layout/SectionHeader'
import { Hero } from './components/calculator/Hero'
import { InputCard } from './components/calculator/InputCard'
import { ResultCard } from './components/calculator/ResultCard'
import { FeePanel } from './components/calculator/FeePanel'
import { CalcFlow } from './components/calculator/CalcFlow'
import { DualDonuts, TopFeesBar, RecommendationCard } from './components/calculator/Charts'
import { ScenariosSection } from './components/calculator/Scenarios'
import { useFeeCalculator } from './hooks/useFeeCalculator'
import { useDbFees, type DbFeesState } from './lib/use-db-fees'
import { Toast, type ToastState } from './components/ui/Toast'
import { useHasFeature } from './hooks/useHasFeature'
import { getZaloLink } from './lib/system-config'
import { RefreshCw, AlertCircle, Lock } from 'lucide-react'
import type { Scenario } from './types/fees'
import type { ScData } from './components/calculator/Scenarios'

export default function CalculatorApp() {
  const dbFees = useDbFees()

  if (dbFees.loading) {
    return (
      <div style={{
        padding: '24px 28px 48px', maxWidth: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 320, fontSize: 14, color: '#6B6B66',
      }}>
        Đang tải dữ liệu phí...
      </div>
    )
  }

  if (dbFees.error) {
    return (
      <div style={{
        padding: '24px 28px 48px', maxWidth: 720, margin: '40px auto',
      }}>
        <div style={{
          background: '#fff', border: '1px solid #FCA5A5', borderRadius: 12,
          padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <AlertCircle size={20} color="#A82928" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
              Không tải được dữ liệu phí
            </div>
            <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 14 }}>
              {dbFees.error}
            </div>
            <button onClick={dbFees.reload} style={{
              padding: '8px 16px', borderRadius: 8,
              background: '#1A1A1A', color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>Tải lại</button>
          </div>
        </div>
      </div>
    )
  }

  return <CalculatorBody dbFees={dbFees} />
}

const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  mall: 'Shop Mall',
  normal: 'Shop thường',
}

const TAX_MODE_LABELS: Record<TaxMode, string> = {
  hokd: 'Hộ kinh doanh',
  company: 'Công ty',
  personal: 'Cá nhân',
}

function CalculatorBody({ dbFees }: { dbFees: DbFeesState }) {
  const calc = useFeeCalculator({
    fixedFees: dbFees.fixedFees,
    varFees: dbFees.varFees,
    categories: dbFees.categories,
  })
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)

  const { hasFeature: canCompare, loading: compareLoading } = useHasFeature('shopee_compare_scenarios')

  const handleApplyScenario = (s: ScData) => calc.applySnapshot(s.snapshot)

  const handleSaveSuccess = (_resultId: string) => {
    setToast({ kind: 'success', message: 'Đã lưu kết quả. Xem trong Dashboard để tìm lại.' })
  }

  const handleSetMode = (m: typeof calc.mode) => {
    if (m === 'reverse' && calc.mode !== 'reverse') {
      setToast({
        kind: 'info',
        message: "Tính năng 'Tìm giá bán theo lợi nhuận' đang phát triển. Chúng tôi sẽ thông báo qua email khi ra mắt.",
      })
      return
    }
    calc.setMode(m)
  }

  const currentCategory = calc.categories.find(c => c.id === calc.category)
  const categoryLabel = currentCategory?.name ?? ''
  const shopTypeLabel = SHOP_TYPE_LABELS[calc.shopType] ?? calc.shopType
  const businessTypeLabel = TAX_MODE_LABELS[calc.taxMode] ?? calc.taxMode

  // GA: track khi user đã có đủ inputs (cost + sell + category). Throttle 5s
  // để tránh spam mỗi keystroke. Reset throttle khi đổi ngành (event mới).
  const lastTrackRef = useRef<number>(0)
  useEffect(() => {
    if (calc.costPrice <= 0 || calc.sellPrice <= 0 || !calc.category) return
    const now = Date.now()
    if (now - lastTrackRef.current < 5000) return
    lastTrackRef.current = now
    trackCalculatorUsed(calc.category, calc.profitPct)
  }, [calc.costPrice, calc.sellPrice, calc.category, calc.profitPct])

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <Hero mode={calc.mode} setMode={handleSetMode} />

      <InputCard
        costPrice={calc.costPrice} setCostPrice={calc.setCostPrice}
        sellPrice={calc.sellPrice} setSellPrice={calc.setSellPrice}
        productName={calc.productName} setProductName={calc.setProductName}
        shopType={calc.shopType} setShopType={calc.setShopType}
        category={calc.category} setCategory={calc.setCategory}
        taxMode={calc.taxMode} setTaxMode={calc.setTaxMode}
        categories={calc.categories}
      />

      <div style={{ marginTop: 16 }}>
        <ResultCard
          revenue={calc.revenue} costPrice={calc.costPrice}
          feeTotal={calc.feeTotal} profit={calc.profit}
          profitPct={calc.profitPct}
          fixedFees={calc.fixedFees} varFees={calc.varFees}
          productName={calc.productName}
          category={calc.category}
          categoryLabel={categoryLabel}
          shopTypeLabel={shopTypeLabel}
          businessTypeLabel={businessTypeLabel}
          onSaveSuccess={handleSaveSuccess}
          onShowToast={setToast}
        />
      </div>

      <section style={{ marginTop: 28 }}>
        <SectionHeader
          title="Bảng phí chi tiết"
          subtitle="Bật/tắt từng khoản, dòng tiền sẽ cập nhật ngay tức thì."
          right={
            <button onClick={calc.reset} style={{
              background: 'transparent', border: 0, padding: '6px 0',
              color: '#6B6B66', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
            }}>
              <RefreshCw size={13} /> Reset về mặc định
            </button>
          }
        />
        <div className="col-3" style={{ marginTop: 16 }}>
          <FeePanel title="Chi phí cố định" fees={calc.fixedFees} setFees={calc.setFixedFees}
            revenue={calc.revenue} color="#F5B81C" accentBg="#FAF6E8" />
          <CalcFlow revenue={calc.revenue} costPrice={calc.costPrice}
            fixedTotal={calc.fixedTotal} varTotal={calc.varTotal} profit={calc.profit} />
          <FeePanel title="Chi phí biến đổi" fees={calc.varFees} setFees={calc.setVarFees}
            revenue={calc.revenue} color="#3B82C4" accentBg="#EAF2FB" />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <SectionHeader
          title="Phân tích trực quan"
          subtitle="Cấu trúc doanh thu và phân rã chi phí — biết khoản nào ngốn lợi nhuận."
        />
        <div style={{ marginTop: 16 }}>
          <DualDonuts revenue={calc.revenue} costPrice={calc.costPrice}
            fixedFees={calc.fixedFees} varFees={calc.varFees} profit={calc.profit} />
          <div style={{ marginTop: 16 }}>
            <TopFeesBar fees={[...calc.fixedFees, ...calc.varFees]} revenue={calc.revenue} />
          </div>
        </div>
      </section>

      <RecommendationCard profit={calc.profit} profitPct={calc.profitPct}
        fixedFees={calc.fixedFees} revenue={calc.revenue} />

      {canCompare ? (
        <ScenariosSection scenarios={scenarios} setScenarios={setScenarios}
          current={calc.currentSnapshot} onApply={handleApplyScenario}
          categories={calc.categories} />
      ) : !compareLoading ? (
        <ScenariosLockCard />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function ScenariosLockCard() {
  const [zaloLink, setZaloLink] = useState<string | null>(null)
  const [zaloError, setZaloError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getZaloLink()
      .then(link => { if (!cancelled) setZaloLink(link) })
      .catch(() => { if (!cancelled) setZaloError(true) })
    return () => { cancelled = true }
  }, [])

  const disabled = !zaloLink || zaloError

  return (
    <section style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #EFEAE0' }}>
      <div style={{
        background: '#FAFAF7', border: '1px dashed #E2DDD0', borderRadius: 12,
        padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: '#fff', border: '1px solid #EFEAE0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={18} color="#A47408" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
            So sánh kịch bản — Tính năng nâng cao
          </div>
          <div style={{ fontSize: 13, color: '#6B6B66', lineHeight: 1.6, marginBottom: 14 }}>
            Lưu nhiều cấu hình giá vốn / giá bán để so sánh lợi nhuận side-by-side.
            Liên hệ admin để mở khóa tính năng này.
          </div>
          <a
            href={disabled ? undefined : zaloLink!}
            target="_blank"
            rel="noreferrer"
            aria-disabled={disabled}
            onClick={e => { if (disabled) e.preventDefault() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: disabled ? '#E5E5E0' : '#0084FF',
              color: disabled ? '#A8A89E' : '#fff',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {zaloLink === null && !zaloError ? 'Đang tải...' : zaloError ? 'Vui lòng thử lại sau' : 'Liên hệ admin để mở khóa'}
          </a>
        </div>
      </div>
    </section>
  )
}

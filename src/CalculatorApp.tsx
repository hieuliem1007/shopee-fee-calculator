// Original Shopee Fee Calculator UI — served at /app/shopee-calculator
import { useState } from 'react'
import { SectionHeader } from './components/layout/SectionHeader'
import { Hero } from './components/calculator/Hero'
import { InputCard } from './components/calculator/InputCard'
import { ResultCard } from './components/calculator/ResultCard'
import { FeePanel } from './components/calculator/FeePanel'
import { CalcFlow } from './components/calculator/CalcFlow'
import { DualDonuts, TopFeesBar, RecommendationCard } from './components/calculator/Charts'
import { ScenariosSection } from './components/calculator/Scenarios'
import { useFeeCalculator } from './hooks/useFeeCalculator'
import { RefreshCw } from 'lucide-react'
import type { Scenario } from './types/fees'
import type { ScData } from './components/calculator/Scenarios'

export default function CalculatorApp() {
  const calc = useFeeCalculator()
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  const handleApplyScenario = (s: ScData) => calc.applySnapshot(s.snapshot)

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 1200 }}>
      <Hero mode={calc.mode} setMode={calc.setMode} />

      <InputCard
        costPrice={calc.costPrice} setCostPrice={calc.setCostPrice}
        sellPrice={calc.sellPrice} setSellPrice={calc.setSellPrice}
        productName={calc.productName} setProductName={calc.setProductName}
        shopType={calc.shopType} setShopType={calc.setShopType}
        category={calc.category} setCategory={calc.setCategory}
        taxMode={calc.taxMode} setTaxMode={calc.setTaxMode}
      />

      <div style={{ marginTop: 16 }}>
        <ResultCard
          revenue={calc.revenue} costPrice={calc.costPrice}
          feeTotal={calc.feeTotal} profit={calc.profit}
          profitPct={calc.profitPct}
          fixedFees={calc.fixedFees} varFees={calc.varFees}
          onSave={() => {}}
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

      <ScenariosSection scenarios={scenarios} setScenarios={setScenarios}
        current={calc.currentSnapshot} onApply={handleApplyScenario} />
    </div>
  )
}

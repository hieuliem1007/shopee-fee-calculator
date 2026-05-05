import { useEffect, useRef, useState } from 'react'
import { Bookmark, Image, Download, Share2, Lock, Loader2 } from 'lucide-react'
import { ResultHero } from './ResultHero'
import { SmartAlerts } from './SmartAlerts'
import { SaveResultDialog } from './SaveResultDialog'
import { ShareLinkDialog } from './ShareLinkDialog'
import { ExportTemplate, type ExportFee } from './ExportTemplate'
import { useHasFeature } from '@/hooks/useHasFeature'
import { exportTemplateAsPNG, buildExportFilename } from '@/lib/export-image'
import { exportTemplateAsPDF } from '@/lib/export-pdf'
import { computeFee } from '@/lib/fees'
import { computeSmartAlerts } from '@/lib/smart-alerts'
import { generateRecommendation } from '@/lib/recommendation-engine'
import { trackEvent } from '@/lib/analytics'
import type { Fee } from '@/types/fees'
import type { ToastState } from '@/components/ui/Toast'

interface Props {
  revenue: number
  costPrice: number
  feeTotal: number
  profit: number
  profitPct: number
  fixedFees: Fee[]
  varFees: Fee[]
  productName: string
  category: string
  categoryLabel: string
  shopTypeLabel: string
  businessTypeLabel: string
  onSaveSuccess?: (resultId: string) => void
  onShowToast?: (toast: ToastState) => void
}

const btnSec: React.CSSProperties = {
  padding: '12px 12px', borderRadius: 10,
  background: '#FFFFFF', color: '#1A1A1A',
  border: '1px solid #E2DDD0', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, fontFamily: 'inherit',
}

function toExportFee(f: Fee, revenue: number): ExportFee {
  return {
    id: f.id,
    name: f.name,
    rate: f.rate,
    kind: f.kind,
    amount: computeFee(f, revenue),
  }
}

function toFeeSnapshot(f: Fee, group: 'fixed' | 'var') {
  return {
    id: f.id,
    label: f.name,
    value: f.kind === 'pct' ? +(f.rate * 100).toFixed(4) : f.rate,
    unit: f.kind === 'pct' ? 'percent' : 'vnd',
    on: f.on,
    custom: f.custom ?? false,
    group,
  }
}

export function ResultCard({
  revenue, costPrice, feeTotal, profit, profitPct,
  fixedFees, varFees,
  productName, category, categoryLabel,
  shopTypeLabel, businessTypeLabel,
  onSaveSuccess, onShowToast,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [savedResultId, setSavedResultId] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const wantShareAfterSaveRef = useRef(false)

  const { hasFeature: canSave, loading: featureLoading } = useHasFeature('shopee_save_result')
  const { hasFeature: canShare, loading: shareFeatureLoading } = useHasFeature('shopee_share_link')
  const { hasFeature: canExportImage, loading: exportImageLoading } = useHasFeature('shopee_export_image')
  const { hasFeature: canExportPdf, loading: exportPdfLoading } = useHasFeature('shopee_export_pdf')
  const { hasFeature: canSmartAlerts, loading: smartAlertsLoading } = useHasFeature('shopee_smart_alerts')
  const { hasFeature: canExpertInsight } = useHasFeature('shopee_expert_insight')

  // Saved result tied to current inputs/fees; clear khi user thay đổi inputs hay fees
  // → tránh share một snapshot stale.
  const inputSignature = `${costPrice}|${revenue}|${category}|${productName}|${[...fixedFees, ...varFees].map(f => `${f.id}:${f.on?1:0}:${f.rate}`).join(',')}`
  useEffect(() => {
    setSavedResultId(null)
  }, [inputSignature])

  // Lưu thêm `group` để Saved/Share render 2 panel "Phí cố định" /
  // "Phí biến đổi" giống Calculator. Dữ liệu cũ (pre-M6.7) không có group
  // → fallback ở SavedResultDetailPage / PublicSharePage.
  const feesSnapshot = [
    ...fixedFees.map(f => toFeeSnapshot(f, 'fixed')),
    ...varFees.map(f => toFeeSnapshot(f, 'var')),
  ]

  const inputs = {
    costPrice, sellPrice: revenue,
    category, categoryLabel,
    shopTypeLabel, taxModeLabel: businessTypeLabel,
    // M6.9.2 — lưu shopType raw value để saved/share biết loại shop chính xác
    // (independent của label tiếng Việt). Saved cũ không có field này → fallback
    // theo shopTypeLabel hoặc null tại read site.
    shopType: shopTypeLabel === 'Shop Mall' ? 'mall' : 'normal',
  }

  // Phase 7 — snapshot integrity (Approach 1): user mất quyền lúc save → field = null →
  // vĩnh viễn không có (kể cả admin bật lại quyền sau), giống logic phí.
  // PublicShare/SavedDetail tự ẩn block khi field null nhờ guard `&&` có sẵn.
  // Saved cũ (trước fix này) không bị ảnh hưởng — chỉ apply saved MỚI từ giờ.
  const smartAlerts = canSmartAlerts
    ? computeSmartAlerts(
        { revenue, feeTotal, profit, profitPct, costPrice },
        fixedFees, varFees,
      )
    : null

  const fixedTotalForRec = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const varTotalForRec = varFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const shopTypeForRec: 'mall' | 'normal' = shopTypeLabel === 'Shop Mall' ? 'mall' : 'normal'
  const recommendation = canExpertInsight
    ? generateRecommendation({
        costPrice, sellPrice: revenue,
        fixedFees, varFees,
        revenue, feeTotal,
        fixedTotal: fixedTotalForRec, varTotal: varTotalForRec,
        profit, profitPct,
        shopType: shopTypeForRec,
        productName, categoryLabel,
      })
    : null

  const results = { feeTotal, profit, profitPct, revenue, alerts: smartAlerts, recommendation }

  const handleSaveClick = () => {
    if (!canSave || featureLoading) return
    setDialogOpen(true)
  }

  const handleShareClick = () => {
    if (!canShare || shareFeatureLoading) return
    if (savedResultId) {
      setShareDialogOpen(true)
      return
    }
    if (!canSave) {
      onShowToast?.({
        kind: 'info',
        message: 'Vui lòng lưu kết quả trước khi chia sẻ. Vào Dashboard → Chi tiết để mở link share.',
      })
      return
    }
    onShowToast?.({
      kind: 'info',
      message: 'Vui lòng lưu kết quả trước khi chia sẻ.',
    })
    wantShareAfterSaveRef.current = true
    setDialogOpen(true)
  }

  const handleSaved = (id: string) => {
    setSavedResultId(id)
    onSaveSuccess?.(id)
    if (wantShareAfterSaveRef.current) {
      wantShareAfterSaveRef.current = false
      setShareDialogOpen(true)
    }
  }

  const buildTemplateElement = () => {
    const activeFixed = fixedFees.filter(f => f.on).map(f => toExportFee(f, revenue))
    const activeVar = varFees.filter(f => f.on).map(f => toExportFee(f, revenue))
    const totalFixed = activeFixed.reduce((s, f) => s + f.amount, 0)
    const totalVar = activeVar.reduce((s, f) => s + f.amount, 0)
    const costPct = revenue > 0 ? (feeTotal / revenue) * 100 : 0
    const exportDate = new Date().toLocaleDateString('vi-VN')

    return (
      <ExportTemplate
        productName={productName}
        category={categoryLabel || category || '—'}
        shopType={shopTypeLabel}
        businessType={businessTypeLabel}
        inputs={{ costPrice, sellPrice: revenue }}
        results={{ profit, profitPct, totalCost: feeTotal, costPct }}
        fixedFees={activeFixed}
        variableFees={activeVar}
        totalFixedFees={totalFixed}
        totalVariableFees={totalVar}
        fixedFeesActiveCount={activeFixed.length}
        fixedFeesTotalCount={fixedFees.length}
        variableFeesActiveCount={activeVar.length}
        variableFeesTotalCount={varFees.length}
        exportDate={exportDate}
      />
    )
  }

  const handleExportImage = async () => {
    if (!canExportImage || exportImageLoading || exporting) return
    setExporting('png')
    try {
      const filename = buildExportFilename(productName, 'png')
      await exportTemplateAsPNG(buildTemplateElement(), filename)
      trackEvent('export_image', {
        event_category: 'engagement',
        tool_id: 'shopee_calculator',
      })
      onShowToast?.({ kind: 'success', message: 'Đã tải ảnh kết quả' })
    } catch {
      onShowToast?.({ kind: 'error', message: 'Lỗi khi tải ảnh, vui lòng thử lại' })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    if (!canExportPdf || exportPdfLoading || exporting) return
    setExporting('pdf')
    try {
      const filename = buildExportFilename(productName, 'pdf')
      await exportTemplateAsPDF(buildTemplateElement(), filename)
      trackEvent('export_pdf', {
        event_category: 'engagement',
        tool_id: 'shopee_calculator',
      })
      onShowToast?.({ kind: 'success', message: 'Đã xuất file PDF' })
    } catch {
      onShowToast?.({ kind: 'error', message: 'Lỗi khi xuất PDF, vui lòng thử lại' })
    } finally {
      setExporting(null)
    }
  }

  return (
    <ResultHero
      revenue={revenue} costPrice={costPrice} feeTotal={feeTotal}
      profit={profit} profitPct={profitPct}
      kind="live"
    >
      {!smartAlertsLoading && costPrice > 0 && revenue > 0 && (
        <SmartAlerts
          result={{ revenue, feeTotal, profit, profitPct, costPrice }}
          fixedFees={fixedFees}
          varFees={varFees}
          hasFeature={canSmartAlerts}
        />
      )}

      {/* Action buttons */}
      <div className="result-actions" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10, marginTop: 24,
      }}>
        <button
          onClick={handleSaveClick}
          disabled={!canSave || featureLoading}
          title={!canSave && !featureLoading ? 'Liên hệ admin để mở khóa tính năng lưu kết quả' : undefined}
          style={{
            padding: '12px 14px', borderRadius: 10,
            background: canSave ? '#F5B81C' : '#E5E5E0',
            color: canSave ? '#1A1A1A' : '#A8A89E',
            border: 0, fontSize: 13, fontWeight: 600,
            cursor: canSave && !featureLoading ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, transition: 'all 0.2s', fontFamily: 'inherit',
            boxShadow: canSave ? '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)' : 'none',
          }}
        >
          {canSave ? <Bookmark size={14} /> : <Lock size={14} />}
          Lưu kết quả
        </button>
        <button
          onClick={handleExportImage}
          disabled={!canExportImage || exportImageLoading || exporting !== null}
          title={!canExportImage && !exportImageLoading ? 'Liên hệ admin để mở khóa tính năng tải ảnh' : undefined}
          style={{
            ...btnSec,
            background: canExportImage ? '#FFFFFF' : '#F5F5F0',
            color: canExportImage ? '#1A1A1A' : '#A8A89E',
            cursor: canExportImage && !exportImageLoading && exporting === null ? 'pointer' : 'not-allowed',
            opacity: canExportImage ? 1 : 0.7,
          }}
        >
          {!canExportImage ? <Lock size={14} /> :
            exporting === 'png' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> :
            <Image size={14} />} Tải ảnh
        </button>
        <button
          onClick={handleExportPdf}
          disabled={!canExportPdf || exportPdfLoading || exporting !== null}
          title={!canExportPdf && !exportPdfLoading ? 'Liên hệ admin để mở khóa tính năng xuất PDF' : undefined}
          style={{
            ...btnSec,
            background: canExportPdf ? '#FFFFFF' : '#F5F5F0',
            color: canExportPdf ? '#1A1A1A' : '#A8A89E',
            cursor: canExportPdf && !exportPdfLoading && exporting === null ? 'pointer' : 'not-allowed',
            opacity: canExportPdf ? 1 : 0.7,
          }}
        >
          {!canExportPdf ? <Lock size={14} /> :
            exporting === 'pdf' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> :
            <Download size={14} />} Xuất PDF
        </button>
        <button
          onClick={handleShareClick}
          disabled={!canShare || shareFeatureLoading || exporting !== null}
          title={!canShare && !shareFeatureLoading ? 'Liên hệ admin để mở khóa tính năng chia sẻ' : undefined}
          style={{
            ...btnSec,
            background: canShare ? '#FFFFFF' : '#F5F5F0',
            color: canShare ? '#1A1A1A' : '#A8A89E',
            cursor: canShare && !shareFeatureLoading && exporting === null ? 'pointer' : 'not-allowed',
            opacity: canShare ? 1 : 0.7,
          }}
        >
          {canShare ? <Share2 size={14} /> : <Lock size={14} />} Chia sẻ
        </button>
      </div>

      <SaveResultDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          wantShareAfterSaveRef.current = false
        }}
        defaultProductName={productName}
        inputs={inputs}
        feesSnapshot={feesSnapshot}
        results={results}
        onSaved={handleSaved}
      />

      <ShareLinkDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resultId={savedResultId ?? ''}
        existingSlug={null}
        resultName={productName || 'Kết quả không tên'}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .result-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </ResultHero>
  )
}

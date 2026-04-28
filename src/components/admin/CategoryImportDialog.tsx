import { useState, useRef, type ReactNode } from 'react'
import {
  Upload, FileSpreadsheet, AlertTriangle, AlertCircle, Loader2,
  ArrowLeft, ArrowRight, Download, X, CheckCircle2,
} from 'lucide-react'
import {
  bulkImportCategories, type ImportMode, type ImportResult,
} from '@/lib/fees-admin'
import {
  parseExcelFile, downloadSampleExcel, type ParseResult,
} from '@/lib/import-excel'

// ── Layout helpers ──────────────────────────────────────────────────

function DialogShell({ onClose, children }: {
  onClose: () => void; children: ReactNode
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 0,
        width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>{children}</div>
    </div>
  )
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Chọn file' },
    { n: 2, label: 'Chế độ' },
    { n: 3, label: 'Xác nhận' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 0, padding: '14px 24px',
      borderBottom: '1px solid #EFEAE0',
      alignItems: 'center',
    }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flex: i === steps.length - 1 ? 0 : 1,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: current >= s.n ? '#1D9E75' : '#EFEAE0',
            color: current >= s.n ? '#fff' : '#8A8A82',
            fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {current > s.n ? <CheckCircle2 size={13} /> : s.n}
          </div>
          <span style={{
            fontSize: 12, fontWeight: current === s.n ? 600 : 500,
            color: current >= s.n ? '#1A1A1A' : '#8A8A82',
          }}>{s.label}</span>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 1, background: '#EFEAE0',
              margin: '0 12px',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled, loading, danger = false }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding: '9px 18px', borderRadius: 8, border: 'none',
      background: danger ? '#A82928' : '#1D9E75',
      color: '#fff', fontSize: 13, fontWeight: 600,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
      opacity: (disabled || loading) ? 0.6 : 1,
    }}>
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick, disabled }: {
  children: ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
      background: '#fff', fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</button>
  )
}

// ── Main wizard ─────────────────────────────────────────────────────

export interface CategoryImportDialogProps {
  onClose: () => void
  onSuccess: (result: ImportResult) => void
  onError: (msg: string) => void
}

export function CategoryImportDialog({ onClose, onSuccess, onError }: CategoryImportDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showInvalidRows, setShowInvalidRows] = useState(false)
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setParsing(true)
    try {
      const result = await parseExcelFile(selectedFile)
      setParseResult(result)
      if (result.fatalError) {
        onError(result.fatalError)
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Không đọc được file')
      setParseResult(null)
    }
    setParsing(false)
  }

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return
    setImporting(true)
    const rows = parseResult.validRows.map(r => r.data!).filter(Boolean)
    const { data, error } = await bulkImportCategories(rows, mode)
    setImporting(false)
    if (error) {
      onError(error)
      return
    }
    if (data) onSuccess(data)
  }

  const validCount = parseResult?.validRows.length ?? 0
  const invalidCount = parseResult?.invalidRows.length ?? 0
  const totalCount = parseResult?.totalRows ?? 0

  return (
    <DialogShell onClose={onClose}>
      <div style={{
        padding: '18px 24px 0', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>
          Import ngành hàng từ Excel
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#8A8A82', display: 'flex', alignItems: 'center', padding: 4,
        }}>
          <X size={18} />
        </button>
      </div>

      <StepIndicator current={step} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {step === 1 && (
          <Step1
            file={file} parsing={parsing} parseResult={parseResult}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDownloadSample={downloadSampleExcel}
          />
        )}
        {step === 2 && (
          <Step2 mode={mode} onChange={setMode}
            replaceConfirmed={replaceConfirmed}
            onReplaceConfirmedChange={setReplaceConfirmed}
            validCount={validCount} />
        )}
        {step === 3 && parseResult && (
          <Step3 parseResult={parseResult} mode={mode}
            showInvalid={showInvalidRows}
            onToggleInvalid={() => setShowInvalidRows(v => !v)} />
        )}
      </div>

      {/* Footer actions */}
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'space-between',
        alignItems: 'center', padding: '14px 24px',
        borderTop: '1px solid #EFEAE0',
      }}>
        <div style={{ fontSize: 12, color: '#8A8A82' }}>
          {step === 3 && totalCount > 0 && (
            <>
              Tổng <strong>{totalCount}</strong> dòng:{' '}
              <span style={{ color: '#166534' }}>✅ {validCount} hợp lệ</span>
              {invalidCount > 0 && (
                <> | <span style={{ color: '#A82928' }}>❌ {invalidCount} lỗi</span></>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <SecondaryButton onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} disabled={importing}>
              <ArrowLeft size={13} /> Quay lại
            </SecondaryButton>
          )}
          <SecondaryButton onClick={onClose} disabled={importing}>Hủy</SecondaryButton>
          {step === 1 && (
            <PrimaryButton onClick={() => setStep(2)}
              disabled={!parseResult || parseResult.fatalError !== null || validCount === 0}>
              Bước tiếp <ArrowRight size={13} />
            </PrimaryButton>
          )}
          {step === 2 && (
            <PrimaryButton onClick={() => setStep(3)}
              disabled={mode === 'replace' && !replaceConfirmed}>
              Bước tiếp <ArrowRight size={13} />
            </PrimaryButton>
          )}
          {step === 3 && (
            <PrimaryButton onClick={handleConfirmImport}
              disabled={validCount === 0}
              loading={importing}
              danger={mode === 'replace'}>
              {mode === 'replace' ? 'Xác nhận thay thế' : 'Xác nhận import'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </DialogShell>
  )
}

// ── Step 1: chọn file ───────────────────────────────────────────────

function Step1({ file, parsing, parseResult, fileInputRef, onFileSelect, onDownloadSample }: {
  file: File | null
  parsing: boolean
  parseResult: ParseResult | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (f: File) => void
  onDownloadSample: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const validCount = parseResult?.validRows.length ?? 0
  const invalidCount = parseResult?.invalidRows.length ?? 0

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFileSelect(f)
        }}
        style={{
          border: `2px dashed ${dragOver ? '#1D9E75' : '#EFEAE0'}`,
          background: dragOver ? '#DCFCE7' : '#FAFAF7',
          borderRadius: 10, padding: '32px 20px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onFileSelect(f)
          }} />
        {parsing ? (
          <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
        ) : file ? (
          <>
            <FileSpreadsheet size={28} color="#1D9E75" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: '#6B6B66' }}>
              {(file.size / 1024).toFixed(1)} KB · click để chọn file khác
            </div>
          </>
        ) : (
          <>
            <Upload size={28} color="#8A8A82" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>
              Click hoặc kéo thả file vào đây
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              Định dạng hỗ trợ: .xlsx, .xls, .csv
            </div>
          </>
        )}
      </div>

      {parseResult?.fatalError && (
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 8,
          background: '#FEE2E2', border: '1px solid #FCA5A5',
          color: '#991B1B', fontSize: 13,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{parseResult.fatalError}</span>
        </div>
      )}

      {parseResult && !parseResult.fatalError && (
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 8,
          background: validCount > 0 ? '#DCFCE7' : '#FEF2F2',
          border: `1px solid ${validCount > 0 ? '#86EFAC' : '#FCA5A5'}`,
          color: validCount > 0 ? '#166534' : '#991B1B',
          fontSize: 13,
        }}>
          ✅ {validCount} dòng hợp lệ
          {invalidCount > 0 && `, ❌ ${invalidCount} dòng có lỗi`}
        </div>
      )}

      <div style={{
        marginTop: 18, padding: 14, borderRadius: 8,
        background: '#FAFAF7', border: '1px solid #EFEAE0',
      }}>
        <div style={{ fontSize: 12, color: '#6B6B66', marginBottom: 8 }}>
          <strong>Định dạng file:</strong> 3 cột — Tên ngành | Phí % | Mô tả (tùy chọn).
          Dòng 1 là header. Tối đa 200 dòng dữ liệu.
        </div>
        <button onClick={onDownloadSample} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8,
          border: '1px solid #EFEAE0', background: '#fff',
          fontSize: 12, color: '#1A1A1A', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500,
        }}>
          <Download size={12} /> Tải file mẫu (.xlsx)
        </button>
      </div>
    </div>
  )
}

// ── Step 2: chọn mode ───────────────────────────────────────────────

function Step2({ mode, onChange, replaceConfirmed, onReplaceConfirmedChange, validCount }: {
  mode: ImportMode
  onChange: (m: ImportMode) => void
  replaceConfirmed: boolean
  onReplaceConfirmedChange: (v: boolean) => void
  validCount: number
}) {
  return (
    <div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 14 }}>
        Chọn cách áp dụng dữ liệu từ file vào bảng <strong>category_fees</strong>:
      </div>

      <ModeOption
        active={mode === 'merge'}
        onClick={() => { onChange('merge'); onReplaceConfirmedChange(false) }}
        title="Merge (cộng dồn)"
        recommended
      >
        Ngành đã có (cùng tên, không phân biệt hoa/thường) → cập nhật giá + mô tả.
        Ngành mới → thêm vào.
        <br />
        <span style={{ color: '#166534', fontWeight: 500 }}>Khuyến nghị</span> cho hầu hết tình huống.
      </ModeOption>

      <ModeOption
        active={mode === 'replace'}
        onClick={() => onChange('replace')}
        title="Replace (thay thế hết)"
        danger
      >
        <strong>⚠️ Xóa toàn bộ ngành hàng đang active</strong>, sau đó nhập lại từ file.
        Dữ liệu cũ sẽ KHÔNG khôi phục được tự động qua UI.
        <br />
        Chỉ chọn khi bạn muốn reset hoàn toàn danh sách ngành hàng.
      </ModeOption>

      {mode === 'replace' && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            color: '#991B1B', fontSize: 12, marginBottom: 12,
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Bạn đang chọn <strong>Replace</strong>. Sau khi confirm sẽ
              {validCount > 0 ? <> thay toàn bộ ngành hàng hiện có bằng <strong>{validCount}</strong> ngành từ file.</> : <> XÓA HẾT ngành hàng hiện có và KHÔNG nhập lại gì.</>}
            </span>
          </div>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            fontSize: 13, color: '#1A1A1A', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={replaceConfirmed}
              onChange={e => onReplaceConfirmedChange(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#A82928' }} />
            <span>Tôi hiểu sẽ xóa hết ngành hàng cũ và muốn tiếp tục.</span>
          </label>
        </div>
      )}
    </div>
  )
}

function ModeOption({ active, onClick, title, recommended, danger, children }: {
  active: boolean
  onClick: () => void
  title: string
  recommended?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <div onClick={onClick} style={{
      padding: 14, borderRadius: 10,
      border: `2px solid ${active ? (danger ? '#A82928' : '#1D9E75') : '#EFEAE0'}`,
      background: active ? (danger ? '#FEF2F2' : '#DCFCE7') : '#fff',
      cursor: 'pointer', marginBottom: 10,
      transition: 'all 0.15s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
      }}>
        <input type="radio" checked={active} readOnly
          style={{ accentColor: danger ? '#A82928' : '#1D9E75' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{title}</span>
        {recommended && (
          <span style={{
            padding: '1px 8px', borderRadius: 999,
            background: '#86EFAC', color: '#166534',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          }}>KHUYẾN NGHỊ</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66', lineHeight: 1.5, paddingLeft: 24 }}>
        {children}
      </div>
    </div>
  )
}

// ── Step 3: preview ─────────────────────────────────────────────────

function Step3({ parseResult, mode, showInvalid, onToggleInvalid }: {
  parseResult: ParseResult
  mode: ImportMode
  showInvalid: boolean
  onToggleInvalid: () => void
}) {
  const { validRows, invalidRows } = parseResult

  return (
    <div>
      {validRows.length === 0 ? (
        <div style={{
          padding: 18, borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          color: '#991B1B', fontSize: 13,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Không có dòng nào hợp lệ để import. Quay lại sửa file.</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#6B6B66', marginBottom: 10 }}>
            Mode: <strong>{mode === 'merge' ? 'Merge (cộng dồn)' : 'Replace (thay thế hết)'}</strong>.
            {mode === 'merge'
              ? ' Hành động dự kiến của từng dòng (UPDATE/INSERT) chỉ là gợi ý — DB sẽ quyết theo tên ngành thực tế tại thời điểm import.'
              : ' Mọi ngành hàng sẽ là INSERT mới (sau khi xóa cũ).'}
          </div>

          <div style={{
            border: '1px solid #EFEAE0', borderRadius: 8, overflow: 'hidden',
            marginBottom: invalidRows.length > 0 ? 14 : 0,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '50px 1fr 90px minmax(0, 2fr) 100px',
              gap: 10, alignItems: 'center',
              padding: '8px 14px', background: '#DCFCE7',
              fontSize: 11, fontWeight: 600, color: '#166534',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              borderBottom: '1px solid #86EFAC',
            }}>
              <span>#</span><span>Tên ngành</span><span>Phí %</span><span>Mô tả</span><span>Hành động</span>
            </div>
            {validRows.map((r, idx) => (
              <div key={r.rowNumber} style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 90px minmax(0, 2fr) 100px',
                gap: 10, alignItems: 'center',
                padding: '8px 14px',
                background: idx % 2 === 0 ? '#fff' : '#FAFAF7',
                fontSize: 13, color: '#1A1A1A',
                borderBottom: idx === validRows.length - 1 ? 'none' : '1px solid #F5F2EA',
              }}>
                <span style={{ color: '#8A8A82' }}>{r.rowNumber}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.data?.name}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.data?.fee_percent.toFixed(2)}
                </span>
                <span style={{
                  color: '#6B6B66', fontSize: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.data?.description ?? <span style={{ color: '#A8A89E' }}>—</span>}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#166534',
                }}>
                  {mode === 'replace' ? 'INSERT' : 'AUTO'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {invalidRows.length > 0 && (
        <div style={{
          border: '1px solid #FCA5A5', borderRadius: 8, overflow: 'hidden',
        }}>
          <button onClick={onToggleInvalid} style={{
            width: '100%', padding: '10px 14px',
            background: '#FEF2F2', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12, fontWeight: 600, color: '#991B1B',
            cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>{invalidRows.length} dòng có lỗi (sẽ bỏ qua khi import)</span>
            <span>{showInvalid ? '▴' : '▾'}</span>
          </button>
          {showInvalid && (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '60px 60px 1fr',
                gap: 10, padding: '6px 14px',
                background: '#FEE2E2',
                fontSize: 11, fontWeight: 600, color: '#991B1B',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderTop: '1px solid #FCA5A5',
              }}>
                <span>#</span><span>Dòng</span><span>Lỗi</span>
              </div>
              {invalidRows.map((r, idx) => (
                <div key={r.rowNumber} style={{
                  display: 'grid', gridTemplateColumns: '60px 60px 1fr',
                  gap: 10, padding: '6px 14px',
                  background: '#fff', fontSize: 12, color: '#1A1A1A',
                  borderTop: '1px solid #FCA5A5',
                }}>
                  <span style={{ color: '#8A8A82' }}>{idx + 1}</span>
                  <span style={{ color: '#8A8A82' }}>{r.rowNumber}</span>
                  <span style={{ color: '#A82928' }}>{r.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

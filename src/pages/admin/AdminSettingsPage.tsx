import { useState, useEffect, type ReactNode } from 'react'
import { Pencil, Loader2, Save, AlertCircle, AlertTriangle } from 'lucide-react'
import {
  listSystemConfig, updateSystemConfig, validateConfigValue,
  type SystemConfigEntry,
} from '@/lib/system-config'

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ── Toast ───────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'warning' | 'error'; message: string } | null

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  const palette = toast.type === 'success'
    ? { bg: '#DCFCE7', border: '#86EFAC', color: '#166534' }
    : toast.type === 'warning'
    ? { bg: '#FEF3C7', border: '#FCD34D', color: '#92400E' }
    : { bg: '#FEE2E2', border: '#FCA5A5', color: '#991B1B' }
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 200,
      padding: '12px 18px', borderRadius: 10,
      background: palette.bg, color: palette.color,
      border: `1px solid ${palette.border}`,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'fadeIn 0.2s ease', maxWidth: 420,
    }}>{toast.message}</div>
  )
}

// ── Dialog shell ────────────────────────────────────────────────────

function DialogShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 28,
        width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>{children}</div>
    </div>
  )
}

// ── Edit dialog ─────────────────────────────────────────────────────

function EditConfigDialog({ config, onClose, onSuccess, onWarning, onError }: {
  config: SystemConfigEntry
  onClose: () => void
  onSuccess: (msg: string) => void
  onWarning: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [value, setValue] = useState(config.value)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const validateErr = validateConfigValue(config.key, value)
    if (validateErr) {
      setError(validateErr)
      return
    }

    setSaving(true)
    const { data, error: rpcError } = await updateSystemConfig(config.key, value)
    setSaving(false)
    if (rpcError) {
      onError(rpcError)
      return
    }
    if (data?.changed) {
      onSuccess(`Đã cập nhật, giá trị mới: ${value}`)
    } else {
      onWarning('Giá trị không thay đổi')
    }
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>
        Sửa cấu hình: <span style={{ fontFamily: 'monospace' }}>{config.key}</span>
      </div>

      {!config.is_string && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: '#FEF3C7', border: '1px solid #FCD34D',
          color: '#92400E', fontSize: 12, marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Config gốc là kiểu <strong>{Array.isArray(config.raw) ? 'array' : typeof config.raw}</strong>.
            Lưu qua UI sẽ chuyển thành <strong>string</strong>. Cân nhắc kỹ trước khi sửa.
          </span>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, marginBottom: 4 }}>
          Tên config
        </div>
        <div style={{
          padding: '8px 10px', borderRadius: 7,
          background: '#F5F5F3', border: '1px solid #EFEAE0',
          fontSize: 13, color: '#1A1A1A', fontFamily: 'monospace',
        }}>{config.key}</div>
      </div>

      {config.description && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, marginBottom: 4 }}>
            Mô tả
          </div>
          <div style={{
            padding: '8px 10px', borderRadius: 7,
            background: '#FAFAF7', border: '1px solid #EFEAE0',
            fontSize: 12, color: '#6B6B66', lineHeight: 1.5,
          }}>{config.description}</div>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Giá trị mới <span style={{ color: '#A82928' }}>*</span>
          </label>
          <input type="text" value={value}
            onChange={e => { setValue(e.target.value); setError(null) }}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              border: `1.5px solid ${error ? '#FCA5A5' : '#EFEAE0'}`,
              background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#A82928', marginTop: 4 }}>{error}</div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#8A8A82', marginBottom: 18 }}>
          Lưu ý: thay đổi sẽ áp dụng ngay cho toàn hệ thống.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
            background: '#fff', fontSize: 13, fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>Hủy</button>
          <button type="submit" disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1,
          }}>
            {saving
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Save size={14} />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

// ── Main page ───────────────────────────────────────────────────────

export function AdminSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfigEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<SystemConfigEntry | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = (type: 'success' | 'warning' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    const data = await listSystemConfig()
    setConfigs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A',
          textTransform: 'uppercase', letterSpacing: '0.02em',
        }}>
          Cấu hình hệ thống
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          Quản lý các tham số hệ thống. Chỉ sửa nếu hiểu rõ ý nghĩa của từng config.
        </p>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1.2fr) minmax(220px, 1.5fr) 100px 90px',
          gap: 14, alignItems: 'center',
          padding: '11px 18px', background: '#FAFAF7',
          borderBottom: '1px solid #EFEAE0',
          fontSize: 11, fontWeight: 600, color: '#8A8A82',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Tên config</span>
          <span>Giá trị</span>
          <span>Mô tả</span>
          <span>Cập nhật</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : configs.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <AlertCircle size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6B6B66' }}>Chưa có cấu hình nào.</div>
          </div>
        ) : (
          configs.map(cfg => (
            <ConfigRow key={cfg.key} config={cfg} onEdit={() => setEditTarget(cfg)} />
          ))
        )}
      </div>

      {editTarget && (
        <EditConfigDialog config={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={msg => { setEditTarget(null); showToast('success', msg); load() }}
          onWarning={msg => { setEditTarget(null); showToast('warning', msg) }}
          onError={msg => showToast('error', msg)}
        />
      )}

      <Toast toast={toast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function ConfigRow({ config, onEdit }: { config: SystemConfigEntry; onEdit: () => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1.2fr) minmax(220px, 1.5fr) 100px 90px',
      gap: 14, alignItems: 'center',
      padding: '12px 18px', borderBottom: '1px solid #F5F2EA',
    }}>
      <div style={{
        fontSize: 12, color: '#1A1A1A', fontWeight: 500,
        fontFamily: 'monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {config.key}
        {!config.is_string && (
          <span style={{
            marginLeft: 6, padding: '1px 6px', borderRadius: 4,
            background: '#FEF3C7', color: '#92400E',
            fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
            letterSpacing: '0.04em',
          }}>
            {Array.isArray(config.raw) ? 'ARRAY' : (typeof config.raw).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 13, color: '#1A1A1A',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{config.value}</div>
      <div style={{
        fontSize: 12, color: '#6B6B66',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{config.description ?? <span style={{ color: '#A8A89E' }}>—</span>}</div>
      <div style={{ fontSize: 12, color: '#A8A89E' }}>
        {formatDate(config.updated_at)}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="Sửa" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 6,
          border: '1px solid #EFEAE0', background: '#fff',
          fontSize: 12, color: '#1A1A1A', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500,
        }}>
          <Pencil size={12} /> Sửa
        </button>
      </div>
    </div>
  )
}

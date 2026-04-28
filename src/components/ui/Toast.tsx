// src/components/ui/Toast.tsx
//
// Shared toast component. Auto-dismiss sau 4s (UX feedback từ Cowork qua
// Phase 2-4: 2-3s quá ngắn cho người đọc tiếng Việt). Có nút X để dismiss
// thủ công sớm.

import { useEffect } from 'react'
import { X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastState {
  message: string
  kind: ToastKind
}

interface Props {
  toast: ToastState | null
  onClose: () => void
  duration?: number
}

const PALETTE: Record<ToastKind, { bg: string; color: string; border: string }> = {
  success: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  error:   { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  info:    { bg: '#F0F9FF', color: '#0C4A6E', border: '#BAE6FD' },
}

export function Toast({ toast, onClose, duration = 4000 }: Props) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [toast, onClose, duration])

  if (!toast) return null
  const p = PALETTE[toast.kind]

  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 24, right: 24, zIndex: 200,
      padding: '12px 14px 12px 18px',
      borderRadius: 10,
      background: p.bg, color: p.color,
      border: `1px solid ${p.border}`,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      maxWidth: 400, minWidth: 240,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Đóng thông báo"
        style={{
          width: 20, height: 20, padding: 0, border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: p.color, opacity: 0.7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

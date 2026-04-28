// src/lib/format.ts
//
// Date/time helpers tiếng Việt. Money/percent formatters đã có sẵn
// trong utils.ts (fmtVND, fmtPct) — không duplicate ở đây.

export function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'Vừa xong'
  if (diffSec < 3600) return Math.floor(diffSec / 60) + ' phút trước'
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + ' giờ trước'
  if (diffSec < 86400 * 30) return Math.floor(diffSec / 86400) + ' ngày trước'
  if (diffSec < 86400 * 365) return Math.floor(diffSec / (86400 * 30)) + ' tháng trước'
  return Math.floor(diffSec / (86400 * 365)) + ' năm trước'
}

export function daysUntil(isoDate: string): number {
  const diffMs = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.floor(diffMs / (1000 * 86400)))
}

export function expiryLabel(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return 'Hôm nay'
  if (days === 1) return '1 ngày'
  return days + ' ngày'
}

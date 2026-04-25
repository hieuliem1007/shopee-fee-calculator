import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmtVND = (n: number): string => {
  const abs = Math.round(Math.abs(n))
  const s = abs.toLocaleString('vi-VN').replace(/,/g, '.')
  return (n < 0 ? '-' : '') + s + 'đ'
}

export const fmtNum = (n: number): string =>
  Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.')

export const parseNum = (s: string): number => {
  const n = parseInt(String(s).replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

export const fmtPct = (n: number, sign = false): string => {
  const v = n.toFixed(2).replace('.', ',')
  return (sign && n > 0 ? '+' : '') + v + '%'
}

// src/lib/import-excel.ts
//
// Parse Excel/CSV file → ImportRow[] + generate sample file để download.
// Header tiếng Việt: "Tên ngành" | "Phí %" | "Mô tả".

import * as XLSX from 'xlsx'
import type { ImportRow } from './fees-admin'

const MAX_ROWS = 200

export interface ParsedRow {
  rowNumber: number // 1-indexed (dòng 1 là header, data từ dòng 2)
  data: ImportRow | null
  error: string | null
}

export interface ParseResult {
  totalRows: number
  validRows: ParsedRow[]
  invalidRows: ParsedRow[]
  fatalError: string | null // file-level error (vượt quá 200, file empty, etc.)
}

function parseSheetToAOA(buf: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buf, { type: 'array' })
  if (wb.SheetNames.length === 0) return []
  const sheet = wb.Sheets[wb.SheetNames[0]]
  // header:1 → mảng các array (row-major). raw:false → number/text giữ nguyên.
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
}

function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const s = v.trim().replace(',', '.')
    if (s === '') return null
    const n = Number(s)
    return isNaN(n) ? null : n
  }
  return null
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer()
  const aoa = parseSheetToAOA(buf)

  if (aoa.length <= 1) {
    return {
      totalRows: 0, validRows: [], invalidRows: [],
      fatalError: 'File rỗng hoặc chỉ có header',
    }
  }

  const dataRows = aoa.slice(1) // bỏ header
  if (dataRows.length > MAX_ROWS) {
    return {
      totalRows: dataRows.length, validRows: [], invalidRows: [],
      fatalError: `File quá lớn (tối đa ${MAX_ROWS} dòng, file có ${dataRows.length})`,
    }
  }

  const valid: ParsedRow[] = []
  const invalid: ParsedRow[] = []
  const seenNames = new Map<string, number>() // lower(name) → first occurrence rowNumber

  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2 // 1-indexed Excel row (header is row 1)
    const rawName = row[0]
    const rawPercent = row[1]
    const rawDesc = row[2]

    const name = typeof rawName === 'string' ? rawName.trim() : String(rawName ?? '').trim()
    if (!name) {
      invalid.push({ rowNumber, data: null, error: 'Tên ngành rỗng' })
      return
    }
    if (name.length > 100) {
      invalid.push({ rowNumber, data: null, error: 'Tên ngành tối đa 100 ký tự' })
      return
    }

    const percent = parseNumber(rawPercent)
    if (percent === null) {
      invalid.push({ rowNumber, data: null, error: 'Phí phải là số' })
      return
    }
    if (percent < 0 || percent > 100) {
      invalid.push({ rowNumber, data: null, error: 'Phí phải >= 0 và <= 100' })
      return
    }

    const lowerKey = name.toLowerCase()
    const dupRow = seenNames.get(lowerKey)
    if (dupRow !== undefined) {
      invalid.push({
        rowNumber, data: null,
        error: `Tên ngành trùng với dòng ${dupRow}`,
      })
      return
    }
    seenNames.set(lowerKey, rowNumber)

    const description = typeof rawDesc === 'string' ? rawDesc.trim() : ''
    valid.push({
      rowNumber, error: null,
      data: {
        name,
        fee_percent: percent,
        description: description || undefined,
      },
    })
  })

  return {
    totalRows: dataRows.length,
    validRows: valid,
    invalidRows: invalid,
    fatalError: null,
  }
}

// ────────────────────────────────────────────────────────────────────
// Sample file generator
// ────────────────────────────────────────────────────────────────────

export function generateSampleExcelBlob(): Blob {
  const wb = XLSX.utils.book_new()
  const aoa: (string | number)[][] = [
    ['Tên ngành', 'Phí %', 'Mô tả'],
    ['Thực phẩm', 3.5, 'Ngành thực phẩm Shopee'],
    ['Thời trang', 4.0, 'Ngành thời trang'],
    ['Điện tử', 3.0, 'Ngành điện tử'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // Set column widths cho dễ đọc
  ws['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Categories')

  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadSampleExcel(filename = 'category-fees-sample.xlsx') {
  const blob = generateSampleExcelBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

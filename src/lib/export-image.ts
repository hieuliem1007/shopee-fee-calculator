import html2canvas from 'html2canvas'

export async function exportElementAsPNG(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Không thể tạo ảnh'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
      resolve()
    }, 'image/png')
  })
}

export function buildExportFilename(
  productName: string | undefined,
  ext: 'png' | 'pdf',
): string {
  const date = new Date().toISOString().slice(0, 10)
  const name = productName?.trim()
    ? slugify(productName.trim())
    : 'ket-qua-tinh-phi'
  return `${name}-${date}.${ext}`
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

export function createBrandBanner(): HTMLDivElement {
  const date = new Date().toLocaleDateString('vi-VN')
  const banner = document.createElement('div')
  banner.setAttribute('data-export-banner', '')
  banner.style.cssText = [
    'display: flex',
    'align-items: center',
    'gap: 14px',
    'padding: 14px 20px',
    'background: #FFFBEB',
    'border: 1px solid #F5E5B8',
    'border-bottom: 2px solid #FBBF24',
    'border-radius: 12px',
    'margin-bottom: 16px',
    'font-family: inherit',
  ].join(';')
  banner.innerHTML = `
    <div style="width:40px;height:40px;border-radius:8px;background:#FBBF24;
                display:flex;align-items:center;justify-content:center;
                color:#1A1A1A;font-weight:700;font-size:20px;flex-shrink:0;
                font-family:inherit;">E</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;line-height:1.3;">E-Dream Tools</div>
      <div style="font-size:12px;color:#6B6B66;margin-top:2px;">Tính phí Shopee chính xác · ${date} · edream.vn</div>
    </div>
  `
  return banner
}

export interface HiddenStyle {
  el: HTMLElement
  prevDisplay: string
}

export function hideExportElements(root: HTMLElement): HiddenStyle[] {
  const matches = root.querySelectorAll<HTMLElement>('[data-export-hide]')
  return Array.from(matches).map(el => {
    const prevDisplay = el.style.display
    el.style.display = 'none'
    return { el, prevDisplay }
  })
}

export function restoreHiddenElements(items: HiddenStyle[]): void {
  for (const { el, prevDisplay } of items) {
    el.style.display = prevDisplay
  }
}

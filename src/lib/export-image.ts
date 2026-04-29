import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import type { ReactElement } from 'react'

const TEMPLATE_WIDTH = 800

async function withOffscreenTemplate<T>(
  template: ReactElement,
  fn: (target: HTMLElement) => Promise<T>,
): Promise<T> {
  const container = document.createElement('div')
  container.style.cssText = `position: absolute; left: -9999px; top: 0; width: ${TEMPLATE_WIDTH}px; pointer-events: none;`
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(template)

  // Wait two animation frames + a tiny safety delay so React paints the DOM
  // trước khi html2canvas đọc. requestAnimationFrame x2 đảm bảo commit + paint.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  await new Promise<void>(resolve => setTimeout(resolve, 50))

  try {
    const target = container.firstElementChild as HTMLElement | null
    if (!target) throw new Error('Template render failed')
    return await fn(target)
  } finally {
    root.unmount()
    if (container.parentNode) container.parentNode.removeChild(container)
  }
}

export async function exportTemplateAsPNG(
  template: ReactElement,
  filename: string,
): Promise<void> {
  await withOffscreenTemplate(template, async (target) => {
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      width: TEMPLATE_WIDTH,
      windowWidth: TEMPLATE_WIDTH,
    })
    await canvasToBlob(canvas, filename)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, filename: string): Promise<void> {
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

export { withOffscreenTemplate, TEMPLATE_WIDTH }

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

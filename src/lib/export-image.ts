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

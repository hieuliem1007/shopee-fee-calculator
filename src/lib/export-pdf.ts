import html2pdf from 'html2pdf.js'
import type { ReactElement } from 'react'
import { withOffscreenTemplate, TEMPLATE_WIDTH } from './export-image'

export async function exportTemplateAsPDF(
  template: ReactElement,
  filename: string,
): Promise<void> {
  await withOffscreenTemplate(template, async (target) => {
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: TEMPLATE_WIDTH,
        windowWidth: TEMPLATE_WIDTH,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
      },
    }
    await html2pdf().set(opt).from(target).save()
  })
}

import html2pdf from 'html2pdf.js'

export async function exportElementAsPDF(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
    },
  }

  await html2pdf().set(opt).from(element).save()
}

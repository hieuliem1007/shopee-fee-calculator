import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
}

export function SectionHeader({ title, subtitle, right }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{
          margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em',
          color: '#1A1A1A',
        }}>{title}</h2>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B6B66' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

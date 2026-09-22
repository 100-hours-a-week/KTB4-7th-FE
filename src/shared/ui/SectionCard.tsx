import type { ReactNode } from 'react'

type SectionCardProps = {
  eyebrow?: string
  title: string
  children: ReactNode
}

export function SectionCard({ eyebrow, title, children }: SectionCardProps) {
  return (
    <section className="section-card">
      {eyebrow && <small>{eyebrow}</small>}
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  )
}

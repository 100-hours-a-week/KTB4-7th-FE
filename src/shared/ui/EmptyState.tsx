import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  supportingText?: string | null
  action?: ReactNode
}

export function EmptyState({
  title,
  description,
  supportingText,
  action,
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      <span aria-hidden="true">✦</span>
      <h1>{title}</h1>
      <p
        className={
          supportingText ? 'empty-state-description--paired' : undefined
        }
      >
        {description}
      </p>
      {supportingText && (
        <p className="empty-state-supporting">{supportingText}</p>
      )}
      {action && <div>{action}</div>}
    </section>
  )
}

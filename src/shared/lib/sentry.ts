import * as Sentry from '@sentry/react'

type SentryConfig = {
  dsn?: string
  environment: string
}

export function initializeSentry({ dsn, environment }: SentryConfig): void {
  const normalizedDsn = dsn?.trim()

  if (!normalizedDsn) {
    return
  }

  Sentry.init({
    dsn: normalizedDsn,
    environment,
  })
}

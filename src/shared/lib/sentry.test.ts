import * as Sentry from '@sentry/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeSentry } from './sentry'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
}))

describe('initializeSentry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DSN이 없으면 Sentry를 초기화하지 않는다', () => {
    initializeSentry({ dsn: undefined, environment: 'production' })

    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('DSN이 있으면 현재 환경과 함께 Sentry를 초기화한다', () => {
    initializeSentry({
      dsn: ' https://public-key@example.ingest.sentry.io/123 ',
      environment: 'production',
    })

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'https://public-key@example.ingest.sentry.io/123',
      environment: 'production',
    })
  })
})

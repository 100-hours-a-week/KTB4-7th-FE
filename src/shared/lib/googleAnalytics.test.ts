import { beforeEach, describe, expect, it } from 'vitest'
import { initializeGoogleAnalytics } from './googleAnalytics'

describe('initializeGoogleAnalytics', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.dataLayer
    delete window.gtag
  })

  it('does not add a tag when the measurement ID is missing', () => {
    initializeGoogleAnalytics()

    expect(document.querySelector('script')).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })

  it('adds the Google tag and initializes the data layer', () => {
    initializeGoogleAnalytics('G-TEST123')

    const script = document.querySelector<HTMLScriptElement>(
      '#google-analytics-tag',
    )

    expect(script?.async).toBe(true)
    expect(script?.src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
    )
    expect(window.dataLayer).toHaveLength(2)
    expect(window.dataLayer?.[0]?.[0]).toBe('js')
    expect(window.dataLayer?.[1]).toEqual(['config', 'G-TEST123'])
  })

  it('does not initialize the same tag more than once', () => {
    initializeGoogleAnalytics('G-TEST123')
    initializeGoogleAnalytics('G-TEST123')

    expect(document.querySelectorAll('#google-analytics-tag')).toHaveLength(1)
    expect(window.dataLayer).toHaveLength(2)
  })
})

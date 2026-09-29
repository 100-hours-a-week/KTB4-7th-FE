const GOOGLE_ANALYTICS_SCRIPT_ID = 'google-analytics-tag'

type GoogleTagArguments =
  [command: 'js', date: Date] | [command: 'config', measurementId: string]

declare global {
  interface Window {
    dataLayer?: GoogleTagArguments[]
    gtag?: (...args: GoogleTagArguments) => void
  }
}

export function initializeGoogleAnalytics(measurementId?: string): void {
  const normalizedMeasurementId = measurementId?.trim()

  if (
    !normalizedMeasurementId ||
    document.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)
  ) {
    return
  }

  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: GoogleTagArguments) => {
    window.dataLayer?.push(args)
  }

  const script = document.createElement('script')
  script.id = GOOGLE_ANALYTICS_SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(normalizedMeasurementId)}`
  document.head.append(script)

  window.gtag('js', new Date())
  window.gtag('config', normalizedMeasurementId)
}

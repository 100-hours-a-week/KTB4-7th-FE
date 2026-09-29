import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reactErrorHandler } from '@sentry/react'
import { App } from './app/App'
import { initializeCsrfToken } from './shared/api/http'
import { initializeGoogleAnalytics } from './shared/lib/googleAnalytics'
import { initializeSentry } from './shared/lib/sentry'
import './index.css'

initializeSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
})

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('앱 루트 요소를 찾을 수 없습니다.')
}

void initializeCsrfToken().catch(() => undefined)
initializeGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID)

createRoot(rootElement, {
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
  onUncaughtError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { initializeCsrfToken } from './shared/api/http'
import './index.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('앱 루트 요소를 찾을 수 없습니다.')
}

void initializeCsrfToken().catch(() => undefined)

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

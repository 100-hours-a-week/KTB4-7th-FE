import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

export function AppShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mobile-app-shell">
      <div className="device-notch" aria-hidden="true" />
      <header className="mobile-app-header">
        <Link to="/" aria-label="홈">
          memme
        </Link>
        <strong>{title}</strong>
        <Link to="/notifications" aria-label="알림">
          <span aria-hidden="true">◦</span>
        </Link>
      </header>
      <main className="app-content">{children}</main>
      <nav className="bottom-tabs" aria-label="하단 탐색">
        <NavLink to="/solution">솔루션</NavLink>
        <NavLink to="/sales/analysis">매출</NavLink>
        <NavLink to="/my-solutions">저장됨</NavLink>
        <NavLink to="/profile">프로필</NavLink>
      </nav>
    </div>
  )
}

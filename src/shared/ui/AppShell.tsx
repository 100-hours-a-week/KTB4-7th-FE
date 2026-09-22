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
      <aside className="app-sidebar">
        <Link className="app-brand" to="/">
          memme
        </Link>
        <nav aria-label="주요 탐색">
          <NavLink to="/solution">솔루션</NavLink>
          <NavLink to="/my-solutions">내 솔루션</NavLink>
          <NavLink to="/signup">회원가입</NavLink>
        </nav>
      </aside>
      <header className="mobile-app-header">
        <Link to="/" aria-label="홈">
          memme
        </Link>
        <strong>{title}</strong>
        <button aria-label="알림">●</button>
      </header>
      <main className="app-content">{children}</main>
      <nav className="bottom-tabs" aria-label="하단 탐색">
        <NavLink to="/solution">솔루션</NavLink>
        <NavLink to="/my-solutions">저장됨</NavLink>
        <NavLink to="/signup">프로필</NavLink>
      </nav>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { getNotifications } from '../../features/notifications/api/notificationApi'

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function AppShell({
  title,
  backTo,
  children,
}: {
  title: string
  backTo?: string
  children: ReactNode
}) {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    let ignore = false
    getNotifications({ readStatus: 'UNREAD', size: 1 })
      .then((response) => {
        if (!ignore) setHasUnread(response.data.items.length > 0)
      })
      .catch(() => {
        // 알림 배지는 부가 정보라 실패해도 화면 동작에 영향을 주지 않는다.
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="mobile-app-shell">
      <div className="device-notch" aria-hidden="true" />
      <header className="mobile-app-header">
        {backTo ? (
          <Link to={backTo} className="app-back-button" aria-label="뒤로가기">
            <BackIcon />
          </Link>
        ) : (
          <Link to="/" aria-label="홈">
            memme
          </Link>
        )}
        <strong>{title}</strong>
        <Link
          to="/notifications"
          className="notification-bell"
          aria-label="알림"
        >
          <BellIcon />
          {hasUnread && (
            <span className="notification-dot" aria-hidden="true" />
          )}
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

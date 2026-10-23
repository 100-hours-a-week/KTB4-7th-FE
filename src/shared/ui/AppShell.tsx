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

function TabIcon({
  name,
}: {
  name: 'solution' | 'sales' | 'saved' | 'profile'
}) {
  const common = {
    width: '20',
    height: '20',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'solution') {
    return (
      <svg {...common}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.7 15.1A7 7 0 1 1 15.3 15c-.8.6-1.3 1.2-1.3 2H10c0-.8-.5-1.4-1.3-1.9Z" />
      </svg>
    )
  }
  if (name === 'sales') {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 2 5-6" />
        <path d="M16 7h3v3" />
      </svg>
    )
  }
  if (name === 'saved') {
    return (
      <svg {...common}>
        <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.7L6 21V4.8Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

export function AppShell({
  title,
  backTo,
  contentClassName,
  tone = 'white',
  children,
}: {
  title: string
  backTo?: string
  contentClassName?: string
  tone?: 'white' | 'paper'
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
    <div className={`mobile-app-shell mobile-app-shell--${tone}`}>
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
      <main className={`app-content ${contentClassName ?? ''}`.trim()}>
        {children}
      </main>
      <nav className="bottom-tabs" aria-label="하단 탐색">
        <NavLink to="/solution">
          <span className="bottom-tab-icon">
            <TabIcon name="solution" />
          </span>
          <span>솔루션</span>
        </NavLink>
        <NavLink to="/sales/analysis">
          <span className="bottom-tab-icon">
            <TabIcon name="sales" />
          </span>
          <span>매출</span>
        </NavLink>
        <NavLink to="/my-solutions">
          <span className="bottom-tab-icon">
            <TabIcon name="saved" />
          </span>
          <span>저장됨</span>
        </NavLink>
        <NavLink to="/profile">
          <span className="bottom-tab-icon">
            <TabIcon name="profile" />
          </span>
          <span>프로필</span>
        </NavLink>
      </nav>
    </div>
  )
}

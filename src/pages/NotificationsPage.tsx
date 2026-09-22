import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'

export function NotificationsPage() {
  const notifications = dashboardFixtures.notifications
  return (
    <AppShell title="알림">
      <div className="page-stack">
        <header className="page-title">
          <p>NOTIFICATIONS</p>
          <h1>알림</h1>
          <span>매장에 필요한 소식을 놓치지 않도록 알려드릴게요.</span>
        </header>
        {notifications.length === 0 ? (
          <EmptyState
            title="새 알림이 없습니다"
            description="새로운 소식이 도착하면 알려드릴게요."
          />
        ) : (
          <ul className="notification-list" aria-label="알림 목록">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={notification.read ? '' : 'unread'}
              >
                <span aria-label={notification.read ? '읽음' : '읽지 않음'} />
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.detail}</p>
                  <small>{notification.createdAt}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

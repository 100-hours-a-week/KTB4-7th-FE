import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markNotificationsAsRead,
  type NotificationItem,
} from '../features/notifications/api/notificationApi'
import { EmptyState } from '../shared/ui/EmptyState'
import { AppShell } from '../shared/ui/AppShell'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function formatSentAt(sentAt: string) {
  const date = new Date(sentAt)
  if (Number.isNaN(date.getTime())) return sentAt
  return date.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getNotifications({ size: 20 })
      .then((response) => {
        if (ignore) return
        setItems(response.data.items)
        setNextCursor(response.nextCursor)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('알림을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  const handleLoadMore = async () => {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setError('')
    try {
      const response = await getNotifications({
        size: 20,
        cursor: nextCursor,
      })
      setItems((previous) => [...previous, ...response.data.items])
      setNextCursor(response.nextCursor)
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setError('알림을 더 불러오지 못했습니다.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (notification.readAt) return
    try {
      const { readAt } = await markNotificationsAsRead([notification.id])
      setItems((previous) =>
        previous.map((item) =>
          item.id === notification.id ? { ...item, readAt } : item,
        ),
      )
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        navigate('/login')
      }
    }
  }

  return (
    <AppShell title="알림">
      <div className="page-stack">
        <header className="page-title">
          <p>NOTIFICATIONS</p>
          <h1>알림</h1>
          <span>매장에 필요한 소식을 놓치지 않도록 알려드릴게요.</span>
        </header>
        {error && <p role="alert">{error}</p>}
        {isLoading ? (
          <p>불러오는 중...</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="새 알림이 없습니다"
            description="새로운 소식이 도착하면 알려드릴게요."
          />
        ) : (
          <>
            <ul className="notification-list" aria-label="알림 목록">
              {items.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.readAt ? '' : 'unread'}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <span
                    aria-label={notification.readAt ? '읽음' : '읽지 않음'}
                  />
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.content}</p>
                    <small>{formatSentAt(notification.sentAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
            {nextCursor && (
              <button
                type="button"
                className="notification-list-load-more"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
              >
                {isLoadingMore ? '불러오는 중...' : '더보기'}
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

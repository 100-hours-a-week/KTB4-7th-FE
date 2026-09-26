import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../features/notifications/api/notificationApi'
import { AppShell } from '../shared/ui/AppShell'
import { ToggleSwitch } from '../shared/ui/ToggleSwitch'

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export function NotificationSettingsPage() {
  const navigate = useNavigate()
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingKey, setPendingKey] = useState<
    keyof NotificationPreferences | null
  >(null)

  useEffect(() => {
    let ignore = false
    getNotificationPreferences()
      .then((data) => {
        if (!ignore) setPreferences(data)
      })
      .catch((requestError) => {
        if (ignore) return
        if (isUnauthorized(requestError)) {
          navigate('/login')
          return
        }
        setError('알림 설정을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate])

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!preferences) return
    const previous = preferences
    setPreferences({ ...preferences, [key]: value })
    setPendingKey(key)
    setError('')
    try {
      const updated = await updateNotificationPreferences({ [key]: value })
      setPreferences(updated)
    } catch (requestError) {
      setPreferences(previous)
      if (isUnauthorized(requestError)) {
        navigate('/login')
        return
      }
      setError('알림 설정을 변경하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <AppShell title="알림 설정" backTo="/profile">
      <div className="page-stack">
        <header className="page-title">
          <p>NOTIFICATIONS</p>
          <h1>알림 설정</h1>
        </header>
        {error && <p role="alert">{error}</p>}
        {isLoading || !preferences ? (
          <p>불러오는 중...</p>
        ) : (
          <div className="notification-preference-list">
            <div className="notification-preference-row">
              <div>
                <strong>솔루션 제공 알림</strong>
                <p>매일 오전 8시, 새로운 솔루션이 도착하면 알려드려요</p>
              </div>
              <ToggleSwitch
                label="솔루션 제공 알림"
                checked={preferences.solutionEnabled}
                disabled={pendingKey === 'solutionEnabled'}
                onChange={(value) => handleToggle('solutionEnabled', value)}
              />
            </div>
            <div className="notification-preference-row">
              <div>
                <strong>매출 데이터 업로드 알림</strong>
                <p>
                  예측 종료일이 다가오면 업로드 전까지 매일 오전 8시에
                  알려드려요
                </p>
              </div>
              <ToggleSwitch
                label="매출 데이터 업로드 알림"
                checked={preferences.salesUploadReminderEnabled}
                disabled={pendingKey === 'salesUploadReminderEnabled'}
                onChange={(value) =>
                  handleToggle('salesUploadReminderEnabled', value)
                }
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

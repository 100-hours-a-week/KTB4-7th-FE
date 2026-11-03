import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../features/notifications/api/notificationApi'
import { AppShell } from '../shared/ui/AppShell'
import { ToggleSwitch } from '../shared/ui/ToggleSwitch'
import {
  enableBrowserPush,
  getFcmAvailability,
} from '../features/notifications/lib/firebaseMessaging'

type FcmAvailability = 'ready' | 'missing-config' | 'unsupported'

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
  const [fcmAvailability, setFcmAvailability] =
    useState<FcmAvailability | null>(null)
  const [isPushPending, setIsPushPending] = useState(false)
  const [pushError, setPushError] = useState('')
  const [isPushEnabled, setIsPushEnabled] = useState(false)

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

  useEffect(() => {
    let ignore = false

    const initializePush = async () => {
      const availability = await getFcmAvailability()
      if (ignore) return
      setFcmAvailability(availability)

      if (availability !== 'ready') return

      setIsPushPending(true)
      try {
        await enableBrowserPush()
        if (!ignore) setIsPushEnabled(true)
      } catch (requestError) {
        if (!ignore) {
          const status =
            typeof requestError === 'object' &&
            requestError !== null &&
            'response' in requestError
              ? (requestError as { response?: { status?: number } }).response
                  ?.status
              : undefined
          setPushError(
            requestError instanceof Error &&
              requestError.message === 'fcm_permission_denied'
              ? '브라우저 알림 권한이 거부되어 있어요. 브라우저 설정에서 허용해 주세요.'
              : status
                ? `웹푸시 등록에 실패했습니다. 서버 응답: ${status}`
                : '웹푸시 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          )
        }
      } finally {
        if (!ignore) setIsPushPending(false)
      }
    }

    void initializePush()
    return () => {
      ignore = true
    }
  }, [])

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
                  전달 마지막일부터 예측 종료 전까지, 매출 파일을 업로드하기
                  전이면 매일 오전 8시에 알려드려요
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
            <div className="notification-preference-row">
              <div>
                <strong>성장 랭킹 변동 알림</strong>
                <p>성장 랭킹 집계 후 순위 변동이 있으면 알려드려요</p>
              </div>
              <ToggleSwitch
                label="성장 랭킹 변동 알림"
                checked={preferences.rankingChangeEnabled}
                disabled={pendingKey === 'rankingChangeEnabled'}
                onChange={(value) =>
                  handleToggle('rankingChangeEnabled', value)
                }
              />
            </div>
            <div className="notification-preference-row">
              <div>
                <strong>브라우저 푸시 알림</strong>
                <p>
                  {fcmAvailability === 'missing-config'
                    ? 'Firebase 웹 설정이 연결되면 사용할 수 있어요.'
                    : fcmAvailability === 'unsupported'
                      ? '현재 브라우저에서는 웹 푸시를 지원하지 않아요.'
                      : isPushPending
                        ? '웹푸시를 연결하고 있어요.'
                        : isPushEnabled
                          ? '이 브라우저에서 새 알림을 푸시로 받고 있어요.'
                          : '브라우저 알림 권한을 허용하면 자동으로 웹푸시를 받을 수 있어요.'}
                </p>
                {pushError && <p role="alert">{pushError}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

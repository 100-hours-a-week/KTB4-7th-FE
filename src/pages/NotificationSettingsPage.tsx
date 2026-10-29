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
  disableBrowserPush,
  enableBrowserPush,
  getFcmAvailability,
  registerPushTokenIfPermitted,
  shouldRegisterPushAfterLogin,
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
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isPushPending, setIsPushPending] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushMessage, setPushMessage] = useState('')

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

      if (availability !== 'ready' || !shouldRegisterPushAfterLogin()) return

      setIsPushPending(true)
      try {
        const registered = await registerPushTokenIfPermitted()
        if (!ignore && registered) setIsPushEnabled(true)
      } catch {
        if (!ignore) {
          setPushError(
            '브라우저 푸시 토큰을 등록하지 못했습니다. 다시 시도해 주세요.',
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

  const handlePushToggle = async (enabled: boolean) => {
    setIsPushPending(true)
    setPushError('')
    setPushMessage('')

    try {
      if (enabled) {
        await enableBrowserPush()
        setIsPushEnabled(true)
        setPushMessage('이 브라우저에서 푸시 알림을 받을 수 있어요.')
      } else {
        const serverTokenRemoved = await disableBrowserPush()
        setIsPushEnabled(false)
        setPushMessage(
          serverTokenRemoved
            ? '이 브라우저의 푸시 알림을 껐어요.'
            : '브라우저 토큰은 삭제했지만 서버 등록 해제는 확인하지 못했습니다.',
        )
      }
    } catch (pushRequestError) {
      if (
        pushRequestError instanceof Error &&
        pushRequestError.message === 'fcm_permission_denied'
      ) {
        setPushError(
          '브라우저 알림 권한이 거부되어 있어요. 브라우저 설정에서 권한을 허용해 주세요.',
        )
      } else {
        setPushError(
          '푸시 알림 설정을 변경하지 못했습니다. 다시 시도해 주세요.',
        )
      }
    } finally {
      setIsPushPending(false)
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
                      : isPushEnabled
                        ? '이 브라우저에서 새 알림을 푸시로 받고 있어요.'
                        : '알림 권한을 허용하면 새 알림을 푸시로 받을 수 있어요.'}
                </p>
                {pushError && <p role="alert">{pushError}</p>}
                {pushMessage && <p role="status">{pushMessage}</p>}
              </div>
              <ToggleSwitch
                label="브라우저 푸시 알림"
                checked={isPushEnabled}
                disabled={isPushPending || fcmAvailability !== 'ready'}
                onChange={(value) => void handlePushToggle(value)}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

import type { FirebaseOptions } from 'firebase/app'
import type { Messaging, MessagePayload } from 'firebase/messaging'
import { registerFcmToken, unregisterFcmToken } from '../api/notificationApi'

const firebaseAppName = 'memme-notifications'
const pushPreferenceKey = 'memme:fcm-push-enabled'
const pushTokenKey = 'memme:fcm-token'
const pendingUnregisterTokenKey = 'memme:fcm-pending-unregister-token'

type FcmAvailability = 'ready' | 'missing-config' | 'unsupported'

type MessagingContext = {
  messaging: Messaging
  serviceWorker: ServiceWorkerRegistration
}

function getFirebaseConfig() {
  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MEASUREMENT_ID,
    VITE_FIREBASE_VAPID_KEY,
  } = import.meta.env

  if (
    !VITE_FIREBASE_API_KEY ||
    !VITE_FIREBASE_AUTH_DOMAIN ||
    !VITE_FIREBASE_PROJECT_ID ||
    !VITE_FIREBASE_MESSAGING_SENDER_ID ||
    !VITE_FIREBASE_APP_ID ||
    !VITE_FIREBASE_VAPID_KEY
  ) {
    return null
  }

  const config: FirebaseOptions = {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: VITE_FIREBASE_APP_ID,
    ...(VITE_FIREBASE_STORAGE_BUCKET
      ? { storageBucket: VITE_FIREBASE_STORAGE_BUCKET }
      : {}),
    ...(VITE_FIREBASE_MEASUREMENT_ID
      ? { measurementId: VITE_FIREBASE_MEASUREMENT_ID }
      : {}),
  }

  return { config, vapidKey: VITE_FIREBASE_VAPID_KEY }
}

function canUseBrowserPush() {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator
  )
}

function isPushExplicitlyDisabled() {
  try {
    return window.localStorage.getItem(pushPreferenceKey) === 'false'
  } catch {
    return false
  }
}

function setPushPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(pushPreferenceKey, String(enabled))
  } catch {
    // The server token remains the source of truth if browser storage is unavailable.
  }
}

function getStoredPushToken() {
  try {
    return window.localStorage.getItem(pushTokenKey)
  } catch {
    return null
  }
}

function setStoredPushToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(pushTokenKey, token)
    else window.localStorage.removeItem(pushTokenKey)
  } catch {
    // The Firebase SDK keeps its own token record when browser storage is unavailable.
  }
}

function getPendingUnregisterTokens() {
  try {
    const raw = window.localStorage.getItem(pendingUnregisterTokenKey)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (token): token is string => typeof token === 'string' && token.length > 0,
      )
    }

    return typeof parsed === 'string' && parsed.length > 0 ? [parsed] : []
  } catch {
    return []
  }
}

function setPendingUnregisterTokens(tokens: string[]) {
  try {
    if (tokens.length > 0) {
      window.localStorage.setItem(pendingUnregisterTokenKey, JSON.stringify(tokens))
    } else {
      window.localStorage.removeItem(pendingUnregisterTokenKey)
    }
  } catch {
    // Retain the pending token in browser storage when available for a later retry.
  }
}

function addPendingUnregisterToken(token: string) {
  const tokens = getPendingUnregisterTokens()
  if (!tokens.includes(token)) setPendingUnregisterTokens([...tokens, token])
}

async function retryPendingUnregisterTokens() {
  const pendingTokens = getPendingUnregisterTokens()

  for (const token of pendingTokens) {
    await unregisterFcmToken(token)
    setPendingUnregisterTokens(
      getPendingUnregisterTokens().filter((pendingToken) => pendingToken !== token),
    )
  }
}

async function getPushMessaging() {
  const firebase = getFirebaseConfig()
  if (!firebase) throw new Error('fcm_not_configured')

  const [{ getApps, initializeApp }, { getMessaging }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])
  const existingApp = getApps().find((app) => app.name === firebaseAppName)
  const app = existingApp ?? initializeApp(firebase.config, firebaseAppName)

  return {
    ...firebase,
    messaging: getMessaging(app),
  }
}

async function getMessagingContext(): Promise<MessagingContext> {
  if (!canUseBrowserPush()) throw new Error('fcm_not_supported')

  const { isSupported } = await import('firebase/messaging')
  if (!(await isSupported())) {
    throw new Error('fcm_not_supported')
  }

  const firebase = await getPushMessaging()
  const serviceWorkerUrl = new URL(
    '/firebase-messaging-sw.js',
    window.location.origin,
  )
  serviceWorkerUrl.searchParams.set(
    'firebaseConfig',
    JSON.stringify(firebase.config),
  )

  const serviceWorker = await navigator.serviceWorker.register(
    serviceWorkerUrl,
    {
      scope: '/',
    },
  )

  return { messaging: firebase.messaging, serviceWorker }
}

async function getCurrentToken(context: MessagingContext) {
  const firebase = getFirebaseConfig()
  if (!firebase) throw new Error('fcm_not_configured')
  const { getToken } = await import('firebase/messaging')
  return getToken(context.messaging, {
    vapidKey: firebase.vapidKey,
    serviceWorkerRegistration: context.serviceWorker,
  })
}

export async function getFcmAvailability(): Promise<FcmAvailability> {
  if (!getFirebaseConfig()) return 'missing-config'
  if (!canUseBrowserPush()) return 'unsupported'

  try {
    const { isSupported } = await import('firebase/messaging')
    return (await isSupported()) ? 'ready' : 'unsupported'
  } catch {
    return 'unsupported'
  }
}

export function shouldRegisterPushAfterLogin() {
  return (
    canUseBrowserPush() &&
    Notification.permission === 'granted' &&
    !isPushExplicitlyDisabled()
  )
}

export async function registerPushTokenIfPermitted() {
  await retryPendingUnregisterTokens()

  if (
    !shouldRegisterPushAfterLogin() ||
    (await getFcmAvailability()) !== 'ready'
  ) {
    return false
  }

  const context = await getMessagingContext()
  const token = await getCurrentToken(context)
  await registerFcmToken(token)
  setStoredPushToken(token)
  setPushPreference(true)
  return true
}

export async function enableBrowserPush() {
  await retryPendingUnregisterTokens()

  if (!getFirebaseConfig()) throw new Error('fcm_not_configured')
  if (!canUseBrowserPush()) throw new Error('fcm_not_supported')

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()

  if (permission !== 'granted') throw new Error('fcm_permission_denied')

  const context = await getMessagingContext()
  const token = await getCurrentToken(context)
  await registerFcmToken(token)
  setStoredPushToken(token)
  setPushPreference(true)
}

export async function disableBrowserPush(
  options: { forceLocalRemoval?: boolean; preservePreference?: boolean } = {},
) {
  const { forceLocalRemoval = false, preservePreference = false } = options
  const availability = await getFcmAvailability()
  let context: MessagingContext | null = null
  let token = getStoredPushToken()

  if (availability === 'ready') {
    context = await getMessagingContext().catch(() => null)
    if (
      !token &&
      context &&
      canUseBrowserPush() &&
      Notification.permission === 'granted'
    ) {
      token = await getCurrentToken(context).catch(() => null)
    }
  }

  if (token) {
    const { deleteToken } = await import('firebase/messaging')
    try {
      await unregisterFcmToken(token)
    } catch (error) {
      if (!forceLocalRemoval) throw error
      addPendingUnregisterToken(token)
      if (context) await deleteToken(context.messaging).catch(() => false)
      setStoredPushToken(null)
      if (!preservePreference) setPushPreference(false)
      return false
    }
  }

  if (context) {
    const { deleteToken } = await import('firebase/messaging')
    await deleteToken(context.messaging).catch(() => false)
  }
  setStoredPushToken(null)
  if (!preservePreference) setPushPreference(false)
  return true
}

function showForegroundNotification(payload: MessagePayload) {
  const title = payload.notification?.title
  if (!title || typeof Notification === 'undefined') return

  const notification = new Notification(title, {
    body: payload.notification?.body ?? '',
    data: payload.data,
  })

  notification.onclick = () => {
    window.focus()
    window.location.assign('/notifications')
    notification.close()
  }
}

export async function initializeForegroundPushMessages() {
  if ((await getFcmAvailability()) !== 'ready') return

  try {
    const firebase = await getPushMessaging()
    const { onMessage } = await import('firebase/messaging')
    onMessage(firebase.messaging, showForegroundNotification)
  } catch {
    // Missing permissions or browser support must not prevent the app from starting.
  }
}

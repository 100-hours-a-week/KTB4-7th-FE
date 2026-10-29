/* Firebase notification clicks should open the app's existing REST inbox. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationUrl = new URL('/notifications', self.location.origin).href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windows) => {
        const appWindow = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        )

        if (appWindow) {
          await appWindow.navigate(notificationUrl)
          return appWindow.focus()
        }

        return self.clients.openWindow(notificationUrl)
      }),
  )
})

importScripts(
  'https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js',
)
importScripts(
  'https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js',
)

const configValue = new URL(self.location.href).searchParams.get(
  'firebaseConfig',
)

if (configValue) {
  firebase.initializeApp(JSON.parse(configValue))
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    // FCM automatically displays notification payloads in the background.
    // Only display data-only payloads here to avoid showing duplicate notifications.
    if (payload.notification) return

    const title = payload.data?.title || '새 알림이 도착했어요'
    self.registration.showNotification(title, {
      body: payload.data?.body || '',
      data: payload.data,
      tag: payload.data?.notificationId,
    })
  })
}

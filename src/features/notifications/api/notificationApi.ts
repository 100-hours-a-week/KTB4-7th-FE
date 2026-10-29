import { http } from '../../../shared/api/http'

type ApiResponse<T> = { message: string; data: T }

export type NotificationType =
  'SOLUTION_READY' | 'SALES_UPLOAD_REMINDER' | 'RANKING_CHANGED'
export type NotificationReadStatus = 'ALL' | 'UNREAD'

export type NotificationItem = {
  id: number
  type: NotificationType
  title: string
  content: string
  relatedEntityType: string | null
  relatedEntityId: number | null
  sentAt: string
  readAt: string | null
}
export type NotificationListResponse = {
  message: string
  nextCursor: string | null
  data: { items: NotificationItem[] }
}
export type NotificationListParams = {
  readStatus?: NotificationReadStatus
  cursor?: string
  size?: number
}

export async function getNotifications(params: NotificationListParams = {}) {
  return (
    await http.get<NotificationListResponse>('/v1/notifications', { params })
  ).data
}

export async function markNotificationsAsRead(notificationIds: number[]) {
  return (
    await http.patch<ApiResponse<{ updatedCount: number; readAt: string }>>(
      '/v1/notifications',
      { notificationIds },
    )
  ).data.data
}

export type NotificationPreferences = {
  solutionEnabled: boolean
  salesUploadReminderEnabled: boolean
  rankingChangeEnabled: boolean
}
export type NotificationPreferenceUpdateRequest = {
  solutionEnabled?: boolean
  salesUploadReminderEnabled?: boolean
  rankingChangeEnabled?: boolean
}

export async function registerFcmToken(token: string) {
  await http.post('/v3/notifications/fcm-tokens', { token })
}

export async function unregisterFcmToken(token: string) {
  await http.delete('/v3/notifications/fcm-tokens', { data: { token } })
}

export async function getNotificationPreferences() {
  return (
    await http.get<ApiResponse<{ preferences: NotificationPreferences }>>(
      '/v1/notification-preferences',
    )
  ).data.data.preferences
}

export async function updateNotificationPreferences(
  request: NotificationPreferenceUpdateRequest,
) {
  return (
    await http.patch<ApiResponse<{ preferences: NotificationPreferences }>>(
      '/v1/notification-preferences',
      request,
    )
  ).data.data.preferences
}

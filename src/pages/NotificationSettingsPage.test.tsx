import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { NotificationSettingsPage } from './NotificationSettingsPage'

const {
  getNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  navigate,
} = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getNotifications.mockReset()
  getNotificationPreferences.mockReset()
  updateNotificationPreferences.mockReset()
  navigate.mockReset()

  // AppShell이 알림 배지 확인용으로 같은 모듈의 getNotifications를 호출하므로
  // 이 페이지의 동작과 무관하게 항상 안전한 기본 응답을 준다.
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('알림 설정을 불러와 토글 상태로 표시한다', async () => {
  getNotificationPreferences.mockResolvedValue({
    solutionEnabled: true,
    salesUploadReminderEnabled: false,
  })

  render(
    <MemoryRouter>
      <NotificationSettingsPage />
    </MemoryRouter>,
  )

  const solutionToggle = await screen.findByRole('switch', {
    name: '솔루션 제공 알림',
  })
  const salesToggle = screen.getByRole('switch', {
    name: '매출 데이터 업로드 알림',
  })

  expect(solutionToggle).toHaveAttribute('aria-checked', 'true')
  expect(salesToggle).toHaveAttribute('aria-checked', 'false')
})

test('토글을 클릭하면 변경 요청을 보내고 응답으로 상태를 갱신한다', async () => {
  getNotificationPreferences.mockResolvedValue({
    solutionEnabled: true,
    salesUploadReminderEnabled: false,
  })
  updateNotificationPreferences.mockResolvedValue({
    solutionEnabled: false,
    salesUploadReminderEnabled: false,
  })

  render(
    <MemoryRouter>
      <NotificationSettingsPage />
    </MemoryRouter>,
  )

  const solutionToggle = await screen.findByRole('switch', {
    name: '솔루션 제공 알림',
  })
  fireEvent.click(solutionToggle)

  await waitFor(() =>
    expect(updateNotificationPreferences).toHaveBeenCalledWith({
      solutionEnabled: false,
    }),
  )
  await waitFor(() =>
    expect(solutionToggle).toHaveAttribute('aria-checked', 'false'),
  )
})

test('변경 요청이 실패하면 토글을 이전 상태로 되돌린다', async () => {
  getNotificationPreferences.mockResolvedValue({
    solutionEnabled: true,
    salesUploadReminderEnabled: false,
  })
  updateNotificationPreferences.mockRejectedValue(new Error('network error'))

  render(
    <MemoryRouter>
      <NotificationSettingsPage />
    </MemoryRouter>,
  )

  const solutionToggle = await screen.findByRole('switch', {
    name: '솔루션 제공 알림',
  })
  fireEvent.click(solutionToggle)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '알림 설정을 변경하지 못했습니다. 다시 시도해 주세요.',
  )
  expect(solutionToggle).toHaveAttribute('aria-checked', 'true')
})

test('세션이 없으면 로그인 페이지로 이동한다', async () => {
  getNotificationPreferences.mockRejectedValue({ response: { status: 401 } })

  render(
    <MemoryRouter>
      <NotificationSettingsPage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

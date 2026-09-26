import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { NotificationsPage } from './NotificationsPage'

const { getNotifications, markNotificationsAsRead, navigate } = vi.hoisted(
  () => ({
    getNotifications: vi.fn(),
    markNotificationsAsRead: vi.fn(),
    navigate: vi.fn(),
  }),
)

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
  markNotificationsAsRead,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getNotifications.mockReset()
  markNotificationsAsRead.mockReset()
  navigate.mockReset()
})

test('알림 목록을 불러와 제목과 읽음 여부를 표시한다', async () => {
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: {
      items: [
        {
          id: 1,
          type: 'SOLUTION_READY',
          title: '오늘의 솔루션이 도착했어요',
          content: '오후 진열 재고를 먼저 점검해 보세요.',
          relatedEntityType: null,
          relatedEntityId: null,
          sentAt: '2026-09-26T08:00:00+09:00',
          readAt: null,
        },
      ],
    },
  })

  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument()
  expect(
    await screen.findByText('오늘의 솔루션이 도착했어요'),
  ).toBeInTheDocument()
  expect(getNotifications).toHaveBeenCalledWith({ size: 20 })
})

test('알림이 없으면 빈 상태를 표시한다', async () => {
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })

  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('새 알림이 없습니다')).toBeInTheDocument()
})

test('읽지 않은 알림을 클릭하면 읽음 처리를 요청한다', async () => {
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: {
      items: [
        {
          id: 1,
          type: 'SOLUTION_READY',
          title: '오늘의 솔루션이 도착했어요',
          content: '오후 진열 재고를 먼저 점검해 보세요.',
          relatedEntityType: null,
          relatedEntityId: null,
          sentAt: '2026-09-26T08:00:00+09:00',
          readAt: null,
        },
      ],
    },
  })
  markNotificationsAsRead.mockResolvedValue({
    updatedCount: 1,
    readAt: '2026-09-26T09:00:00+09:00',
  })

  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )

  fireEvent.click(await screen.findByText('오늘의 솔루션이 도착했어요'))

  await waitFor(() => expect(markNotificationsAsRead).toHaveBeenCalledWith([1]))
})

test('더 불러올 알림이 있으면 더보기 버튼으로 다음 페이지를 요청한다', async () => {
  // AppShell도 같은 getNotifications를 알림 배지 확인용으로 호출하므로,
  // 호출 순서가 아니라 요청 파라미터로 응답을 구분해야 두 호출이 서로
  // 뒤섞여도 안전하다.
  getNotifications.mockImplementation((params) => {
    if (params?.readStatus === 'UNREAD') {
      return Promise.resolve({
        message: '조회 성공',
        nextCursor: null,
        data: { items: [] },
      })
    }
    if (params?.cursor) {
      return Promise.resolve({
        message: '조회 성공',
        nextCursor: null,
        data: {
          items: [
            {
              id: 2,
              type: 'SALES_UPLOAD_REMINDER',
              title: '두 번째 알림',
              content: '내용',
              relatedEntityType: null,
              relatedEntityId: null,
              sentAt: '2026-09-25T08:00:00+09:00',
              readAt: '2026-09-25T08:10:00+09:00',
            },
          ],
        },
      })
    }
    return Promise.resolve({
      message: '조회 성공',
      nextCursor: 'cursor-2',
      data: {
        items: [
          {
            id: 1,
            type: 'SOLUTION_READY',
            title: '첫 번째 알림',
            content: '내용',
            relatedEntityType: null,
            relatedEntityId: null,
            sentAt: '2026-09-26T08:00:00+09:00',
            readAt: '2026-09-26T08:10:00+09:00',
          },
        ],
      },
    })
  })

  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )

  fireEvent.click(await screen.findByRole('button', { name: '더보기' }))

  expect(await screen.findByText('두 번째 알림')).toBeInTheDocument()
  expect(getNotifications).toHaveBeenLastCalledWith({
    size: 20,
    cursor: 'cursor-2',
  })
})

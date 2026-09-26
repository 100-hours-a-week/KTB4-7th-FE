import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { AppShell } from './AppShell'

const { getNotifications } = vi.hoisted(() => ({
  getNotifications: vi.fn(),
}))

vi.mock('../../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

beforeEach(() => {
  getNotifications.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('모바일 하단 탐색과 화면 제목을 표시한다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('navigation', { name: '하단 탐색' }),
  ).toBeInTheDocument()
  expect(screen.getAllByText('솔루션')).toHaveLength(2)
})

test('기기 프레임 안에 스크롤 본문과 알림 이동을 렌더링한다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toHaveClass('app-content')
  expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
    'href',
    '/notifications',
  )
})

test('backTo가 없으면 홈 링크를 보여준다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/')
  expect(
    screen.queryByRole('link', { name: '뒤로가기' }),
  ).not.toBeInTheDocument()
})

test('backTo가 있으면 홈 링크 대신 뒤로가기 버튼을 보여준다', () => {
  render(
    <MemoryRouter>
      <AppShell title="비밀번호 수정" backTo="/profile">
        내용
      </AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: '뒤로가기' })).toHaveAttribute(
    'href',
    '/profile',
  )
  expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument()
})

test('읽지 않은 알림이 있으면 알림 배지를 표시한다', async () => {
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: {
      items: [
        {
          id: 1,
          type: 'SOLUTION_READY',
          title: '알림',
          content: '내용',
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
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  await waitFor(() =>
    expect(getNotifications).toHaveBeenCalledWith({
      readStatus: 'UNREAD',
      size: 1,
    }),
  )
  expect(await screen.findByRole('link', { name: '알림' })).toContainHTML(
    'notification-dot',
  )
})

test('읽지 않은 알림이 없으면 알림 배지를 표시하지 않는다', async () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  await waitFor(() => expect(getNotifications).toHaveBeenCalled())
  expect(
    screen
      .getByRole('link', { name: '알림' })
      .querySelector('.notification-dot'),
  ).not.toBeInTheDocument()
})

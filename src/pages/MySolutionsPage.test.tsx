import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { MySolutionsPage } from './MySolutionsPage'

const { getSavedSolutions, getNotifications, navigate } = vi.hoisted(() => ({
  getSavedSolutions: vi.fn(),
  getNotifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/solution/api/savedSolutionApi', () => ({
  getSavedSolutions,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getSavedSolutions.mockReset()
  getNotifications.mockReset()
  navigate.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회에 성공했습니다.',
    nextCursor: null,
    data: { items: [] },
  })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MySolutionsPage />
    </MemoryRouter>,
  )
}

test('저장한 솔루션이 없으면 밝은 빈 화면을 보여준다', async () => {
  getSavedSolutions.mockResolvedValue({
    message: '아직 저장된 솔루션이 없습니다.',
    nextCursor: null,
    data: { groups: [] },
  })

  renderPage()

  expect(screen.getByRole('main')).toHaveClass('saved-solutions-content')
  expect(await screen.findByText('저장한 솔루션이 없습니다')).toBeVisible()
})

test('저장한 솔루션을 날짜와 제목 중심의 목록으로 보여주고 상세 링크를 연결한다', async () => {
  getSavedSolutions.mockResolvedValue({
    message: '조회에 성공했습니다.',
    nextCursor: null,
    data: {
      groups: [
        {
          year: 2026,
          items: [
            {
              savedId: 91,
              savedDate: '2026-09-27',
              displayTitle: '09/27 점심 시간대 할인',
              firstTitle: '점심 시간대 할인',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  expect(await screen.findByText('09/27')).toBeVisible()
  const link = screen.getByRole('link', { name: /09\/27 점심 시간대 할인/ })
  expect(link).toHaveAttribute('href', '/my-solutions/91')
  expect(link.querySelector('strong')).toHaveTextContent('점심 시간대 할인')
  expect(link.querySelector('strong')).not.toHaveTextContent('09/27')
  expect(
    document.querySelector('.saved-solution-carousel'),
  ).not.toBeInTheDocument()
})

test('월 선택 필터는 선택한 달의 저장 솔루션만 보여준다', async () => {
  getSavedSolutions.mockResolvedValue({
    message: '조회에 성공했습니다.',
    nextCursor: null,
    data: {
      groups: [
        {
          year: 2026,
          items: [
            {
              savedId: 91,
              savedDate: '2026-09-27',
              displayTitle: '9월 솔루션',
              firstTitle: '9월 솔루션',
              remainingItemCount: 0,
            },
            {
              savedId: 92,
              savedDate: '2026-10-01',
              displayTitle: '10월 솔루션',
              firstTitle: '10월 솔루션',
              remainingItemCount: 1,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  await screen.findByText('9월 솔루션')
  fireEvent.click(screen.getByRole('button', { name: '9월' }))

  expect(screen.getByText('9월 솔루션')).toBeVisible()
  expect(screen.queryByText('10월 솔루션')).not.toBeInTheDocument()
})

test('더보기를 누르면 다음 목록을 이어붙인다', async () => {
  getSavedSolutions.mockResolvedValueOnce({
    message: '조회에 성공했습니다.',
    nextCursor: 80,
    data: {
      groups: [
        {
          year: 2026,
          items: [
            {
              savedId: 91,
              savedDate: '2026-09-27',
              displayTitle: '점심 시간대 할인',
              firstTitle: '점심 시간대 할인',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })
  getSavedSolutions.mockResolvedValueOnce({
    message: '조회에 성공했습니다.',
    nextCursor: null,
    data: {
      groups: [
        {
          year: 2025,
          items: [
            {
              savedId: 12,
              savedDate: '2025-12-01',
              displayTitle: '재고 점검',
              firstTitle: '재고 점검',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  await screen.findByText('점심 시간대 할인')
  fireEvent.click(screen.getByRole('button', { name: '더보기' }))

  await waitFor(() => expect(screen.getByText('재고 점검')).toBeVisible())
  expect(getSavedSolutions).toHaveBeenLastCalledWith({ size: 20, cursor: 80 })
})

test('401 응답을 받으면 로그인 페이지로 이동한다', async () => {
  getSavedSolutions.mockRejectedValue({ response: { status: 401 } })

  renderPage()

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { MySolutionsPage } from './MySolutionsPage'

const { getSavedSolutions, navigate } = vi.hoisted(() => ({
  getSavedSolutions: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/solution/api/savedSolutionApi', () => ({
  getSavedSolutions,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getSavedSolutions.mockReset()
  navigate.mockReset()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MySolutionsPage />
    </MemoryRouter>,
  )
}

test('저장한 솔루션이 없으면 빈 화면을 보여준다', async () => {
  getSavedSolutions.mockResolvedValue({
    message: '아직 저장된 솔루션이 없습니다.',
    nextCursor: null,
    data: { groups: [] },
  })

  renderPage()

  expect(screen.getByRole('main')).toHaveClass('saved-solutions-content')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText('저장한 솔루션')).toBeVisible()
  expect(
    screen.getByRole('heading', { name: '다시 보고 싶은 일' }),
  ).toBeVisible()
  expect(await screen.findByText('저장한 솔루션이 없습니다')).toBeVisible()
})

test('연도별로 저장한 솔루션 목록을 보여주고 상세 링크를 연결한다', async () => {
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

  expect(await screen.findByText('09/27 점심 시간대 할인')).toBeVisible()
  expect(
    document.querySelector('.saved-solution-card-visual'),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('09.27 SAVED')).not.toBeInTheDocument()
  const link = screen.getByRole('link', { name: /09\/27 점심 시간대 할인/ })
  expect(link).toHaveAttribute('href', '/my-solutions/91')
})

test('화살표로 다음 저장 솔루션 카드를 보여준다', async () => {
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
              displayTitle: '첫 번째 솔루션',
              firstTitle: '첫 번째 솔루션',
              remainingItemCount: 0,
            },
            {
              savedId: 92,
              savedDate: '2026-09-28',
              displayTitle: '두 번째 솔루션',
              firstTitle: '두 번째 솔루션',
              remainingItemCount: 2,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  await screen.findByText('첫 번째 솔루션')
  fireEvent.click(screen.getByRole('button', { name: '다음 저장 솔루션' }))

  expect(screen.getByRole('link', { name: /두 번째 솔루션/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
  expect(screen.getByText('02 / 02')).toBeVisible()
})

test('겹쳐진 폴더 탭을 누르면 해당 솔루션 카드가 앞으로 열린다', async () => {
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
              displayTitle: '첫 번째 솔루션',
              firstTitle: '첫 번째 솔루션',
              remainingItemCount: 0,
            },
            {
              savedId: 92,
              savedDate: '2026-09-28',
              displayTitle: '두 번째 솔루션',
              firstTitle: '두 번째 솔루션',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  const secondCard = await screen.findByRole('link', {
    name: /두 번째 솔루션/,
  })
  fireEvent.click(secondCard)

  expect(secondCard).toHaveAttribute('aria-current', 'true')
  expect(navigate).not.toHaveBeenCalled()
})

test('월 필터로 해당 월의 저장 솔루션만 보여준다', async () => {
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
          ],
        },
        {
          year: 2025,
          items: [
            {
              savedId: 12,
              savedDate: '2025-12-01',
              displayTitle: '12월 솔루션',
              firstTitle: '12월 솔루션',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  await screen.findByText('9월 솔루션')
  fireEvent.click(screen.getByRole('button', { name: '12월' }))

  expect(screen.getByRole('link', { name: /12월 솔루션/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
  expect(screen.getByText('01 / 01')).toBeVisible()
})

test('위로 스와이프하면 다음 저장 솔루션 카드를 보여준다', async () => {
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
              displayTitle: '첫 번째 솔루션',
              firstTitle: '첫 번째 솔루션',
              remainingItemCount: 0,
            },
            {
              savedId: 92,
              savedDate: '2026-09-28',
              displayTitle: '두 번째 솔루션',
              firstTitle: '두 번째 솔루션',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  const carousel = await screen.findByRole('region', {
    name: '저장한 솔루션 카드',
  })
  const viewport = carousel.querySelector('.saved-solution-carousel-viewport')
  expect(viewport).not.toBeNull()

  fireEvent.touchStart(viewport as Element, {
    touches: [{ clientY: 360 }],
  })
  fireEvent.touchEnd(viewport as Element, {
    changedTouches: [{ clientY: 180 }],
  })

  expect(screen.getByRole('link', { name: /두 번째 솔루션/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
})

test('더보기를 누르면 다음 페이지를 이어붙인다', async () => {
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
              displayTitle: '09/27 점심 시간대 할인',
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
              displayTitle: '12/01 재고 점검',
              firstTitle: '재고 점검',
              remainingItemCount: 0,
            },
          ],
        },
      ],
    },
  })

  renderPage()

  await screen.findByText('09/27 점심 시간대 할인')
  const loadMoreButton = screen.getByRole('button', { name: '더보기' })
  loadMoreButton.click()

  await waitFor(() => {
    expect(screen.getAllByText('12/01 재고 점검').length).toBeGreaterThan(0)
  })
  expect(getSavedSolutions).toHaveBeenLastCalledWith({ size: 20, cursor: 80 })
})

test('401 응답을 받으면 로그인 페이지로 이동한다', async () => {
  getSavedSolutions.mockRejectedValue({ response: { status: 401 } })

  renderPage()

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

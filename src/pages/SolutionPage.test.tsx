import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SolutionPage } from './SolutionPage'

const { getTodaySolution } = vi.hoisted(() => ({
  getTodaySolution: vi.fn(),
}))

vi.mock('../features/solution/api/solutionApi', () => ({
  getTodaySolution,
}))

beforeEach(() => {
  getTodaySolution.mockReset()
})

test('오늘의 솔루션 카드 3개를 보여주고 상세 페이지로 연결한다', async () => {
  getTodaySolution.mockResolvedValue({
    message: '조회에 성공했습니다.',
    status: 'COMPLETED',
    data: {
      storeName: '맴매 베이커리',
      screenTitle: '맴매 베이커리 맴매 솔루션',
      solutionBundleId: 12,
      targetDate: '2026-09-27',
      solutionCards: [
        {
          id: 1,
          rankNo: 1,
          title: '재고 점검',
          summaryText: '요약1',
          detailText: '상세1',
          evidence: '근거1',
          isSaved: false,
          savedId: null,
        },
        {
          id: 2,
          rankNo: 2,
          title: '재방문 혜택',
          summaryText: '요약2',
          detailText: '상세2',
          evidence: '근거2',
          isSaved: false,
          savedId: null,
        },
        {
          id: 3,
          rankNo: 3,
          title: '메뉴 구성',
          summaryText: '요약3',
          detailText: '상세3',
          evidence: '근거3',
          isSaved: false,
          savedId: null,
        },
      ],
    },
  })

  render(
    <MemoryRouter>
      <SolutionPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('재고 점검')).toBeInTheDocument()
  expect(screen.getByText('재방문 혜택')).toBeInTheDocument()
  expect(screen.getByText('메뉴 구성')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '솔루션 상세 보기' }),
  ).toHaveAttribute('href', '/solution/12/1')
  expect(screen.getByText('재방문 혜택').closest('a')).toHaveAttribute(
    'href',
    '/solution/12/2',
  )
})

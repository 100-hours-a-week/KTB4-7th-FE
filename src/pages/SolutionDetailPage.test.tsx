import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SolutionDetailPage } from './SolutionDetailPage'

const { getSolutionBundleDetail, saveSolutionCard, navigate } = vi.hoisted(
  () => ({
    getSolutionBundleDetail: vi.fn(),
    saveSolutionCard: vi.fn(),
    navigate: vi.fn(),
  }),
)

vi.mock('../features/solution/api/solutionApi', () => ({
  getSolutionBundleDetail,
  saveSolutionCard,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getSolutionBundleDetail.mockReset()
  saveSolutionCard.mockReset()
  navigate.mockReset()
})

function renderDetail(bundleId: string, cardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/solution/${bundleId}/${cardId}`]}>
      <Routes>
        <Route
          path="/solution/:bundleId/:cardId"
          element={<SolutionDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function mockDetail(overrides: { items?: Record<string, unknown>[] } = {}) {
  getSolutionBundleDetail.mockResolvedValue({
    message: '조회에 성공했습니다.',
    data: {
      solutionBundle: {
        id: 12,
        targetDate: '2026-09-27',
        expiresAt: '2026-09-28T00:00:00+09:00',
        expirationNotice:
          '오늘의 솔루션은 00:00시에 사라져요. 남겨두려면 저장해주세요.',
        isSaved: false,
        items: overrides.items ?? [
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
            isSaved: true,
            savedId: 200,
          },
        ],
      },
    },
  })
}

test('클릭한 카드 하나만 상세로 보여준다', async () => {
  mockDetail()

  renderDetail('12', '1')

  expect(await screen.findByText('재고 점검')).toBeInTheDocument()
  expect(screen.getByText('상세1')).toBeInTheDocument()
  expect(screen.queryByText('재방문 혜택')).not.toBeInTheDocument()
  expect(screen.queryByText('메뉴 구성')).not.toBeInTheDocument()

  const saveButtons = screen.getAllByRole('button', { name: /저장/ })
  expect(saveButtons).toHaveLength(1)
})

test('다른 카드 id로 들어가면 그 카드만 보여준다', async () => {
  mockDetail()

  renderDetail('12', '3')

  expect(await screen.findByText('메뉴 구성')).toBeInTheDocument()
  expect(screen.queryByText('재고 점검')).not.toBeInTheDocument()
  // 세 번째 카드는 이미 저장돼 있어서 버튼이 비활성 "저장됨" 상태여야 한다
  expect(screen.getByRole('button', { name: '저장됨' })).toBeDisabled()
})

test('저장 버튼을 누르면 해당 카드만 저장 상태로 바뀐다', async () => {
  mockDetail()
  saveSolutionCard.mockResolvedValue({
    message: '솔루션이 저장되었습니다.',
    data: {
      savedSolution: {
        id: 100,
        solutionBundleId: 12,
        targetDate: '2026-09-27',
        savedAt: '2026-09-27T10:00:00',
      },
      next: 'SOL-03',
    },
  })

  renderDetail('12', '1')

  const saveButton = await screen.findByRole('button', {
    name: '이 솔루션 저장하기',
  })
  fireEvent.click(saveButton)

  await waitFor(() => expect(saveSolutionCard).toHaveBeenCalledWith(1))
  expect(await screen.findByRole('button', { name: '저장됨' })).toBeDisabled()
})

test('존재하지 않는 카드 id면 안내 문구를 보여준다', async () => {
  mockDetail()

  renderDetail('12', '999')

  expect(
    await screen.findByText('솔루션을 찾을 수 없습니다'),
  ).toBeInTheDocument()
})

test('찾을 수 없는 솔루션이면 안내 문구를 보여준다', async () => {
  getSolutionBundleDetail.mockRejectedValue(new Error('not found'))

  renderDetail('999', '1')

  expect(
    await screen.findByText('솔루션을 찾을 수 없습니다'),
  ).toBeInTheDocument()
})

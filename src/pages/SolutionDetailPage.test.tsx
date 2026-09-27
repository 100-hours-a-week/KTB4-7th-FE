import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SolutionDetailPage } from './SolutionDetailPage'

const { getSolutionBundleDetail, saveSolutionBundle, navigate } = vi.hoisted(
  () => ({
    getSolutionBundleDetail: vi.fn(),
    saveSolutionBundle: vi.fn(),
    navigate: vi.fn(),
  }),
)

vi.mock('../features/solution/api/solutionApi', () => ({
  getSolutionBundleDetail,
  saveSolutionBundle,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getSolutionBundleDetail.mockReset()
  saveSolutionBundle.mockReset()
  navigate.mockReset()
})

function renderDetail(bundleId: string) {
  return render(
    <MemoryRouter initialEntries={[`/solution/${bundleId}`]}>
      <Routes>
        <Route path="/solution/:solutionId" element={<SolutionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('솔루션 상세 카드 3개를 보여주고 저장을 누르면 저장 API를 호출한다', async () => {
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
        items: [
          {
            id: 1,
            rankNo: 1,
            title: '재고 점검',
            summaryText: '요약1',
            detailText: '상세1',
            evidence: '근거1',
          },
          {
            id: 2,
            rankNo: 2,
            title: '재방문 혜택',
            summaryText: '요약2',
            detailText: '상세2',
            evidence: '근거2',
          },
          {
            id: 3,
            rankNo: 3,
            title: '메뉴 구성',
            summaryText: '요약3',
            detailText: '상세3',
            evidence: '근거3',
          },
        ],
      },
    },
  })
  saveSolutionBundle.mockResolvedValue({
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

  renderDetail('12')

  expect(await screen.findByText('재고 점검')).toBeInTheDocument()
  expect(screen.getByText('재방문 혜택')).toBeInTheDocument()
  expect(screen.getByText('메뉴 구성')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '솔루션 저장하기' }))

  await waitFor(() => expect(saveSolutionBundle).toHaveBeenCalledWith(12))
  expect(await screen.findByRole('button', { name: '저장됨' })).toBeDisabled()
})

test('찾을 수 없는 솔루션이면 안내 문구를 보여준다', async () => {
  getSolutionBundleDetail.mockRejectedValue(new Error('not found'))

  renderDetail('999')

  expect(
    await screen.findByText('솔루션을 찾을 수 없습니다'),
  ).toBeInTheDocument()
})

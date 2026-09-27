import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { MySolutionDetailPage } from './MySolutionDetailPage'

const { getSavedSolutionDetail, deleteSavedSolutions, navigate } = vi.hoisted(
  () => ({
    getSavedSolutionDetail: vi.fn(),
    deleteSavedSolutions: vi.fn(),
    navigate: vi.fn(),
  }),
)

vi.mock('../features/solution/api/savedSolutionApi', () => ({
  getSavedSolutionDetail,
  deleteSavedSolutions,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getSavedSolutionDetail.mockReset()
  deleteSavedSolutions.mockReset()
  navigate.mockReset()
})

function renderDetail(savedId: string) {
  return render(
    <MemoryRouter initialEntries={[`/my-solutions/${savedId}`]}>
      <Routes>
        <Route
          path="/my-solutions/:savedId"
          element={<MySolutionDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function mockDetail() {
  getSavedSolutionDetail.mockResolvedValue({
    message: '조회에 성공했습니다.',
    data: {
      savedSolution: {
        id: 91,
        savedDate: '2026-09-27',
        displayTitle: '09/27 점심 시간대 할인',
        readOnly: true,
        items: [
          {
            rankNo: 1,
            title: '점심 시간대 할인',
            summaryText: '요약',
            detailText: '상세',
            evidence: '근거',
          },
        ],
      },
    },
  })
}

test('저장한 솔루션 상세를 보여준다', async () => {
  mockDetail()

  renderDetail('91')

  expect(await screen.findByText('09/27 점심 시간대 할인')).toBeVisible()
  expect(screen.getByText('요약')).toBeVisible()
  expect(screen.getByText('상세')).toBeVisible()
  expect(getSavedSolutionDetail).toHaveBeenCalledWith(91)
})

test('저장 취소를 누르면 삭제하고 목록으로 돌아간다', async () => {
  mockDetail()
  deleteSavedSolutions.mockResolvedValue({
    message: '삭제되었습니다.',
    data: { deletedCount: 1 },
  })

  renderDetail('91')
  await screen.findByText('09/27 점심 시간대 할인')

  screen.getByRole('button', { name: '저장 취소' }).click()

  await waitFor(() => {
    expect(deleteSavedSolutions).toHaveBeenCalledWith([91])
    expect(navigate).toHaveBeenCalledWith('/my-solutions')
  })
})

test('찾을 수 없는 저장 솔루션이면 안내 문구를 보여준다', async () => {
  getSavedSolutionDetail.mockRejectedValue({ response: { status: 404 } })

  renderDetail('999')

  expect(
    await screen.findByText('저장한 솔루션을 찾을 수 없습니다.'),
  ).toBeVisible()
})

test('401 응답을 받으면 로그인 페이지로 이동한다', async () => {
  getSavedSolutionDetail.mockRejectedValue({ response: { status: 401 } })

  renderDetail('91')

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { GrowthRankingPage } from './GrowthRankingPage'

const { getGrowthRanking, getNotifications } = vi.hoisted(() => ({
  getGrowthRanking: vi.fn(),
  getNotifications: vi.fn(),
}))
vi.mock('../features/ranking/api/rankingApi', () => ({ getGrowthRanking }))
vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

const completed = {
  message: '조회 성공',
  status: 'COMPLETED',
  data: {
    isFinal: true,
    period: {
      type: 'LAST_MONTH',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      comparisonStartDate: '2026-08-01',
      comparisonEndDate: '2026-08-31',
      calculatedAt: '2026-10-01T09:00:00+09:00',
    },
    rankings: [
      { rank: 1, displayName: '사장님 754', growthRate: 32.1, isMine: false },
      { rank: 2, displayName: '내 매장', growthRate: -2.5, isMine: true },
    ],
    myRanking: { rank: 2, growthRate: -2.5, includedInTop20: true },
    myEligibility: { status: 'ELIGIBLE', reason: null },
  },
}

function mount() {
  return render(
    <MemoryRouter>
      <GrowthRankingPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getGrowthRanking.mockReset()
  getNotifications.mockResolvedValue({ data: { items: [] } })
})

test('집계 기간과 내 순위, 익명 상위 순위를 표시한다', async () => {
  getGrowthRanking.mockResolvedValue(completed)
  mount()

  expect(await screen.findByText('2026년 9월 매출')).toBeInTheDocument()
  expect(screen.getByText(/8월 대비 성장률/)).toBeInTheDocument()
  expect(screen.getByText('2위')).toBeInTheDocument()
  expect(screen.getAllByText('-2.5%')).toHaveLength(2)
  expect(
    within(screen.getByRole('list', { name: '전체 사장님 순위' })).getByText(
      '사장님 754',
    ),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: '이번 달' }),
  ).not.toBeInTheDocument()
})

test('내 순위가 없어도 다른 사장님 순위를 표시하고 업로드로 안내한다', async () => {
  getGrowthRanking.mockResolvedValue({
    ...completed,
    data: {
      ...completed.data,
      myRanking: null,
      rankings: completed.data.rankings.slice(0, 1),
      myEligibility: {
        status: 'DATA_INSUFFICIENT',
        reason: 'SELECTED_PERIOD_MISSING',
      },
    },
  })
  mount()

  expect(
    await screen.findByText('아직 내 순위 정보가 없어요'),
  ).toBeInTheDocument()
  expect(screen.getByText('사장님 754')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '매출 데이터 등록하기' }),
  ).toHaveAttribute('href', '/sales/upload')
})

test('매출 분석 미완료면 업로드를 잘못 권하지 않는다', async () => {
  getGrowthRanking.mockResolvedValue({
    ...completed,
    data: {
      ...completed.data,
      myRanking: null,
      myEligibility: {
        status: 'DATA_INSUFFICIENT',
        reason: 'ANALYSIS_NOT_COMPLETED',
      },
    },
  })
  mount()

  expect(
    await screen.findByText(
      '매출 분석이 완료되면 내 성장 순위를 확인할 수 있어요.',
    ),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '매출 데이터 등록하기' }),
  ).not.toBeInTheDocument()
  expect(screen.getByText('사장님 754')).toBeInTheDocument()
})

test('전체 미집계 상태는 타인 순위 없이 안내한다', async () => {
  getGrowthRanking.mockResolvedValue({
    ...completed,
    status: 'NOT_CALCULATED',
    data: {
      ...completed.data,
      rankings: [],
      myRanking: null,
      myEligibility: { status: 'UNKNOWN', reason: null },
    },
  })
  mount()

  expect(
    await screen.findByText('아직 성장 랭킹이 집계되지 않았어요'),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('list', { name: '전체 사장님 순위' }),
  ).not.toBeInTheDocument()
})

test('집계 중이면 진행 상태를 안내한다', async () => {
  getGrowthRanking.mockResolvedValue({
    ...completed,
    status: 'PROCESSING',
    data: {
      ...completed.data,
      rankings: [],
      myRanking: null,
      myEligibility: { status: 'UNKNOWN', reason: null },
    },
  })
  mount()

  expect(
    await screen.findByText('성장 랭킹을 집계하고 있어요'),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('list', { name: '전체 사장님 순위' }),
  ).not.toBeInTheDocument()
})

test('집계 실패와 조회 오류는 다시 시도할 수 있다', async () => {
  getGrowthRanking
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({
      ...completed,
      status: 'FAILED',
      data: { ...completed.data, rankings: [], myRanking: null },
    })
    .mockResolvedValueOnce(completed)
  mount()

  expect(
    await screen.findByText('성장 랭킹을 불러오지 못했어요'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(
    await screen.findByText('성장 랭킹 집계에 실패했어요'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await waitFor(() =>
    expect(screen.getByText('사장님 754')).toBeInTheDocument(),
  )
})

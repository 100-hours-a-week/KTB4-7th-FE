import { beforeEach, expect, test, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../../shared/api/http', () => ({ http: { get } }))

import { getGrowthRanking } from './rankingApi'

beforeEach(() => get.mockReset())

test('세션으로 지난달 성장 랭킹을 조건 없이 조회한다', async () => {
  const response = {
    status: 'NOT_CALCULATED',
    message: '미집계',
    data: {
      isFinal: true,
      period: {
        type: 'LAST_MONTH',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        comparisonStartDate: '2026-08-01',
        comparisonEndDate: '2026-08-31',
        calculatedAt: null,
      },
      rankings: [],
      myRanking: null,
      myEligibility: { status: 'UNKNOWN', reason: null },
    },
  }
  get.mockResolvedValue({ data: response })

  await expect(getGrowthRanking()).resolves.toEqual(response)
  expect(get).toHaveBeenCalledWith('/v2/rankings/growth')
})

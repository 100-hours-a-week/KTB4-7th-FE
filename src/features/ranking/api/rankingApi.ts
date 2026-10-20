import { http } from '../../../shared/api/http'

export type GrowthRankingStatus =
  'COMPLETED' | 'NOT_CALCULATED' | 'PROCESSING' | 'FAILED'
export type GrowthRankingEligibilityReason =
  | 'SELECTED_PERIOD_MISSING'
  | 'COMPARISON_PERIOD_MISSING'
  | 'DATA_INCOMPLETE'
  | 'COMPARISON_SALES_ZERO'
  | 'ANALYSIS_NOT_COMPLETED'
  | null

export type GrowthRankingResponse = {
  message: string
  status: GrowthRankingStatus
  data: {
    isFinal: boolean
    period: {
      type: 'LAST_MONTH'
      startDate: string
      endDate: string
      comparisonStartDate: string
      comparisonEndDate: string
      calculatedAt: string | null
    }
    rankings: Array<{
      rank: number
      displayName: string
      growthRate: number
      isMine: boolean
    }>
    myRanking: {
      rank: number
      growthRate: number
      includedInTop20: boolean
    } | null
    myEligibility: {
      status: 'ELIGIBLE' | 'DATA_INSUFFICIENT' | 'UNKNOWN'
      reason: GrowthRankingEligibilityReason
    }
  }
}

export async function getGrowthRanking() {
  return (await http.get<GrowthRankingResponse>('/v2/rankings/growth')).data
}

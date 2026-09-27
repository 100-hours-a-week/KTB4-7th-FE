import { http } from '../../../shared/api/http'

export type SolutionTodayStatus =
  | 'EMPTY'
  | 'INSUFFICIENT_HISTORY'
  | 'PENDING'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'

export type SolutionCard = {
  id: number
  rankNo: number
  title: string
  summaryText: string
  detailText: string
  evidence: string
}

export type SolutionTodayData = {
  storeName: string | null
  screenTitle: string | null
  solutionBundleId: number | null
  targetDate: string
  solutionCards: SolutionCard[]
}

export type SolutionTodayResponse = {
  message: string
  status: SolutionTodayStatus
  data: SolutionTodayData
}

export async function getTodaySolution() {
  return (await http.get<SolutionTodayResponse>('/v1/solutions/today')).data
}

export type SolutionBundleDetail = {
  id: number
  targetDate: string
  expiresAt: string
  expirationNotice: string
  isSaved: boolean
  items: SolutionCard[]
}

export type SolutionBundleDetailResponse = {
  message: string
  data: { solutionBundle: SolutionBundleDetail }
}

export async function getSolutionBundleDetail(bundleId: number) {
  return (
    await http.get<SolutionBundleDetailResponse>(
      `/v1/solution-bundles/${bundleId}`,
    )
  ).data
}

export type SolutionSaveResponse = {
  message: string
  data: {
    savedSolution: {
      id: number
      solutionBundleId: number
      targetDate: string
      savedAt: string
    }
    next: string
  }
}

export async function saveSolutionBundle(bundleId: number) {
  return (
    await http.post<SolutionSaveResponse>(
      `/v1/solution-bundles/${bundleId}/saves`,
    )
  ).data
}

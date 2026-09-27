import { http } from '../../../shared/api/http'

export type SavedSolutionListItem = {
  savedId: number
  savedDate: string
  displayTitle: string
  firstTitle: string
  remainingItemCount: number
}

export type SavedSolutionYearGroup = {
  year: number
  items: SavedSolutionListItem[]
}

export type SavedSolutionListResponse = {
  message: string
  nextCursor: number | null
  data: { groups: SavedSolutionYearGroup[] }
}

export type SavedSolutionListParams = {
  cursor?: number
  size?: number
}

export async function getSavedSolutions(params: SavedSolutionListParams = {}) {
  return (
    await http.get<SavedSolutionListResponse>('/v1/saved-solutions', {
      params,
    })
  ).data
}

export type SavedSolutionDetailItem = {
  rankNo: number
  title: string
  summaryText: string
  detailText: string
  evidence: string
}

export type SavedSolutionDetail = {
  id: number
  savedDate: string
  displayTitle: string
  readOnly: boolean
  items: SavedSolutionDetailItem[]
}

export type SavedSolutionDetailResponse = {
  message: string
  data: { savedSolution: SavedSolutionDetail }
}

export async function getSavedSolutionDetail(savedId: number) {
  return (
    await http.get<SavedSolutionDetailResponse>(
      `/v1/saved-solutions/${savedId}`,
    )
  ).data
}

export type SavedSolutionDeleteResponse = {
  message: string
  data: { deletedCount: number }
}

export async function deleteSavedSolutions(savedIds: number[]) {
  return (
    await http.delete<SavedSolutionDeleteResponse>('/v1/saved-solutions', {
      params: { savedIds: savedIds.join(',') },
    })
  ).data
}

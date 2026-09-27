import { http } from '../../../shared/api/http'

type StatusResponse<T> = { message: string; status: string; data: T }

export type SalesUploadStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type SalesUploadConnection = {
  lastUploadedAt: string | null
  totalAppliedRecordCount: number
  latestStatus: SalesUploadStatus | null
}

export type SalesUploadHistoryItem = {
  uploadId: number
  fileName: string
  uploadedAt: string
  recordCount: number
  appliedRecordCount: number
  status: SalesUploadStatus
  failReason: string | null
}

export type SalesUploadHistoryResponse = {
  connection: SalesUploadConnection
  items: SalesUploadHistoryItem[]
  page: number
  size: number
  totalPages: number
  totalCount: number
}

export async function getSalesUploadHistory(params?: {
  targetMonth?: string
  page?: number
  size?: number
}) {
  return (
    await http.get<SalesUploadHistoryResponse>('/v1/sales/uploads', {
      params,
    })
  ).data
}

export type SalesUploadProgress = { step: string; percent: number }

export type SalesUploadStatusDetail = {
  message: string
  status: SalesUploadStatus
  failReason: string | null
  data: {
    uploadId: number
    analysisRunId: number | null
    progress: SalesUploadProgress | null
    analysisId: number | null
    retryable: boolean
  }
}

export async function getSalesUploadStatus(uploadId: number) {
  return (
    await http.get<SalesUploadStatusDetail>(`/v1/sales/uploads/${uploadId}`)
  ).data
}

export type SalesUploadResult = {
  uploadId: number
  analysisRunId: number | null
}

export async function uploadSalesFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return (
    await http.post<StatusResponse<SalesUploadResult>>(
      '/v1/sales/uploads',
      formData,
    )
  ).data
}

export async function retrySalesAnalysis(uploadId: number) {
  return (
    await http.post<
      StatusResponse<{ uploadId: number; analysisRunId: number | null }>
    >(`/v1/sales/uploads/${uploadId}/analysis-retries`)
  ).data
}

export type SalesPeriodType = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'

export type SalesPeriod = {
  type: SalesPeriodType
  startDate: string
  endDate: string
}

export type SalesKpis = {
  totalSales: number
  orderCount: number
  averageOrderValue: number
  changes: {
    totalSalesRate: number | null
    orderCountRate: number | null
    averageOrderValueRate: number | null
  }
}

export type SalesDailyPoint = { date: string; salesAmount: number }
export type SalesMenuRanking = {
  rank: number
  menuName: string
  salesAmount: number
  quantity: number
}
export type SalesHourlyPoint = { hour: number; salesAmount: number }
export type SalesWeekdayPoint = {
  dayOfWeek:
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY'
  salesAmount: number
}

export type SalesAiInsight = {
  targetMonth: string
  insights: string[]
  generatedAt: string | null
} | null

export type SalesAnalysisData = {
  period: SalesPeriod
  comparisonPeriod: { startDate: string; endDate: string } | null
  kpis: SalesKpis
  dailySales: SalesDailyPoint[]
  menuRankings: SalesMenuRanking[]
  hourlySales: SalesHourlyPoint[]
  weekdaySales: SalesWeekdayPoint[]
  aiInsight: SalesAiInsight
}

export type SalesAnalysisResponse =
  | { status: 'COMPLETED'; message: string; data: SalesAnalysisData }
  | { status: 'EMPTY'; message: string; data: SalesAnalysisData }

export async function getSalesAnalysis(params: {
  periodType: SalesPeriodType
  startDate?: string
  endDate?: string
}) {
  return (
    await http.get<SalesAnalysisResponse>('/v1/sales/analyses', { params })
  ).data
}

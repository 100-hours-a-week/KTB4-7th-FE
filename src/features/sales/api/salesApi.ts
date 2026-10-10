import { http } from '../../../shared/api/http'

type StatusResponse<T> = { message: string; status: string; data: T }
type ApiResponse<T> = { message: string; data: T }

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

export type SalesUploadCostMonth = {
  costMonth: string
  rentAmount: number | null
  laborAmount: number | null
  ingredientCostRate: number | null
  source: 'SAVED' | 'SUGGESTED' | 'EMPTY'
}

export type SalesUploadCostEntry = {
  uploadId: number
  months: SalesUploadCostMonth[]
}

export type SalesUploadCostInput = {
  costMonth: string
  rentAmount: number
  laborAmount: number
  ingredientCostRate: number
}

export async function getSalesUploadCostEntry(uploadId: number) {
  return (
    await http.get<ApiResponse<SalesUploadCostEntry>>(
      `/v2/sales/uploads/${uploadId}/cost-items`,
    )
  ).data.data
}

export async function saveSalesUploadCosts(
  uploadId: number,
  items: SalesUploadCostInput[],
) {
  return (
    await http.put<
      ApiResponse<{ uploadId: number; costMonths: string[]; next: string }>
    >(`/v2/sales/uploads/${uploadId}/cost-items`, { items })
  ).data.data
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
  status: 'COMPLETED' | 'INSUFFICIENT_DATA' | 'FAILED'
  insights: string[]
  helperText: string | null
  generatedAt: string | null
} | null

export type SalesForecast = {
  predictedSalesAmount: number
  lowerBound: number
  upperBound: number
  dailyForecasts: {
    targetDate: string
    predictedSalesAmount: number
    lowerBound: number
    upperBound: number
  }[]
} | null

export type SalesAnalysisData = {
  period: SalesPeriod
  comparisonPeriod: { startDate: string; endDate: string } | null
  kpis: SalesKpis
  dailySales: SalesDailyPoint[]
  menuRankings: SalesMenuRanking[]
  hourlySales: SalesHourlyPoint[]
  weekdaySales: SalesWeekdayPoint[]
  forecast: SalesForecast
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

export type SalesExpectedForecast = {
  targetMonth: string
  actualSalesAmount: number
  forecastSalesAmount: number
  expectedSalesAmount: number
  lowerBound: number
  upperBound: number
  dailyForecasts: {
    targetDate: string
    predictedSalesAmount: number
    lowerBound: number
    upperBound: number
  }[]
}

export type SalesExpectedForecastResponse =
  | { status: 'COMPLETED'; message: string; data: SalesExpectedForecast }
  | { status: 'EMPTY'; message: string; data: null }

export async function getSalesExpectedForecast() {
  return (
    await http.get<SalesExpectedForecastResponse>(
      '/v1/sales/forecasts/expected',
    )
  ).data
}

export type SalesAvailableMonthsResponse = {
  months: string[]
}

export async function getSalesAvailableMonths() {
  return (
    await http.get<SalesAvailableMonthsResponse>('/v1/sales/analyses/months')
  ).data
}

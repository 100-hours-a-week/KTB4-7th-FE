import { http } from '../../../shared/api/http'

export type SalesCalendarDay = {
  date: string
  dayOfWeek: string
  isToday: boolean
  isSelected: boolean
  dataStatus: 'COMPLETE' | 'CLOSED' | 'MISSING' | 'UNKNOWN' | 'FUTURE'
  salesAmount: number | null
  orderCount: number | null
  salesLevel: 'HIGH' | 'LOW' | 'NORMAL' | 'UNAVAILABLE'
  weather: { condition: 'SUNNY' | 'CLOUDY' | 'RAIN' | 'SNOW' } | null
}

export type SalesCalendarSelectedDay = {
  date: string
  dataStatus: SalesCalendarDay['dataStatus']
  salesAmount: number | null
  orderCount: number | null
  averageOrderAmount: number | null
  insight: {
    salesLevel: SalesCalendarDay['salesLevel']
    monthlyAverageSalesAmount: number | null
    deviationRate: number | null
  }
}

export type SalesCalendarData = {
  month: string
  timezone: 'Asia/Seoul'
  availableRange: { firstMonth: string; lastMonth: string }
  selectedDate: string
  monthSummary: {
    totalSalesAmount: number
    totalOrderCount: number
    averageDailySalesAmount: number | null
    dataDayCount: number
  }
  days: SalesCalendarDay[]
  selectedDay: SalesCalendarSelectedDay
}

export async function getSalesCalendar(params: {
  month: string
  selectedDate?: string
}) {
  const response = await http.get<{
    message: string
    status: 'COMPLETED'
    data: SalesCalendarData
  }>('/v3/sales/calendar', { params })
  return response.data.data
}

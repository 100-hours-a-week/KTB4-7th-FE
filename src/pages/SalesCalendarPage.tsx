import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Link, Navigate } from 'react-router-dom'
import {
  getSalesCalendar,
  type SalesCalendarDay,
} from '../features/sales/api/salesCalendarApi'
import { AppShell } from '../shared/ui/AppShell'
import './sales-calendar.css'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const longWeekdays = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
]
const weatherLabels = { SUNNY: '맑음', CLOUDY: '흐림', RAIN: '비', SNOW: '눈' }
const weatherSymbols = { SUNNY: '☀', CLOUDY: '☁', RAIN: '☂', SNOW: '❄' }

function seoulToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function weekdayOf(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function changeMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function shortAmount(amount: number | null) {
  if (amount === null) return '-'
  return `${new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}원`
}

function dateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일 ${longWeekdays[weekdayOf(date)]}`
}

function levelLabel(level: SalesCalendarDay['salesLevel']) {
  if (level === 'HIGH') return '월평균보다 높은 매출'
  if (level === 'LOW') return '월평균보다 낮은 매출'
  if (level === 'NORMAL') return '월평균 수준의 매출'
  return '비교할 매출 데이터 없음'
}

export function SalesCalendarPage() {
  const [month, setMonth] = useState(() => seoulToday().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const calendar = useQuery({
    queryKey: ['sales-calendar', month, selectedDate],
    queryFn: () => getSalesCalendar({ month, selectedDate }),
    staleTime: 30_000,
    retry: false,
  })
  const data = calendar.data
  const selected = data?.selectedDay
  const selectedCalendarDay = data?.days.find(
    (day) => day.date === selected?.date,
  )
  const firstWeekday = data?.days[0] ? weekdayOf(data.days[0].date) : 0
  const [year, monthNumber] = month.split('-').map(Number)

  if (isAxiosError(calendar.error) && calendar.error.response?.status === 401) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: '/sales/calendar' } }}
      />
    )
  }

  function moveMonth(delta: number) {
    setMonth((current) => changeMonth(current, delta))
    setSelectedDate(undefined)
  }

  return (
    <AppShell title="매출 달력" contentClassName="sales-calendar-content">
      <div className="sales-calendar-page">
        <header className="sales-calendar-intro">
          <p className="sales-calendar-eyebrow">SALES / CALENDAR</p>
          <h1>매출 달력</h1>
          <p>날짜별 매출과 날씨를 한눈에 확인해 보세요.</p>
          <Link to="/sales/analysis">매출 분석 보기</Link>
        </header>

        {calendar.isPending && (
          <p className="sales-calendar-state" role="status">
            매출 달력을 불러오는 중입니다.
          </p>
        )}
        {calendar.isError && (
          <div className="sales-calendar-state" role="alert">
            <p>달력 데이터를 불러오지 못했습니다. 다시 시도해 주세요.</p>
            <button type="button" onClick={() => void calendar.refetch()}>
              다시 시도
            </button>
          </div>
        )}

        {data && (
          <>
            <section
              className="sales-calendar-card"
              aria-label="월간 매출 달력"
            >
              <div className="sales-calendar-head">
                <div className="sales-calendar-month">
                  <span className="sales-calendar-icon" aria-hidden="true">
                    ▦
                  </span>
                  <strong>
                    {year}년 {monthNumber}월
                  </strong>
                </div>
                <div className="sales-calendar-actions">
                  <button
                    type="button"
                    aria-label="이전 달"
                    disabled={month <= data.availableRange.firstMonth}
                    onClick={() => moveMonth(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="다음 달"
                    disabled={month >= data.availableRange.lastMonth}
                    onClick={() => moveMonth(1)}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div
                className="sales-calendar-grid"
                aria-label={`${year}년 ${monthNumber}월 매출`}
              >
                {weekdays.map((weekday, index) => (
                  <span className="sales-calendar-weekday" key={index}>
                    {weekday}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <span
                    className="sales-calendar-blank"
                    aria-hidden="true"
                    key={`before-${index}`}
                  />
                ))}
                {data.days.map((day) => {
                  const weather = day.weather?.condition
                  return (
                    <button
                      type="button"
                      className={`sales-calendar-day${day.date === data.selectedDate ? ' is-selected' : ''}${day.isToday ? ' is-today' : ''}${day.salesLevel === 'HIGH' ? ' is-high' : ''}${day.salesLevel === 'LOW' ? ' is-low' : ''}`}
                      key={day.date}
                      aria-pressed={day.date === data.selectedDate}
                      aria-label={`${dateLabel(day.date)}, 매출 ${day.salesAmount === null ? '데이터 없음' : shortAmount(day.salesAmount)}, 주문 ${day.orderCount === null ? '데이터 없음' : `${day.orderCount}건`}`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <span className="sales-calendar-date">
                        {Number(day.date.slice(-2))}
                      </span>
                      <span
                        className="sales-calendar-weather"
                        aria-label={
                          weather ? weatherLabels[weather] : '날씨 없음'
                        }
                      >
                        {weather ? weatherSymbols[weather] : '-'}
                      </span>
                      <span className="sales-calendar-amount">
                        {shortAmount(day.salesAmount)}
                      </span>
                      <span className="sales-calendar-orders">
                        {day.orderCount === null || day.orderCount === 0
                          ? '-'
                          : `${day.orderCount}건`}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="sales-calendar-legend">
                <span>
                  <i />
                  월평균보다 높은 매출
                </span>
                <span>
                  <i />
                  월평균보다 낮은 매출
                </span>
              </div>
            </section>

            {data.monthSummary.dataDayCount === 0 && (
              <p className="sales-calendar-empty">
                선택한 월에 매출 데이터가 없습니다.
              </p>
            )}

            {selected && (
              <section
                className="sales-calendar-detail"
                aria-live="polite"
                aria-label="선택한 날짜 상세"
              >
                <div className="sales-calendar-detail-head">
                  <div>
                    <p className="sales-calendar-eyebrow">DAILY REPORT</p>
                    <h2>선택한 날짜</h2>
                    <p>{dateLabel(selected.date)}</p>
                  </div>
                  <span className="sales-calendar-level">
                    {levelLabel(selected.insight.salesLevel)}
                  </span>
                </div>
                <div className="sales-calendar-metrics">
                  <div>
                    <span>총 매출</span>
                    <strong>{shortAmount(selected.salesAmount)}</strong>
                    <small>
                      {selected.insight.monthlyAverageSalesAmount === null
                        ? '월평균 데이터 없음'
                        : `월평균 ${shortAmount(selected.insight.monthlyAverageSalesAmount)}`}
                    </small>
                  </div>
                  <div>
                    <span>주문 건수</span>
                    <strong>
                      {selected.orderCount === null || selected.orderCount === 0
                        ? '-'
                        : `${selected.orderCount}건`}
                    </strong>
                    <small>매출 분석과 동일한 주문 기준</small>
                  </div>
                  <div>
                    <span>날씨 · 12시</span>
                    <strong>
                      {selectedCalendarDay?.weather
                        ? weatherLabels[selectedCalendarDay.weather.condition]
                        : '-'}
                    </strong>
                    <small>매장 주소 기준</small>
                  </div>
                </div>
                <p className="sales-calendar-policy">
                  매출은 기존 매출 분석과 동일하게 주문한 날 기준이며, 취소
                  금액도 해당 날짜에 반영됩니다.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

import { expect, test, vi } from 'vitest'
import { getSalesCalendar } from './salesCalendarApi'
const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../../shared/api/http', () => ({ http: { get } }))
test('기존 세션 HTTP 클라이언트로 월과 선택일을 보내고 data를 반환한다', async () => {
  const data = { month: '2026-10', selectedDate: '2026-10-20' }
  get.mockResolvedValue({ data: { status: 'COMPLETED', data } })
  const params = { month: '2026-10', selectedDate: '2026-10-20' }
  expect(await getSalesCalendar(params)).toEqual(data)
  expect(get).toHaveBeenCalledWith('/v3/sales/calendar', { params })
})

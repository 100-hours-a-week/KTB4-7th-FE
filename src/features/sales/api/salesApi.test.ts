import { beforeEach, expect, test, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../../shared/api/http', () => ({ http: { get, post } }))

import { getSalesUploadStatus, uploadSalesFile } from './salesApi'

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

test('공식 상태 조회 경로에 업로드 ID와 요청 취소 신호를 전달한다', async () => {
  const controller = new AbortController()
  const response = { status: 'PENDING', data: { uploadId: 12 } }
  get.mockResolvedValue({ data: response })

  await expect(getSalesUploadStatus(12, controller.signal)).resolves.toEqual(
    response,
  )
  expect(get).toHaveBeenCalledWith('/v1/sales/uploads/12/status', {
    signal: controller.signal,
    timeout: 15000,
  })
})

test('파일을 전송한 뒤 완료를 가정하지 않고 접수 응답을 반환한다', async () => {
  const response = {
    status: 'PENDING',
    data: { uploadId: 12, analysisRunId: 34, processingPhase: null },
  }
  const file = new File(['xlsx'], 'sales.xlsx')
  post.mockResolvedValue({ data: response })

  await expect(uploadSalesFile(file)).resolves.toEqual(response)
  const [url, form] = post.mock.calls[0]
  expect(url).toBe('/v1/sales/uploads')
  expect((form as FormData).get('file')).toBe(file)
})

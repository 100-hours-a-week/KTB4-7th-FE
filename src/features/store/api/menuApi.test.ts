import { beforeEach, expect, test, vi } from 'vitest'
import {
  confirmMenuBatch,
  getMenuBatch,
  getMenuList,
  updateMenuItems,
  uploadMenuImages,
} from './menuApi'

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))
vi.mock('../../../shared/api/http', () => ({ http: { get, post, patch } }))

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue({ data: { data: { items: [] } } })
  post.mockResolvedValue({
    data: { status: 'COMPLETED', data: { batchId: 9 } },
  })
  patch.mockResolvedValue({ data: { data: {} } })
})

test('메뉴판 업로드는 이미지 배열과 재시도 키를 보낸다', async () => {
  const first = new File(['first'], 'one.png', { type: 'image/png' })
  const second = new File(['second'], 'two.jpg', { type: 'image/jpeg' })
  await uploadMenuImages([first, second])
  const [url, body, options] = post.mock.calls[0]
  expect(url).toBe('/v2/menu-images')
  expect(body.getAll('images')).toEqual([first, second])
  expect(options.headers['Idempotency-Key']).toBeTruthy()
})

test('목록, 배치, 확정과 수정 요청을 BE 경로로 전송한다', async () => {
  await getMenuList()
  await getMenuBatch(9)
  await confirmMenuBatch(9, 3, [
    {
      itemId: 101,
      name: '라떼',
      price: 5000,
      category: 'COFFEE',
      order: 1,
      priceConfirmed: true,
    },
  ])
  await updateMenuItems(3, [
    { menuId: 21, name: '라떼', price: 5000, category: 'COFFEE', order: 1 },
  ])

  expect(get).toHaveBeenCalledWith('/v2/menu-items')
  expect(get).toHaveBeenCalledWith('/v2/menu-image-batches/9')
  expect(post).toHaveBeenCalledWith(
    '/v2/menu-image-batches/9/confirmations',
    expect.objectContaining({
      expectedMenuRevision: 3,
      items: [expect.objectContaining({ itemId: 101 })],
    }),
    expect.objectContaining({
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
    }),
  )
  expect(patch).toHaveBeenCalledWith(
    '/v2/menu-items',
    expect.objectContaining({
      expectedMenuRevision: 3,
      items: [expect.objectContaining({ menuId: 21 })],
    }),
    expect.anything(),
  )
})

import { http } from '../../../shared/api/http'

type ApiResponse<T> = { message: string; data: T }
type StatusResponse<T> = ApiResponse<T> & { status: MenuBatchStatus }

export type MenuCategory =
  'COFFEE' | 'TEA' | 'BEVERAGE' | 'CAKE' | 'BAKERY' | 'OTHER'

export type MenuBatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type SavedMenu = {
  id: number
  order: number
  name: string
  price: number
  category: MenuCategory
  updatedAt: string
}

export type MenuList = {
  menuRevision: number
  items: SavedMenu[]
  draftBatch: {
    batchId: number
    status: MenuBatchStatus
    uploadedAt: string
    failReason: string | null
    savedAt: string | null
  } | null
}

export type MenuBatch = {
  batchId: number
  baseMenuRevision: number
  uploadedAt: string
  savedAt: string | null
  failReason: string | null
  detectedItems: {
    itemId: number
    order: number
    name: string
    price: number | null
    category: MenuCategory | null
    priceReviewRequired: boolean
  }[]
  failedImages: { imageId: number; order: number; failReason: string }[]
}

export type EditableMenu = {
  name: string
  price: number
  category: MenuCategory
  order: number
  priceConfirmed?: boolean
}

export async function getMenuList() {
  return (await http.get<ApiResponse<MenuList>>('/v2/menu-items')).data.data
}

export async function uploadMenuImages(files: File[]) {
  const form = new FormData()
  files.forEach((file) => form.append('images', file))
  return (
    await http.post<
      StatusResponse<{
        batchId: number
        imageCount: number
        uploadedAt: string
        failReason: string | null
      }>
    >('/v2/menu-images', form, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      timeout: 150_000,
    })
  ).data
}

export async function getMenuBatch(batchId: number) {
  return (
    await http.get<StatusResponse<MenuBatch>>(
      `/v2/menu-image-batches/${batchId}`,
    )
  ).data
}

export async function confirmMenuBatch(
  batchId: number,
  expectedMenuRevision: number,
  items: (EditableMenu & { itemId: number })[],
) {
  return (
    await http.post<ApiResponse<unknown>>(
      `/v2/menu-image-batches/${batchId}/confirmations`,
      { expectedMenuRevision, items },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    )
  ).data
}

export async function updateMenuItems(
  expectedMenuRevision: number,
  items: (EditableMenu & { menuId: number })[],
) {
  return (
    await http.patch<ApiResponse<unknown>>(
      '/v2/menu-items',
      { expectedMenuRevision, items },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    )
  ).data
}

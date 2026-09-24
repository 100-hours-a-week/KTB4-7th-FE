import { http } from '../../../shared/api/http'
import type { BusinessHours } from '../../signup/api/signupApi'

type ApiResponse<T> = { message: string; data: T }

export type StoreAddress = {
  postalCode: string
  roadAddress: string
  addressDetail: string
}

export type StoreProfile = {
  id: number
  businessRegNumber: string
  storeName: string
  address: StoreAddress
  businessHours: BusinessHours[]
}

export type StoreProfileUpdateRequest = {
  storeName?: string
  address?: {
    postalCode?: string
    roadAddress?: string
    addressDetail?: string
  }
  businessHours?: BusinessHours[]
}

export async function getMyStore() {
  return (await http.get<ApiResponse<{ store: StoreProfile }>>('/v1/stores/me'))
    .data.data.store
}

export async function updateMyStore(request: StoreProfileUpdateRequest) {
  return (
    await http.patch<ApiResponse<{ store: StoreProfile }>>(
      '/v1/stores/me',
      request,
    )
  ).data.data.store
}

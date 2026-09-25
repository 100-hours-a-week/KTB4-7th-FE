import { http } from '../../../shared/api/http'

type ApiResponse<T> = { message: string; data: T }

export type UserProfile = {
  id: number
  email: string
  phone: string
  storeName: string
}

export type PasswordChangeRequest = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export async function getMyProfile() {
  return (await http.get<ApiResponse<{ user: UserProfile }>>('/v1/users/me'))
    .data.data.user
}

export async function changePassword(request: PasswordChangeRequest) {
  await http.patch<ApiResponse<null>>('/v1/users/me/password', request)
}

export async function withdraw() {
  await http.delete('/v1/users/me')
}

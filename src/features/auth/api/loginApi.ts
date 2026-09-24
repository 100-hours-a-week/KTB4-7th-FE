import { http } from '../../../shared/api/http'

type ApiResponse<T> = { message: string; data: T }

export type LoginRequest = {
  email: string
  password: string
}
export type LoginResponse = {
  user: { id: number; email: string }
}

export async function login(request: LoginRequest) {
  return (
    await http.post<ApiResponse<LoginResponse>>('/v1/auth/login', request)
  ).data.data
}

export async function logout() {
  await http.post('/v1/auth/logout')
}

export type PasswordResetEmailRequest = {
  email: string
}
export type PasswordResetRequest = {
  token: string
  newPassword: string
  confirmPassword: string
}

export async function requestPasswordResetEmail(
  request: PasswordResetEmailRequest,
) {
  await http.post<ApiResponse<null>>('/v1/auth/password-reset/email', request)
}

export async function resetPassword(request: PasswordResetRequest) {
  await http.patch<ApiResponse<null>>('/v1/auth/password-reset', request)
}

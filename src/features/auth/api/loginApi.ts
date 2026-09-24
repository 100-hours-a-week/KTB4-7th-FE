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

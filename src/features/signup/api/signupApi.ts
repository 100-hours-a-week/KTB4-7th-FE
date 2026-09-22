import { http } from '../../../shared/api/http'

type ApiResponse<T> = { message: string; data: T }

export type SignupAccountRequest = {
  email: string
  password: string
  passwordConfirm: string
  phone: string
  agreements: {
    termsOfService: boolean
    termsOfServiceVersion: string
    privacyPolicy: boolean
    privacyPolicyVersion: string
  }
}
export type SignupAccountResponse = { signupToken: string; expiresAt: string }
export type BusinessHours = {
  dayOfWeek: string
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
}
export type SignupBusinessRequest = {
  storeName: string
  businessRegNumber: string
  businessVerificationId: number
  postalCode: string
  address: string
  addressDetail: string
  businessHours: BusinessHours[]
}
export type SignupBusinessResponse = {
  user: { id: number; email: string }
  store: { id: number; storeName: string }
  next: string
}
export type AddressSearchItem = {
  postalCode: string
  roadAddress: string
  jibunAddress: string
}
export type AddressSearchResult = {
  addresses: AddressSearchItem[]
  nextCursor: string | null
}

export async function requestSignupAccount(request: SignupAccountRequest) {
  return (
    await http.post<ApiResponse<SignupAccountResponse>>(
      '/v1/auth/signup/account',
      request,
    )
  ).data.data
}

export async function verifyBusinessNumber(businessRegNumber: string) {
  return (
    await http.post<
      ApiResponse<{ businessVerificationId: number; expiresAt: string }>
    >('/v1/auth/business-verifications', { businessRegNumber })
  ).data.data
}

export async function searchAddress(query: string, cursor?: string) {
  return (
    await http.get<ApiResponse<AddressSearchResult>>('/v1/addresses/search', {
      params: { query, cursor, size: 10 },
    })
  ).data.data
}

export async function completeSignup(
  token: string,
  request: SignupBusinessRequest,
) {
  return (
    await http.post<ApiResponse<SignupBusinessResponse>>(
      '/v1/auth/signup/business',
      request,
      { headers: { 'Signup-Token': token } },
    )
  ).data.data
}

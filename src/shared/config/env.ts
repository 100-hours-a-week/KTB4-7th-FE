export type ApiEnvironment = {
  VITE_API_BASE_URL?: string
}

export function getApiBaseUrl(env: ApiEnvironment): string {
  return env.VITE_API_BASE_URL ?? ''
}

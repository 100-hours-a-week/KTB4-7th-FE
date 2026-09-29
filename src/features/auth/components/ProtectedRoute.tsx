import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getMyProfile } from '../api/userApi'

type AuthenticationState = 'checking' | 'authenticated' | 'unauthenticated'

export function ProtectedRoute() {
  const location = useLocation()
  const [authenticationState, setAuthenticationState] =
    useState<AuthenticationState>('checking')

  useEffect(() => {
    let cancelled = false

    getMyProfile()
      .then(() => {
        if (!cancelled) setAuthenticationState('authenticated')
      })
      .catch(() => {
        if (!cancelled) setAuthenticationState('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (authenticationState === 'checking') {
    return <p role="status">로그인 정보를 확인하고 있습니다.</p>
  }

  if (authenticationState === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    )
  }

  return <Outlet />
}

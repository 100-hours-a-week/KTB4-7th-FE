import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

const { getMyProfile } = vi.hoisted(() => ({ getMyProfile: vi.fn() }))

vi.mock('../api/userApi', () => ({ getMyProfile }))

function ProtectedPage() {
  return <p>보호된 화면</p>
}

function LoginPage() {
  const location = useLocation()
  const from = location.state?.from as { pathname?: string } | undefined
  return <p>로그인 화면: {from?.pathname}</p>
}

function renderAt(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/solution/chat" element={<ProtectedPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getMyProfile.mockReset()
})

test('미로그인 사용자가 보호 경로에 접근하면 로그인 화면으로 이동한다', async () => {
  getMyProfile.mockRejectedValue(new Error('unauthorized'))
  renderAt('/solution/chat')

  expect(
    await screen.findByText('로그인 화면: /solution/chat'),
  ).toBeInTheDocument()
})

test('로그인 사용자는 보호 경로의 화면을 볼 수 있다', async () => {
  getMyProfile.mockResolvedValue({ id: 1 })
  renderAt('/solution/chat')

  expect(await screen.findByText('보호된 화면')).toBeInTheDocument()
})

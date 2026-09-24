import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'

const { getMyProfile, withdraw, logout, navigate } = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  withdraw: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/auth/api/userApi', () => ({
  getMyProfile,
  withdraw,
}))

vi.mock('../features/auth/api/loginApi', () => ({
  logout,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getMyProfile.mockReset()
  withdraw.mockReset()
  logout.mockReset()
  navigate.mockReset()
})

test('프로필 정보를 불러와 매장명 기반으로 표시한다', async () => {
  getMyProfile.mockResolvedValue({
    id: 1,
    email: 'owner@memme.kr',
    phone: '01012345678',
    storeName: '맴매 베이커리',
  })

  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('heading', { name: '맴매 베이커리 사장님' }),
  ).toBeInTheDocument()
  expect(screen.getByText('맴매 베이커리님, 안녕하세요')).toBeInTheDocument()
  expect(screen.getByText('owner@memme.kr')).toBeInTheDocument()
  expect(screen.getByText('010-1234-5678')).toBeInTheDocument()
})

test('세션이 없으면 로그인 페이지로 이동한다', async () => {
  getMyProfile.mockRejectedValue({ response: { status: 401 } })

  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

test('회원탈퇴 확인 후 탈퇴를 요청하고 홈으로 이동한다', async () => {
  getMyProfile.mockResolvedValue({
    id: 1,
    email: 'owner@memme.kr',
    phone: '01012345678',
    storeName: '맴매 베이커리',
  })
  withdraw.mockResolvedValue(undefined)

  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )

  fireEvent.click(await screen.findByRole('button', { name: /회원탈퇴/ }))
  fireEvent.click(await screen.findByRole('button', { name: '탈퇴하기' }))

  await waitFor(() => expect(withdraw).toHaveBeenCalled())
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

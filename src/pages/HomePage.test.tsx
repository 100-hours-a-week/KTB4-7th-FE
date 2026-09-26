import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { HomePage } from './HomePage'

const { getMyProfile, getNotifications } = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  getNotifications: vi.fn(),
}))

vi.mock('../features/auth/api/userApi', () => ({
  getMyProfile,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

beforeEach(() => {
  getMyProfile.mockReset()
  getNotifications.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('로그인하지 않은 사용자에게는 회원가입/로그인 버튼을 보여준다', async () => {
  getMyProfile.mockRejectedValue({ response: { status: 401 } })

  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

  await waitFor(() => expect(getMyProfile).toHaveBeenCalled())
  expect(
    screen.getByRole('link', { name: '무료로 시작하기' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
})

test('로그인한 사용자에게는 회원가입/로그인 버튼을 숨긴다', async () => {
  getMyProfile.mockResolvedValue({
    id: 1,
    email: 'owner@memme.kr',
    phone: '01012345678',
    storeName: '맴매 베이커리',
  })

  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

  await waitFor(() =>
    expect(
      screen.queryByRole('link', { name: '무료로 시작하기' }),
    ).not.toBeInTheDocument(),
  )
  expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '솔루션 미리 보기' }),
  ).toBeInTheDocument()
})

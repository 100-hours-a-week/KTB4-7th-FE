import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { PasswordResetPage } from './PasswordResetPage'

const { requestPasswordResetEmail, resetPassword, navigate } = vi.hoisted(
  () => ({
    requestPasswordResetEmail: vi.fn(),
    resetPassword: vi.fn(),
    navigate: vi.fn(),
  }),
)

vi.mock('../features/auth/api/loginApi', () => ({
  requestPasswordResetEmail,
  resetPassword,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  requestPasswordResetEmail.mockReset()
  resetPassword.mockReset()
  navigate.mockReset()
})

test('토큰이 없으면 이메일로 재설정 메일을 요청한다', async () => {
  requestPasswordResetEmail.mockResolvedValue(undefined)
  render(
    <MemoryRouter initialEntries={['/password-reset']}>
      <PasswordResetPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.click(screen.getByRole('button', { name: '재설정 메일 보내기' }))

  await waitFor(() =>
    expect(requestPasswordResetEmail).toHaveBeenCalledWith({
      email: 'owner@memme.kr',
    }),
  )
  expect(
    await screen.findByText(
      '입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.',
    ),
  ).toBeInTheDocument()
})

test('토큰이 있으면 새 비밀번호 설정 폼을 보여주고 성공 시 로그인으로 이동한다', async () => {
  resetPassword.mockResolvedValue(undefined)
  render(
    <MemoryRouter initialEntries={['/password-reset?token=abc123']}>
      <PasswordResetPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  await waitFor(() =>
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'abc123',
      newPassword: 'Memme!2026',
      confirmPassword: 'Memme!2026',
    }),
  )
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/login', {
      state: { passwordResetComplete: true },
    }),
  )
})

test('새 비밀번호 확인이 일치하지 않으면 에러를 보여준다', async () => {
  render(
    <MemoryRouter initialEntries={['/password-reset?token=abc123']}>
      <PasswordResetPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'Memme!2027' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(
    await screen.findByText('비밀번호와 일치하지 않습니다.'),
  ).toBeInTheDocument()
  expect(resetPassword).not.toHaveBeenCalled()
})

test('만료된 토큰이면 서버 에러 메시지와 재요청 링크를 보여준다', async () => {
  resetPassword.mockRejectedValue({
    response: {
      data: { message: '재설정 링크가 만료되었거나 올바르지 않습니다.' },
    },
  })
  render(
    <MemoryRouter initialEntries={['/password-reset?token=expired']}>
      <PasswordResetPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(
    await screen.findByText('재설정 링크가 만료되었거나 올바르지 않습니다.'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '재설정 메일 다시 받기' }),
  ).toHaveAttribute('href', '/password-reset')
  expect(navigate).not.toHaveBeenCalled()
})

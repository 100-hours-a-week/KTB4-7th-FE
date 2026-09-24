import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const { login, navigate } = vi.hoisted(() => ({
  login: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/auth/api/loginApi', () => ({
  login,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  login.mockReset()
  navigate.mockReset()
})

function renderLoginPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

test('이메일/비밀번호로 로그인에 성공하면 솔루션 페이지로 이동한다', async () => {
  login.mockResolvedValue({ user: { id: 1, email: 'owner@memme.kr' } })
  renderLoginPage()

  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))

  await waitFor(() =>
    expect(login).toHaveBeenCalledWith({
      email: 'owner@memme.kr',
      password: 'Memme!2026',
    }),
  )
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/solution'))
})

test('로그인에 실패하면 서버 에러 메시지를 보여주고 이동하지 않는다', async () => {
  login.mockRejectedValue({
    response: {
      data: { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
    },
  })
  renderLoginPage()

  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: 'wrong-password' },
  })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))

  expect(
    await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
  ).toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})

test('이메일과 비밀번호를 입력하지 않으면 필수 입력 오류를 보여준다', async () => {
  renderLoginPage()

  fireEvent.click(screen.getByRole('button', { name: '로그인' }))

  expect(await screen.findByText('이메일을 입력해주세요.')).toBeInTheDocument()
  expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
  expect(login).not.toHaveBeenCalled()
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { PasswordChangePage } from './PasswordChangePage'

const { changePassword, navigate } = vi.hoisted(() => ({
  changePassword: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/auth/api/userApi', () => ({
  changePassword,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  changePassword.mockReset()
  navigate.mockReset()
})

test('비밀번호 변경에 성공하면 마이페이지로 이동한다', async () => {
  changePassword.mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <PasswordChangePage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
    target: { value: 'OldPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'NewPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'NewPass1!' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  await waitFor(() =>
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass1!',
      confirmPassword: 'NewPass1!',
    }),
  )
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/profile', {
      state: { passwordChanged: true },
    }),
  )
})

test('현재 비밀번호가 일치하지 않으면 서버 에러 메시지를 보여준다', async () => {
  changePassword.mockRejectedValue({
    response: { data: { message: '현재 비밀번호가 일치하지 않습니다.' } },
  })
  render(
    <MemoryRouter>
      <PasswordChangePage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
    target: { value: 'WrongPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'NewPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'NewPass1!' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(
    await screen.findByText('현재 비밀번호가 일치하지 않습니다.'),
  ).toBeInTheDocument()
  expect(navigate).not.toHaveBeenCalled()
})

test('새 비밀번호 확인이 일치하지 않으면 클라이언트에서 막는다', async () => {
  render(
    <MemoryRouter>
      <PasswordChangePage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
    target: { value: 'OldPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호'), {
    target: { value: 'NewPass1!' },
  })
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 'Different1!' },
  })
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(
    await screen.findByText('비밀번호와 일치하지 않습니다.'),
  ).toBeInTheDocument()
  expect(changePassword).not.toHaveBeenCalled()
})

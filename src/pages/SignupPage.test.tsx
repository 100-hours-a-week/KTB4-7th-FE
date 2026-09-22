import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { SignupPage } from './SignupPage'

const { requestSignupAccount } = vi.hoisted(() => ({
  requestSignupAccount: vi.fn(),
}))

vi.mock('../features/signup/api/signupApi', () => ({
  requestSignupAccount,
  verifyBusinessNumber: vi.fn(),
  completeSignup: vi.fn(),
}))

beforeEach(() => {
  requestSignupAccount.mockReset()
})

test('계정 가입 API의 이메일 오류를 이메일 입력칸 아래에 표시한다', async () => {
  requestSignupAccount.mockRejectedValue({
    response: {
      data: {
        message: '입력값을 확인해 주세요.',
        data: {
          fieldErrors: [
            { field: 'email', message: '이미 사용 중인 이메일입니다.' },
          ],
        },
      },
    },
  })

  render(<SignupPage />)
  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('휴대폰 번호'), {
    target: { value: '01012345678' },
  })
  fireEvent.click(screen.getByLabelText(/이용약관 동의/))
  fireEvent.click(screen.getByLabelText(/개인정보.*동의/))
  fireEvent.click(screen.getByRole('button', { name: '다음' }))

  expect(
    await screen.findByText('이미 사용 중인 이메일입니다.'),
  ).toBeInTheDocument()
  expect(
    screen.queryByText('가입 정보를 확인해 주세요.'),
  ).not.toBeInTheDocument()

  await waitFor(() => expect(requestSignupAccount).toHaveBeenCalledOnce())
})

test('매장 정보 단계에서 이전을 누르면 입력한 계정 정보를 유지한 채 돌아간다', async () => {
  requestSignupAccount.mockResolvedValue({
    signupToken: 'signup-token',
    expiresAt: '2026-09-30T00:00:00Z',
  })

  render(<SignupPage />)
  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('휴대폰 번호'), {
    target: { value: '01012345678' },
  })
  fireEvent.click(screen.getByLabelText(/이용약관 동의/))
  fireEvent.click(screen.getByLabelText(/개인정보.*동의/))
  fireEvent.click(screen.getByRole('button', { name: '다음' }))

  expect(
    await screen.findByRole('button', { name: '이전' }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '이전' }))

  expect(screen.getByLabelText('이메일')).toHaveValue('owner@memme.kr')
})

test('매장 정보 입력칸에는 계정 자동완성이 적용되지 않는다', async () => {
  requestSignupAccount.mockResolvedValue({
    signupToken: 'signup-token',
    expiresAt: '2026-09-30T00:00:00Z',
  })

  render(<SignupPage />)
  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'owner@memme.kr' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
    target: { value: 'Memme!2026' },
  })
  fireEvent.change(screen.getByLabelText('휴대폰 번호'), {
    target: { value: '01012345678' },
  })
  fireEvent.click(screen.getByLabelText(/이용약관 동의/))
  fireEvent.click(screen.getByLabelText(/개인정보.*동의/))
  fireEvent.click(screen.getByRole('button', { name: '다음' }))

  expect(await screen.findByLabelText('매장명')).toHaveAttribute(
    'autocomplete',
    'organization',
  )
  expect(screen.getByLabelText('사업자등록번호')).toHaveAttribute(
    'autocomplete',
    'off',
  )
  expect(screen.getByLabelText('우편번호')).toHaveAttribute(
    'autocomplete',
    'postal-code',
  )
})

test('이용약관 상세 버튼을 누르면 하드코딩된 약관 모달이 열린다', () => {
  render(<SignupPage />)

  fireEvent.click(screen.getByRole('button', { name: '이용약관 자세히 보기' }))

  expect(screen.getByRole('dialog', { name: '이용약관' })).toBeInTheDocument()
  expect(screen.getByText('맴매 서비스 이용약관')).toBeInTheDocument()
})

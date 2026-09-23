import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { SignupPage } from './SignupPage'

const {
  requestSignupAccount,
  verifyBusinessNumber,
  completeSignup,
  searchAddress,
} = vi.hoisted(() => ({
  requestSignupAccount: vi.fn(),
  verifyBusinessNumber: vi.fn(),
  completeSignup: vi.fn(),
  searchAddress: vi.fn(),
}))

vi.mock('../features/signup/api/signupApi', () => ({
  requestSignupAccount,
  verifyBusinessNumber,
  completeSignup,
  searchAddress,
}))

beforeEach(() => {
  requestSignupAccount.mockReset()
  verifyBusinessNumber.mockReset()
  completeSignup.mockReset()
  searchAddress.mockReset()
})

async function moveToBusinessStep() {
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

  await screen.findByRole('button', { name: '이전' })
}

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

  expect(await screen.findByLabelText(/매장명/)).toHaveAttribute(
    'autocomplete',
    'organization',
  )
  expect(screen.getByLabelText(/사업자등록번호/)).toHaveAttribute(
    'autocomplete',
    'off',
  )
  expect(screen.getByLabelText('상세 주소')).toHaveAttribute(
    'autocomplete',
    'address-line2',
  )
})

test('사업자 인증 API의 400 fieldErrors를 사업자등록번호 입력칸 아래에 표시한다', async () => {
  await moveToBusinessStep()
  verifyBusinessNumber.mockRejectedValue({
    response: {
      data: {
        message: '입력값을 확인해 주세요.',
        data: {
          fieldErrors: [
            {
              field: 'businessRegNumber',
              message: '사업자등록번호는 숫자 10자리여야 합니다.',
            },
          ],
        },
      },
    },
  })

  fireEvent.change(screen.getByLabelText(/사업자등록번호/), {
    target: { value: '1234567890' },
  })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))

  expect(
    await screen.findByText('사업자등록번호는 숫자 10자리여야 합니다.'),
  ).toBeInTheDocument()
})

test('주소 검색 API의 400 fieldErrors를 주소 검색 모달에 표시한다', async () => {
  await moveToBusinessStep()
  searchAddress.mockRejectedValue({
    response: {
      data: {
        message: '입력값을 확인해 주세요.',
        data: {
          fieldErrors: [
            { field: 'query', message: '주소 검색어를 입력해 주세요.' },
          ],
        },
      },
    },
  })

  fireEvent.click(screen.getByRole('button', { name: '주소 검색' }))
  fireEvent.change(
    screen.getByPlaceholderText('도로명, 건물명 또는 지번으로 검색해주세요'),
    { target: { value: '테헤란로' } },
  )

  expect(
    await screen.findByText('주소 검색어를 입력해 주세요.'),
  ).toBeInTheDocument()
})

test('가입 완료 API의 영업시간 오류를 영업시간 영역에 표시한다', async () => {
  await moveToBusinessStep()
  verifyBusinessNumber.mockResolvedValue({ businessVerificationId: 1 })
  searchAddress.mockResolvedValue({
    addresses: [
      {
        postalCode: '06134',
        roadAddress: '서울특별시 강남구 테헤란로 231',
        jibunAddress: '',
      },
    ],
    nextCursor: null,
  })
  completeSignup.mockRejectedValue({
    response: {
      data: {
        message: '입력값을 확인해 주세요.',
        data: {
          fieldErrors: [
            { field: 'businessHours', message: '영업시간을 확인해 주세요.' },
          ],
        },
      },
    },
  })

  fireEvent.change(screen.getByLabelText('매장명'), {
    target: { value: '맴매카페' },
  })
  fireEvent.change(screen.getByLabelText(/사업자등록번호/), {
    target: { value: '1234567890' },
  })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))
  await screen.findByText('사업자 인증이 완료되었어요.')

  fireEvent.click(screen.getByRole('button', { name: '주소 검색' }))
  fireEvent.change(
    screen.getByPlaceholderText('도로명, 건물명 또는 지번으로 검색해주세요'),
    { target: { value: '테헤란로' } },
  )
  fireEvent.click(
    await screen.findByRole('button', {
      name: /서울특별시 강남구 테헤란로 231/,
    }),
  )

  fireEvent.click(screen.getByRole('button', { name: '회원가입 완료' }))

  expect(
    await screen.findByText('영업시간을 확인해 주세요.'),
  ).toBeInTheDocument()
})

test('주소 검색 모달에서 검색 결과를 선택하면 매장 주소가 채워진다', async () => {
  requestSignupAccount.mockResolvedValue({
    signupToken: 'signup-token',
    expiresAt: '2026-09-30T00:00:00Z',
  })
  searchAddress.mockResolvedValue({
    addresses: [
      {
        postalCode: '06134',
        roadAddress: '서울특별시 강남구 테헤란로 231',
        jibunAddress: '서울특별시 강남구 역삼동 723',
      },
    ],
    nextCursor: null,
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

  fireEvent.click(await screen.findByRole('button', { name: '주소 검색' }))
  fireEvent.change(
    screen.getByPlaceholderText('도로명, 건물명 또는 지번으로 검색해주세요'),
    { target: { value: '테헤란로' } },
  )

  await waitFor(() => expect(searchAddress).toHaveBeenCalledWith('테헤란로'))
  fireEvent.click(
    await screen.findByRole('button', {
      name: /서울특별시 강남구 테헤란로 231/,
    }),
  )

  expect(
    await screen.findByDisplayValue('[06134] 서울특별시 강남구 테헤란로 231'),
  ).toBeInTheDocument()
})

test('이용약관 상세 버튼을 누르면 하드코딩된 약관 모달이 열린다', () => {
  render(<SignupPage />)

  fireEvent.click(screen.getByRole('button', { name: '이용약관 자세히 보기' }))

  expect(screen.getByRole('dialog', { name: '이용약관' })).toBeInTheDocument()
  expect(screen.getByText('맴매 서비스 이용약관')).toBeInTheDocument()
})

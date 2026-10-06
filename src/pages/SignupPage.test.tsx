import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

test('약관 오류는 처음에는 숨기고 동의를 해제하면 표시한다', async () => {
  render(<SignupPage />)

  const terms = screen.getByLabelText(/이용약관 동의/)
  const privacy = screen.getByLabelText(/개인정보.*동의/)
  const clickAgreement = async (input: HTMLElement) => {
    await act(async () => fireEvent.click(input))
  }
  expect(screen.queryByText('이용약관에 동의해주세요.')).not.toBeInTheDocument()
  expect(
    screen.queryByText('개인정보 수집·이용에 동의해주세요.'),
  ).not.toBeInTheDocument()

  await clickAgreement(terms)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await clickAgreement(terms)
  expect(screen.getByRole('alert')).toHaveTextContent(
    '이용약관에 동의해주세요.',
  )

  await clickAgreement(terms)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await clickAgreement(privacy)
  await clickAgreement(privacy)
  expect(screen.getByRole('alert')).toHaveTextContent(
    '개인정보 수집·이용에 동의해주세요.',
  )
})

test('회원가입 화면은 로그인과 같은 에디토리얼 배경을 사용한다', () => {
  const { container } = render(<SignupPage />)

  expect(screen.getByRole('main')).toHaveClass('signup-page--editorial')
  expect(screen.getByText('OWNER PROFILE')).toBeInTheDocument()
  expect(container.querySelector('.signup-bean-backdrop img')).toHaveAttribute(
    'src',
    '/assets/auth-coffee-moka-upright.png',
  )
})

async function moveToBusinessStep() {
  requestSignupAccount.mockResolvedValue({
    signupToken: 'signup-token',
    expiresAt: '2026-09-30T00:00:00Z',
  })

  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<div>로그인 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
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

test('상세 주소는 255자로 입력을 제한하고 초과 값은 검증한다', async () => {
  await moveToBusinessStep()

  const addressDetail = screen.getByLabelText('상세 주소') as HTMLInputElement
  expect(addressDetail.maxLength).toBe(255)

  fireEvent.change(addressDetail, { target: { value: '가'.repeat(256) } })
  expect(
    await screen.findByText('상세 주소는 255자 이하여야 합니다.'),
  ).toBeInTheDocument()

  fireEvent.change(addressDetail, { target: { value: '가'.repeat(255) } })
  await waitFor(() =>
    expect(
      screen.queryByText('상세 주소는 255자 이하여야 합니다.'),
    ).not.toBeInTheDocument(),
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

test('사업자번호와 인증 없이 매장 정보를 입력하면 회원가입을 완료한다', async () => {
  await moveToBusinessStep()
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
  completeSignup.mockResolvedValue({
    user: { id: 1, email: 'owner@memme.kr' },
    store: { id: 2, storeName: '맴매카페' },
    next: 'LOGIN',
  })

  fireEvent.change(screen.getByLabelText('매장명'), {
    target: { value: '맴매카페' },
  })
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

  const submitButton = screen.getByRole('button', { name: '회원가입 완료' })
  expect(submitButton).toBeEnabled()
  fireEvent.click(submitButton)

  await waitFor(() => expect(completeSignup).toHaveBeenCalledOnce())
  const [, request] = completeSignup.mock.calls[0]
  expect(request).not.toHaveProperty('businessRegNumber')
  expect(request).not.toHaveProperty('businessVerificationId')

  const loginLink = await screen.findByRole('link', { name: '로그인으로 이동' })
  expect(loginLink).toHaveAttribute('href', '/login')
  fireEvent.click(loginLink)
  expect(screen.getByText('로그인 화면')).toBeInTheDocument()
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

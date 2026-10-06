import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { StoreProfilePage } from './StoreProfilePage'

const {
  getMyStore,
  updateMyStore,
  searchAddress,
  verifyBusinessNumber,
  getNotifications,
} = vi.hoisted(() => ({
    getMyStore: vi.fn(),
    updateMyStore: vi.fn(),
    searchAddress: vi.fn(),
    verifyBusinessNumber: vi.fn(),
    getNotifications: vi.fn(),
  }))

vi.mock('../features/store/api/storeApi', () => ({
  getMyStore,
  updateMyStore,
}))

vi.mock('../features/signup/api/signupApi', () => ({
  searchAddress,
  verifyBusinessNumber,
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

const storeFixture = {
  id: 1,
  businessRegNumber: '123-45-67890',
  storeName: '맴매 베이커리',
  address: {
    postalCode: '12345',
    roadAddress: '서울시 강남구 테헤란로 1',
    addressDetail: '2층',
  },
  businessHours: [
    {
      dayOfWeek: 'MONDAY',
      isClosed: false,
      openTime: '09:00:00',
      closeTime: '18:00:00',
    },
    {
      dayOfWeek: 'TUESDAY',
      isClosed: false,
      openTime: '09:00:00',
      closeTime: '18:00:00',
    },
    {
      dayOfWeek: 'WEDNESDAY',
      isClosed: false,
      openTime: '09:00:00',
      closeTime: '18:00:00',
    },
    {
      dayOfWeek: 'THURSDAY',
      isClosed: false,
      openTime: '09:00:00',
      closeTime: '18:00:00',
    },
    {
      dayOfWeek: 'FRIDAY',
      isClosed: false,
      openTime: '09:00:00',
      closeTime: '18:00:00',
    },
    { dayOfWeek: 'SATURDAY', isClosed: true, openTime: null, closeTime: null },
    { dayOfWeek: 'SUNDAY', isClosed: true, openTime: null, closeTime: null },
  ],
}

beforeEach(() => {
  getMyStore.mockReset()
  updateMyStore.mockReset()
  searchAddress.mockReset()
  verifyBusinessNumber.mockReset()
  getNotifications.mockReset()
  getNotifications.mockResolvedValue({
    message: '조회 성공',
    nextCursor: null,
    data: { items: [] },
  })
})

test('매장 정보를 불러와 폼에 채운다', async () => {
  getMyStore.mockResolvedValue(storeFixture)

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  expect(await screen.findByLabelText('매장명')).toHaveValue('맴매 베이커리')
  expect(screen.getByLabelText('사업자등록번호')).toHaveValue('1234567890')
  expect(
    screen.getByDisplayValue('[12345] 서울시 강남구 테헤란로 1'),
  ).toBeInTheDocument()
})

test('저장하면 수정된 매장 정보를 서버로 전송한다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  updateMyStore.mockResolvedValue(storeFixture)

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  const storeNameInput = await screen.findByLabelText('매장명')
  fireEvent.change(storeNameInput, { target: { value: '맴매 카페' } })
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() =>
    expect(updateMyStore).toHaveBeenCalledWith(
      expect.objectContaining({
        storeName: '맴매 카페',
        address: {
          postalCode: '12345',
          roadAddress: '서울시 강남구 테헤란로 1',
          addressDetail: '2층',
        },
      }),
    ),
  )
  const call = updateMyStore.mock.calls[0][0]
  expect(call).not.toHaveProperty('businessRegNumber')
  expect(call).not.toHaveProperty('businessVerificationId')
  expect(call.businessHours).toHaveLength(7)
  expect(call.businessHours[0]).toEqual({
    dayOfWeek: 'MONDAY',
    isClosed: false,
    openTime: '09:00',
    closeTime: '18:00',
  })
  expect(call.businessHours[5]).toEqual({
    dayOfWeek: 'SATURDAY',
    isClosed: true,
    openTime: null,
    closeTime: null,
  })
  expect(
    await screen.findByText('매장 정보가 수정되었습니다.'),
  ).toBeInTheDocument()
})

test('요일별 24시간 영업을 선택하면 자정부터 자정까지 전송한다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  updateMyStore.mockResolvedValue(storeFixture)

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  await screen.findByLabelText('매장명')
  fireEvent.click(screen.getAllByRole('button', { name: '24시간' })[0])
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() => expect(updateMyStore).toHaveBeenCalledOnce())
  expect(updateMyStore.mock.calls[0][0].businessHours[0]).toEqual({
    dayOfWeek: 'MONDAY',
    isClosed: false,
    openTime: '00:00',
    closeTime: '00:00',
  })
})

test('사업자등록번호 변경 시 인증한 번호와 인증 ID를 함께 전송한다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  verifyBusinessNumber.mockResolvedValue({
    businessVerificationId: 42,
    expiresAt: '2026-10-06T20:00:00+09:00',
  })
  updateMyStore.mockResolvedValue(storeFixture)

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  const businessRegNumberInput = await screen.findByLabelText('사업자등록번호')
  fireEvent.change(businessRegNumberInput, { target: { value: '9876543210' } })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))

  await waitFor(() =>
    expect(verifyBusinessNumber).toHaveBeenCalledWith('9876543210'),
  )
  expect(await screen.findByText('사업자 인증이 완료되었어요.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() =>
    expect(updateMyStore).toHaveBeenCalledWith(
      expect.objectContaining({
        businessRegNumber: '9876543210',
        businessVerificationId: 42,
      }),
    ),
  )
})

test('사업자등록번호가 없는 매장에 새 번호를 인증해 등록한다', async () => {
  getMyStore.mockResolvedValue({ ...storeFixture, businessRegNumber: null })
  verifyBusinessNumber.mockResolvedValue({
    businessVerificationId: 43,
    expiresAt: '2026-10-06T20:00:00+09:00',
  })
  updateMyStore.mockResolvedValue(storeFixture)

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  const businessRegNumberInput = await screen.findByLabelText('사업자등록번호')
  expect(businessRegNumberInput).toHaveValue('')
  fireEvent.change(businessRegNumberInput, { target: { value: '9876543210' } })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))
  expect(await screen.findByText('사업자 인증이 완료되었어요.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() =>
    expect(updateMyStore).toHaveBeenCalledWith(
      expect.objectContaining({
        businessRegNumber: '9876543210',
        businessVerificationId: 43,
      }),
    ),
  )
})

test('사업자 인증에 실패하면 오류를 표시하고 변경 번호 저장을 막는다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  verifyBusinessNumber.mockRejectedValue({
    response: {
      data: {
        data: {
          fieldErrors: [
            { field: 'businessRegNumber', message: '사업자등록번호를 확인해주세요.' },
          ],
        },
      },
    },
  })

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  fireEvent.change(await screen.findByLabelText('사업자등록번호'), {
    target: { value: '9876543210' },
  })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))

  expect(
    await screen.findByText('사업자등록번호를 확인해주세요.'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  expect(
    await screen.findByText('변경한 사업자등록번호 인증을 완료해주세요.'),
  ).toBeInTheDocument()
  expect(updateMyStore).not.toHaveBeenCalled()
})

test('사업자 인증 API의 일반 오류 메시지를 입력칸에 표시한다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  verifyBusinessNumber.mockRejectedValue({
    response: {
      data: { message: '인증 요청을 처리할 수 없습니다.' },
    },
  })

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  fireEvent.change(await screen.findByLabelText('사업자등록번호'), {
    target: { value: '9876543210' },
  })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))

  expect(
    await screen.findByText('인증 요청을 처리할 수 없습니다.'),
  ).toBeInTheDocument()
})

test('인증 후 사업자등록번호를 다시 변경하면 재인증 전까지 저장하지 않는다', async () => {
  getMyStore.mockResolvedValue(storeFixture)
  verifyBusinessNumber.mockResolvedValue({
    businessVerificationId: 42,
    expiresAt: '2026-10-06T20:00:00+09:00',
  })

  render(
    <MemoryRouter>
      <StoreProfilePage />
    </MemoryRouter>,
  )

  const businessRegNumberInput = await screen.findByLabelText('사업자등록번호')
  fireEvent.change(businessRegNumberInput, { target: { value: '9876543210' } })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))
  expect(await screen.findByText('사업자 인증이 완료되었어요.')).toBeInTheDocument()

  fireEvent.change(businessRegNumberInput, { target: { value: '9876543211' } })
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  expect(
    await screen.findByText('변경한 사업자등록번호 인증을 완료해주세요.'),
  ).toBeInTheDocument()
  expect(updateMyStore).not.toHaveBeenCalled()
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { StoreProfilePage } from './StoreProfilePage'

const { getMyStore, updateMyStore, searchAddress, getNotifications } =
  vi.hoisted(() => ({
    getMyStore: vi.fn(),
    updateMyStore: vi.fn(),
    searchAddress: vi.fn(),
    getNotifications: vi.fn(),
  }))

vi.mock('../features/store/api/storeApi', () => ({
  getMyStore,
  updateMyStore,
}))

vi.mock('../features/signup/api/signupApi', () => ({
  searchAddress,
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
  expect(screen.getByDisplayValue('123-45-67890')).toBeInTheDocument()
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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { MenuPage } from './MenuPage'

const {
  getMenuList,
  getMenuBatch,
  uploadMenuImages,
  confirmMenuBatch,
  updateMenuItems,
  getNotifications,
} = vi.hoisted(() => ({
  getMenuList: vi.fn(),
  getMenuBatch: vi.fn(),
  uploadMenuImages: vi.fn(),
  confirmMenuBatch: vi.fn(),
  updateMenuItems: vi.fn(),
  getNotifications: vi.fn(),
}))

vi.mock('../features/store/api/menuApi', () => ({
  getMenuList,
  getMenuBatch,
  uploadMenuImages,
  confirmMenuBatch,
  updateMenuItems,
}))
vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

const saved = {
  menuRevision: 3,
  items: [
    {
      id: 21,
      order: 1,
      name: '아메리카노',
      price: 4500,
      category: 'COFFEE',
      updatedAt: '2026-10-19T10:00:00+09:00',
    },
  ],
  draftBatch: null,
}

const draft = {
  batchId: 9,
  baseMenuRevision: 3,
  uploadedAt: '2026-10-19T11:00:00+09:00',
  savedAt: null,
  failReason: null,
  failedImages: [],
  detectedItems: [
    {
      itemId: 101,
      order: 1,
      name: '라떼',
      price: 5000,
      category: 'COFFEE',
      priceReviewRequired: true,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  HTMLElement.prototype.scrollIntoView = vi.fn()
  getNotifications.mockResolvedValue({ data: { items: [] } })
  getMenuList.mockResolvedValue(saved)
  confirmMenuBatch.mockResolvedValue({ message: '저장 완료' })
  updateMenuItems.mockResolvedValue({ message: '저장 완료' })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MenuPage />
    </MemoryRouter>,
  )
}

async function openReuploadPanel() {
  await screen.findByRole('heading', { name: '저장된 메뉴' })
  fireEvent.click(screen.getByRole('button', { name: '사진 다시 올리기' }))
  await screen.findByRole('heading', { name: '메뉴판 사진 올리기' })
}

test('저장된 메뉴는 조회 전용으로 보이고 수정 후 개정 번호와 전체 메뉴를 전송한다', async () => {
  renderPage()
  await screen.findByRole('heading', { name: '저장된 메뉴' })
  expect(screen.queryByDisplayValue('아메리카노')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '수정하기' }))
  const name = await screen.findByDisplayValue('아메리카노')
  const saveButton = screen.getByRole('button', {
    name: '변경사항 저장하기',
  })
  expect(saveButton).toBeDisabled()

  fireEvent.change(name, { target: { value: '아이스 아메리카노' } })
  expect(saveButton).toBeEnabled()
  fireEvent.click(saveButton)

  await waitFor(() =>
    expect(updateMenuItems).toHaveBeenCalledWith(3, [
      expect.objectContaining({
        menuId: 21,
        name: '아이스 아메리카노',
        price: 4500,
        order: 1,
      }),
    ]),
  )
})

test('기존 메뉴 값을 원래대로 되돌리면 저장 버튼을 비활성화한다', async () => {
  renderPage()
  await screen.findByRole('heading', { name: '저장된 메뉴' })
  fireEvent.click(screen.getByRole('button', { name: '수정하기' }))
  const name = await screen.findByDisplayValue('아메리카노')
  const saveButton = screen.getByRole('button', {
    name: '변경사항 저장하기',
  })

  fireEvent.change(name, { target: { value: '아이스 아메리카노' } })
  expect(saveButton).toBeEnabled()

  fireEvent.change(name, { target: { value: '아메리카노' } })
  expect(saveButton).toBeDisabled()
})

test('저장된 메뉴 화면에서 사진 다시 올리기를 누르면 이미지 선택 영역을 연다', async () => {
  renderPage()
  await screen.findByRole('heading', { name: '저장된 메뉴' })

  fireEvent.click(screen.getByRole('button', { name: '사진 다시 올리기' }))

  expect(
    await screen.findByRole('heading', { name: '메뉴판 사진 올리기' }),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('메뉴판 이미지 선택')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
})

test('분석 후 인식된 메뉴로 이동하고 수정 없이 저장한다', async () => {
  uploadMenuImages.mockResolvedValue({
    status: 'COMPLETED',
    data: { batchId: 9 },
  })
  getMenuBatch.mockResolvedValue({ status: 'COMPLETED', data: draft })
  getMenuList
    .mockResolvedValueOnce(saved)
    .mockResolvedValueOnce({ ...saved, menuRevision: 4 })
  renderPage()
  await openReuploadPanel()

  const image = new File(['image'], 'menu.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('메뉴판 이미지 선택'), {
    target: { files: [image] },
  })
  fireEvent.click(screen.getByRole('button', { name: '메뉴판 분석하기' }))
  expect(await screen.findByDisplayValue('라떼')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '현재 저장된 메뉴' }),
  ).toBeInTheDocument()
  expect(screen.getByText('아메리카노')).toBeInTheDocument()
  await waitFor(() =>
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() =>
    expect(confirmMenuBatch).toHaveBeenCalledWith(9, 3, [
      expect.objectContaining({
        itemId: 101,
        price: 5000,
        priceConfirmed: true,
      }),
    ]),
  )
})

test('인식된 메뉴를 수정한 뒤 저장한다', async () => {
  uploadMenuImages.mockResolvedValue({
    status: 'COMPLETED',
    data: { batchId: 9 },
  })
  getMenuBatch.mockResolvedValue({ status: 'COMPLETED', data: draft })
  renderPage()
  await openReuploadPanel()

  fireEvent.change(screen.getByLabelText('메뉴판 이미지 선택'), {
    target: {
      files: [new File(['image'], 'menu.png', { type: 'image/png' })],
    },
  })
  fireEvent.click(screen.getByRole('button', { name: '메뉴판 분석하기' }))
  const detectedName = await screen.findByDisplayValue('라떼')
  fireEvent.change(detectedName, { target: { value: '바닐라 라떼' } })
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), {
    target: { value: 'BEVERAGE' },
  })
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

  await waitFor(() =>
    expect(confirmMenuBatch).toHaveBeenCalledWith(9, 3, [
      expect.objectContaining({
        itemId: 101,
        name: '바닐라 라떼',
        category: 'BEVERAGE',
        price: 5000,
        priceConfirmed: true,
      }),
    ]),
  )
})

test('메뉴 조회 중 인증이 만료되면 로그인으로 이동한다', async () => {
  getMenuList.mockRejectedValue({ response: { status: 401 } })
  render(
    <MemoryRouter initialEntries={['/profile/menu']}>
      <Routes>
        <Route path="/profile/menu" element={<MenuPage />} />
        <Route path="/login" element={<h1>로그인 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('heading', { name: '로그인 화면' }),
  ).toBeInTheDocument()
})

test('실패한 분석과 빈 메뉴 목록을 안내한다', async () => {
  getMenuList.mockResolvedValue({
    ...saved,
    items: [],
    draftBatch: {
      batchId: 9,
      status: 'FAILED',
      uploadedAt: '',
      failReason: 'LOW_IMAGE_QUALITY',
      savedAt: null,
    },
  })
  getMenuBatch.mockResolvedValue({
    status: 'FAILED',
    data: { ...draft, detectedItems: [] },
  })
  renderPage()
  expect(
    await screen.findByRole('heading', { name: '메뉴 인식에 실패했어요' }),
  ).toBeInTheDocument()
})

test('메뉴 카테고리는 티를 포함한 여섯 종류만 제공한다', async () => {
  renderPage()
  await screen.findByRole('heading', { name: '저장된 메뉴' })
  fireEvent.click(screen.getByRole('button', { name: '수정하기' }))
  const options = screen
    .getByRole('combobox', { name: '카테고리' })
    .querySelectorAll('option')
  expect(Array.from(options, (option) => option.value).filter(Boolean)).toEqual(
    ['COFFEE', 'TEA', 'BEVERAGE', 'CAKE', 'BAKERY', 'OTHER'],
  )
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), {
    target: { value: 'TEA' },
  })
  fireEvent.click(screen.getByRole('button', { name: '변경사항 저장하기' }))
  await waitFor(() =>
    expect(updateMenuItems).toHaveBeenCalledWith(3, [
      expect.objectContaining({ menuId: 21, category: 'TEA' }),
    ]),
  )
})

test('카테고리가 없는 인식 후보는 선택 전 확정을 막는다', async () => {
  getMenuList.mockResolvedValue({
    ...saved,
    draftBatch: {
      batchId: 9,
      status: 'COMPLETED',
      uploadedAt: '',
      failReason: null,
      savedAt: null,
    },
  })
  getMenuBatch.mockResolvedValue({
    status: 'COMPLETED',
    data: {
      ...draft,
      detectedItems: [
        {
          ...draft.detectedItems[0],
          category: null,
          priceReviewRequired: false,
        },
      ],
    },
  })
  renderPage()
  const select = await screen.findByRole('combobox', { name: '카테고리' })
  expect(select).toHaveValue('')
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
  expect(screen.getByRole('alert')).toHaveTextContent('카테고리')
  expect(confirmMenuBatch).not.toHaveBeenCalled()
  fireEvent.change(select, { target: { value: 'TEA' } })
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
  await waitFor(() =>
    expect(confirmMenuBatch).toHaveBeenCalledWith(9, 3, [
      expect.objectContaining({ category: 'TEA' }),
    ]),
  )
})

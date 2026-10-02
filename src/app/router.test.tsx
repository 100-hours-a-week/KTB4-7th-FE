import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { router } from './router'

const { getNotifications } = vi.hoisted(() => ({
  getNotifications: vi.fn().mockResolvedValue({ data: { items: [] } }),
}))

vi.mock('../features/notifications/api/notificationApi', () => ({
  getNotifications,
}))

test('미등록 경로에 404 안내와 홈 링크를 표시한다', async () => {
  const memoryRouter = createMemoryRouter(router.routes, {
    initialEntries: ['/non-existent-page'],
  })

  render(<RouterProvider router={memoryRouter} />)

  expect(
    await screen.findByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute(
    'href',
    '/',
  )
  expect(screen.queryByText('Unexpected Application Error!')).toBeNull()
})

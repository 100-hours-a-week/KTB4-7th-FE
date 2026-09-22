import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { NotificationsPage } from './NotificationsPage'

test('알림 제목과 새 솔루션 알림을 표시한다', () => {
  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument()
  expect(screen.getByText('오늘의 솔루션이 도착했어요')).toBeInTheDocument()
})

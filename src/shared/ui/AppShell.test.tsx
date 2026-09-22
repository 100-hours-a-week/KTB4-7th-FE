import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { AppShell } from './AppShell'

test('모바일 하단 탐색과 화면 제목을 표시한다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('navigation', { name: '하단 탐색' }),
  ).toBeInTheDocument()
  expect(screen.getAllByText('솔루션')).toHaveLength(3)
})

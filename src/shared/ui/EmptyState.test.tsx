import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { EmptyState } from './EmptyState'

test('제목과 설명을 가진 빈 상태를 표시한다', () => {
  render(
    <EmptyState
      title="새 알림이 없습니다"
      description="새로운 소식이 도착하면 알려드릴게요."
    />,
  )

  expect(
    screen.getByRole('heading', { name: '새 알림이 없습니다' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText('새로운 소식이 도착하면 알려드릴게요.'),
  ).toBeInTheDocument()
})

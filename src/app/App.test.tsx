import { render, screen } from '@testing-library/react'
import { App } from './App'

test('랜딩 메시지를 표시한다', () => {
  render(<App />)

  expect(
    screen.getByRole('heading', { name: '오늘의 매장을 더 가볍게' }),
  ).toBeInTheDocument()
})

import { render, screen } from '@testing-library/react'
import { App } from './App'

test('서비스 이름을 표시한다', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: '맴매' })).toBeInTheDocument()
})

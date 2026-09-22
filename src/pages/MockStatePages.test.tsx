import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { LoginPage } from './LoginPage'
import { SalesAnalysisPage } from './SalesAnalysisPage'
import { SolutionPage } from './SolutionPage'

test('솔루션이 없으면 매출 업로드 행동을 제공한다', () => {
  render(
    <MemoryRouter>
      <SolutionPage
        summary={{
          availability: 'unavailable',
          storeName: '맴매',
          solutions: [],
        }}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: '아직 제공된 솔루션이 없습니다' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '매출 데이터 업로드' }),
  ).toHaveAttribute('href', '/sales/upload')
})

test('분석 데이터가 없으면 업로드 행동을 제공한다', () => {
  render(
    <MemoryRouter>
      <SalesAnalysisPage sales={null} />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: '분석할 매출 데이터가 없습니다' }),
  ).toBeInTheDocument()
})

test('로그인 화면도 모바일 앱 컨테이너에서 렌더링한다', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('main')).toHaveClass('mobile-app-shell')
})

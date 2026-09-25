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
  expect(screen.getAllByText('솔루션')).toHaveLength(2)
})

test('기기 프레임 안에 스크롤 본문과 알림 이동을 렌더링한다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toHaveClass('app-content')
  expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
    'href',
    '/notifications',
  )
})

test('backTo가 없으면 홈 링크를 보여준다', () => {
  render(
    <MemoryRouter>
      <AppShell title="솔루션">내용</AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/')
  expect(
    screen.queryByRole('link', { name: '뒤로가기' }),
  ).not.toBeInTheDocument()
})

test('backTo가 있으면 홈 링크 대신 뒤로가기 버튼을 보여준다', () => {
  render(
    <MemoryRouter>
      <AppShell title="비밀번호 수정" backTo="/profile">
        내용
      </AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: '뒤로가기' })).toHaveAttribute(
    'href',
    '/profile',
  )
  expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument()
})

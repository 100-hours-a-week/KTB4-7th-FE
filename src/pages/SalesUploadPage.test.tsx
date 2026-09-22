import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { SalesUploadPage } from './SalesUploadPage'

test('지원하지 않는 매출 파일을 선택하면 오류를 표시한다', () => {
  render(
    <MemoryRouter>
      <SalesUploadPage />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('매출 파일 선택'), {
    target: {
      files: [new File(['x'], 'sales.pdf', { type: 'application/pdf' })],
    },
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    'CSV 또는 엑셀 파일만 업로드할 수 있습니다.',
  )
})

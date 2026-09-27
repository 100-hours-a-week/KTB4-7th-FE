import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SolutionChatPage } from './SolutionChatPage'

const {
  getChatHistory,
  streamChatMessage,
  isInsufficientData,
  getChatErrorMessage,
  navigate,
} = vi.hoisted(() => ({
  getChatHistory: vi.fn(),
  streamChatMessage: vi.fn(),
  isInsufficientData: vi.fn(),
  getChatErrorMessage: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../features/chat/api/chatApi', () => ({
  getChatHistory,
  streamChatMessage,
  isInsufficientData,
  getChatErrorMessage,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => {
  getChatHistory.mockReset()
  streamChatMessage.mockReset()
  isInsufficientData.mockReset()
  isInsufficientData.mockReturnValue(false)
  getChatErrorMessage.mockReset()
  getChatErrorMessage.mockImplementation(
    (_error: unknown, fallback: string) => fallback,
  )
  navigate.mockReset()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SolutionChatPage />
    </MemoryRouter>,
  )
}

function emptyHistory() {
  return {
    message: '오늘 대화가 없습니다.',
    data: {
      chatDate: '2026-09-27',
      serviceGuide: '매출과 오늘의 솔루션을 바탕으로 답변해드려요.',
      messages: [],
      recommendedQuestions: ['오늘 매출을 높이려면 무엇을 해야 하나요?'],
    },
  }
}

test('대화가 없으면 안내 문구와 추천 질문을 보여준다', async () => {
  getChatHistory.mockResolvedValue(emptyHistory())

  renderPage()

  expect(
    await screen.findByText('오늘 매출을 높이려면 무엇을 해야 하나요?'),
  ).toBeVisible()
  expect(
    screen.getByText('매출과 오늘의 솔루션을 바탕으로 답변해드려요.'),
  ).toBeVisible()
})

test('질문을 보내면 스트리밍 답변이 쌓이고 이력을 다시 불러온다', async () => {
  getChatHistory.mockResolvedValueOnce(emptyHistory()).mockResolvedValueOnce({
    message: '조회에 성공했습니다.',
    data: {
      chatDate: '2026-09-27',
      serviceGuide: '',
      messages: [
        {
          id: 1,
          role: 'USER',
          content: '질문입니다',
          status: 'COMPLETED',
          createdAt: '2026-09-27T10:00:00+09:00',
        },
        {
          id: 2,
          role: 'ASSISTANT',
          content: '답변입니다',
          status: 'COMPLETED',
          createdAt: '2026-09-27T10:00:05+09:00',
        },
      ],
      recommendedQuestions: [],
    },
  })
  streamChatMessage.mockImplementation(async (_request, onEvent) => {
    onEvent({
      event: 'answerChunk',
      data: { messageId: 2, content: '답', evidence: null },
    })
    onEvent({
      event: 'answerChunk',
      data: { messageId: 2, content: '변입니다', evidence: null },
    })
  })

  renderPage()
  await waitFor(() => expect(getChatHistory).toHaveBeenCalledTimes(1))

  fireEvent.change(screen.getByPlaceholderText('궁금한 점을 입력하세요'), {
    target: { value: '질문입니다' },
  })
  fireEvent.click(screen.getByRole('button', { name: '전송' }))

  await waitFor(() =>
    expect(streamChatMessage).toHaveBeenCalledWith(
      { content: '질문입니다' },
      expect.any(Function),
    ),
  )
  await waitFor(() => expect(getChatHistory).toHaveBeenCalledTimes(2))
  expect(await screen.findByText('답변입니다')).toBeVisible()
})

test('매출 이력이 부족하면 안내 문구를 보여주고 입력값을 복원한다', async () => {
  getChatHistory.mockResolvedValue(emptyHistory())
  streamChatMessage.mockRejectedValue(new Error('insufficient'))
  isInsufficientData.mockReturnValue(true)

  renderPage()
  await waitFor(() => expect(getChatHistory).toHaveBeenCalledTimes(1))

  const input = screen.getByPlaceholderText('궁금한 점을 입력하세요')
  fireEvent.change(input, { target: { value: '질문' } })
  fireEvent.click(screen.getByRole('button', { name: '전송' }))

  expect(
    await screen.findByText('매출 이력이 더 쌓이면 챗봇을 이용할 수 있어요.'),
  ).toBeVisible()
  expect(input).toHaveValue('질문')
})

test('401 응답을 받으면 로그인 페이지로 이동한다', async () => {
  getChatHistory.mockRejectedValue({ response: { status: 401 } })

  renderPage()

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
})

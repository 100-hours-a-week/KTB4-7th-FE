import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSolutionById } from '../entities/solution/model/fixtures'
import { AppHeader } from '../shared/ui/AppHeader'
export function SolutionChatPage() {
  const solution = getSolutionById(useParams().solutionId ?? '')
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState<string[]>(
    solution ? [`${solution.title}에 대해 무엇이 궁금하세요?`] : [],
  )
  if (!solution) return null
  const send = () => {
    const text = value.trim()
    if (text) {
      setMessages([
        ...messages,
        text,
        `${solution.title}을 기준으로 오늘 실행할 수 있는 범위부터 확인해 보세요.`,
      ])
      setValue('')
    }
  }
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="chat-page">
        <p>MEMME AI</p>
        <h1>{solution.title}</h1>
        <div>
          {messages.map((message, index) => (
            <p key={`${message}-${index}`} className={index % 2 ? 'user' : ''}>
              {message}
            </p>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <label>
            메시지 입력
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="궁금한 점을 입력하세요"
            />
          </label>
          <button>전송</button>
        </form>
      </main>
    </div>
  )
}

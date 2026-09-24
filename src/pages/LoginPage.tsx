import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { login } from '../features/auth/api/loginApi'
import { ClearableInput } from '../shared/ui/ClearableInput'

type LoginForm = {
  email: string
  password: string
}
type ApiErrorResponse = { message?: string }
type LocationState = { passwordResetComplete?: boolean } | null

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null || !('response' in error))
    return fallback

  const response = (error as { response?: { data?: ApiErrorResponse } })
    .response?.data
  return response?.message ?? fallback
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ mode: 'onChange' })

  const passwordResetComplete = Boolean(
    (location.state as LocationState)?.passwordResetComplete,
  )

  const submitLogin = handleSubmit(async (values) => {
    setError('')
    try {
      await login(values)
      navigate('/solution')
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        ),
      )
    }
  })

  return (
    <main className="mobile-app-shell auth-app-shell">
      <div className="device-notch" aria-hidden="true" />
      <div className="auth-page">
        <header>
          <Link to="/" className="signup-brand">
            memme
          </Link>
          <span>LOGIN</span>
        </header>
        <section className="auth-intro">
          <p>WELCOME BACK</p>
          <h1>
            매장에 필요한
            <br />한 가지를 찾으세요.
          </h1>
        </section>
        {passwordResetComplete && (
          <p className="form-success">
            비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
          </p>
        )}
        <form className="login-form" onSubmit={submitLogin} noValidate>
          {error && <p role="alert">{error}</p>}
          <label>
            이메일
            <ClearableInput
              aria-label="이메일"
              type="email"
              placeholder="이메일 주소"
              autoComplete="email"
              {...register('email', {
                required: true,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '올바른 이메일 형식으로 입력해주세요.',
                },
              })}
            />
            {errors.email && (
              <small role="alert">
                {errors.email.message || '이메일을 입력해주세요.'}
              </small>
            )}
          </label>
          <label>
            비밀번호
            <ClearableInput
              aria-label="비밀번호"
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
              {...register('password', { required: true })}
            />
            {errors.password && (
              <small role="alert">비밀번호를 입력해주세요.</small>
            )}
          </label>
          <Link className="login-forgot-password" to="/password-reset">
            비밀번호를 잃어버리셨나요?
          </Link>
          <button
            className="primary-action"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="auth-footer">
          처음이라면 <Link to="/signup">회원가입</Link>으로 시작해 보세요.
        </p>
      </div>
    </main>
  )
}

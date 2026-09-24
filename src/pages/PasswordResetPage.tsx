import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  requestPasswordResetEmail,
  resetPassword,
} from '../features/auth/api/loginApi'

type EmailForm = { email: string }
type ResetForm = { newPassword: string; confirmPassword: string }
type ApiFieldError = { field: string; message: string }
type ApiErrorResponse = {
  message?: string
  data?: { fieldErrors?: ApiFieldError[] }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null || !('response' in error))
    return fallback

  const response = (error as { response?: { data?: ApiErrorResponse } })
    .response?.data
  return response?.message ?? fallback
}

function getApiFieldErrors(error: unknown): ApiFieldError[] {
  if (typeof error !== 'object' || error === null || !('response' in error))
    return []

  const response = (error as { response?: { data?: ApiErrorResponse } })
    .response?.data
  return response?.data?.fieldErrors ?? []
}

function EmailRequestForm() {
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailForm>({ mode: 'onChange' })

  const submit = handleSubmit(async (values) => {
    setError('')
    try {
      await requestPasswordResetEmail(values)
      setIsSent(true)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          '비밀번호 재설정 메일을 보내지 못했습니다.',
        ),
      )
    }
  })

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <p>PASSWORD RESET</p>
        <h1>
          비밀번호를
          <br />
          잊어버리셨나요?
        </h1>
        <span>가입하신 이메일로 재설정 링크를 보내드려요.</span>
      </section>
      <form className="login-form" onSubmit={submit} noValidate>
        {error && <p role="alert">{error}</p>}
        <label>
          이메일
          <input
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
        <button
          className="primary-action"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '전송 중...' : '재설정 메일 보내기'}
        </button>
      </form>
      <p className="auth-footer">
        <Link to="/login">로그인으로 돌아가기</Link>
      </p>
      {isSent && (
        <div
          className="signup-modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsSent(false)}
        >
          <section
            className="signup-policy-modal password-reset-sent-modal"
            role="dialog"
            aria-modal="true"
            aria-label="메일을 확인해주세요"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>메일을 확인해주세요</strong>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setIsSent(false)}
              >
                ×
              </button>
            </header>
            <div>
              <p>입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.</p>
              <Link className="signup-button" to="/login">
                로그인으로 이동
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function NewPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    getValues,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ mode: 'onChange' })

  const submit = handleSubmit(async (values) => {
    setError('')
    try {
      await resetPassword({ token, ...values })
      navigate('/login', { state: { passwordResetComplete: true } })
    } catch (requestError) {
      const fieldErrors = getApiFieldErrors(requestError)
      const confirmError = fieldErrors.find(
        (fieldError) => fieldError.field === 'confirmPassword',
      )
      if (confirmError) {
        setFieldError('confirmPassword', {
          type: 'server',
          message: confirmError.message,
        })
        return
      }
      setError(
        getApiErrorMessage(
          requestError,
          '재설정 링크가 만료되었거나 올바르지 않습니다.',
        ),
      )
    }
  })

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <p>PASSWORD RESET</p>
        <h1>
          새 비밀번호를
          <br />
          설정해주세요.
        </h1>
      </section>
      <form className="login-form" onSubmit={submit} noValidate>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Link to="/password-reset">재설정 메일 다시 받기</Link>
          </div>
        )}
        <label>
          새 비밀번호
          <input
            aria-label="새 비밀번호"
            type="password"
            placeholder="새 비밀번호를 입력해주세요"
            autoComplete="new-password"
            {...register('newPassword', {
              required: true,
              pattern: {
                value:
                  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/,
                message:
                  '영문 대/소문자, 숫자, 특수문자를 포함해 8~20자로 입력해주세요.',
              },
            })}
          />
          {errors.newPassword && (
            <small role="alert">
              {errors.newPassword.message || '새 비밀번호를 입력해주세요.'}
            </small>
          )}
        </label>
        <label>
          새 비밀번호 확인
          <input
            aria-label="새 비밀번호 확인"
            type="password"
            placeholder="새 비밀번호를 다시 입력해주세요"
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: true,
              validate: (value) =>
                value === getValues('newPassword') ||
                '비밀번호와 일치하지 않습니다.',
            })}
          />
          {errors.confirmPassword && (
            <small role="alert">{errors.confirmPassword.message}</small>
          )}
        </label>
        <button
          className="primary-action"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}

export function PasswordResetPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  return (
    <main className="mobile-app-shell auth-app-shell">
      <div className="device-notch" aria-hidden="true" />
      {token ? <NewPasswordForm token={token} /> : <EmailRequestForm />}
    </main>
  )
}

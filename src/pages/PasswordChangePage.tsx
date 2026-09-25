import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { changePassword } from '../features/auth/api/userApi'
import { ClearableInput } from '../shared/ui/ClearableInput'
import { AppShell } from '../shared/ui/AppShell'

type PasswordChangeForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
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

export function PasswordChangePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    getValues,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeForm>({ mode: 'onChange' })

  const submit = handleSubmit(async (values) => {
    setError('')
    try {
      await changePassword(values)
      navigate('/profile', { state: { passwordChanged: true } })
    } catch (requestError) {
      const fieldErrors = getApiFieldErrors(requestError)
      const newPasswordError = fieldErrors.find(
        (fieldError) => fieldError.field === 'newPassword',
      )
      const confirmError = fieldErrors.find(
        (fieldError) => fieldError.field === 'confirmPassword',
      )
      if (newPasswordError) {
        setFieldError('newPassword', {
          type: 'server',
          message: newPasswordError.message,
        })
      }
      if (confirmError) {
        setFieldError('confirmPassword', {
          type: 'server',
          message: confirmError.message,
        })
      }
      if (newPasswordError || confirmError) return

      setError(
        getApiErrorMessage(requestError, '비밀번호 변경에 실패했습니다.'),
      )
    }
  })

  return (
    <AppShell title="비밀번호 수정" backTo="/profile">
      <div className="page-stack">
        <header className="page-title">
          <p>PASSWORD</p>
          <h1>비밀번호 수정</h1>
          <span>현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔드릴게요.</span>
        </header>
        <form className="login-form" onSubmit={submit} noValidate>
          {error && <p role="alert">{error}</p>}
          <label>
            현재 비밀번호
            <ClearableInput
              aria-label="현재 비밀번호"
              type="password"
              placeholder="현재 비밀번호를 입력해주세요"
              autoComplete="current-password"
              {...register('currentPassword', { required: true })}
            />
            {errors.currentPassword && (
              <small role="alert">현재 비밀번호를 입력해주세요.</small>
            )}
          </label>
          <label>
            새 비밀번호
            <ClearableInput
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
            <ClearableInput
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
    </AppShell>
  )
}

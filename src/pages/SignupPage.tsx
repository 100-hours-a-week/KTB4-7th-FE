import { useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import {
  completeSignup,
  requestSignupAccount,
  verifyBusinessNumber,
} from '../features/signup/api/signupApi'

type Account = {
  email: string
  password: string
  passwordConfirm: string
  phone: string
  terms: boolean
  privacy: boolean
}
type Business = {
  storeName: string
  businessRegNumber: string
  postalCode: string
  address: string
  addressDetail: string
}
type ApiFieldError = { field: string; message: string }
type ApiErrorResponse = {
  message?: string
  data?: { fieldErrors?: ApiFieldError[] }
}
type PolicyType = 'terms' | 'privacy'

const days = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]
const accountFieldMap: Record<string, FieldPath<Account>> = {
  email: 'email',
  password: 'password',
  passwordConfirm: 'passwordConfirm',
  phone: 'phone',
  'agreements.termsOfService': 'terms',
  'agreements.privacyPolicy': 'privacy',
}
const policies: Record<
  PolicyType,
  { title: string; heading: string; paragraphs: string[] }
> = {
  terms: {
    title: '이용약관',
    heading: '맴매 서비스 이용약관',
    paragraphs: [
      '제1조 (목적) 이 약관은 맴매 서비스 이용에 필요한 기본 사항을 정합니다.',
      '제2조 (서비스 이용) 회원은 정확한 정보를 입력하고 서비스를 정상적인 방법으로 이용해야 합니다.',
      '제3조 (계정 관리) 회원은 계정 정보와 비밀번호를 안전하게 관리할 책임이 있습니다.',
    ],
  },
  privacy: {
    title: '개인정보 수집 및 이용',
    heading: '개인정보 수집 및 이용 동의',
    paragraphs: [
      '수집 항목: 이메일 주소, 비밀번호, 휴대폰 번호, 매장 정보',
      '이용 목적: 회원 식별, 매장 서비스 제공, 고객 문의 응대',
      '보유 기간: 회원 탈퇴 또는 수집·이용 목적 달성 시까지',
    ],
  },
}

function getApiFieldErrors(error: unknown): ApiFieldError[] {
  if (typeof error !== 'object' || error === null || !('response' in error))
    return []

  const response = (error as { response?: { data?: ApiErrorResponse } })
    .response?.data
  return response?.data?.fieldErrors ?? []
}

export function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [token, setToken] = useState('')
  const [verificationId, setVerificationId] = useState<number>()
  const [error, setError] = useState('')
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null)
  const account = useForm<Account>()
  const business = useForm<Business>()
  const accountValues = account.watch()
  const isAccountReady =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountValues.email ?? '') &&
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(
      accountValues.password ?? '',
    ) &&
    accountValues.password === accountValues.passwordConfirm &&
    /^010\d{8}$/.test(accountValues.phone ?? '') &&
    accountValues.terms &&
    accountValues.privacy

  const submitAccount = account.handleSubmit(async (values) => {
    setError('')
    account.clearErrors()

    try {
      const data = await requestSignupAccount({
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        phone: values.phone,
        agreements: {
          termsOfService: values.terms,
          termsOfServiceVersion: '2026-09',
          privacyPolicy: values.privacy,
          privacyPolicyVersion: '2026-09',
        },
      })
      setToken(data.signupToken)
      setStep(2)
    } catch (requestError) {
      const fieldErrors = getApiFieldErrors(requestError)

      fieldErrors.forEach(({ field, message }) => {
        const accountField = accountFieldMap[field]
        if (accountField)
          account.setError(accountField, { type: 'server', message })
      })

      if (fieldErrors.length === 0) setError('가입 정보를 확인해 주세요.')
    }
  })

  const verify = async () => {
    try {
      setVerificationId(
        (await verifyBusinessNumber(business.getValues('businessRegNumber')))
          .businessVerificationId,
      )
      setError('')
    } catch {
      setError('사업자 인증에 실패했습니다.')
    }
  }

  const submitBusiness = business.handleSubmit(async (values) => {
    if (!verificationId) return setError('사업자 인증을 먼저 완료해 주세요.')

    try {
      const data = await completeSignup(token, {
        ...values,
        businessVerificationId: verificationId,
        businessHours: days.map((dayOfWeek) => ({
          dayOfWeek,
          isClosed: false,
          openTime: '09:00',
          closeTime: '18:00',
        })),
      })
      setStep(3)
      business.setValue('storeName', data.store.storeName)
    } catch {
      setError('가입 시간이 만료되었거나 입력값이 올바르지 않습니다.')
    }
  })

  if (step === 3) {
    return (
      <main className="signup-page signup-complete">
        <p className="signup-kicker">MEMME / JOIN</p>
        <h1>
          가입이
          <br />
          완료되었습니다.
        </h1>
        <p>{business.getValues('storeName')}의 오늘을 함께 만들게요.</p>
        <a className="signup-button" href="/">
          로그인으로 이동
        </a>
      </main>
    )
  }

  return (
    <main className="signup-page">
      <header>
        <a href="/" className="signup-brand">
          memme
        </a>
        <span>JOIN / 0{step}</span>
      </header>
      <section className="signup-intro">
        <div className="signup-logo">m</div>
        <h1>
          {step === 1 ? (
            <>
              매장의 오늘을
              <br />
              시작하세요.
            </>
          ) : (
            <>
              매장을
              <br />
              소개해 주세요.
            </>
          )}
        </h1>
        <p>
          {step === 1
            ? '필수 정보를 입력한 뒤 다음 단계로 이동할 수 있습니다.'
            : '사업자 인증 후 매장 정보를 등록해 주세요.'}
        </p>
      </section>
      {error && <p role="alert">{error}</p>}
      {step === 1 ? (
        <form
          className="signup-account-form"
          onSubmit={submitAccount}
          noValidate
        >
          <label>
            <span className="signup-field-label">
              이메일 <em aria-hidden="true">*</em>
            </span>
            <input
              aria-label="이메일"
              type="email"
              placeholder="이메일 주소를 입력해주세요"
              autoComplete="email"
              {...account.register('email', { required: true })}
            />
            {account.formState.errors.email && (
              <small role="alert">
                {account.formState.errors.email.message}
              </small>
            )}
          </label>
          <label>
            <span className="signup-field-label">
              비밀번호 <em aria-hidden="true">*</em>
            </span>
            <input
              aria-label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력해주세요"
              autoComplete="new-password"
              {...account.register('password', { required: true })}
            />
            {account.formState.errors.password && (
              <small role="alert">
                {account.formState.errors.password.message}
              </small>
            )}
          </label>
          <label>
            <span className="signup-field-label">
              비밀번호 확인 <em aria-hidden="true">*</em>
            </span>
            <input
              aria-label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 다시 입력해주세요"
              autoComplete="new-password"
              {...account.register('passwordConfirm', { required: true })}
            />
            {account.formState.errors.passwordConfirm && (
              <small role="alert">
                {account.formState.errors.passwordConfirm.message}
              </small>
            )}
          </label>
          <label>
            <span className="signup-field-label">
              휴대폰 번호 <em aria-hidden="true">*</em>
            </span>
            <input
              aria-label="휴대폰 번호"
              placeholder="휴대폰 번호를 입력해주세요"
              autoComplete="tel"
              {...account.register('phone', { required: true })}
            />
            {account.formState.errors.phone && (
              <small role="alert">
                {account.formState.errors.phone.message}
              </small>
            )}
          </label>
          <div className="signup-agreements">
            <div className="signup-agreement">
              <label className="signup-check">
                <input
                  type="checkbox"
                  {...account.register('terms', { required: true })}
                />
                [필수] 이용약관 동의
              </label>
              <button
                type="button"
                aria-label="이용약관 자세히 보기"
                onClick={() => setActivePolicy('terms')}
              >
                ›
              </button>
            </div>
            <div className="signup-agreement">
              <label className="signup-check">
                <input
                  type="checkbox"
                  {...account.register('privacy', { required: true })}
                />
                [필수] 개인정보 수집·이용 동의
              </label>
              <button
                type="button"
                aria-label="개인정보 수집 및 이용 자세히 보기"
                onClick={() => setActivePolicy('privacy')}
              >
                ›
              </button>
            </div>
          </div>
          <button className="signup-button" disabled={!isAccountReady}>
            다음
          </button>
        </form>
      ) : (
        <form onSubmit={submitBusiness} autoComplete="off">
          <label>
            매장명
            <input
              autoComplete="organization"
              {...business.register('storeName', { required: true })}
            />
          </label>
          <label>
            사업자등록번호
            <input
              autoComplete="off"
              {...business.register('businessRegNumber', { required: true })}
            />
          </label>
          <button className="signup-verify" type="button" onClick={verify}>
            사업자 인증
          </button>
          <label>
            우편번호
            <input
              autoComplete="postal-code"
              {...business.register('postalCode', { required: true })}
            />
          </label>
          <label>
            기본 주소
            <input
              autoComplete="street-address"
              {...business.register('address', { required: true })}
            />
          </label>
          <label>
            상세 주소
            <input
              autoComplete="address-line2"
              {...business.register('addressDetail')}
            />
          </label>
          <div className="signup-actions">
            <button
              className="signup-previous"
              type="button"
              onClick={() => {
                setError('')
                setStep(1)
              }}
            >
              이전
            </button>
            <button className="signup-button">가입 완료</button>
          </div>
        </form>
      )}
      {activePolicy && (
        <div
          className="signup-modal-backdrop"
          role="presentation"
          onMouseDown={() => setActivePolicy(null)}
        >
          <section
            className="signup-policy-modal"
            role="dialog"
            aria-modal="true"
            aria-label={policies[activePolicy].title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>{policies[activePolicy].title}</strong>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setActivePolicy(null)}
              >
                ×
              </button>
            </header>
            <div>
              <h2>{policies[activePolicy].heading}</h2>
              {policies[activePolicy].paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

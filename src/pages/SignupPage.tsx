import { useEffect, useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import {
  completeSignup,
  requestSignupAccount,
  searchAddress,
  verifyBusinessNumber,
  type AddressSearchItem,
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
  openTime: string
  closeTime: string
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
const dayLabels: Record<(typeof days)[number], string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
}
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
const timeHours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, '0'),
)
const timeMinutes = ['00', '30']
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
  const [verifiedRegNumber, setVerifiedRegNumber] = useState('')
  const [error, setError] = useState('')
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null)
  const [isAddressModalOpen, setAddressModalOpen] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressResults, setAddressResults] = useState<AddressSearchItem[]>([])
  const [addressNextCursor, setAddressNextCursor] = useState<string | null>(
    null,
  )
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set())
  const account = useForm<Account>({ mode: 'onChange' })
  const business = useForm<Business>({
    mode: 'onChange',
    defaultValues: { openTime: '09:00', closeTime: '18:00' },
  })
  const accountValues = account.watch()
  const businessValues = business.watch()
  const isAccountReady =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountValues.email ?? '') &&
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(
      accountValues.password ?? '',
    ) &&
    accountValues.password === accountValues.passwordConfirm &&
    /^010\d{8}$/.test(accountValues.phone ?? '') &&
    accountValues.terms &&
    accountValues.privacy
  const isBusinessVerified =
    Boolean(verificationId) &&
    verifiedRegNumber === businessValues.businessRegNumber
  const isBusinessReady =
    Boolean(businessValues.storeName) &&
    isBusinessVerified &&
    Boolean(businessValues.postalCode) &&
    Boolean(businessValues.address) &&
    Boolean(businessValues.openTime) &&
    Boolean(businessValues.closeTime) &&
    businessValues.closeTime > businessValues.openTime
  const addressLabel =
    businessValues.postalCode && businessValues.address
      ? '[' + businessValues.postalCode + '] ' + businessValues.address
      : ''
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
      const businessRegNumber = business.getValues('businessRegNumber')
      setVerificationId(
        (await verifyBusinessNumber(businessRegNumber)).businessVerificationId,
      )
      setVerifiedRegNumber(businessRegNumber)
      setError('')
    } catch {
      setError('사업자 인증에 실패했습니다.')
    }
  }

  const closeAddressModal = () => {
    setAddressModalOpen(false)
    setAddressQuery('')
    setAddressResults([])
    setAddressNextCursor(null)
    setAddressError('')
  }

  const selectAddress = (item: AddressSearchItem) => {
    business.setValue('postalCode', item.postalCode, { shouldValidate: true })
    business.setValue('address', item.roadAddress || item.jibunAddress, {
      shouldValidate: true,
    })
    closeAddressModal()
  }

  const toggleClosedDay = (day: string) => {
    setClosedDays((previous) => {
      const next = new Set(previous)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const updateTimePart = (
    field: 'openTime' | 'closeTime',
    part: 'hour' | 'minute',
    value: string,
  ) => {
    const [hour, minute] = (business.getValues(field) || '00:00').split(':')
    const nextValue =
      part === 'hour'
        ? value + ':' + (minute ?? '00')
        : (hour ?? '00') + ':' + value
    business.setValue(field, nextValue, { shouldValidate: true })
  }

  const loadMoreAddresses = async () => {
    if (!addressNextCursor) return
    setIsSearchingAddress(true)
    try {
      const result = await searchAddress(addressQuery.trim(), addressNextCursor)
      setAddressResults((previous) => [...previous, ...result.addresses])
      setAddressNextCursor(result.nextCursor)
    } catch {
      setAddressError('주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSearchingAddress(false)
    }
  }

  useEffect(() => {
    if (!isAddressModalOpen) return

    const query = addressQuery.trim()
    if (!query) {
      setAddressResults([])
      setAddressNextCursor(null)
      setAddressError('')
      return
    }

    setIsSearchingAddress(true)
    setAddressError('')
    const timer = setTimeout(() => {
      searchAddress(query)
        .then((result) => {
          setAddressResults(result.addresses)
          setAddressNextCursor(result.nextCursor)
        })
        .catch(() => {
          setAddressResults([])
          setAddressNextCursor(null)
          setAddressError(
            '주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.',
          )
        })
        .finally(() => setIsSearchingAddress(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [addressQuery, isAddressModalOpen])

  const submitBusiness = business.handleSubmit(async (values) => {
    if (!isBusinessVerified)
      return setError('사업자 인증을 먼저 완료해 주세요.')

    const { openTime, closeTime, ...businessFields } = values

    try {
      const data = await completeSignup(token, {
        ...businessFields,
        businessVerificationId: verificationId as number,
        businessHours: days.map((dayOfWeek) => {
          const isClosed = closedDays.has(dayOfWeek)
          return {
            dayOfWeek,
            isClosed,
            openTime: isClosed ? null : openTime,
            closeTime: isClosed ? null : closeTime,
          }
        }),
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
    <main className="signup-page mobile-onboarding">
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
          key="step-1"
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
              {...account.register('email', {
                required: true,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '올바른 이메일 형식으로 입력해주세요.',
                },
              })}
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
              {...account.register('password', {
                required: true,
                pattern: {
                  value:
                    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/,
                  message:
                    '영문 대/소문자, 숫자, 특수문자를 포함해 8~20자로 입력해주세요.',
                },
              })}
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
              {...account.register('passwordConfirm', {
                required: true,
                validate: (value) =>
                  value === account.getValues('password') ||
                  '비밀번호가 일치하지 않습니다.',
              })}
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
              {...account.register('phone', {
                required: true,
                pattern: {
                  value: /^010\d{8}$/,
                  message: '숫자만 입력해주세요. 예) 01012345678',
                },
              })}
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
                  {...account.register('terms', {
                    required: '이용약관에 동의해주세요.',
                  })}
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
                  {...account.register('privacy', {
                    required: '개인정보 수집·이용에 동의해주세요.',
                  })}
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
          {(!accountValues.terms || !accountValues.privacy) && (
            <small role="alert" className="signup-agreements-error">
              {!accountValues.terms
                ? '이용약관에 동의해주세요.'
                : '개인정보 수집·이용에 동의해주세요.'}
            </small>
          )}
          <button className="signup-button" disabled={!isAccountReady}>
            다음
          </button>
        </form>
      ) : (
        <form
          key="step-2"
          onSubmit={submitBusiness}
          autoComplete="off"
          noValidate
        >
          <section className="signup-section">
            <h2 className="signup-section-title">사업자 정보</h2>
            <label>
              <span className="signup-field-label">
                매장명 <em aria-hidden="true">*</em>
              </span>
              <input
                autoComplete="organization"
                placeholder="매장명을 입력해주세요"
                {...business.register('storeName', { required: true })}
              />
            </label>
            <label>
              <span className="signup-field-label">
                사업자등록번호 <em aria-hidden="true">*</em>
              </span>
              <div className="signup-inline-field">
                <input
                  autoComplete="off"
                  placeholder="- 없이 숫자 10자리를 입력해주세요"
                  {...business.register('businessRegNumber', {
                    required: true,
                    pattern: {
                      value: /^\d{10}$/,
                      message: '숫자 10자리를 입력해주세요.',
                    },
                  })}
                />
                <button
                  type="button"
                  className="signup-inline-action-btn"
                  disabled={
                    isBusinessVerified ||
                    !/^\d{10}$/.test(businessValues.businessRegNumber ?? '')
                  }
                  onClick={verify}
                >
                  {isBusinessVerified ? '인증 완료' : '인증하기'}
                </button>
              </div>
              {business.formState.errors.businessRegNumber ? (
                <small role="alert">
                  {business.formState.errors.businessRegNumber.message}
                </small>
              ) : isBusinessVerified ? (
                <small className="signup-field-hint signup-field-hint--success">
                  사업자 인증이 완료되었어요.
                </small>
              ) : (
                <small className="signup-field-hint">
                  사업자등록번호를 입력하고 인증하기를 눌러주세요.
                </small>
              )}
            </label>
          </section>

          <section className="signup-section">
            <h2 className="signup-section-title">매장 주소</h2>
            <label>
              <span className="signup-field-label">
                주소 <em aria-hidden="true">*</em>
              </span>
              <div className="signup-inline-field">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  placeholder="주소 검색을 눌러 매장 주소를 입력해주세요"
                  value={addressLabel}
                  onClick={() => setAddressModalOpen(true)}
                />
                <button
                  type="button"
                  className="signup-inline-action-btn"
                  onClick={() => setAddressModalOpen(true)}
                >
                  주소 검색
                </button>
              </div>
              <input
                type="hidden"
                {...business.register('postalCode', { required: true })}
              />
              <input
                type="hidden"
                {...business.register('address', { required: true })}
              />
              {(business.formState.errors.postalCode ||
                business.formState.errors.address) && (
                <small role="alert">
                  주소 검색으로 매장 주소를 입력해주세요.
                </small>
              )}
            </label>
            <label>
              <span className="signup-field-label">상세 주소</span>
              <input
                autoComplete="address-line2"
                placeholder="동/호수 등 상세 주소를 입력해주세요"
                {...business.register('addressDetail')}
              />
            </label>
          </section>

          <section className="signup-section">
            <h2 className="signup-section-title">영업 시간</h2>
            <div className="signup-hours-row">
              <div className="signup-time-field">
                <span className="signup-field-label">영업 시작</span>
                <div className="signup-time-selects">
                  <select
                    aria-label="영업 시작 시"
                    value={(businessValues.openTime ?? '09:00').split(':')[0]}
                    onChange={(event) =>
                      updateTimePart('openTime', 'hour', event.target.value)
                    }
                  >
                    {timeHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className="signup-time-colon">:</span>
                  <select
                    aria-label="영업 시작 분"
                    value={(businessValues.openTime ?? '09:00').split(':')[1]}
                    onChange={(event) =>
                      updateTimePart('openTime', 'minute', event.target.value)
                    }
                  >
                    {timeMinutes.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="hidden"
                  {...business.register('openTime', { required: true })}
                />
              </div>
              <div className="signup-time-field">
                <span className="signup-field-label">영업 마감</span>
                <div className="signup-time-selects">
                  <select
                    aria-label="영업 마감 시"
                    value={(businessValues.closeTime ?? '18:00').split(':')[0]}
                    onChange={(event) =>
                      updateTimePart('closeTime', 'hour', event.target.value)
                    }
                  >
                    {timeHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className="signup-time-colon">:</span>
                  <select
                    aria-label="영업 마감 분"
                    value={(businessValues.closeTime ?? '18:00').split(':')[1]}
                    onChange={(event) =>
                      updateTimePart('closeTime', 'minute', event.target.value)
                    }
                  >
                    {timeMinutes.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="hidden"
                  {...business.register('closeTime', {
                    required: true,
                    validate: (value) =>
                      value > business.getValues('openTime') ||
                      '영업 마감 시간은 시작 시간보다 늦어야 해요.',
                  })}
                />
              </div>
            </div>
            {business.formState.errors.closeTime ? (
              <small role="alert">
                {business.formState.errors.closeTime.message}
              </small>
            ) : (
              <small className="signup-field-hint">
                입력한 시간이 매일 동일하게 적용돼요. 요일별 설정은 매장
                정보에서 다시 바꿀 수 있어요.
              </small>
            )}
            <div className="signup-days-block">
              <span className="signup-field-label">휴무일</span>
              <div
                className="signup-days-row"
                role="group"
                aria-label="휴무일 선택"
              >
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={
                      closedDays.has(day)
                        ? 'signup-day-toggle active'
                        : 'signup-day-toggle'
                    }
                    aria-pressed={closedDays.has(day)}
                    onClick={() => toggleClosedDay(day)}
                  >
                    {dayLabels[day]}
                  </button>
                ))}
              </div>
              <small className="signup-field-hint">
                {closedDays.size === 0
                  ? '선택하지 않으면 매일 영업으로 등록돼요.'
                  : Array.from(closedDays)
                      .map((day) => dayLabels[day])
                      .join(', ') + '요일은 휴무로 등록돼요.'}
              </small>
            </div>
          </section>

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
            <button className="signup-button" disabled={!isBusinessReady}>
              회원가입 완료
            </button>
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
      {isAddressModalOpen && (
        <div
          className="signup-modal-backdrop"
          role="presentation"
          onMouseDown={closeAddressModal}
        >
          <section
            className="signup-policy-modal signup-address-modal"
            role="dialog"
            aria-modal="true"
            aria-label="주소 검색"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>주소 검색</strong>
              <button
                type="button"
                aria-label="닫기"
                onClick={closeAddressModal}
              >
                ×
              </button>
            </header>
            <div className="signup-address-search">
              <input
                type="search"
                placeholder="도로명, 건물명 또는 지번으로 검색해주세요"
                value={addressQuery}
                onChange={(event) => setAddressQuery(event.target.value)}
                autoFocus
              />
              <p className="signup-address-tips">
                Tip. 도로명 주소는 도로명과 건물번호로, 지번 주소는 동/읍/면과
                번지로 검색하면 더 정확해요.
              </p>
              <ul className="signup-address-results">
                {addressError ? (
                  <li className="signup-address-empty" role="alert">
                    {addressError}
                  </li>
                ) : !addressQuery.trim() ? (
                  <li className="signup-address-empty">
                    도로명, 건물명 또는 지번으로 검색해보세요.
                  </li>
                ) : isSearchingAddress && addressResults.length === 0 ? (
                  <li className="signup-address-empty">검색 중이에요...</li>
                ) : addressResults.length === 0 ? (
                  <li className="signup-address-empty">
                    검색 결과가 없어요. 다른 키워드로 검색해보세요.
                  </li>
                ) : (
                  addressResults.map((item, index) => (
                    <li key={item.postalCode + item.roadAddress + index}>
                      <button type="button" onClick={() => selectAddress(item)}>
                        <span className="signup-address-postal">
                          [{item.postalCode}]
                        </span>
                        <span className="signup-address-lines">
                          <strong>{item.roadAddress}</strong>
                          {item.jibunAddress && (
                            <small>{item.jibunAddress}</small>
                          )}
                        </span>
                      </button>
                    </li>
                  ))
                )}
                {addressNextCursor && !isSearchingAddress && (
                  <li className="signup-address-more">
                    <button type="button" onClick={loadMoreAddresses}>
                      더 보기
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

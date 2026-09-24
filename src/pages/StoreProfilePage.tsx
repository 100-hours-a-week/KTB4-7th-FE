import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  getMyStore,
  updateMyStore,
  type StoreProfile,
} from '../features/store/api/storeApi'
import {
  searchAddress,
  type AddressSearchItem,
  type BusinessHours,
} from '../features/signup/api/signupApi'
import { ClearableInput } from '../shared/ui/ClearableInput'
import { AppShell } from '../shared/ui/AppShell'

type StoreForm = { storeName: string; addressDetail: string }
type ApiFieldError = { field: string; message: string }
type ApiErrorResponse = {
  message?: string
  data?: { fieldErrors?: ApiFieldError[] }
}

const days = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]
const dayLabels: Record<string, string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
}
const timeHours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, '0'),
)
const timeMinutes = ['00', '30']

function toHourMinute(time: string | null, fallback: string) {
  if (!time) return fallback
  return time.slice(0, 5)
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

export function StoreProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [postalCode, setPostalCode] = useState('')
  const [roadAddress, setRoadAddress] = useState('')
  const [businessRegNumber, setBusinessRegNumber] = useState('')
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(
    days.map((dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    })),
  )
  const [businessHoursError, setBusinessHoursError] = useState('')
  const [isAddressModalOpen, setAddressModalOpen] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressResults, setAddressResults] = useState<AddressSearchItem[]>([])
  const [addressNextCursor, setAddressNextCursor] = useState<string | null>(
    null,
  )
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreForm>({ mode: 'onChange' })

  useEffect(() => {
    let isMounted = true
    getMyStore()
      .then((store: StoreProfile) => {
        if (!isMounted) return
        setValue('storeName', store.storeName)
        setValue('addressDetail', store.address.addressDetail ?? '')
        setPostalCode(store.address.postalCode)
        setRoadAddress(store.address.roadAddress)
        setBusinessRegNumber(store.businessRegNumber)
        setBusinessHours(
          days.map((dayOfWeek) => {
            const found = store.businessHours.find(
              (hours) => hours.dayOfWeek === dayOfWeek,
            )
            return {
              dayOfWeek,
              isClosed: found?.isClosed ?? false,
              openTime: toHourMinute(found?.openTime ?? null, '09:00'),
              closeTime: toHourMinute(found?.closeTime ?? null, '18:00'),
            }
          }),
        )
      })
      .catch(() => {
        if (isMounted) setLoadError('매장 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [setValue])

  const closeAddressModal = () => {
    setAddressModalOpen(false)
    setAddressQuery('')
    setAddressResults([])
    setAddressNextCursor(null)
    setAddressError('')
  }

  const selectAddress = (item: AddressSearchItem) => {
    setPostalCode(item.postalCode)
    setRoadAddress(item.roadAddress || item.jibunAddress)
    closeAddressModal()
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

  const toggleDayClosed = (dayOfWeek: string) => {
    setBusinessHours((previous) =>
      previous.map((hours) => {
        if (hours.dayOfWeek !== dayOfWeek) return hours
        const isClosed = !hours.isClosed
        return {
          ...hours,
          isClosed,
          openTime: isClosed ? hours.openTime : (hours.openTime ?? '09:00'),
          closeTime: isClosed ? hours.closeTime : (hours.closeTime ?? '18:00'),
        }
      }),
    )
  }

  const updateDayTime = (
    dayOfWeek: string,
    field: 'openTime' | 'closeTime',
    part: 'hour' | 'minute',
    value: string,
  ) => {
    setBusinessHours((previous) =>
      previous.map((hours) => {
        if (hours.dayOfWeek !== dayOfWeek) return hours
        const [hour, minute] = (hours[field] || '00:00').split(':')
        const nextValue =
          part === 'hour'
            ? value + ':' + (minute ?? '00')
            : (hour ?? '00') + ':' + value
        return { ...hours, [field]: nextValue }
      }),
    )
  }

  const submit = handleSubmit(async (values) => {
    setError('')
    setSuccess(false)
    setBusinessHoursError('')

    if (!postalCode || !roadAddress) {
      setError('주소 검색으로 매장 주소를 입력해주세요.')
      return
    }

    try {
      await updateMyStore({
        storeName: values.storeName,
        address: {
          postalCode,
          roadAddress,
          addressDetail: values.addressDetail,
        },
        businessHours: businessHours.map((hours) => ({
          dayOfWeek: hours.dayOfWeek,
          isClosed: hours.isClosed,
          openTime: hours.isClosed ? null : hours.openTime,
          closeTime: hours.isClosed ? null : hours.closeTime,
        })),
      })
      setSuccess(true)
    } catch (requestError) {
      const fieldErrors = getApiFieldErrors(requestError)
      const hoursError = fieldErrors.find(
        (fieldError) => fieldError.field === 'businessHours',
      )
      if (hoursError) {
        setBusinessHoursError(hoursError.message)
        return
      }
      setError(
        getApiErrorMessage(requestError, '매장 정보 수정에 실패했습니다.'),
      )
    }
  })

  return (
    <AppShell title="사업자 정보">
      <div className="page-stack">
        <header className="page-title">
          <p>STORE INFO</p>
          <h1>사업자 정보 확인 및 수정</h1>
          <span>매장명, 주소, 영업시간을 확인하고 수정할 수 있어요.</span>
        </header>
        {isLoading ? (
          <p>불러오는 중...</p>
        ) : loadError ? (
          <p role="alert">{loadError}</p>
        ) : (
          <form className="login-form" onSubmit={submit} noValidate>
            {error && <p role="alert">{error}</p>}
            {success && (
              <p className="form-success">매장 정보가 수정되었습니다.</p>
            )}
            <label>
              사업자등록번호
              <input value={businessRegNumber} readOnly disabled />
            </label>
            <label>
              매장명
              <ClearableInput
                aria-label="매장명"
                placeholder="매장명을 입력해주세요"
                {...register('storeName', { required: true })}
              />
              {errors.storeName && (
                <small role="alert">매장명을 입력해주세요.</small>
              )}
            </label>
            <label>
              주소
              <div className="signup-inline-field">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  placeholder="주소 검색을 눌러 매장 주소를 입력해주세요"
                  value={
                    postalCode && roadAddress
                      ? `[${postalCode}] ${roadAddress}`
                      : ''
                  }
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
            </label>
            <label>
              상세 주소
              <ClearableInput
                aria-label="상세 주소"
                autoComplete="address-line2"
                placeholder="동/호수 등 상세 주소를 입력해주세요"
                {...register('addressDetail')}
              />
            </label>

            <div className="store-hours-list">
              <span className="signup-field-label">영업 시간</span>
              {businessHoursError && (
                <small role="alert">{businessHoursError}</small>
              )}
              {businessHours.map((hours) => (
                <div className="store-hours-row" key={hours.dayOfWeek}>
                  <div className="store-hours-day">
                    <span>{dayLabels[hours.dayOfWeek]}요일</span>
                    <button
                      type="button"
                      className={
                        hours.isClosed
                          ? 'store-hours-closed-toggle active'
                          : 'store-hours-closed-toggle'
                      }
                      aria-pressed={hours.isClosed}
                      onClick={() => toggleDayClosed(hours.dayOfWeek)}
                    >
                      휴무
                    </button>
                  </div>
                  {!hours.isClosed && (
                    <div className="store-hours-times">
                      <div className="signup-time-selects">
                        <select
                          aria-label={`${dayLabels[hours.dayOfWeek]}요일 영업 시작 시`}
                          value={(hours.openTime ?? '09:00').split(':')[0]}
                          onChange={(event) =>
                            updateDayTime(
                              hours.dayOfWeek,
                              'openTime',
                              'hour',
                              event.target.value,
                            )
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
                          aria-label={`${dayLabels[hours.dayOfWeek]}요일 영업 시작 분`}
                          value={(hours.openTime ?? '09:00').split(':')[1]}
                          onChange={(event) =>
                            updateDayTime(
                              hours.dayOfWeek,
                              'openTime',
                              'minute',
                              event.target.value,
                            )
                          }
                        >
                          {timeMinutes.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="store-hours-dash">~</span>
                      <div className="signup-time-selects">
                        <select
                          aria-label={`${dayLabels[hours.dayOfWeek]}요일 영업 마감 시`}
                          value={(hours.closeTime ?? '18:00').split(':')[0]}
                          onChange={(event) =>
                            updateDayTime(
                              hours.dayOfWeek,
                              'closeTime',
                              'hour',
                              event.target.value,
                            )
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
                          aria-label={`${dayLabels[hours.dayOfWeek]}요일 영업 마감 분`}
                          value={(hours.closeTime ?? '18:00').split(':')[1]}
                          onChange={(event) =>
                            updateDayTime(
                              hours.dayOfWeek,
                              'closeTime',
                              'minute',
                              event.target.value,
                            )
                          }
                        >
                          {timeMinutes.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              className="primary-action"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장하기'}
            </button>
          </form>
        )}
      </div>
      {isAddressModalOpen && (
        <div
          className="auth-modal-backdrop"
          role="presentation"
          onMouseDown={closeAddressModal}
        >
          <section
            className="auth-modal auth-modal-wide"
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
              <ClearableInput
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
                {addressNextCursor && (
                  <li className="signup-address-more">
                    <button
                      type="button"
                      onClick={loadMoreAddresses}
                      disabled={isSearchingAddress}
                    >
                      {isSearchingAddress ? '불러오는 중...' : '더 보기'}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}

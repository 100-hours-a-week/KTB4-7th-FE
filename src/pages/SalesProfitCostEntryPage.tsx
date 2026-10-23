import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  getSalesUploadCostEntry,
  saveSalesUploadCosts,
  type SalesUploadCostMonth,
} from '../features/sales/api/salesApi'
import { AppShell } from '../shared/ui/AppShell'
import './sales-profit-cost.css'

type CostFields = {
  costMonth: string
  rentAmount: string
  laborAmount: string
  ingredientCostRate: string
}

type CostForm = { items: CostFields[] }

const formSchema = z
  .object({
    items: z
      .array(
        z.object({
          costMonth: z.string(),
          rentAmount: z.string(),
          laborAmount: z.string(),
          ingredientCostRate: z.string(),
        }),
      )
      .min(1),
  })
  .superRefine((form, context) => {
    form.items.forEach((item, index) => {
      const amountFields = [
        ['rentAmount', '임대료'],
        ['laborAmount', '인건비'],
      ] as const
      amountFields.forEach(([field, label]) => {
        const value = item[field]
        let message = ''
        if (!value) message = `${label}를 입력해주세요.`
        else if (/^-/.test(value))
          message = `${label}는 0 이상의 금액으로 입력해주세요.`
        else if (!/^\d+$/.test(value))
          message = `${label}는 원 단위 정수로 입력해주세요.`
        else if (!Number.isSafeInteger(Number(value)))
          message = `${label}가 허용 범위를 초과했습니다.`
        if (message)
          context.addIssue({
            code: 'custom',
            message,
            path: ['items', index, field],
          })
      })

      const rate = item.ingredientCostRate
      let rateMessage = ''
      if (!rate) rateMessage = '원가율을 입력해주세요.'
      else if (/^-/.test(rate) || Number(rate) < 0 || Number(rate) > 100) {
        rateMessage = '원가율은 0에서 100 사이로 입력해주세요.'
      } else if (!/^\d+(\.\d+)?$/.test(rate)) {
        rateMessage = '원가율을 숫자로 입력해주세요.'
      } else if (/\.\d{2,}$/.test(rate)) {
        rateMessage = '원가율은 소수점 첫째 자리까지 입력할 수 있습니다.'
      }
      if (rateMessage)
        context.addIssue({
          code: 'custom',
          message: rateMessage,
          path: ['items', index, 'ingredientCostRate'],
        })
    })
  })

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function formatAmount(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

function toFields(month: SalesUploadCostMonth): CostFields {
  return {
    costMonth: month.costMonth,
    rentAmount: month.rentAmount === null ? '' : String(month.rentAmount),
    laborAmount: month.laborAmount === null ? '' : String(month.laborAmount),
    ingredientCostRate:
      month.ingredientCostRate === null ? '' : String(month.ingredientCostRate),
  }
}

export function SalesProfitCostEntryPage() {
  const { uploadId: uploadIdText } = useParams()
  const uploadId = Number(uploadIdText)
  const navigate = useNavigate()
  const [sources, setSources] = useState<SalesUploadCostMonth['source'][]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [visitedMonths, setVisitedMonths] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CostForm>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: { items: [] },
  })
  const items = useWatch({ control, name: 'items' }) ?? []

  useEffect(() => {
    if (!Number.isSafeInteger(uploadId) || uploadId <= 0) {
      setLoadError('업로드 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }
    let ignore = false
    setIsLoading(true)
    getSalesUploadCostEntry(uploadId)
      .then((data) => {
        if (ignore) return
        setSources(data.months.map((month) => month.source))
        setActiveIndex(0)
        setVisitedMonths(
          new Set(data.months[0] ? [data.months[0].costMonth] : []),
        )
        reset({ items: data.months.map(toFields) })
      })
      .catch((error) => {
        if (ignore) return
        if (isUnauthorized(error)) {
          navigate('/login')
          return
        }
        setLoadError(
          '순이익 분석 정보를 불러오지 못했습니다. 다시 시도해주세요.',
        )
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [uploadId, navigate, reset])

  const showNextMonth = async () => {
    const current = getValues(`items.${activeIndex}`)
    if (!current || activeIndex >= items.length - 1) return
    const valid = await trigger([
      `items.${activeIndex}.rentAmount`,
      `items.${activeIndex}.laborAmount`,
      `items.${activeIndex}.ingredientCostRate`,
    ])
    if (!valid) return

    const nextIndex = activeIndex + 1
    const nextMonth = getValues(`items.${nextIndex}.costMonth`)
    if (nextMonth && !visitedMonths.has(nextMonth)) {
      if (sources[nextIndex] !== 'SAVED') {
        setValue(`items.${nextIndex}.rentAmount`, current.rentAmount)
        setValue(`items.${nextIndex}.laborAmount`, current.laborAmount)
        setValue(
          `items.${nextIndex}.ingredientCostRate`,
          current.ingredientCostRate,
        )
      }
      setVisitedMonths((months) => new Set(months).add(nextMonth))
    }
    setActiveIndex(nextIndex)
    setSaveError('')
  }

  const save = handleSubmit(async (form) => {
    setSaveError('')
    try {
      await saveSalesUploadCosts(
        uploadId,
        form.items.map((item) => ({
          costMonth: item.costMonth,
          rentAmount: Number(item.rentAmount),
          laborAmount: Number(item.laborAmount),
          ingredientCostRate: Number(item.ingredientCostRate),
        })),
      )
      navigate('/sales/analysis', {
        state: { refreshForecastAfterUpload: true },
      })
    } catch (error) {
      if (isUnauthorized(error)) {
        navigate('/login')
        return
      }
      const response = error as {
        response?: {
          data?: {
            data?: {
              fieldErrors?: {
                costMonth: string
                field: keyof CostFields
                message: string
              }[]
            }
          }
        }
      }
      const fieldErrors = response.response?.data?.data?.fieldErrors
      if (fieldErrors?.length) {
        fieldErrors.forEach((fieldError) => {
          const index = form.items.findIndex(
            (item) => item.costMonth === fieldError.costMonth,
          )
          if (index >= 0 && fieldError.field !== 'costMonth') {
            setError(`items.${index}.${fieldError.field}`, {
              message: fieldError.message,
            })
            setActiveIndex(index)
          }
        })
      }
      setSaveError(
        '순이익 분석 정보를 저장하지 못했습니다. 입력값을 확인하고 다시 시도해주세요.',
      )
    }
  })

  return (
    <AppShell title="순이익 분석 정보 입력" backTo="/sales/upload">
      <div className="page-stack profit-cost-page">
        <header className="page-title">
          <p>SALES · 순이익 분석</p>
          <h1>순이익 분석 정보 입력</h1>
          <span>
            파일에 포함된 달의 비용을 순서대로 확인해주세요.
            <br />
            나중에 입력해도 됩니다.
          </span>
        </header>
        {isLoading && (
          <p role="status">매출 월과 저장된 비용을 확인하고 있어요.</p>
        )}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}
        {!isLoading && !loadError && items.length === 0 && (
          <p role="status">
            이 파일에서 비용을 입력할 매출 월을 찾지 못했습니다.
          </p>
        )}
        {!isLoading && !loadError && items.length > 0 && (
          <form className="profit-cost-form" onSubmit={save} noValidate>
            <p className="profit-cost-progress" aria-live="polite">
              {activeIndex + 1} / {items.length} ·{' '}
              {monthLabel(items[activeIndex].costMonth)}
            </p>
            {items.map((item, index) => (
              <section
                className="profit-cost-month"
                key={item.costMonth}
                hidden={index !== activeIndex}
              >
                <div className="profit-cost-month-heading">
                  <h2>{monthLabel(item.costMonth)}</h2>
                  {sources[index] === 'SUGGESTED' && (
                    <span>이전 달 값 · 이번 달 미저장</span>
                  )}
                  {sources[index] === 'SAVED' && <span>저장된 값</span>}
                </div>
                {index > 0 && sources[index] !== 'SAVED' && (
                  <p className="profit-cost-copy-note">
                    이전 달 입력값을 채워두었어요. 이번 달 비용에 맞게 수정할 수
                    있습니다.
                  </p>
                )}
                <Controller
                  control={control}
                  name={`items.${index}.rentAmount`}
                  render={({ field }) => (
                    <label className="profit-cost-field">
                      <strong>임대료</strong>
                      <span className="profit-cost-input">
                        <input
                          {...field}
                          inputMode="numeric"
                          placeholder="예: 1,800,000"
                          aria-invalid={Boolean(
                            errors.items?.[index]?.rentAmount,
                          )}
                          value={formatAmount(field.value ?? '')}
                          onChange={(event) => {
                            const value = event.target.value.replace(/,/g, '')
                            if (/^\d*$/.test(value)) field.onChange(value)
                          }}
                        />
                        <em>원</em>
                      </span>
                      <small>
                        {errors.items?.[index]?.rentAmount?.message ??
                          '관리비를 포함한 월 임대료를 입력해주세요.'}
                      </small>
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.laborAmount`}
                  render={({ field }) => (
                    <label className="profit-cost-field">
                      <strong>인건비</strong>
                      <span className="profit-cost-input">
                        <input
                          {...field}
                          inputMode="numeric"
                          placeholder="예: 2,400,000"
                          aria-invalid={Boolean(
                            errors.items?.[index]?.laborAmount,
                          )}
                          value={formatAmount(field.value ?? '')}
                          onChange={(event) => {
                            const value = event.target.value.replace(/,/g, '')
                            if (/^\d*$/.test(value)) field.onChange(value)
                          }}
                        />
                        <em>원</em>
                      </span>
                      <small>
                        {errors.items?.[index]?.laborAmount?.message ??
                          '사장님 본인 인건비도 포함해서 입력해주세요.'}
                      </small>
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.ingredientCostRate`}
                  render={({ field }) => (
                    <label className="profit-cost-field">
                      <strong>원가율</strong>
                      <span className="profit-cost-input">
                        <input
                          {...field}
                          inputMode="decimal"
                          placeholder="예: 40"
                          aria-invalid={Boolean(
                            errors.items?.[index]?.ingredientCostRate,
                          )}
                          onChange={(event) => {
                            if (/^\d*\.?\d*$/.test(event.target.value))
                              field.onChange(event.target.value)
                          }}
                        />
                        <em>%</em>
                      </span>
                      <small>
                        {errors.items?.[index]?.ingredientCostRate?.message ??
                          '한 달 매출 중 식자재비가 차지하는 비율을 입력해주세요.'}
                      </small>
                    </label>
                  )}
                />
              </section>
            ))}
            <p className="profit-cost-notice">
              ⓘ 공과금, 카드·배달 수수료 등은 포함되지 않아요. 실제 순수익과
              차이가 발생할 수 있어요.
            </p>
            {saveError && (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="profit-cost-actions">
              {activeIndex > 0 && (
                <button
                  type="button"
                  className="profit-cost-back"
                  onClick={() => setActiveIndex(activeIndex - 1)}
                >
                  이전 달
                </button>
              )}
              {activeIndex < items.length - 1 ? (
                <button
                  className="primary-action full-width"
                  type="button"
                  onClick={() => void showNextMonth()}
                >
                  다음 달 입력
                </button>
              ) : (
                <button
                  className="primary-action full-width"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '저장하고 분석 보기'}
                </button>
              )}
            </div>
          </form>
        )}
        {Number.isSafeInteger(uploadId) && uploadId > 0 && (
          <>
            <p className="profit-cost-skip-notice" id="profit-cost-skip-notice">
              비용 입력을 건너뛰면 순이익 분석을 확인할 수 없어요. 나중에 비용을
              입력하면 확인할 수 있어요.
            </p>
            <button
              className="profit-cost-skip"
              type="button"
              aria-describedby="profit-cost-skip-notice"
              disabled={isSubmitting}
              onClick={() =>
                navigate('/sales/analysis', {
                  state: { refreshForecastAfterUpload: true },
                })
              }
            >
              건너뛰고 매출 분석 보기
            </button>
          </>
        )}
      </div>
    </AppShell>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSalesUploadHistory,
  getSalesUploadStatus,
  uploadSalesFile,
  type SalesUploadHistoryResponse,
  type SalesUploadStatus,
} from '../features/sales/api/salesApi'
import { AppShell } from '../shared/ui/AppShell'
import { AnalysisLoadingDialog } from '../features/sales/ui/AnalysisLoadingDialog'

const supportedExtensions = ['xlsx']
const MAX_REQUESTABLE_PAGE = 5
const HISTORY_PAGE_SIZE = 5
const API_PAGE_SIZE = 10
const STATUS_POLL_INTERVAL_MS = 1500

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'
  return `${month}.${day}`
}

function formatEyebrowDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'
  return `${year}.${month}.${day} 기준`
}

function statusLabel(status: SalesUploadStatus | null) {
  switch (status) {
    case 'COMPLETED':
      return '최신'
    case 'PROCESSING':
      return '분석 중'
    case 'PENDING':
      return '대기 중'
    case 'FAILED':
      return '실패'
    default:
      return '-'
  }
}

function historyStatusLabel(status: SalesUploadStatus) {
  switch (status) {
    case 'COMPLETED':
      return '성공'
    case 'PROCESSING':
      return '분석 중'
    case 'PENDING':
      return '대기 중'
    case 'FAILED':
      return '실패'
  }
}

export function SalesUploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [history, setHistory] = useState<SalesUploadHistoryResponse | null>(
    null,
  )
  const [historyPage, setHistoryPage] = useState(1)
  const historyApiPage = Math.ceil(
    historyPage / (API_PAGE_SIZE / HISTORY_PAGE_SIZE),
  )
  const historyTouchStart = useRef<{ x: number; y: number } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [processingUploadId, setProcessingUploadId] = useState<number | null>(
    null,
  )
  const [processingMessage, setProcessingMessage] = useState('')
  const [statusLookupFailed, setStatusLookupFailed] = useState(false)
  const [pollAttempt, setPollAttempt] = useState(0)
  const [historyRevision, setHistoryRevision] = useState(0)
  const uploadAbort = useRef<AbortController | null>(null)
  const [validatedUploadId, setValidatedUploadId] = useState<number | null>(
    null,
  )

  useEffect(() => {
    let ignore = false
    setIsLoadingHistory(true)
    getSalesUploadHistory({ page: historyApiPage, size: API_PAGE_SIZE })
      .then((response) => {
        if (!ignore) setHistory(response)
      })
      .catch((error) => {
        if (ignore) return
        if (isUnauthorized(error)) {
          navigate('/login')
          return
        }
        setSubmitError('업로드 기록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!ignore) setIsLoadingHistory(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate, historyApiPage, historyRevision])

  useEffect(() => () => uploadAbort.current?.abort(), [])

  useEffect(() => {
    if (processingUploadId === null) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      try {
        const result = await getSalesUploadStatus(
          processingUploadId,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setProcessingMessage(result.message)
        if (result.status === 'COMPLETED') {
          setValidatedUploadId(processingUploadId)
          setProcessingUploadId(null)
          setIsSubmitting(false)
          setHistoryRevision((revision) => revision + 1)
          return
        }
        if (result.status === 'FAILED') {
          setSubmitError(
            result.message ||
              '매출 파일 처리에 실패했습니다. 파일을 확인해 주세요.',
          )
          setProcessingUploadId(null)
          setIsSubmitting(false)
          setHistoryRevision((revision) => revision + 1)
          return
        }
        timer = setTimeout(poll, STATUS_POLL_INTERVAL_MS)
      } catch (error) {
        if (controller.signal.aborted) return
        setIsSubmitting(false)
        if (isUnauthorized(error)) {
          navigate('/login')
          return
        }
        setStatusLookupFailed(true)
        setSubmitError(
          '처리 상태를 확인하지 못했습니다. 파일을 다시 올리지 않고 상태를 다시 확인해 주세요.',
        )
      }
    }

    void poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [processingUploadId, pollAttempt, navigate])

  const selectFile = (file?: File) => {
    if (!file) return
    setValidatedUploadId(null)
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !supportedExtensions.includes(extension)) {
      setSelectedFile(null)
      setFileError('xlsx 파일만 업로드할 수 있습니다.')
      return
    }
    setFileError('')
    setSubmitError('')
    setSelectedFile(file)
  }

  const startAnalysis = async () => {
    if (!selectedFile || isSubmitting || processingUploadId !== null) return
    const controller = new AbortController()
    uploadAbort.current = controller
    setIsSubmitting(true)
    setSubmitError('')
    setProcessingMessage('파일을 업로드하고 있어요.')
    try {
      const result = await uploadSalesFile(selectedFile, controller.signal)
      if (controller.signal.aborted) return
      if (result.status === 'COMPLETED') {
        setValidatedUploadId(result.data.uploadId)
        setIsSubmitting(false)
        setHistoryRevision((revision) => revision + 1)
      } else if (
        result.status === 'PENDING' ||
        result.status === 'PROCESSING'
      ) {
        setProcessingMessage(result.message)
        setStatusLookupFailed(false)
        setProcessingUploadId(result.data.uploadId)
      } else {
        setSubmitError(result.message || '매출 파일 처리에 실패했습니다.')
        setIsSubmitting(false)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setIsSubmitting(false)
      if (isUnauthorized(error)) {
        navigate('/login')
        return
      }
      setSubmitError('매출 파일 업로드에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  const connection = history?.connection
  const maxNavigablePage = history
    ? Math.max(
        1,
        Math.min(
          Math.ceil(history.totalCount / HISTORY_PAGE_SIZE),
          MAX_REQUESTABLE_PAGE * (API_PAGE_SIZE / HISTORY_PAGE_SIZE),
        ),
      )
    : 1
  const historyOffset =
    ((historyPage - 1) % (API_PAGE_SIZE / HISTORY_PAGE_SIZE)) *
    HISTORY_PAGE_SIZE
  const visibleHistory =
    history?.items.slice(historyOffset, historyOffset + HISTORY_PAGE_SIZE) ?? []
  const changeHistoryPage = (direction: number) => {
    if (isLoadingHistory) return
    setHistoryPage((page) =>
      Math.min(maxNavigablePage, Math.max(1, page + direction)),
    )
  }

  return (
    <AppShell
      title="매출 데이터 연결"
      backTo="/sales/analysis"
      contentClassName="sales-upload-content"
    >
      <div className="page-stack sales-upload-page">
        <header className="page-title sales-upload-intro">
          <p className="page-eyebrow-date">{formatEyebrowDate(new Date())}</p>
          <h1>매출 분석</h1>
          <span>매출 파일을 업로드하고 분석 결과를 확인해 보세요.</span>
        </header>

        <label className="upload-dropzone">
          <input
            aria-label="매출 파일 선택"
            type="file"
            disabled={isSubmitting || processingUploadId !== null}
            accept=".xlsx"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <span aria-hidden="true">↑</span>
          <strong>{selectedFile?.name || '매출 파일을 선택해 주세요'}</strong>
          <small>xlsx · 최대 10MB · 한 번에 한 개</small>
        </label>
        {fileError && (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        )}

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        {statusLookupFailed && processingUploadId !== null ? (
          <button
            type="button"
            className="primary-action full-width"
            onClick={() => {
              setStatusLookupFailed(false)
              setSubmitError('')
              setIsSubmitting(true)
              setPollAttempt((attempt) => attempt + 1)
            }}
          >
            상태 다시 확인
          </button>
        ) : validatedUploadId !== null ? (
          <button
            type="button"
            className="primary-action full-width"
            onClick={() =>
              navigate(`/sales/uploads/${validatedUploadId}/cost-items`)
            }
          >
            다음 단계
          </button>
        ) : (
          <button
            type="button"
            className="primary-action full-width"
            aria-busy={isSubmitting}
            disabled={!selectedFile || isSubmitting}
            onClick={startAnalysis}
          >
            {isSubmitting ? '분석 중...' : '분석 시작'}
          </button>
        )}
        {isSubmitting && <AnalysisLoadingDialog message={processingMessage} />}

        <section className="connection-status">
          <p className="section-label">누적 반영 매출</p>
          <div className="passbook">
            <p className="passbook-num">
              {isLoadingHistory
                ? '-'
                : (connection?.totalAppliedRecordCount ?? 0).toLocaleString()}
              <span>건</span>
            </p>
            <div className="passbook-meta">
              <span>
                마지막 업로드{' '}
                <b>
                  {isLoadingHistory
                    ? '-'
                    : formatDate(connection?.lastUploadedAt ?? null)}
                </b>
              </span>
              <span>
                상태{' '}
                <b>
                  {isLoadingHistory
                    ? '-'
                    : statusLabel(connection?.latestStatus ?? null)}
                </b>
              </span>
            </div>
          </div>
          <p className="connection-status-guide">
            같은 기간을 다시 업로드한 경우에도 중복 없이 반영된 건수예요.
          </p>
        </section>

        <section className="upload-history">
          <p className="section-label">업로드 기록</p>
          <div
            className="upload-history-list"
            aria-label="업로드 기록 목록"
            aria-busy={isLoadingHistory}
            onTouchStart={(event) => {
              const touch = event.touches[0]
              historyTouchStart.current = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null
            }}
            onTouchCancel={() => {
              historyTouchStart.current = null
            }}
            onTouchEnd={(event) => {
              const start = historyTouchStart.current
              historyTouchStart.current = null
              const touch = event.changedTouches[0]
              if (!start || !touch) return
              const dx = touch.clientX - start.x
              const dy = touch.clientY - start.y
              if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                changeHistoryPage(dx < 0 ? 1 : -1)
              }
            }}
          >
            {visibleHistory.map((item) => (
              <div className="upload-history-row" key={item.uploadId}>
                <div>
                  <strong title={item.fileName}>{item.fileName}</strong>
                  <span>{formatDate(item.uploadedAt)}</span>
                </div>
                <div className="upload-history-meta">
                  <span className="upload-history-count">
                    {item.appliedRecordCount.toLocaleString()}건
                  </span>
                  <span
                    className={
                      item.status === 'COMPLETED'
                        ? 'status-badge status-success'
                        : item.status === 'FAILED'
                          ? 'status-badge status-failed'
                          : 'status-badge status-pending'
                    }
                  >
                    {historyStatusLabel(item.status)}
                  </span>
                </div>
              </div>
            ))}
            {!isLoadingHistory && history?.items.length === 0 && (
              <p className="upload-history-empty">
                아직 업로드한 매출 파일이 없습니다.
              </p>
            )}
          </div>
          {history && maxNavigablePage > 1 && (
            <div className="upload-history-pagination">
              <button
                type="button"
                aria-label="이전"
                disabled={isLoadingHistory || historyPage <= 1}
                onClick={() => changeHistoryPage(-1)}
              >
                <span aria-hidden="true">←</span>
              </button>
              <span aria-live="polite">
                {historyPage} / {maxNavigablePage}
              </span>
              <button
                type="button"
                aria-label="다음"
                disabled={isLoadingHistory || historyPage >= maxNavigablePage}
                onClick={() => changeHistoryPage(1)}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

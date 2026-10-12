import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSalesUploadHistory,
  uploadSalesFile,
  type SalesUploadHistoryResponse,
  type SalesUploadStatus,
} from '../features/sales/api/salesApi'
import { AppShell } from '../shared/ui/AppShell'

const supportedExtensions = ['xlsx']
const MAX_REQUESTABLE_PAGE = 5

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [validatedUploadId, setValidatedUploadId] = useState<number | null>(null)

  useEffect(() => {
    let ignore = false
    setIsLoadingHistory(true)
    getSalesUploadHistory({ page: historyPage })
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
  }, [navigate, historyPage])

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
    if (!selectedFile) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const result = await uploadSalesFile(selectedFile)
      if (result.status !== 'COMPLETED') {
        setSubmitError('매출 파일 처리가 완료된 뒤 다음 단계로 이동할 수 있습니다.')
        return
      }
      setValidatedUploadId(result.data.uploadId)
    } catch (error) {
      if (isUnauthorized(error)) {
        navigate('/login')
        return
      }
      setSubmitError('매출 파일 업로드에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const connection = history?.connection
  const maxNavigablePage = history
    ? Math.min(history.totalPages, MAX_REQUESTABLE_PAGE)
    : 1

  return (
    <AppShell title="매출 데이터 연결">
      <div className="page-stack sales-upload-page">
        <header className="page-title">
          <p className="page-eyebrow-date">{formatEyebrowDate(new Date())}</p>
          <h1>매출 장부</h1>
          <span>업로드한 매출을 장부처럼 모아두고 있어요</span>
        </header>

        <label className="upload-dropzone">
          <input
            aria-label="매출 파일 선택"
            type="file"
            accept=".xlsx"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <span aria-hidden="true">↑</span>
          <strong>
            {selectedFile?.name || '매출 파일을 여기에 놓아주세요'}
          </strong>
          <small>xlsx · 최대 10MB · 한 번에 한 개</small>
        </label>
        {fileError && (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        )}
        {selectedFile && !fileError && (
          <div className="upload-ready">
            <strong>파일을 확인했어요</strong>
            <span>{selectedFile.name}</span>
          </div>
        )}

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

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="button"
          className="primary-action full-width"
          disabled={!selectedFile || isSubmitting || validatedUploadId !== null}
          onClick={startAnalysis}
        >
          {isSubmitting ? '분석을 시작하는 중...' : '분석 시작'}
        </button>
        {validatedUploadId !== null && (
          <div className="upload-ready" role="status">
            <strong>파일 오류 검사가 완료됐어요.</strong>
            <span>다음 단계에서 순이익 분석 정보를 확인해주세요.</span>
            <button
              type="button"
              className="primary-action"
              onClick={() => navigate(`/sales/uploads/${validatedUploadId}/cost-items`)}
            >
              다음 단계
            </button>
          </div>
        )}

        <section className="upload-history">
          <p className="section-label">업로드 기록</p>
          <div className="upload-history-list">
            {history?.items.map((item) => (
              <div className="upload-history-row" key={item.uploadId}>
                <div>
                  <strong>{item.fileName}</strong>
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
          {!isLoadingHistory && history && maxNavigablePage > 1 && (
            <div className="upload-history-pagination">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </button>
              <span>
                {historyPage} / {maxNavigablePage}
              </span>
              <button
                type="button"
                disabled={historyPage >= maxNavigablePage}
                onClick={() =>
                  setHistoryPage((prev) => Math.min(maxNavigablePage, prev + 1))
                }
              >
                다음
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

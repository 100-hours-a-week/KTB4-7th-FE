import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSalesUploadHistory,
  uploadSalesFile,
  type SalesUploadHistoryResponse,
  type SalesUploadStatus,
} from '../features/sales/api/salesApi'
import { AppShell } from '../shared/ui/AppShell'

const supportedExtensions = ['csv', 'xlsx', 'xls']

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
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let ignore = false
    getSalesUploadHistory()
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
  }, [navigate])

  const selectFile = (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !supportedExtensions.includes(extension)) {
      setSelectedFile(null)
      setFileError('CSV 또는 엑셀 파일만 업로드할 수 있습니다.')
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
      await uploadSalesFile(selectedFile)
      navigate('/sales/analysis')
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

  return (
    <AppShell title="매출 데이터 연결">
      <div className="page-stack sales-upload-page">
        <header className="page-title">
          <p>SALES DATA</p>
          <h1>매출 데이터 연결</h1>
          <span>
            POS 매출 데이터를 올려주시면 AI가 우리 가게를 분석해드려요
          </span>
        </header>

        <label className="upload-dropzone">
          <input
            aria-label="매출 파일 선택"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <span aria-hidden="true">↑</span>
          <strong>{selectedFile?.name || '파일을 올려주세요'}</strong>
          <small>xlsx, xls, csv · 최대 10MB · 한 번에 한 개</small>
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
          <h2>연결 상태</h2>
          <div className="connection-status-grid">
            <div className="connection-status-card">
              <small>마지막 업로드</small>
              <strong>
                {isLoadingHistory
                  ? '-'
                  : formatDate(connection?.lastUploadedAt ?? null)}
              </strong>
            </div>
            <div className="connection-status-card">
              <small>총 데이터 건수</small>
              <strong>
                {isLoadingHistory
                  ? '-'
                  : `${(connection?.totalAppliedRecordCount ?? 0).toLocaleString()}건`}
              </strong>
            </div>
            <div className="connection-status-card">
              <small>최신 상태</small>
              <strong>
                {isLoadingHistory
                  ? '-'
                  : statusLabel(connection?.latestStatus ?? null)}
              </strong>
            </div>
          </div>
        </section>

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="button"
          className="primary-action full-width"
          disabled={!selectedFile || isSubmitting}
          onClick={startAnalysis}
        >
          {isSubmitting ? '분석을 시작하는 중...' : '분석 시작'}
        </button>

        <section className="upload-history">
          <h2>업로드 기록</h2>
          <div className="upload-history-list">
            {history?.items.map((item) => (
              <div className="upload-history-row" key={item.uploadId}>
                <div>
                  <strong>{formatDate(item.uploadedAt)}</strong>
                  <span>{item.fileName}</span>
                </div>
                <div className="upload-history-meta">
                  <span>{item.appliedRecordCount.toLocaleString()}건</span>
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
        </section>
      </div>
    </AppShell>
  )
}

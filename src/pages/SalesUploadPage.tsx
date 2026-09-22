import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../shared/ui/AppShell'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'

const supportedExtensions = ['csv', 'xlsx', 'xls']

export function SalesUploadPage() {
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const { salesConnection } = dashboardFixtures

  const selectFile = (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !supportedExtensions.includes(extension)) {
      setFileName('')
      setError('CSV 또는 엑셀 파일만 업로드할 수 있습니다.')
      return
    }
    setError('')
    setFileName(file.name)
  }

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
          <strong>{fileName || '파일을 올려주세요'}</strong>
          <small>xlsx, xls, csv · 최대 10MB · 한 번에 한 개</small>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {fileName && (
          <div className="upload-ready">
            <strong>파일을 확인했어요</strong>
            <span>{fileName} · 서버에 전송되지 않는 목업입니다.</span>
          </div>
        )}

        <section className="connection-status">
          <h2>연결 상태</h2>
          <div className="connection-status-grid">
            <div className="connection-status-card">
              <small>마지막 업로드</small>
              <strong>{salesConnection.lastUploadDate}</strong>
            </div>
            <div className="connection-status-card">
              <small>총 데이터 건수</small>
              <strong>{salesConnection.totalRecords.toLocaleString()}건</strong>
            </div>
            <div className="connection-status-card">
              <small>예측 종료일</small>
              <strong>{salesConnection.forecastEndDate}</strong>
            </div>
          </div>
          <p className="connection-status-note">
            {salesConnection.forecastNote}
          </p>
        </section>

        <Link className="primary-action full-width" to="/sales/analysis">
          다음 단계
        </Link>

        <section className="upload-history">
          <h2>업로드 기록</h2>
          <div className="upload-history-list">
            {salesConnection.history.map((item) => (
              <div className="upload-history-row" key={item.id}>
                <div>
                  <strong>{item.date}</strong>
                  <span>{item.fileName}</span>
                </div>
                <div className="upload-history-meta">
                  <span>{item.count}건</span>
                  <span
                    className={
                      item.status === 'success'
                        ? 'status-badge status-success'
                        : 'status-badge status-failed'
                    }
                  >
                    {item.status === 'success' ? '성공' : '실패'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

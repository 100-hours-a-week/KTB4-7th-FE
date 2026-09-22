import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../shared/ui/AppShell'

const supportedExtensions = ['csv', 'xlsx', 'xls']

export function SalesUploadPage() {
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
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
    <AppShell title="매출 업로드">
      <div className="page-stack sales-upload-page">
        <header className="page-title">
          <p>SALES DATA</p>
          <h1>매출을 알려주세요</h1>
          <span>
            파일을 선택하면 맴매가 매장의 흐름을 정리할 준비를 합니다.
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
          <strong>{fileName || '매출 파일을 선택하세요'}</strong>
          <small>CSV, XLSX, XLS 파일을 지원합니다.</small>
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
            <Link className="primary-action" to="/sales/analysis">
              분석 화면 미리 보기
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}

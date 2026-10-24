import { useEffect, useRef } from 'react'
import { CoffeePourLoader } from './CoffeePourLoader'

export function AnalysisLoadingDialog({ message }: { message?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="analysis-loading-dialog"
      aria-labelledby="analysis-loading-title"
      aria-describedby="analysis-loading-description"
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => event.preventDefault()}
    >
      <CoffeePourLoader />
      <div role="status" aria-live="polite">
        <h2 id="analysis-loading-title">매출을 분석하고 있어요</h2>
        <p id="analysis-loading-description">
          {message || '파일을 확인하고 분석을 준비하고 있어요.'}
          <br />
          잠시만 기다려 주세요.
        </p>
      </div>
    </dialog>
  )
}

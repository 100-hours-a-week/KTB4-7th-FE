import { Link } from 'react-router-dom'
import { AppShell } from '../shared/ui/AppShell'
import { EmptyState } from '../shared/ui/EmptyState'

export function NotFoundPage() {
  return (
    <AppShell title="페이지 없음" tone="paper">
      <EmptyState
        title="페이지를 찾을 수 없습니다"
        description="주소를 다시 확인하거나 홈으로 돌아가 주세요."
        action={<Link to="/">홈으로 이동</Link>}
      />
    </AppShell>
  )
}

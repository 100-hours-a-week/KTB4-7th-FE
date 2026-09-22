import { Link } from 'react-router-dom'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { SectionCard } from '../shared/ui/SectionCard'
import { AppShell } from '../shared/ui/AppShell'

export function ProfilePage() {
  const { profile } = dashboardFixtures
  return (
    <AppShell title="프로필">
      <div className="page-stack">
        <header className="profile-hero">
          <span>{profile.storeName.slice(0, 1)}</span>
          <p>{profile.ownerName} 사장님</p>
          <h1>{profile.storeName}</h1>
          <small>{profile.email}</small>
        </header>
        <SectionCard eyebrow="STORE" title="매장 정보">
          <dl className="profile-details">
            <div>
              <dt>사업자등록번호</dt>
              <dd>{profile.businessNumber}</dd>
            </div>
            <div>
              <dt>계정 이메일</dt>
              <dd>{profile.email}</dd>
            </div>
          </dl>
        </SectionCard>
        <nav className="profile-menu" aria-label="프로필 메뉴">
          <Link to="/sales/upload">
            매출 데이터 업로드 <span>›</span>
          </Link>
          <Link to="/notifications">
            알림 설정 <span>›</span>
          </Link>
          <Link to="/">
            서비스 소개 <span>›</span>
          </Link>
        </nav>
      </div>
    </AppShell>
  )
}

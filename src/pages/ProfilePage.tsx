import { Link, useNavigate } from 'react-router-dom'
import { dashboardFixtures } from '../entities/dashboard/model/fixtures'
import { logout } from '../features/auth/api/loginApi'
import { AppShell } from '../shared/ui/AppShell'

export function ProfilePage() {
  const { profile } = dashboardFixtures
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/')
    }
  }

  return (
    <AppShell title="마이페이지">
      <div className="page-stack">
        <header className="profile-hero">
          <span>{profile.storeName.slice(0, 1)}</span>
          <p>{profile.storeName}님, 안녕하세요</p>
          <h1>{profile.ownerName} 사장님</h1>
          <small>{profile.joinedAt}부터 함께하고 있어요</small>
        </header>

        <dl className="profile-details">
          <div>
            <dt>휴대폰 번호</dt>
            <dd>{profile.phone}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{profile.email}</dd>
          </div>
        </dl>

        <nav className="profile-menu" aria-label="프로필 메뉴">
          <Link to="/profile">
            비밀번호 수정 <span>›</span>
          </Link>
          <Link to="/profile">
            사업자 정보 확인 및 수정 <span>›</span>
          </Link>
          <Link to="/notifications">
            알림 설정 <span>›</span>
          </Link>
          <button
            type="button"
            className="profile-menu-action"
            onClick={handleLogout}
          >
            로그아웃 <span>›</span>
          </button>
          <Link to="/" className="danger-link">
            회원탈퇴 <span>›</span>
          </Link>
        </nav>
        <p className="profile-menu-caption">
          회원탈퇴 시 계정 및 서비스 이용 정보가 삭제되며 복구할 수 없습니다.
        </p>
      </div>
    </AppShell>
  )
}

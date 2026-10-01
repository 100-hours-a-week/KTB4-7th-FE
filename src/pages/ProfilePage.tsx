import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/loginApi'
import {
  getMyProfile,
  withdraw,
  type UserProfile,
} from '../features/auth/api/userApi'
import { AppShell } from '../shared/ui/AppShell'

type LocationState = { passwordChanged?: boolean } | null

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 11) return phone
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const passwordChanged = Boolean(
    (location.state as LocationState)?.passwordChanged,
  )

  useEffect(() => {
    let isMounted = true
    getMyProfile()
      .then((data) => {
        if (isMounted) setProfile(data)
      })
      .catch((requestError) => {
        if (!isMounted) return
        const status =
          typeof requestError === 'object' &&
          requestError !== null &&
          'response' in requestError
            ? (requestError as { response?: { status?: number } }).response
                ?.status
            : undefined
        if (status === 401) {
          navigate('/login')
          return
        }
        setLoadError('프로필 정보를 불러오지 못했습니다.')
      })
    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/')
    }
  }

  const handleWithdraw = async () => {
    setWithdrawError('')
    setIsWithdrawing(true)
    try {
      await withdraw()
      navigate('/')
    } catch {
      setWithdrawError('회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (loadError) {
    return (
      <AppShell title="마이페이지" tone="white">
        <p role="alert">{loadError}</p>
      </AppShell>
    )
  }

  if (!profile) {
    return (
      <AppShell title="마이페이지" tone="white">
        <p>불러오는 중...</p>
      </AppShell>
    )
  }

  return (
    <AppShell title="마이페이지" tone="white">
      <div className="page-stack profile-editorial-page">
        {passwordChanged && (
          <p className="form-success">비밀번호가 변경되었습니다.</p>
        )}
        <figure className="profile-editorial-hero">
          <img
            src="/assets/profile-coffee-tasting-halftone.png"
            alt="커피를 맛보는 세 명의 사람들"
          />
          <figcaption>OWNER PROFILE / MEMME ARCHIVE</figcaption>
        </figure>
        <header className="merchant-card">
          <div className="merchant-card-top">
            <span className="merchant-mono">OWNER RECORD / 01</span>
            <span className="merchant-seal">
              {profile.storeName.slice(0, 1)}
            </span>
          </div>
          <p className="merchant-card-kicker">STORE INFORMATION</p>
          <h1 className="merchant-name">{profile.storeName} 사장님</h1>
          <p className="merchant-role">오늘도 매장의 기록을 이어가요.</p>
          <dl className="merchant-card-meta">
            <div>
              <dt>PHONE</dt>
              <dd>{formatPhone(profile.phone)}</dd>
            </div>
            <div>
              <dt>EMAIL</dt>
              <dd>{profile.email}</dd>
            </div>
          </dl>
        </header>

        <p className="profile-index-title">ACCOUNT INDEX</p>
        <nav className="profile-menu" aria-label="프로필 메뉴">
          <Link to="/profile/password">
            <span className="profile-menu-label">
              <b>01</b> 비밀번호 수정
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/profile/store">
            <span className="profile-menu-label">
              <b>02</b> 사업자 정보 확인 및 수정
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/notifications/settings">
            <span className="profile-menu-label">
              <b>03</b> 알림 설정
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            className="profile-menu-action"
            onClick={handleLogout}
          >
            <span className="profile-menu-label">
              <b>04</b> 로그아웃
            </span>
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="profile-menu-action danger-link"
            onClick={() => setWithdrawModalOpen(true)}
          >
            <span className="profile-menu-label">
              <b>05</b> 회원탈퇴
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </nav>
        <p className="profile-menu-caption">
          회원탈퇴 시 계정 및 서비스 이용 정보가 삭제되며 복구할 수 없습니다.
        </p>
      </div>
      {isWithdrawModalOpen && (
        <div
          className="auth-modal-backdrop"
          role="presentation"
          onMouseDown={() => !isWithdrawing && setWithdrawModalOpen(false)}
        >
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-label="회원탈퇴"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>정말 탈퇴하시겠어요?</strong>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={isWithdrawing}
              >
                ×
              </button>
            </header>
            <div>
              {withdrawError && <p role="alert">{withdrawError}</p>}
              <p>
                탈퇴 시 계정 및 서비스 이용 정보가 삭제되며 복구할 수 없습니다.
              </p>
              <button
                type="button"
                className="danger-action"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}

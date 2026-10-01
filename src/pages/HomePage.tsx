import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyProfile } from '../features/auth/api/userApi'
import { AppShell } from '../shared/ui/AppShell'

export function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let ignore = false
    getMyProfile()
      .then(() => {
        if (!ignore) setIsAuthenticated(true)
      })
      .catch(() => {
        // 로그인하지 않은 사용자는 게스트용 랜딩을 그대로 봅니다.
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <AppShell title="맴매" tone="paper">
      <div className="landing-page landing-page--editorial">
        <main className="landing-editorial">
          <section className="landing-hero" aria-labelledby="landing-title">
            <p className="landing-kicker">SMART STORE PARTNER</p>
            <h1 id="landing-title">MEMME</h1>
            <ul className="landing-keywords" aria-label="맴매가 돕는 일">
              <li>매출 분석</li>
              <li>오늘의 솔루션</li>
              <li>실행 코칭</li>
            </ul>

            <img
              className="landing-illustration"
              src="/assets/memme-storefront-hero.png"
              alt="커피 봉투와 돈 봉투를 들고 씩씩하게 걷는 사장님"
            />

            <div className="landing-copy">
              <h2>
                사장님의 매장을 읽고,
                <br />
                오늘의 다음 한 가지를 제안해요.
              </h2>
              <p>
                복잡한 숫자는 맴매가 정리할게요. 사장님은 지금 필요한 일에만
                집중하세요.
              </p>
            </div>

            <div className="landing-actions">
              {!isAuthenticated ? (
                <Link className="landing-primary-action" to="/signup">
                  무료로 시작하기 <span aria-hidden="true">↗</span>
                </Link>
              ) : (
                <Link className="landing-primary-action" to="/solution">
                  오늘의 솔루션 보기 <span aria-hidden="true">↗</span>
                </Link>
              )}
              {!isAuthenticated && (
                <div className="landing-secondary-actions">
                  <Link to="/login">로그인</Link>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  )
}

import { Link } from 'react-router-dom'
import { AppShell } from '../shared/ui/AppShell'
export function HomePage() {
  return (
    <AppShell title="맴매">
      <div className="landing-page">
        <main>
          <section className="landing-hero">
            <p>FOR BETTER DAYS AT YOUR STORE</p>
            <h1>
              오늘의 매장을
              <br />더 가볍게
            </h1>
            <div>
              <span>
                맴매는 사장님의 매장 데이터를 읽고, 오늘 바로 실행할 수 있는
                다음 한 가지를 제안합니다.
              </span>
              <Link className="dark-button" to="/signup">
                무료로 시작하기
              </Link>
              <Link className="light-button" to="/login">
                로그인
              </Link>
              <Link className="light-button" to="/solution">
                솔루션 미리 보기
              </Link>
            </div>
          </section>
          <section className="landing-values">
            {[
              [
                '01',
                '흩어진 숫자 대신',
                '매출과 재고의 흐름을 한눈에 정리합니다.',
              ],
              [
                '02',
                '어려운 분석 대신',
                '오늘 먼저 하면 좋은 일을 짧고 분명하게 알려드립니다.',
              ],
              [
                '03',
                '혼자 고민하는 대신',
                '솔루션을 따라 실행하고 질문을 이어갈 수 있습니다.',
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <small>{n}</small>
                <h2>{t}</h2>
                <p>{d}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </AppShell>
  )
}

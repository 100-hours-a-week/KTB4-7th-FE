import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <main className="mobile-app-shell auth-app-shell">
      <div className="device-notch" aria-hidden="true" />
      <div className="auth-page">
        <header>
          <Link to="/" className="signup-brand">
            memme
          </Link>
          <span>LOGIN</span>
        </header>
        <section className="auth-intro">
          <p>WELCOME BACK</p>
          <h1>
            매장에 필요한
            <br />한 가지를 찾으세요.
          </h1>
          <span>로그인 기능은 백엔드 인증 API 연결 후 제공됩니다.</span>
        </section>
        <form
          className="login-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            이메일
            <input
              type="email"
              placeholder="이메일 주소"
              autoComplete="email"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </label>
          <button className="primary-action" type="submit">
            로그인 준비 중
          </button>
        </form>
        <p className="auth-footer">
          처음이라면 <Link to="/signup">회원가입</Link>으로 시작해 보세요.
        </p>
      </div>
    </main>
  )
}

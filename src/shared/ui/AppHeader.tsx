import { Link, NavLink } from 'react-router-dom'
export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="app-brand" to="/">
        memme
      </Link>
      <nav>
        <NavLink to="/solution">솔루션</NavLink>
        <NavLink to="/my-solutions">내 솔루션</NavLink>
      </nav>
      <Link to="/signup">시작하기</Link>
    </header>
  )
}

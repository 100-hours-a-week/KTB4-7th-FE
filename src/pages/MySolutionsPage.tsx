import { AppHeader } from '../shared/ui/AppHeader'
export function MySolutionsPage() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="empty-page">
        <p>memme</p>
        <h1>저장한 솔루션이 없습니다</h1>
        <span>필요한 솔루션을 저장하면 이곳에서 다시 볼 수 있습니다.</span>
      </main>
    </div>
  )
}

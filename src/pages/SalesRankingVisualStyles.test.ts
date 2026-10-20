import { readFileSync } from 'node:fs'
import { afterEach, expect, test } from 'vitest'

const baseStyles = readFileSync('src/index.css', 'utf8')
const solutionStyles = readFileSync('src/solution-results.css', 'utf8')

afterEach(() => {
  document.head
    .querySelectorAll('[data-solution-style-test]')
    .forEach((style) => style.remove())
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
})

function mountSolutionStyles() {
  // JSDOM miscalculates specificity for selector lists, so reproduce the
  // legacy single-selector override independently before loading page styles.
  for (const [name, content] of [
    ['base', baseStyles.replace(/^@import[^\r\n]*(?:\r?\n|$)/gm, '')],
    [
      'legacy-ai-insight',
      `.sales-analysis-page .ai-insight-box:not(.ai-insight-box--notice) {
        background-color: #f5efe3;
        color: #111111;
      }`,
    ],
    ['solution', solutionStyles],
  ]) {
    const style = document.createElement('style')
    style.dataset.solutionStyleTest = name
    style.textContent = content
    document.head.append(style)
  }
}

test('매출 분석과 성장 랭킹 카드가 솔루션의 둥근 글래스 표면을 사용한다', () => {
  mountSolutionStyles()
  document.body.innerHTML = `
    <main class="mobile-app-shell mobile-app-shell--white">
      <div class="app-content">
        <section class="sales-analysis-page">
          <article class="forecast-total-card"></article>
          <article class="stat-card"></article>
          <article class="ai-insight-box"><h2>AI가 발견했어요</h2></article>
          <article class="ai-insight-box ai-insight-box--notice"></article>
          <article class="chart-card"></article>
          <article class="profit-analysis-notice"></article>
          <section class="profit-chart-section"></section>
        </section>
        <section class="growth-ranking-page">
          <article class="growth-ranking-my-card"></article>
          <article class="growth-ranking-feedback"></article>
          <section class="growth-ranking-list-section">
            <ol class="growth-ranking-list"></ol>
          </section>
          <p class="growth-ranking-list-empty"></p>
          <p role="status"></p>
        </section>
      </div>
    </main>
  `

  for (const selector of [
    '.forecast-total-card',
    '.stat-card',
    '.ai-insight-box',
    '.ai-insight-box--notice',
    '.chart-card',
    '.profit-analysis-notice',
    '.profit-chart-section',
    '.growth-ranking-my-card',
    '.growth-ranking-feedback',
    '.growth-ranking-list-section',
    '.growth-ranking-list-empty',
    '.growth-ranking-page > [role="status"]',
  ]) {
    const card = document.querySelector(selector)
    expect(card).not.toBeNull()
    expect(getComputedStyle(card!).backgroundColor).toBe(
      'rgba(174, 178, 181, 0.15)',
    )
    expect(getComputedStyle(card!).borderRadius).toBe('18px')
  }
})

test('매출 분석과 랭킹 화면 바깥 배경을 흰색으로 유지한다', () => {
  mountSolutionStyles()
  document.body.innerHTML = `
    <main class="mobile-app-shell mobile-app-shell--white">
      <div class="app-content">
        <section class="growth-ranking-page"></section>
      </div>
    </main>
  `

  expect(getComputedStyle(document.body).backgroundColor).toBe(
    'rgb(255, 255, 255)',
  )
})

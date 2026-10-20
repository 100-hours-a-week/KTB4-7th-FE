import type { ReactNode } from 'react'

export type SolutionActionDetailItem = {
  rankNo: number
  title: string
  summaryText: string
  detailText: string
}

export function SolutionActionDetail({
  item,
  titleLevel = 1,
  children,
}: {
  item: SolutionActionDetailItem
  titleLevel?: 1 | 2
  children?: ReactNode
}) {
  const Title = titleLevel === 1 ? 'h1' : 'h2'
  const SectionTitle = titleLevel === 1 ? 'h2' : 'h3'
  const titleId = `solution-action-title-${item.rankNo}`
  const sectionTitleId = `solution-action-instructions-${item.rankNo}`

  return (
    <article className="solution-result-detail-action">
      <header className="solution-result-detail-hero">
        <div className="solution-result-detail-meta">
          <span>ACTION {String(item.rankNo).padStart(2, '0')}</span>
          <span>{item.rankNo === 1 ? '우선 실행' : '함께 확인'}</span>
        </div>
        <Title id={titleId}>
          {item.title.split(/(\S+·\S+)/).map((part, index) =>
            part.includes('·') ? (
              <span className="solution-detail-title-word" key={index}>
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </Title>
        <p>{item.summaryText}</p>
      </header>

      <div className="solution-result-detail-content">
        <section
          className="solution-result-detail-section"
          aria-labelledby={sectionTitleId}
        >
          <span className="solution-result-detail-index">
            {String(item.rankNo).padStart(2, '0')} / ACTION
          </span>
          <SectionTitle id={sectionTitleId}>이렇게 실행해 보세요</SectionTitle>
          <p className="solution-result-detail-text">{item.detailText}</p>
        </section>
        {children}
      </div>
    </article>
  )
}

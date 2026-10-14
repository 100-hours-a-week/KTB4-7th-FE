import { expect, test } from 'vitest'
import { getSolutionCardKeyword } from './solutionCardVisual'

test('솔루션 제목의 주제에 맞는 핵심 단어를 고른다', () => {
  expect(getSolutionCardKeyword('메뉴를 카테고리별로 분류하세요')).toBe('메뉴')
  expect(getSolutionCardKeyword('음료 메뉴 구성을 다시 살펴보세요')).toBe('음료')
  expect(getSolutionCardKeyword('에스프레소 추출 시간을 점검하세요')).toBe('커피')
  expect(getSolutionCardKeyword('원두 재고를 확인하세요')).toBe('원두')
  expect(getSolutionCardKeyword('오픈 직후 매출 공백을 줄이세요')).toBe('오픈 시간')
  expect(getSolutionCardKeyword('오늘은 추가 매출 확보에 집중하세요')).toBe('매출')
})

import { expect, test } from 'vitest'
import { getSolutionCardKeyword } from './solutionCardVisual'

test('솔루션 제목의 주제에 맞는 영어 핵심 단어를 고른다', () => {
  expect(getSolutionCardKeyword('메뉴를 카테고리별로 분류하세요')).toBe('MENU')
  expect(getSolutionCardKeyword('음료 메뉴 구성을 다시 살펴보세요')).toBe(
    'DRINKS',
  )
  expect(getSolutionCardKeyword('에스프레소 추출 시간을 점검하세요')).toBe(
    'COFFEE',
  )
  expect(getSolutionCardKeyword('원두 재고를 확인하세요')).toBe('BEANS')
  expect(getSolutionCardKeyword('오픈 직후 매출 공백을 줄이세요')).toBe(
    'OPENING',
  )
  expect(getSolutionCardKeyword('오늘은 추가 매출 확보에 집중하세요')).toBe(
    'SALES',
  )
})

test('디저트와 티 제안은 구체적인 영어 주제로 표시한다', () => {
  expect(
    getSolutionCardKeyword(
      '14시 전후 케이크·베이커리 세트 프로모션을 운영하세요',
    ),
  ).toBe('DESSERT')
  expect(getSolutionCardKeyword('티 메뉴 시음 샘플을 제공하세요')).toBe('TEA')
  expect(getSolutionCardKeyword('오늘의 운영을 점검하세요')).toBe('NEXT STEP')
})

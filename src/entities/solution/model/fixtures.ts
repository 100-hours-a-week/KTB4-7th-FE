export type Solution = {
  id: string
  title: string
  summary: string
  actions: {
    id: string
    title: string
    detail: string
    priority: 'high' | 'normal'
  }[]
}
export const solutionFixtures = {
  available: {
    availability: 'available' as const,
    storeName: '맴매 베이커리',
    generatedAt: '2026년 9월 20일',
    solutions: [
      {
        id: 'inventory-priority',
        title: '오후 진열 재고를 먼저 점검하세요',
        summary: '인기 상품의 품절 시간을 늦출 수 있는 가장 빠른 방법입니다.',
        actions: [
          {
            id: 'stock',
            title: '14시 이전에 인기 상품 재고 확인',
            detail:
              '소금빵과 크림빵의 남은 수량을 확인해 추가 생산 여부를 정하세요.',
            priority: 'high' as const,
          },
          {
            id: 'batch',
            title: '추가 생산 수량을 메모',
            detail:
              '지난주 같은 요일의 판매량을 기준으로 필요한 수량을 적어보세요.',
            priority: 'normal' as const,
          },
          {
            id: 'share',
            title: '직원에게 진열 기준 공유',
            detail: '먼저 비워질 진열대를 함께 확인해 교체 시간을 줄이세요.',
            priority: 'normal' as const,
          },
        ],
      },
      {
        id: 'returning-customers',
        title: '재방문 고객을 위한 오후 혜택을 준비하세요',
        summary: '저녁 시간대의 단골 방문을 자연스럽게 늘릴 수 있습니다.',
        actions: [],
      },
    ],
  },
  unavailable: {
    availability: 'unavailable' as const,
    storeName: '맴매 베이커리',
    solutions: [] as Solution[],
  },
}
export const getSolutionById = (id: string) =>
  solutionFixtures.available.solutions.find((solution) => solution.id === id)

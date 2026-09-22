export type NotificationFixture = {
  id: string
  title: string
  detail: string
  createdAt: string
  read: boolean
}

export const dashboardFixtures = {
  profile: {
    storeName: '맴매 베이커리',
    ownerName: '김맴매',
    email: 'owner@memme.kr',
    businessNumber: '123-45-67890',
  },
  notifications: [
    {
      id: 'solution-ready',
      title: '오늘의 솔루션이 도착했어요',
      detail: '오후 진열 재고를 먼저 점검해 보세요.',
      createdAt: '방금 전',
      read: false,
    },
    {
      id: 'sales-ready',
      title: '지난주 매출 분석을 준비했어요',
      detail: '매출이 가장 높았던 요일을 확인해 보세요.',
      createdAt: '어제',
      read: true,
    },
  ] satisfies NotificationFixture[],
  savedSolutions: [
    {
      id: 'inventory-priority',
      title: '오후 진열 재고를 먼저 점검하세요',
      summary: '인기 상품의 품절 시간을 늦출 수 있는 가장 빠른 방법입니다.',
    },
  ],
  sales: {
    total: '₩2,840,000',
    change: '+12.4%',
    orders: '286건',
    averageOrder: '₩9,930',
    daily: [42, 56, 48, 71, 64, 83, 74],
  },
}

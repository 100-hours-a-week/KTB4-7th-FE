export type NotificationFixture = {
  id: string
  title: string
  detail: string
  createdAt: string
  read: boolean
}

export type UploadHistoryFixture = {
  id: string
  date: string
  fileName: string
  count: number
  status: 'success' | 'failed'
}

export const dashboardFixtures = {
  profile: {
    storeName: '맴매 베이커리',
    ownerName: '김맴매',
    email: 'owner@memme.kr',
    businessNumber: '123-45-67890',
    phone: '010-0000-0000',
    joinedAt: '2026년 3월',
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
    total: '₩7,920,000',
    change: '+4.2%',
    orders: '923건',
    ordersChange: '+2.6%',
    averageOrder: '₩8,582',
    averageOrderChange: '-0.8%',
    daily: [42, 34, 56, 48, 64, 83, 74],
    flaggedDayIndex: 1,
    daily7DayCaption: '3주 연속 줄고 있는 화요일을 붉게 표시했습니다.',
    insights: [
      '최근 화요일 매출이 3주 연속 감소하고 있어요.',
      '오후 3~5시는 다른 시간대보다 매출이 크게 낮아요.',
    ],
  },
  salesConnection: {
    lastUploadDate: '08.27',
    totalRecords: 3204,
    forecastEndDate: '10.01',
    forecastNote:
      '직전 업로드(08.27)로 만든 35일 예측이 10월 1일에 끝나요. 그 전에 새 파일을 올리면 분석이 끊기지 않습니다.',
    history: [
      {
        id: 'upload-202608',
        date: '08.27',
        fileName: '202608_매출.xlsx',
        count: 482,
        status: 'success',
      },
      {
        id: 'upload-202607',
        date: '07.28',
        fileName: '202607_매출.xlsx',
        count: 0,
        status: 'failed',
      },
    ] satisfies UploadHistoryFixture[],
  },
}

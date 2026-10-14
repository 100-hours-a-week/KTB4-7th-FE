export function getSolutionCardKeyword(title: string): string {
  if (/원두|커피콩|커피 원재료/.test(title)) {
    return '원두'
  }
  if (/에스프레소|추출|커피머신|커피 머신/.test(title)) {
    return '커피'
  }
  if (/음료|커피|라떼|주스|에이드|차 메뉴|티 메뉴/.test(title)) {
    return '음료'
  }
  if (/메뉴|카테고리|상품|재고|진열/.test(title)) {
    return '메뉴'
  }
  if (/오픈|영업 시간|시간대|피크 시간|매출 공백/.test(title)) {
    return '오픈 시간'
  }
  if (/매출|수익|객단가|가격/.test(title)) {
    return '매출'
  }
  return '오늘의 제안'
}

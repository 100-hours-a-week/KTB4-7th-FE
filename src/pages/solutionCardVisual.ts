export function getSolutionCardKeyword(title: string): string {
  if (/원두|커피콩|커피 원재료/.test(title)) return 'BEANS'
  if (/에스프레소|추출|커피머신|커피 머신/.test(title)) return 'COFFEE'
  if (/케이크|베이커리|디저트|디저트류/.test(title)) return 'DESSERT'
  if (/티 메뉴|차 메뉴|시음/.test(title)) return 'TEA'
  if (/음료|커피|라떼|주스|에이드|스무디/.test(title)) return 'DRINKS'
  if (/메뉴|카테고리|상품|재고|진열/.test(title)) return 'MENU'
  if (/오픈|영업 시간|시간대|피크 시간|매출 공백/.test(title)) return 'OPENING'
  if (/프로모션|이벤트|할인/.test(title)) return 'PROMO'
  if (/매출|수익|객단가|가격/.test(title)) return 'SALES'
  return 'NEXT STEP'
}

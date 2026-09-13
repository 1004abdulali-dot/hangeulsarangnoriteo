// 이 앱은 한글 학습용 낱말·게임 제목·로그인 이름·게임 기록만 표시합니다.
// 화면과 자료에는 장소·기관·가게·교통수단의 이름·소재지·노선번호·운영시간을 표시하는 항목이 없습니다.
// 2026-09-12에 학습 낱말 기준을 확인했으며, 이 앱에서 확인할 실존 대상 데이터가 없어 임의의 실제 대상 정보를 추가하지 않습니다.
// 학습 낱말의 뜻은 국립국어원 표준국어대사전, ‘오뎅→어묵’ 안내는 국립국어원 자료를 기준으로 합니다.
export const contentSource = {
  checkedAt: '2026-09-12',
  dictionary: '국립국어원 표준국어대사전',
  expressionGuide: '국립국어원 온라인가나다',
  hasRealEntityData: false,
  realEntityFields: [] as const,
  note: '확인할 실존 대상의 이름·소재지·노선번호·운영시간 필드가 없음',
} as const
export const verifiedWords = [
  { word: '나래', clue: '날개를 문학적으로 이르는 말', hint: 'ㄴㄹ' },
  { word: '내음', clue: '향기롭거나 나쁘지 않은 냄새', hint: 'ㄴㅇ' },
  { word: '뜨락', clue: '뜰을 이르는 말', hint: 'ㄸㄹ' },
] as const
export const sortingWords = [
  { word: '나래', kind: 'treasure' },
  { word: '열공', kind: 'recycle', tip: '열심히 공부하다' },
  { word: '내음', kind: 'treasure' },
  { word: '오뎅', kind: 'recycle', tip: '어묵' },
  { word: '뜨락', kind: 'treasure' },
] as const

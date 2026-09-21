export type GameId = 'rain' | 'spy' | 'sort'
export type Record = { bestScore: number; bestCombo: number }
export type Records = Record<GameId, Record>
export type Profile = { nickname: string; points: number; level: number; title: string; records: Records }
export const initialRecords: Records = { rain: { bestScore: 0, bestCombo: 0 }, spy: { bestScore: 0, bestCombo: 0 }, sort: { bestScore: 0, bestCombo: 0 } }
export const levels = [
  { at: 0, title: '한글 새싹' }, 
  { at: 3000, title: '초보 훈민정음' }, 
  { at: 8000, title: '우리말 지킴이' },
  { at: 15000, title: '세종대왕의 오른팔' }, 
  { at: 25000, title: '한글 마을 수호자' }, 
  { at: 40000, title: '우리말 별빛 대장' },
  // 👇 여기서부터 새롭게 추가된 신의 경지(7~10단계)입니다! 칭호는 마음껏 수정하세요!
  { at: 70000, title: '집현전 최고 학자' },
  { at: 130000, title: '우리말 수호신' },
  { at: 200000, title: '위대한 한글 영웅' },
  { at: 300000, title: '전설의 훈민정음 마스터' }
]
export function status(points: number) {
  let level = 1; let title = levels[0].title; let next = levels[1].at
  levels.forEach((item, index) => { if (points >= item.at) { level = index + 1; title = item.title; next = levels[index + 1]?.at ?? item.at + 500 } })
  const start = levels[level - 1].at
  return { level, title, next, progress: Math.min(100, ((points - start) / (next - start)) * 100) }
}
export const gameMeta: Record<GameId, { icon: string; title: string; description: string }> = {
  rain: { icon: '☔', title: '우리말 단비', description: '빗방울 글자를 받아 순우리말을 완성해요' },
  spy: { icon: '🕵️‍♂️', title: '세종대왕님의 비밀 첩보원', description: '초성과 뜻풀이로 비밀 낱말을 맞혀요' },
  sort: { icon: '🗑️', title: '바른 말 고운 말 분리수거', description: '낱말 상자를 알맞은 곳에 보내요' },
}

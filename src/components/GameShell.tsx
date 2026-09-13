import { useEffect, useState } from 'react'
export type Result = { best: boolean; next: number; progress: number; saveTask?: Promise<'saved' | 'failed'>; saveStatus?: 'saving' | 'saved' | 'failed' }
export function GameShell({ title, icon, score, combo, status, onHome, children }: { title: string; icon: string; score: number; combo: number; status: string; onHome: () => void; children: React.ReactNode }) {
 return <main className="game-page"><header className="game-head"><button className="home-btn" onClick={onHome}>← 마을로</button><h1>{icon} {title}</h1><div className="hud"><span>⭐ {score}점</span><span>🔥 {combo}번 연속</span><span>{status}</span></div></header>{children}</main>
}
export function ResultModal({ score, combo, result, onHome }: { score: number; combo: number; result: Result; onHome: () => void }) {
 const saveMessage = result.saveStatus === 'saved' ? '저장 완료! ✓' : result.saveStatus === 'failed' ? '저장에 실패했어요' : '기록 저장 중...'
 return <div className="modal-back"><section className="result-modal"><div className="result-stars">🌸 ✨ ⭐</div><h2>오늘의 놀이 결과</h2><strong>{score}점</strong><p>최고 연속 맞힘 <b>{combo}</b> · {result.best ? '새 최고 기록이에요! 🏆' : '다음에도 도전해 봐요!'}</p><div className="progress"><i style={{ width: `${result.progress}%` }} /></div><small>다음 단계까지 {Math.max(0, result.next)}점 남았어요</small><p className={'save-status ' + (result.saveStatus || 'saving')} aria-live="polite">{saveMessage}</p><button className="big-btn" onClick={onHome}>마을 화면으로 돌아가기</button></section></div>
}
export function useResult(onEnd: (score: number, combo: number) => Result) {
 const [result, setResult] = useState<Result | null>(null)
 const finish = (score: number, combo: number) => {
   const nextResult = onEnd(score, combo)
   setResult(nextResult)
   if (nextResult.saveTask) {
     void nextResult.saveTask.then(saveStatus => {
       setResult(current => ({ ...(current || nextResult), saveStatus }))
     })
   } else {
     setResult(current => ({ ...(current || nextResult), saveStatus: 'saved' }))
   }
 }
 return { result, finish }
}
export function useCountdown(start: number, active: boolean, done: () => void) {
 const [left, setLeft] = useState(start)
 useEffect(() => { if (!active) return; setLeft(start); const timer = window.setInterval(() => setLeft(v => { if (v <= 1) { window.clearInterval(timer); done(); return 0 } return v - 1 }), 1000); return () => window.clearInterval(timer) }, [active, start])
 return left
}

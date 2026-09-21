import { FormEvent, useEffect, useMemo, useState } from 'react'
import { GameShell, ResultModal, useResult } from './GameShell'
import type { GameWord } from '../lib/words'

const initials = (word: string) => Array.from(word).map(letter => {
  const code = letter.charCodeAt(0) - 0xac00
  return code < 0 || code > 11171 ? letter : 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(code / 588)]
}).join('')

export function SpyGame({ words, onHome, onEnd }: { words: GameWord[]; onHome: () => void; onEnd: (s: number, c: number) => Promise<unknown> }) {
  const [no, setNo] = useState(0); const [input, setInput] = useState(''); const [time, setTime] = useState(15)
  const [score, setScore] = useState(0); const [combo, setCombo] = useState(0); const [best, setBest] = useState(0)
  const [chance, setChance] = useState(false); const [message, setMessage] = useState(''); const [ended, setEnded] = useState(false)
  
  const [lives, setLives] = useState(3); 
  
  const { result, finish } = useResult(onEnd); const q = words[no % words.length]
  const hint = q.extra || initials(q.word)
  
  // 🚀 [마라맛 타임어택 핵심] 2문제 풀 때마다 제한 시간이 1초씩 줄어들고, 극한의 3초에서 멈춥니다!
  const currentMaxTime = Math.max(3, 15 - Math.floor(no / 2))

  const advance = (ok: boolean, isTimeout = false) => {
    const gain = ok ? (chance ? 10 : 20) + (combo + 1) * 3 : 0
    const finalBest = ok ? Math.max(best, combo + 1) : best
    const nextLives = ok ? lives : lives - 1; 
    
    if (ok) { 
      setCombo(combo + 1); setBest(finalBest); setScore(value => value + gain); setMessage('🔓 비밀의 문이 활짝 열렸어요!') 
    } else { 
      setCombo(0); 
      setLives(nextLives); 
      setMessage(`${isTimeout ? '💥 시간 초과! ' : '틀렸습니다! '}정답은 '${q.word}'입니다.`); 
    }
    
    window.setTimeout(() => {
      if (nextLives <= 0) { 
        setEnded(true); void finish(score + gain, finalBest) 
      } else { 
        setNo(value => value + 1); setInput(''); setChance(false); setMessage('') 
      }
    }, ok ? 900 : 1500) 
  }
  
  useEffect(() => {
    if (ended) return
    setTime(currentMaxTime) // ✅ 점점 깎이는 제한 시간을 세팅
    const timer = window.setInterval(() => setTime(value => {
      if (value <= 1) { 
        window.clearInterval(timer); 
        advance(false, true); 
        return 0 
      }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [no, ended, currentMaxTime])
  
  const submit = (event: FormEvent) => { event.preventDefault(); if (input.trim()) advance(input.trim() === q.word) }
  
  // ✅ 제한 시간이 5초 이하가 되면 긴급한 경고 텍스트로 바뀝니다!
  const prompt = useMemo(() => message || (currentMaxTime <= 5 ? '⚠️ 시간이 없어요! 빨리 입력하세요!' : '시간 안에 비밀 낱말을 입력하세요!'), [message, currentMaxTime])
  
  return <GameShell title="세종대왕님의 비밀 첩보원" icon="🕵️‍♂️" score={score} combo={combo} status={`❤️ ${lives} | ⏱️ ${time}초`} onHome={onHome}>
    <section className="spy-game">
      <div className="secret-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555', fontWeight: 'bold' }}>
          <span>
            비밀 임무 {no + 1} 
            {/* ✅ 마라맛 돌입 시 타이틀에 경고 표시 추가 */}
            {currentMaxTime <= 5 && <span style={{color: '#e74c3c'}}> (마라맛 타임어택 🌶️)</span>}
          </span>
          <span style={{ fontSize: '1.2rem', letterSpacing: '3px' }}>{"❤️".repeat(lives)}{"🤍".repeat(3 - lives)}</span>
        </div>
        
        {/* ✅ 줄어든 제한 시간에 맞춰 게이지 바 비율을 실시간으로 맞추고, 5초 이하일 때 붉게 변합니다 */}
        <div className="bomb">
          <div className="timer" style={{ 
            width: `${time / currentMaxTime * 100}%`, 
            backgroundColor: currentMaxTime <= 5 ? '#e74c3c' : undefined 
          }} />
        </div>
        
        <p className="clue">“{q.meaning}”</p>
        <h2>초성 힌트 · {hint}</h2>
        <p style={{ color: message.includes('정답은') || currentMaxTime <= 5 ? '#e74c3c' : 'inherit', fontWeight: message.includes('정답은') || currentMaxTime <= 5 ? 'bold' : 'normal' }}>
          {prompt}
        </p>
        <form onSubmit={submit}>
          <input autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder="정답을 입력하고 엔터" />
          <button>해제하기</button>
        </form>
        <button className="chance" disabled={chance} onClick={() => { setChance(true); setInput(q.word[0]) }}>💡 찬스: 첫 글자 보기 <small>(점수 반)</small></button>
      </div>
    </section>
    {result && <ResultModal score={score} combo={best} result={result} onHome={onHome} />}
  </GameShell>
}
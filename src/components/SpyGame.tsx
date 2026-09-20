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
  
  // ✅ 하트(목숨) 상태 추가 (초기값 3개)
  const [lives, setLives] = useState(3); 
  
  const { result, finish } = useResult(onEnd); const q = words[no % words.length]
  const hint = q.extra || initials(q.word)
  
  // ✅ 정답/오답 및 시간초과 처리 로직 변경
  const advance = (ok: boolean, isTimeout = false) => {
    const gain = ok ? (chance ? 10 : 20) + (combo + 1) * 3 : 0
    const finalBest = ok ? Math.max(best, combo + 1) : best
    const nextLives = ok ? lives : lives - 1; // 오답일 경우 목숨 1 차감
    
    if (ok) { 
      setCombo(combo + 1); setBest(finalBest); setScore(value => value + gain); setMessage('🔓 비밀의 문이 활짝 열렸어요!') 
    } else { 
      setCombo(0); 
      setLives(nextLives); // 깎인 목숨 적용
      // ✅ 오답 또는 시간 초과 시 정답 공개
      setMessage(`${isTimeout ? '💥 시간 초과! ' : '틀렸습니다! '}정답은 '${q.word}'입니다.`); 
    }
    
    window.setTimeout(() => {
      // ✅ 문제 수 제한 대신, 하트가 0개가 되면 게임 종료
      if (nextLives <= 0) { 
        setEnded(true); void finish(score + gain, finalBest) 
      } else { 
        // 하트가 남아있으면 계속 다음 문제로 진행 (무한 모드)
        setNo(value => value + 1); setInput(''); setChance(false); setMessage('') 
      }
    }, ok ? 900 : 1500) // ✅ 오답일 때는 아이들이 정답을 확실히 읽을 수 있도록 대기 시간을 1.5초로 늘림
  }
  
  useEffect(() => {
    if (ended) return
    setTime(15)
    const timer = window.setInterval(() => setTime(value => {
      if (value <= 1) { 
        window.clearInterval(timer); 
        advance(false, true); // ✅ 시간이 다 되면 오답(시간초과)으로 처리하여 정답 공개
        return 0 
      }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [no, ended])
  
  const submit = (event: FormEvent) => { event.preventDefault(); if (input.trim()) advance(input.trim() === q.word) }
  const prompt = useMemo(() => message || '시간 안에 비밀 낱말을 입력하세요!', [message])
  
  // ✅ 상단 상태바(status)와 화면 UI에 하트 표시 및 오답 시 빨간색 텍스트 강조 효과 추가
  return <GameShell title="세종대왕님의 비밀 첩보원" icon="🕵️‍♂️" score={score} combo={combo} status={`❤️ ${lives} | ⏱️ ${time}초`} onHome={onHome}>
    <section className="spy-game">
      <div className="secret-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555', fontWeight: 'bold' }}>
          <span>비밀 임무 {no + 1}</span>
          <span style={{ fontSize: '1.2rem', letterSpacing: '3px' }}>{"❤️".repeat(lives)}{"🤍".repeat(3 - lives)}</span>
        </div>
        <div className="bomb"><div className="timer" style={{ width: `${time / 15 * 100}%` }} /></div>
        <p className="clue">“{q.meaning}”</p>
        <h2>초성 힌트 · {hint}</h2>
        <p style={{ color: message.includes('정답은') ? '#e74c3c' : 'inherit', fontWeight: message.includes('정답은') ? 'bold' : 'normal' }}>
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
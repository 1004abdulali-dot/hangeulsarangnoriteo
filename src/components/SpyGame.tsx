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
  const { result, finish } = useResult(onEnd); const q = words[no % words.length]
  const hint = q.extra || initials(q.word)
  const advance = (ok: boolean) => {
    const gain = ok ? (chance ? 10 : 20) + (combo + 1) * 3 : 0
    const finalBest = ok ? Math.max(best, combo + 1) : best
    if (ok) { setCombo(combo + 1); setBest(finalBest); setScore(value => value + gain); setMessage('🔓 비밀의 문이 활짝 열렸어요!') } else { setCombo(0); setMessage('다음 비밀을 찾아볼까요?') }
    window.setTimeout(() => {
      if (no === words.length - 1) { setEnded(true); void finish(score + gain, finalBest) }
      else { setNo(value => value + 1); setInput(''); setChance(false); setMessage('') }
    }, 900)
  }
  useEffect(() => {
    if (ended) return
    setTime(15)
    const timer = window.setInterval(() => setTime(value => {
      if (value <= 1) { window.clearInterval(timer); setMessage('💥 시간이 다 되었어요!'); window.setTimeout(() => advance(false), 700); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [no, ended])
  const submit = (event: FormEvent) => { event.preventDefault(); if (input.trim()) advance(input.trim() === q.word) }
  const prompt = useMemo(() => message || '시간 안에 비밀 낱말을 입력하세요!', [message])
  return <GameShell title="세종대왕님의 비밀 첩보원" icon="🕵️‍♂️" score={score} combo={combo} status={`⏱️ ${time}초`} onHome={onHome}><section className="spy-game"><div className="secret-card"><span>비밀 임무 {no + 1} / {words.length}</span><div className="bomb"><div className="timer" style={{ width: `${time / 15 * 100}%` }} /></div><p className="clue">“{q.meaning}”</p><h2>초성 힌트 · {hint}</h2><p>{prompt}</p><form onSubmit={submit}><input autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder="정답을 입력하고 엔터" /><button>해제하기</button></form><button className="chance" disabled={chance} onClick={() => { setChance(true); setInput(q.word[0]) }}>💡 찬스: 첫 글자 보기 <small>(점수 반)</small></button></div></section>{result && <ResultModal score={score} combo={best} result={result} onHome={onHome} />}</GameShell>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { GameShell, ResultModal, useResult } from './GameShell'
import type { GameWord } from '../lib/words'
type Drop = { char: string; x: number; id: number; duration: number }
export function RainGame({ words, onHome, onEnd }: { words: GameWord[]; onHome: () => void; onEnd: (score: number, combo: number) => Promise<unknown> }) {
  const [wordNo, setWordNo] = useState(0)
  const [index, setIndex] = useState(0)
  const [basket, setBasket] = useState(50)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [flash, setFlash] = useState('')
  const [message, setMessage] = useState('뜻풀이를 보고, 함께 내리는 글자 중 알맞은 글자를 받아요!')
  const [ended, setEnded] = useState(false)
  const [round, setRound] = useState(0)
  const resolvingRef = useRef(false)
  const landedRef = useRef(0)
  const word = words[wordNo % words.length]
  const expected = word.word[index]
  const letters = useMemo(() => Array.from(new Set(words.flatMap(item => item.word.split('')))), [words])
  const { result, finish } = useResult(onEnd)
  const makeDrops = (target: string): Drop[] => {
    const count = Math.random() < 0.5 ? 2 : 3
    const decoys = letters.filter(letter => letter !== target)
    const targetSpot = Math.floor(Math.random() * count)
    const lanes = count === 2 ? [27, 73] : [17, 50, 83]
    return Array.from({ length: count }, (_, position) => ({
      char: position === targetSpot ? target : decoys[Math.floor(Math.random() * decoys.length)] || target,
      x: lanes[position] + Math.round(Math.random() * 6 - 3),
      id: Date.now() + position,
      duration: Number((2.35 + Math.random() * 0.8).toFixed(2)),
    }))
  }
  const [drops, setDrops] = useState<Drop[]>(() => makeDrops(words[0].word[0]))
  const startRound = () => { landedRef.current = 0; resolvingRef.current = false; setRound(value => value + 1) }
  useEffect(() => { if (!ended) setDrops(makeDrops(expected)) }, [wordNo, index, round, ended, expected])
  useEffect(() => {
    const moveBasket = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      setBasket(value => Math.min(91, Math.max(9, value + (event.key === 'ArrowLeft' ? -9 : 9))))
    }
    window.addEventListener('keydown', moveBasket)
    return () => window.removeEventListener('keydown', moveBasket)
  }, [])
  const loseHeart = (char: string) => {
    setCombo(0); setFlash('bad'); setMessage(`“${char}”은 지금 필요한 글자가 아니에요. 기회가 하나 줄었어요!`)
    window.setTimeout(() => setFlash(''), 400)
    setHearts(current => {
      if (current <= 1) { setEnded(true); window.setTimeout(() => void finish(score, best), 350); return 0 }
      window.setTimeout(startRound, 520); return current - 1
    })
  }
  const catchDrop = (drop: Drop) => {
    if (ended || resolvingRef.current) return
    if (Math.abs(drop.x - basket) > 11) {
      landedRef.current += 1
      if (landedRef.current === drops.length) { setMessage('빗방울이 모두 지나갔어요. 다음 글자 묶음을 기다려요!'); window.setTimeout(startRound, 260) }
      return
    }
    resolvingRef.current = true
    if (drop.char !== expected) return loseHeart(drop.char)
    const nextCombo = combo + 1; const gain = 10 + nextCombo * 2
    setCombo(nextCombo); setBest(value => Math.max(value, nextCombo)); setScore(value => value + gain); setFlash('good')
    setMessage(`반짝! “${drop.char}” 글자를 받았어요.`); window.setTimeout(() => setFlash(''), 450)
    if (index + 1 === word.word.length) {
      setMessage(`✨ “${word.word}” 완성! 다음 순우리말로 가요.`)
      window.setTimeout(() => {
        if (wordNo >= words.length - 1) {
          setEnded(true)
          void finish(score + gain, Math.max(best, nextCombo))
          return
        }
        setWordNo(value => value + 1)
        setIndex(0)
        resolvingRef.current = false
      }, 750)
    } else window.setTimeout(() => { setIndex(value => value + 1); resolvingRef.current = false }, 450)
  }
  const move = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setBasket(Math.min(91, Math.max(9, ((event.clientX - rect.left) / rect.width) * 100)))
  }
  const completed = useMemo(() => word.word.split('').map((letter, position) => position < index ? letter : '□'), [word.word, index])
  return <GameShell title="우리말 단비" icon="☔" score={score} combo={combo} status={'❤️'.repeat(hearts) || '💔'} onHome={onHome}>
    <section className="rain-game"><div className="word-board"><p className="meaning-label">뜻풀이</p><h2 className="rain-clue">“{word.meaning}”</h2><p className="rain-instruction">함께 내리는 2~3개의 글자 빗방울 중 알맞은 글자를 순서대로 모아요.</p><div className="word-slots" aria-label="완성 중인 순우리말">{completed.map((letter, position) => <span key={position} className={position < index ? 'done' : ''}>{letter}</span>)}</div></div>
      <div className={'rain-board ' + flash} onMouseMove={move} aria-label="빗방울 받기 놀이판">{drops.map(drop => <div key={`${round}-${drop.id}`} className="drop" style={{ left: `${drop.x}%`, animationDuration: `${drop.duration}s` }} onAnimationEnd={() => catchDrop(drop)}>{drop.char}</div>)}<div className="basket" style={{ left: `${basket}%` }} aria-label="글자 바구니">🧺</div><p className="rain-message" aria-live="polite">{message}</p><p className="rain-controls">← → 키 또는 마우스로 바구니를 움직여요</p></div>
    </section>{result && <ResultModal score={score} combo={best} result={result} onHome={onHome} />}
  </GameShell>
}

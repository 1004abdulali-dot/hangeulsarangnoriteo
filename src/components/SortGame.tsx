import { DragEvent, useEffect, useRef, useState } from 'react'
import { GameShell, ResultModal, useResult } from './GameShell'
import type { GameWord } from '../lib/words'

type BinKind = 'treasure' | 'recycle'
type FoundWords = Record<BinKind, string[]>

const category = (item: GameWord): BinKind => {
  if (item.type?.toLowerCase() === 'good') return 'treasure'
  if (item.type?.toLowerCase() === 'bad') return 'recycle'
  return item.extra.toLowerCase().includes('treasure') || item.extra.includes('순우리말') || item.extra.includes('보물') ? 'treasure' : 'recycle'
}

const recommendation = (item: GameWord) => item.correction?.trim() || (category(item) === 'recycle' && !['recycle', '분리수거', '바르지 않은 표현'].includes(item.extra.toLowerCase()) ? item.extra : '')

export function SortGame({ words, onHome, onEnd }: { words: GameWord[]; onHome: () => void; onEnd: (score: number, combo: number) => Promise<unknown> }) {
  const [no, setNo] = useState(0); const [score, setScore] = useState(0); const [combo, setCombo] = useState(0); const [best, setBest] = useState(0)
  const [hearts, setHearts] = useState(3); const [notice, setNotice] = useState('움직이는 길 위 상자를 알맞은 곳으로 옮겨요!'); const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState<BinKind | null>(null); const [boxRun, setBoxRun] = useState(0); const [resolving, setResolving] = useState(false); const [ended, setEnded] = useState(false)
  const [found, setFound] = useState<FoundWords>({ treasure: [], recycle: [] }); const resolvingRef = useRef(false); const { result, finish } = useResult(onEnd)
  const item = words[no % words.length]
  
  const finishGame = (finalScore: number, finalBest: number) => { if (ended) return; setEnded(true); resolvingRef.current = true; void finish(finalScore, finalBest) }
  const startNextBox = () => { if (no >= words.length - 1) return finishGame(score, best); setNo(value => value + 1); setBoxRun(value => value + 1); setResolving(false); resolvingRef.current = false }
  
  const particle = (word: string) => { const last = word.charCodeAt(word.length - 1) - 0xac00; return last >= 0 && last <= 11171 && last % 28 !== 0 ? '을' : '를' }
  
  const classify = (target: BinKind) => {
    if (ended || resolvingRef.current) return
    resolvingRef.current = true; setResolving(true); const correct = category(item) === target; let finalScore = score; let finalBest = best
    if (correct) { 
      const nextCombo = combo + 1; const gain = 15 + nextCombo * 3; finalScore += gain; finalBest = Math.max(best, nextCombo); 
      setScore(finalScore); setCombo(nextCombo); setBest(finalBest); setFlash(target); 
      setFound(value => ({ ...value, [target]: [...value[target], item.word] })); 
      const tip = recommendation(item); 
      setNotice(tip ? `✨ ${item.word} → “${tip}”이라고 말해요!` : `✨ “${item.word}”${particle(item.word)} 보물상자에 담았어요!`) 
    } else { 
      setCombo(0); setShake(true); 
      setHearts(value => { const next = Math.max(0, value - 1); if (next === 0) window.setTimeout(() => finishGame(finalScore, finalBest), 700); return next }); 
      setNotice(`“${item.word}”의 자리가 아니에요. 기회가 하나 줄었어요!`); window.setTimeout(() => setShake(false), 420) 
    }
    window.setTimeout(() => { setFlash(null); if (no >= words.length - 1) finishGame(finalScore, finalBest); else startNextBox() }, 700)
  }
  
  const missBox = () => { 
    if (ended || resolvingRef.current) return; 
    resolvingRef.current = true; setResolving(true); setCombo(0); 
    setNotice('상자가 움직이는 길 끝까지 갔어요. 기회가 하나 줄었어요!'); 
    setHearts(value => { const next = value - 1; if (next <= 0) window.setTimeout(() => finishGame(score, best), 500); else window.setTimeout(startNextBox, 650); return Math.max(0, next) }) 
  }
  
  useEffect(() => { resolvingRef.current = resolving }, [resolving])
  const drop = (event: DragEvent<HTMLDivElement>, target: BinKind) => { event.preventDefault(); classify(target) }
  
  return <GameShell title="바른 말 고운 말 분리수거" icon="🗑️" score={score} combo={combo} status={'❤️'.repeat(hearts) || '💔'} onHome={onHome}>
    <section className="sort-game">
      <div className="sort-instruction" aria-live="polite">{notice}</div>
      <div className="conveyor" aria-label="움직이는 길 위의 단어 상자">
        <div className="belt-lines" />
        {!ended && 
          <div 
            key={boxRun} 
            className={'word-box ' + (shake ? 'shake ' : '') + (resolving ? 'is-resolving' : '')} 
            /* ✅ 속도 조절: 문제가 진행될수록(no 증가) 박스 속도가 7초에서 시작해 점차 2.0초까지 매우 빠르게 줄어듦 */
            style={{ animationDuration: `${Math.max(2.0, 7 - no * 0.35)}s` }} 
            draggable={!resolving} 
            onDragStart={event => event.dataTransfer.setData('word', item.word)} 
            onAnimationEnd={missBox}
          >
            {item.word}
          </div>
        }
      </div>
      <div className="bins">
        <div className={'bin treasure-bin ' + (flash === 'treasure' ? 'correct-flash' : '')} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, 'treasure')}>
          <span>💎</span>
          <h2>보물상자</h2>
          {/* ✅ 순우리말 -> 옳은 표현으로 텍스트 변경 */}
          <p>옳은 표현</p>
          <WordRecord words={found.treasure} empty="아직 모은 낱말이 없어요" />
        </div>
        <div className={'bin recycle-bin ' + (flash === 'recycle' ? 'correct-flash' : '')} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, 'recycle')}>
          <span>♻️</span>
          <h2>재활용 공장</h2>
          <p>줄임말 · 바르지 않은 표현</p>
          <WordRecord words={found.recycle} empty="아직 분류한 낱말이 없어요" />
        </div>
      </div>
      <div className="mobile-choices">
        <button disabled={resolving || ended} onClick={() => classify('treasure')}>💎 보물상자</button>
        <button disabled={resolving || ended} onClick={() => classify('recycle')}>♻️ 재활용 공장</button>
      </div>
    </section>
    {result && <ResultModal score={score} combo={best} result={result} onHome={onHome} />}
  </GameShell>
}

function WordRecord({ words, empty }: { words: string[]; empty: string }) { 
  return <div className="word-record" aria-label="정답 낱말 기록">
    {words.length ? words.map((word, index) => <b key={`${word}-${index}`}>{word}</b>) : <small>{empty}</small>}
  </div> 
}
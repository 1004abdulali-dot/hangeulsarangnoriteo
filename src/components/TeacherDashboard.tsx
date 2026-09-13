import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { GameWord } from '../lib/words'
type Student = { login_id: string; points: number; level: number; title: string; records: string }
const gameNames: Record<string, string> = { rain: '우리말 단비', spy: '비밀 첩보원', sort: '바른 말 고운 말 분리수거' }
const blank = { game_id: 'rain', word: '', meaning: '', kind: '', tip: '' }
export function TeacherDashboard({ onExit }: { onExit: () => void }) {
  const [words, setWords] = useState<GameWord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [form, setForm] = useState(blank)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const [wordResponse, studentResponse] = await Promise.all([api('teacher/words'), api('teacher/students')])
      const wordData = await wordResponse.json()
      const studentData = await studentResponse.json()
      if (!wordResponse.ok || !studentResponse.ok) throw new Error(wordData.detail || studentData.detail || '자료를 불러오지 못했어요.')
      setWords(wordData)
      setStudents(studentData)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '자료를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])
  const grouped = useMemo(() => ['rain', 'spy', 'sort'].map(gameId => ({ gameId, items: words.filter(word => word.game_id === gameId) })), [words])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.word.trim() || !form.meaning.trim()) return setMessage('단어와 뜻을 모두 입력해 주세요.')
    try {
      const response = await api('teacher/words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || '단어를 저장하지 못했어요.')
      setForm(blank)
      setMessage('시트에 단어를 등록했어요.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '단어를 저장하지 못했어요.')
    }
  }
  return <main className="teacher-page">
    <header className="teacher-header"><div><p>교사전용 분석실</p><h1>학습 단어와 학생 기록</h1></div><button className="home-btn" onClick={onExit}>← 처음으로</button></header>
    {message && <p className="teacher-message" role="alert">{message}</p>}
    <section className="teacher-section" aria-labelledby="word-heading"><div className="teacher-heading"><div><p>구글 시트와 실시간 연결</p><h2 id="word-heading">학습 단어 등록</h2></div></div>
      <form className="word-form" onSubmit={submit}>
        <label>게임<select value={form.game_id} onChange={event => setForm({ ...form, game_id: event.target.value })}>{Object.entries(gameNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>단어<input value={form.word} onChange={event => setForm({ ...form, word: event.target.value })} maxLength={30} placeholder="예: 나래" /></label>
        <label className="meaning-input">뜻<input value={form.meaning} onChange={event => setForm({ ...form, meaning: event.target.value })} maxLength={120} placeholder="뜻을 입력하세요" /></label>
        {form.game_id === 'spy' && <label>초성 힌트(선택)<input value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value })} maxLength={30} placeholder="예: ㄴㄹ" /></label>}
        {form.game_id === 'sort' && <label>분류·권장 표현<input value={form.tip} onChange={event => setForm({ ...form, tip: event.target.value })} maxLength={80} placeholder="예: treasure 또는 어묵" /></label>}
        <div className="form-actions"><button className="teacher-save">단어 등록하기</button></div>
      </form>
      {loading ? <p className="teacher-empty">단어 목록을 불러오고 있어요.</p> : <div className="word-groups">{grouped.map(group => <article className="word-group" key={group.gameId}><h3>{gameNames[group.gameId]}</h3>{group.items.length ? <ul>{group.items.map(item => <li key={item.id}><div><b>{item.word}</b><span>{item.meaning}</span>{item.extra && <small>{group.gameId === 'spy' ? `초성: ${item.extra}` : `추가 정보: ${item.extra}`}</small>}</div></li>)}</ul> : <p className="teacher-empty">시트에 등록된 단어가 없어요.</p>}</article>)}</div>}
    </section>
    <section className="teacher-section" aria-labelledby="student-heading"><div className="teacher-heading"><div><p>학생별 기록</p><h2 id="student-heading">놀이 성장 기록</h2></div><button className="teacher-refresh" onClick={() => void load()}>새로고침</button></div>
      {loading ? <p className="teacher-empty">기록을 불러오고 있어요.</p> : students.length ? <div className="student-table-wrap"><table><thead><tr><th>아이디</th><th>누적 포인트</th><th>레벨 · 칭호</th><th>우리말 단비</th><th>비밀 첩보원</th><th>분리수거</th></tr></thead><tbody>{students.map(student => { let records: Record<string, { bestScore?: number }> = {}; try { records = JSON.parse(student.records || '{}') } catch {} return <tr key={student.login_id}><td><b>{student.login_id}</b></td><td>{student.points}점</td><td>단계 {student.level} · {student.title}</td><td>{records.rain?.bestScore || 0}점</td><td>{records.spy?.bestScore || 0}점</td><td>{records.sort?.bestScore || 0}점</td></tr> })}</tbody></table></div> : <p className="teacher-empty">아직 놀이 기록을 남긴 학생이 없어요.</p>}
    </section>
  </main>
}

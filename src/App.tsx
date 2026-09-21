import { useCallback, useState } from 'react'
import { api } from './lib/api'
import { shuffleUniqueWords } from './lib/gameOrder'
import { GameId, Profile, Records, gameMeta, initialRecords, status } from './data'
import type { GameWord } from './lib/words'
import { RainGame } from './components/RainGame'
import { SpyGame } from './components/SpyGame'
import { SortGame } from './components/SortGame'
import { LoginScreen } from './components/LoginScreen'
import { TeacherDashboard } from './components/TeacherDashboard'

const emptyProfile: Profile = { nickname: '한글 친구', points: 0, level: 1, title: '한글 새싹', records: initialRecords }
type RankingEntry = { id: string; name: string; score: number }
type Rankings = Record<GameId, RankingEntry[]>
const emptyRankings: Rankings = { rain: [], spy: [], sort: [] }

function normalizeRankings(value: unknown): Rankings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return (Object.keys(emptyRankings) as GameId[]).reduce((all, game) => {
    const entries = source[game]
    all[game] = Array.isArray(entries) ? entries.flatMap((entry): RankingEntry[] => {
      if (!entry || typeof entry !== 'object') return []
      const row = entry as Record<string, unknown>
      const id = typeof row.id === 'string' ? row.id.trim() : ''
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const score = Math.max(0, Number(row.score) || 0)
      const displayName = name || id
      return displayName ? [{ id: id || displayName, name: displayName, score }] : []
    }).slice(0, 3) : []
    return all
  }, { ...emptyRankings })
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [accountId, setAccountId] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [studentName, setStudentName] = useState('')
  const [screen, setScreen] = useState<GameId | 'main'>('main')
  const [gameWords, setGameWords] = useState<GameWord[]>([])
  const [loadingGame, setLoadingGame] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [teacherLoggedIn, setTeacherLoggedIn] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [rankings, setRankings] = useState<Rankings>(emptyRankings)
  
  // 🚀 지난주 랭킹을 담을 새로운 상태 추가
  const [lastWeekRankings, setLastWeekRankings] = useState<Rankings>(emptyRankings)

  const updateProfileFromSheet = useCallback(async (loginId: string, fallback: Profile) => {
    const studentId = typeof loginId === 'string' ? loginId.trim() : ''
    if (!studentId) return
    setProfileLoading(true)
    try {
      const response = await api(`profile/${encodeURIComponent(studentId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || '점수를 불러오지 못했어요.')
      
      const points = Number.isFinite(Number(data.points)) ? Math.max(0, Number(data.points)) : 0
      const sheetRecords = data.records && typeof data.records === 'object' ? data.records as Partial<Records> : {}
      const records: Records = {
        rain: { bestScore: Math.max(0, Number(sheetRecords.rain?.bestScore) || 0), bestCombo: fallback.records.rain.bestCombo },
        spy: { bestScore: Math.max(0, Number(sheetRecords.spy?.bestScore) || 0), bestCombo: fallback.records.spy.bestCombo },
        sort: { bestScore: Math.max(0, Number(sheetRecords.sort?.bestScore) || 0), bestCombo: fallback.records.sort.bestCombo },
      }
      
      const current = status(points)
      const schoolName = data.school ? String(data.school).trim() : ''
      const displayNickname = schoolName ? `${schoolName} ${studentId}` : studentId

      const syncedProfile = { nickname: displayNickname, points, level: current.level, title: current.title, records }
      
      setRankings(normalizeRankings(data.rankings))
      // 🚀 백엔드에서 받은 지난주 랭킹 화면에 세팅
      setLastWeekRankings(normalizeRankings(data.lastWeekRankings))
      
      try { window.localStorage.setItem(`hangul-profile-${studentId}`, JSON.stringify(syncedProfile)) } catch (storageError) { console.error('[점수 불러오기] 기기 기록 갱신 오류:', storageError) }
      setProfile(syncedProfile)
    } catch (error) {
      console.error('[점수 불러오기] 오류:', error)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const login = async (loginId: string, password: string) => {
    const response = await api('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id: loginId, password }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || '입장하지 못했어요.')
    
    const user = data.user && typeof data.user === 'object' ? data.user : data
    let baseProfile: Profile
    
    const schoolName = user.school ? String(user.school).trim() : ''
    const currentId = user.login_id || user.id || loginId
    const displayNickname = schoolName ? `${schoolName} ${currentId}` : currentId

    try {
      const records = { ...initialRecords, ...JSON.parse(user.records || '{}') }
      baseProfile = { nickname: displayNickname, points: user.points || user.totalPoints || 0, level: user.level || 1, title: user.title || '한글 새싹', records }
    } catch {
      baseProfile = { nickname: displayNickname, points: user.points || user.totalPoints || 0, level: user.level || 1, title: user.title || '한글 새싹', records: initialRecords }
    }
    
    setProfile(baseProfile)
    setRankings(normalizeRankings(data.rankings || user.rankings))
    // 🚀 로그인할 때 지난주 랭킹도 같이 불러오기
    setLastWeekRankings(normalizeRankings(data.lastWeekRankings || user.lastWeekRankings))
    
    setAccountId(currentId); setAccountPassword(password); setStudentName(currentId); setLoggedIn(true)
    await updateProfileFromSheet(currentId, baseProfile)
  }

  const loginTeacher = async (password: string) => {
    const response = await api('teacher/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || '분석실에 들어가지 못했어요.')
    setTeacherLoggedIn(true)
  }

  const logout = () => {
    if (window.confirm('정말 로그아웃 할까요?')) {
      setProfile(emptyProfile); setAccountId(''); setAccountPassword(''); setStudentName('')
      setScreen('main'); setGameWords([]); setLoggedIn(false)
    }
  }

  const startGame = async (game: GameId) => {
    setLoadingGame(true); setLoadError('')
    try {
      let response: Response
      try { response = await api(`words/${game}`) } catch (networkError) { throw new Error('문제 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.') }
      let wordData: unknown
      try { const raw = await response.text(); wordData = raw ? JSON.parse(raw) : [] } catch (parseError) { throw new Error('받아 온 문제 자료를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.') }
      if (!response.ok) throw new Error(typeof wordData === 'object' && wordData !== null && 'detail' in wordData ? String(wordData.detail) : '문제를 불러오지 못했어요.')
      const gameKey: Record<GameId, string> = { rain: 'game1', spy: 'game2', sort: 'game3' }
      const source = Array.isArray(wordData) ? wordData : typeof wordData === 'object' && wordData !== null && Array.isArray((wordData as Record<string, unknown>)[gameKey[game]]) ? (wordData as Record<string, unknown>)[gameKey[game]] as unknown[] : []
      const words = source.flatMap((item, index): GameWord[] => {
        if (typeof item === 'string' && item.trim()) return [{ id: `${game}-${index}-${item}`, game_id: game, word: item.trim(), meaning: item.trim(), extra: '' }]
        if (typeof item !== 'object' || item === null) return []
        const row = item as Record<string, unknown>
        const word = typeof row.word === 'string' ? row.word.trim() : typeof row.text === 'string' ? row.text.trim() : typeof row['단어'] === 'string' ? row['단어'].trim() : ''
        const meaning = typeof row.meaning === 'string' ? row.meaning.trim() : typeof row['뜻'] === 'string' ? row['뜻'].trim() : typeof row.clue === 'string' ? row.clue.trim() : ''
        const extra = typeof row.extra === 'string' ? row.extra : typeof row.kind === 'string' ? row.kind : typeof row.tip === 'string' ? row.tip : ''
        const type = typeof row.type === 'string' ? row.type.trim().toLowerCase() : ''
        const correction = typeof row.correction === 'string' ? row.correction.trim() : ''
        const goodWord = typeof row.goodWord === 'string' ? row.goodWord.trim() : ''
        const badWord = typeof row.badWord === 'string' ? row.badWord.trim() : ''
        return word ? [{ id: typeof row.id === 'string' ? row.id : `${game}-${index}-${word}`, game_id: game, word, meaning: meaning || '뜻풀이가 준비 중이에요.', extra, type, correction, goodWord, badWord }] : []
      })
      const shuffledWords = shuffleUniqueWords(words)
      if (!shuffledWords.length) throw new Error('선생님이 등록한 문제가 아직 없어요.')
      setGameWords(shuffledWords)
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
      setScreen(game)
    } catch (error) { setLoadError(error instanceof Error ? error.message : '문제를 불러오지 못했어요.') } finally { setLoadingGame(false) }
  }

  const saveResult = (game: GameId, score: number, combo: number) => {
    const currentId = typeof accountId === 'string' ? accountId.trim() : ''
    const old = profile.records[game]
    const records: Records = { ...profile.records, [game]: { bestScore: Math.max(old.bestScore, score), bestCombo: Math.max(old.bestCombo, combo) } }
    const newPoints = profile.points + score; const before = status(profile.points); const now = status(newPoints)
    const next = { ...profile, points: newPoints, level: now.level, title: now.title, records }
    setProfile(next)
    if (now.level > before.level) { setCelebrate(true); window.setTimeout(() => setCelebrate(false), 2600) }
    const result = { best: score > old.bestScore, next: now.next - newPoints, progress: now.progress }
    if (!currentId) { window.alert('로그인이 필요합니다'); return { ...result, saveStatus: 'failed' as const } }
    const saveTask = api('profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: currentId, password: accountPassword, student_name: studentName, ...next, records: JSON.stringify(records) }),
    }).then(response => {
      if (!response.ok) throw new Error('기록을 저장하지 못했어요.'); return 'saved' as const
    }).catch(error => { console.error('[기록 저장] 오류:', error); return 'failed' as const })
    return { ...result, saveStatus: 'saving' as const, saveTask }
  }

  const returnHome = () => { setScreen('main'); if (accountId.trim()) void updateProfileFromSheet(accountId, profile) }

  if (teacherLoggedIn) return <TeacherDashboard onExit={() => setTeacherLoggedIn(false)} />
  if (!loggedIn) return <LoginScreen onLogin={login} onTeacherLogin={loginTeacher} />
  if (loadingGame) return <main className="game-loading" role="status"><span>🌸</span><h1>선생님이 내신 문제를<br />불러오는 중...</h1><p>최신 학습 단어를 준비하고 있어요.</p></main>
  
  const s = status(profile.points)
  if (screen === 'rain' && gameWords.length) return <RainGame words={gameWords} onHome={returnHome} onEnd={(score, combo) => saveResult('rain', score, combo)} />
  if (screen === 'spy' && gameWords.length) return <SpyGame words={gameWords} onHome={returnHome} onEnd={(score, combo) => saveResult('spy', score, combo)} />
  if (screen === 'sort' && gameWords.length) return <SortGame words={gameWords} onHome={returnHome} onEnd={(score, combo) => saveResult('sort', score, combo)} />
  
  const medals = ['🥇', '🥈', '🥉']
  
  return (
    <main className="app-shell">
      <div className="decor cloud">☁️</div>
      <div className="decor flower">🌸</div>
      {celebrate && <div className="level-up">✨ 단계 올랐어요! ✨<strong>{profile.title}</strong><span>꽃가루가 팡팡! 축하해요</span></div>}
      
      <header className="hero">
        <p>🌸 봄날 한글 마을에 온 걸 환영해요!</p>
        <h1>한글사랑 놀이터2</h1>
        <p>재미있는 놀이로 우리말을 더 사랑해요</p>
      </header>
      
      {/* 🚀 화면을 왼쪽(기존)과 오른쪽(지난주 랭킹)으로 나누어주는 레이아웃 컨테이너 */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* === [왼쪽 영역: 내 프로필과 게임 선택] === */}
        <div style={{ flex: '1 1 650px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <section className="profile-card" aria-label="내 정보" aria-busy={profileLoading}>
            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
              <button onClick={() => updateProfileFromSheet(accountId, profile)} disabled={profileLoading}
                style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#e6fcf5', color: '#0ca678', border: '1px solid #63e6be', borderRadius: '20px', cursor: profileLoading ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => !profileLoading && (e.currentTarget.style.backgroundColor = '#c3fae8')}
                onMouseOut={(e) => !profileLoading && (e.currentTarget.style.backgroundColor = '#e6fcf5')}>
                {profileLoading ? '가져오는 중...' : '새로고침 🔄'}
              </button>
              <button onClick={logout} 
                style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#f1f3f5', color: '#495057', border: '1px solid #ced4da', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}>
                로그아웃 👋
              </button>
            </div>
            
            <div className="avatar">🏡</div>
            <div className="profile-copy">
              <p className="profile-name"><span>내 이름</span><strong>{profile.nickname || studentName || accountId}</strong></p>
              {profileLoading ? <p className="profile-loading" role="status">점수 불러오는 중...</p> : <>
                <h2>단계 {profile.level} · {profile.title}</h2>
                <div className="progress"><i style={{ width: `${s.progress}%` }} /></div>
                <small>다음 단계까지 {Math.max(0, s.next - profile.points)}점</small>
              </>}
            </div>
            <div className="points">
              {profileLoading ? <><b>…</b><span>점수 불러오는 중</span></> : <><b>{profile.points}</b><span>모은 점수</span></>}
            </div>
          </section>
          
          {loadError && <p className="game-load-error" role="alert">{loadError}</p>}
          
          <section className="game-grid" aria-label="게임 선택">
            {(Object.keys(gameMeta) as GameId[]).map(id => 
              <button className={'game-card ' + id} key={id} onClick={() => void startGame(id)}>
                <span className="game-icon">{gameMeta[id].icon}</span>
                <h2>{gameMeta[id].title}</h2>
                <p>{gameMeta[id].description}</p>
                <footer>최고 점수 <b>{profile.records[id].bestScore}</b> · 가장 많이 연속으로 맞힌 횟수 <b>{profile.records[id].bestCombo}</b></footer>
                <div className="hall-of-fame" aria-label={`${gameMeta[id].title} 이번 주 명예의 전당`}>
                  <h3>🔥 이번 주 명예의 전당</h3>
                  {rankings[id].length ? <ol className="ranking-list">
                    {rankings[id].map((entry, index) => 
                      <li key={`cw-${entry.id}-${index}`}>
                        <span className="ranking-medal">{medals[index]}</span>
                        <span className="ranking-id">{entry.name}</span>
                        <span className="ranking-score">{entry.score}점</span>
                      </li>
                    )}
                  </ol> : <p className="ranking-empty">아직 기록이 없습니다</p>}
                </div>
              </button>
            )}
          </section>
        </div>

        {/* === [오른쪽 영역: 지난주 명예의 전당 게시판] === */}
        <aside style={{ flex: '1 1 300px', maxWidth: '380px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#495057', margin: 0 }}>🏆 지난주 명예의 전당</h2>
            <p style={{ fontSize: '0.85rem', color: '#868e96', marginTop: '6px' }}>매주 월요일 오전 8시 랭킹 초기화</p>
          </div>
          
          {(Object.keys(gameMeta) as GameId[]).map(id => (
            <div key={`lastweek-${id}`} style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', borderRadius: '16px', padding: '16px', border: '1px solid #f1f3f5' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#343a40', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{gameMeta[id].icon}</span> {gameMeta[id].title}
              </h3>
              {lastWeekRankings[id].length ? (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {lastWeekRankings[id].map((entry, index) => (
                    <li key={`lw-${entry.id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                      <div>
                        <span style={{ marginRight: '8px', fontSize: '1.1rem' }}>{medals[index]}</span>
                        <strong style={{ color: '#495057' }}>{entry.name}</strong>
                      </div>
                      <span style={{ color: '#868e96', fontWeight: 'bold' }}>{entry.score}점</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#adb5bd', margin: 0, textAlign: 'center', padding: '10px 0' }}>지난주 기록이 없습니다</p>
              )}
            </div>
          ))}
        </aside>
      </div>
    </main>
  )
}
import { FormEvent, useState } from 'react'
import { api } from '../lib/api'
type Props = { onLogin: (loginId: string, password: string) => Promise<void>; onTeacherLogin: (password: string) => Promise<void> }
export function LoginScreen({ onLogin, onTeacherLogin }: Props) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [teacherPassword, setTeacherPassword] = useState('')
  const [message, setMessage] = useState('')
  const [teacherMessage, setTeacherMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showTeacherLogin, setShowTeacherLogin] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loginId.trim().length < 3) return setMessage('이름은 3글자 이상 입력해 주세요.')
    if (password.length < 4) return setMessage('비밀번호는 4글자 이상 입력해 주세요.')
    setBusy(true); setMessage('')
    try { await onLogin(loginId.trim(), password) } catch (error) { setMessage(error instanceof Error ? error.message : '입장하지 못했어요. 다시 시도해 주세요.') } finally { setBusy(false) }
  }
  const enterTeacherRoom = async (event: FormEvent) => {
    event.preventDefault()
    if (!teacherPassword) return setTeacherMessage('교사 비밀번호를 입력해 주세요.')
    setBusy(true); setTeacherMessage('')
    try { await onTeacherLogin(teacherPassword) } catch (error) { setTeacherMessage(error instanceof Error ? error.message : '분석실에 들어가지 못했어요.') } finally { setBusy(false) }
  }
  return <main className="login-page">
    <div className="login-decor login-cloud">☁️</div><div className="login-decor login-flower">🌸</div><div className="login-decor login-leaf">🍃</div>
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-home" aria-hidden="true">🏡</div><p className="login-welcome">🌸 봄날 한글 마을에 온 걸 환영해요!</p><h1 id="login-title">한글사랑 놀이터2</h1>
      <p className="login-copy">등록된 이름과 비밀번호로<br />즐거운 우리말 놀이를 시작해요.</p>
      <form className="login-form" onSubmit={submit}><label>학생 이름<input value={loginId} onChange={event => setLoginId(event.target.value)} maxLength={20} autoComplete="username" placeholder="이름을 입력하세요" /></label><label>비밀번호<input type="password" value={password} onChange={event => setPassword(event.target.value)} maxLength={40} autoComplete="current-password" placeholder="비밀번호를 입력하세요" /></label>{message && <p className="login-message" role="alert">{message}</p>}<button className="login-button" disabled={busy}>{busy ? '확인하고 있어요...' : '한글 마을 입장하기 →'}</button></form>
      <small className="login-note">이름과 비밀번호는 선생님이 등록한 명단과 확인해요.</small>
      <button type="button" className="teacher-entry" onClick={() => { setShowTeacherLogin(value => !value); setTeacherMessage('') }}>🔐 교사전용 분석실 {showTeacherLogin ? '닫기' : '들어가기'}</button>
      {showTeacherLogin && <form className="login-form teacher-login-form" onSubmit={enterTeacherRoom}><label>교사 비밀번호<input type="password" value={teacherPassword} onChange={event => setTeacherPassword(event.target.value)} inputMode="numeric" maxLength={8} autoComplete="current-password" placeholder="비밀번호를 입력하세요" autoFocus /></label>{teacherMessage && <p className="login-message" role="alert">{teacherMessage}</p>}<button className="login-button" disabled={busy}>{busy ? '확인하고 있어요...' : '분석실 들어가기 →'}</button></form>}
    </section>
  </main>
}

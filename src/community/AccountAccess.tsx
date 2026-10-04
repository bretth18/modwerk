import { useEffect, useRef, useState } from 'react'
import { post } from './api'
import { useCommunity } from './context'

type Challenge = { challengeId: string; expiresIn: number }
export function AccountAccess() {
  const { session, loading, refresh } = useCommunity()
  const [purpose, setPurpose] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [newsletter, setNewsletter] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null), [code, setCode] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (challenge) codeInput.current?.focus() }, [challenge])
  if (session.user) return null
  async function requestCode() {
    setBusy(true); setError('')
    try { setChallenge(await post<Challenge>('/auth/code', { purpose, email, ...(purpose === 'signup' ? { displayName: name, newsletter } : {}) })); setCode('') }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to send a code.') }
    finally { setBusy(false) }
  }
  async function verify() {
    setBusy(true); setError('')
    try { await post('/auth/verify', { challengeId: challenge?.challengeId, code }); await refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to verify your email.') }
    finally { setBusy(false) }
  }
  return <section className="account-access" aria-label="Community account">
    <h2>{challenge ? 'Check your email' : 'Join the community'}</h2>
    <p className="service-note">{challenge ? 'Enter the eight-digit code sent to ' + email + '. It expires in 10 minutes and works once.' : 'Sign in with your email to comment, rate, like and report issues. Your email stays private.'}</p>
    {loading ? <p role="status">Checking your session…</p> : !session.available || !session.emailAvailable ? <p role="status">{!session.available ? 'Community services are unavailable. Please try again later.' : 'Email verification is not available yet. Please try again later.'}</p> : challenge ?
      <form className="community-form" onSubmit={event => { event.preventDefault(); void verify() }} aria-busy={busy}>
        <label>Verification code<input ref={codeInput} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))} disabled={busy}/></label>
        <div className="review-actions"><button className="button button-primary" disabled={busy || code.length !== 8}>{busy ? 'Verifying…' : purpose === 'signup' ? 'Verify & create account' : 'Verify & sign in'}</button><button type="button" className="button button-quiet" disabled={busy} onClick={() => { setChallenge(null); setCode(''); setError('') }}>Change email or request a new code</button></div>
      </form> : <>
      <nav className="admin-tabs" aria-label="Account access"><button disabled={busy} aria-pressed={purpose === 'signin'} onClick={() => { setPurpose('signin'); setError('') }}>Sign in</button><button disabled={busy} aria-pressed={purpose === 'signup'} onClick={() => { setPurpose('signup'); setError('') }}>Create account</button></nav>
      <form className="community-form" onSubmit={event => { event.preventDefault(); void requestCode() }} aria-busy={busy}>
        <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></label>
        {purpose === 'signup' && <><label>Public display name<input autoComplete="nickname" required maxLength={60} value={name} onChange={event => setName(event.target.value)} disabled={busy}/></label><label className="account-consent"><input type="checkbox" checked={newsletter} onChange={event => setNewsletter(event.target.checked)} disabled={busy}/><span>Email me Octamod news and updates (optional). I can unsubscribe in my account at any time.</span></label></>}
        <button className="button button-primary" disabled={busy}>{busy ? 'Sending…' : 'Send verification code'}</button>
        <p className="service-note">{purpose === 'signup' ? 'Your account is created after you verify your email. News emails are optional.' : 'Use the email you registered with. A new code also lets you sign in on another device.'} <a href="#privacy">Privacy details →</a></p>
      </form></>}
    {error && <p className="file-error" role="alert">{error}</p>}
  </section>
}

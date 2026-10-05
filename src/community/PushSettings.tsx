import { useEffect, useState } from 'react'
import { api } from './api'
import { currentPushSubscription, deviceSettings, disablePush, enablePush, homeScreenRequired, pushSupported, testPush } from './push-client'
import type { PushConfig, PushDevice, PushTopic } from './push-contract'

export function PushSettings({ topic = 'activity' }: { topic?: PushTopic }) {
  const [config, setConfig] = useState<PushConfig | null>(null), [device, setDevice] = useState<PushDevice>({ activity: false, signups: false }), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const browser = typeof window !== 'undefined', install = browser && homeScreenRequired(), supported = browser && pushSupported(), blocked = supported && Notification.permission === 'denied'
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await api<PushConfig>('/push/config')
      const value = supported ? await deviceSettings(await currentPushSubscription()) : { activity: false, signups: false }
      if (!cancelled) { setConfig(next); setDevice(value) }
    })().catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [supported])
  async function change() {
    setBusy(true); setError(''); setMessage('')
    try {
      const enabled = device[topic]
      const value = enabled ? await disablePush(topic) : await enablePush(config!, topic)
      setDevice(value); setMessage(enabled ? 'Push notifications turned off on this device.' : 'Push notifications enabled on this device.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to change push notifications.') }
    finally { setBusy(false) }
  }
  async function sendTest() {
    setBusy(true); setError(''); setMessage('')
    try { await testPush(topic); setMessage('Test sent. Check this device’s notifications.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to send a test notification.') }
    finally { setBusy(false) }
  }
  return <section className="configuration-section"><h2>{topic === 'signups' ? 'Admin sign-up alerts' : 'Push notifications'}</h2>
    <p className="service-note">{topic === 'signups' ? 'Receive one private notification for each new account, including email and completed social sign-ups. Available only to administrator accounts.' : 'Receive your bell activity on this device, even when Modwerk is closed. Push is optional and separate from activity email.'}</p>
    {install ? <p className="service-note">On iPhone or iPad, open Modwerk in Safari, choose Share → Add to Home Screen, then open the new icon, sign in and enable notifications here.</p> : !supported ? <p className="service-note">This browser does not support device push. Try Safari on your iPhone Home Screen or a recent desktop browser.</p> : blocked ? <p className="service-note">Notifications are blocked. Allow Modwerk in your browser or iPhone notification settings to enable them.</p> : null}
    {config && !config.available && <p className="service-note">Push delivery is not connected yet.</p>}
    {config && topic === 'signups' && !config.admin && <p className="service-note">Sign in with an administrator member account to enable sign-up alerts.</p>}
    <div className="forum-actions"><button className="button button-quiet" disabled={busy || !config || (!device[topic] && (!config.available || !supported || install || blocked || topic === 'signups' && !config.admin))} onClick={() => void change()}>{busy ? 'Please wait…' : device[topic] ? 'Turn off on this device' : 'Enable on this device'}</button>
      {device[topic] && <button className="text-button" disabled={busy || !config?.available || blocked} onClick={() => void sendTest()}>Send test notification</button>}</div>
    <p className="service-note">Notifications may appear on your lock screen. Turn this device off here at any time, and before sharing it or switching accounts.</p>
    {message && <p role="status">{message}</p>}{error && <p className="file-error" role="alert">{error}</p>}
  </section>
}

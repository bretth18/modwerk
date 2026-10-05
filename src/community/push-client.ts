import { assetUrl } from '../hosting'
import { api, post } from './api'
import type { PushConfig, PushDevice, PushTopic } from './push-contract'

export function homeScreenRequired() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return ios && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & { standalone?: boolean }).standalone
}
export function pushSupported() { return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window }
export async function currentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(new URL(assetUrl(''), document.baseURI).href)
  return await registration?.pushManager.getSubscription() ?? null
}
export async function deviceSettings(subscription: PushSubscription | null): Promise<PushDevice> {
  if (!subscription) return { activity: false, signups: false }
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint)))
  const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return api<PushDevice>('/push/subscriptions/' + id)
}
function keyBytes(value: string) { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)) }
/** Called directly from a button click so iOS sees the permission request as a user gesture. */
export async function enablePush(config: PushConfig, topic: PushTopic) {
  if (!config.publicKey) throw new Error('Push delivery is not connected yet.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser or iPhone notification settings, then try again.')
  const registration = await navigator.serviceWorker.register(new URL(assetUrl('push-sw.js'), document.baseURI), { scope: new URL(assetUrl(''), document.baseURI).href })
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription(), created = false
  if (subscription && Array.from(new Uint8Array(subscription.options.applicationServerKey ?? new ArrayBuffer(0))).join(',') !== Array.from(keyBytes(config.publicKey)).join(',')) { await subscription.unsubscribe(); subscription = null }
  if (!subscription) { subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) }); created = true }
  try { return await post<PushDevice>('/push/subscriptions', { topic, subscription: subscription.toJSON() }) }
  catch (error) { if (created) await subscription.unsubscribe().catch(() => false); throw error }
}
export async function disablePush(topic: PushTopic) {
  const subscription = await currentPushSubscription()
  if (!subscription) return { activity: false, signups: false }
  const value = await post<PushDevice>('/push/subscriptions', { topic, endpoint: subscription.endpoint }, 'DELETE')
  if (!value.activity && !value.signups) await subscription.unsubscribe()
  return value
}
export async function testPush(topic: PushTopic) {
  const subscription = await currentPushSubscription()
  if (!subscription) throw new Error('Enable notifications on this device first.')
  await post('/push/test', { topic, endpoint: subscription.endpoint })
}

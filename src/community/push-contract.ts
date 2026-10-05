export type PushTopic = 'activity' | 'signups'
export type PushDevice = { activity: boolean; signups: boolean }
export type PushConfig = { available: boolean; publicKey: string | null; admin: boolean }
export type DeviceSubscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export type DevicePush = { title: string; body: string; href: string; tag: string }

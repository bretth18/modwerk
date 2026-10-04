import type { BetterAuthOptions } from 'better-auth'
import { google, verifyGoogleIdToken } from 'better-auth/social-providers'
import type { Env } from './platform'
export const SOCIAL_PROVIDERS = ['google', 'github', 'discord'] as const
export type SocialProvider = typeof SOCIAL_PROVIDERS[number]
export function socialProviders(env: Env): SocialProvider[] {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || !env.AUTH_BASE_URL) return []
  try {
    const url = new URL(env.AUTH_BASE_URL), loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback) || url.pathname.replace(/\/$/, '') !== '/api/auth' || url.username || url.password || url.search || url.hash) return []
  } catch { return [] }
  return SOCIAL_PROVIDERS.filter(provider => { const prefix = 'SSO_' + provider.toUpperCase(); return !!env[(prefix + '_CLIENT_ID') as keyof Env] && !!env[(prefix + '_CLIENT_SECRET') as keyof Env] })
}
export function socialOptions(env: Env): BetterAuthOptions['socialProviders'] {
  const options = Object.fromEntries(socialProviders(env).map(provider => { const prefix = 'SSO_' + provider.toUpperCase(); return [provider, { clientId: env[(prefix + '_CLIENT_ID') as keyof Env], clientSecret: env[(prefix + '_CLIENT_SECRET') as keyof Env], disableImplicitSignUp: true, disableSignUp: env.REGISTRATION_OPEN !== 'true' }] })) as NonNullable<BetterAuthOptions['socialProviders']>
  if (options.google && typeof options.google !== 'function') {
    const adapter = google({...options.google})
    // The redirect callback must verify the ID token before reading its claims.
    // The library's direct ID-token endpoint is not exposed by our facade.
    options.google.getUserInfo = async tokens => {
      if (!tokens.idToken || !await verifyGoogleIdToken({token: tokens.idToken, audience: env.SSO_GOOGLE_CLIENT_ID!})) return null
      return adapter.getUserInfo(tokens)
    }
  }
  return options
}
export function validUsername(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9_]{3,24}$/.test(value) && !/^(admin|administrator|moderator|octamod|modwerk|support|system|guest)$/.test(value) }

import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'
import { verifyProviderIdToken } from 'better-auth/oauth2'
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
  return Object.fromEntries(socialProviders(env).map(provider => { const prefix = 'SSO_' + provider.toUpperCase(); return [provider, { clientId: env[(prefix + '_CLIENT_ID') as keyof Env], clientSecret: env[(prefix + '_CLIENT_SECRET') as keyof Env], ...(provider==='google'?{prompt:'select_account' as const}:{}), ...(provider==='github'?{mapProfileToUser:(profile:{login:string})=>({name:profile.login})}:{}), ...(provider==='discord'?{mapProfileToUser:(profile:{username:string})=>({name:profile.username})}:{}), disableImplicitSignUp: true, disableSignUp: env.REGISTRATION_OPEN !== 'true' || env.PRIVACY_READY !== 'true' }] })) as BetterAuthOptions['socialProviders']
}
export function validUsername(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9_]{3,24}$/.test(value) && !/^(admin|administrator|moderator|octamod|modwerk|support|system|guest)$/.test(value) }

/** The pinned Google adapter decodes redirect tokens without verifying them.
 * Use Better Auth's verifier and state nonce before accepting any claims. */
export function googleTokenBinding():BetterAuthPlugin{
  return {id:'modwerk-google-token-binding',init:ctx=>{
    const provider=ctx.socialProviders.find(provider=>provider.id==='google')
    if(!provider)return
    const authorize=provider.createAuthorizationURL.bind(provider),userinfo=provider.getUserInfo.bind(provider)
    provider.requiresIdTokenNonce=true
    if(provider.idToken&&'jwks' in provider.idToken)provider.idToken={...provider.idToken,algorithms:['RS256']}
    provider.createAuthorizationURL=async data=>{
      if(!data.idTokenNonce)throw new Error('Google sign-in requires a state nonce.')
      const url=await authorize(data);url.searchParams.set('nonce',data.idTokenNonce);return url
    }
    provider.getUserInfo=async tokens=>{
      if(!tokens.idToken||!tokens.expectedIdTokenNonce||!await verifyProviderIdToken(provider,tokens.idToken,tokens.expectedIdTokenNonce))return null
      return userinfo(tokens)
    }
  }}
}

/** Suggest the provider's public handle (GitHub login, Discord username) as a Modwerk username; Google has none. */
export function suggestUsername(handle: unknown): string | null {
  if (typeof handle !== 'string') return null
  const name = handle.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24)
  return validUsername(name) ? name : null
}

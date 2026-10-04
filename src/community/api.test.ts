import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const sessionKey = 'octamod.community.session:/api'
let values: Map<string, string>, fetchMock: ReturnType<typeof vi.fn>, storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> }
beforeEach(() => {
  vi.resetModules(); vi.stubEnv('VITE_COMMUNITY_API_URL', '')
  values = new Map()
  storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value) }), removeItem: vi.fn((key: string) => { values.delete(key) }) }
  vi.stubGlobal('localStorage', storage); vi.stubGlobal('sessionStorage', { getItem: () => null })
  vi.stubGlobal('window', new EventTarget()); fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('account transport in the frontend', () => {
  it('keeps verified sessions usable when storage refuses writes and clears them on logout', async () => {
    const { api } = await import('./api')
    values.set(sessionKey, 'a'.repeat(64)); storage.setItem.mockImplementation(() => { throw new Error('Storage disabled') }); storage.removeItem.mockImplementation(() => { throw new Error('Storage disabled') })
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }, { headers: { 'X-Octamod-Session': 'b'.repeat(64) } })).mockImplementation(async () => Response.json({ ok: true }))
    await api('/auth/verify'); await api('/auth/session')
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer ' + 'b'.repeat(64))
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }, { headers: { 'X-Octamod-Session': '' } }))
    await api('/auth/logout'); await api('/auth/session')
    expect(new Headers(fetchMock.mock.calls.at(-1)![1].headers).get('Authorization')).toBeNull()
  })
  it('reads a newer tab session after successful storage and ignores malformed session headers', async () => {
    const { api } = await import('./api')
    fetchMock.mockResolvedValueOnce(Response.json({}, { headers: { 'X-Octamod-Session': 'a'.repeat(64) } })).mockImplementation(async () => Response.json({}))
    await api('/auth/verify'); values.set(sessionKey, 'b'.repeat(64)); await api('/auth/session')
    expect(new Headers(fetchMock.mock.calls.at(-1)![1].headers).get('Authorization')).toBe('Bearer ' + 'b'.repeat(64))
    fetchMock.mockResolvedValueOnce(Response.json({}, { headers: { 'X-Octamod-Session': 'invalid' } }))
    await api('/auth/verify'); await api('/auth/session')
    expect(new Headers(fetchMock.mock.calls.at(-1)![1].headers).get('Authorization')).toBe('Bearer ' + 'b'.repeat(64))
  })
  it('clears an expired session and preserves a newer session when an older request fails', async () => {
    const { api } = await import('./api'), expired = vi.fn(); window.addEventListener('octamod-session-expired', expired)
    values.set(sessionKey, 'a'.repeat(64)); fetchMock.mockResolvedValueOnce(Response.json({ error: 'Sign in' }, { status: 401 }))
    await expect(api('/modules/miniverb/comments')).rejects.toThrow('Sign in')
    expect(values.has(sessionKey)).toBe(false); expect(expired).toHaveBeenCalledOnce()
    values.set(sessionKey, 'a'.repeat(64)); fetchMock.mockImplementationOnce(async () => { values.set(sessionKey, 'b'.repeat(64)); return Response.json({ error: 'Sign in' }, { status: 401 }) })
    await expect(api('/modules/miniverb/comments')).rejects.toThrow('Sign in')
    expect(values.get(sessionKey)).toBe('b'.repeat(64))
  })
})

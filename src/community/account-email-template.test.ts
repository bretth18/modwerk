import { describe, expect, it } from 'vitest'
import { renderAccountEmail } from '../../server/account-email-template'

describe('account email layout', () => {
  it.each([['verify', '24 hours', 'Verify your email address'], ['reset', '30 minutes', 'Reset your password']] as const)('keeps the %s action and expiry consistent in HTML and plain text', (purpose, expiry, action) => {
    const link = 'https://modwerk.app/#account/' + purpose + '/synthetic-token'
    const mail = renderAccountEmail(purpose, link)
    expect(mail.subject).toBe(action + ' · Modwerk')
    expect(mail.text).toContain(link)
    expect(mail.text).toContain('expires in ' + expiry)
    expect(mail.html).toContain('href="' + link + '"')
    expect(mail.html).toContain(action)
    expect(mail.html).toContain('expires in ' + expiry)
    expect(mail.html).toContain('role="presentation"')
    expect(mail.html).not.toMatch(/<script|<img|<iframe|<form|@import|url\(/i)
  })
  it('escapes link attributes and rejects executable URLs', () => {
    const mail = renderAccountEmail('verify', 'https://modwerk.app/?one=1&two=2#account/verify/token')
    expect(mail.html).toContain('one=1&amp;two=2')
    expect(mail.text).toContain('one=1&two=2')
    expect(() => renderAccountEmail('verify', 'javascript:alert(1)')).toThrow('HTTP or HTTPS')
  })
})

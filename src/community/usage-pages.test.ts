import { describe, expect, it } from 'vitest'
import { isUsagePage, usagePage } from './usage-pages'

describe('closed page catalog', () => {
  it.each([
    ['all', 'library:all'], ['all/effects', 'library:all'], ['library', 'library:octatrack'],
    ['effects', 'library:octatrack'], ['configuration', 'configuration:octatrack'],
    ['digitakt', 'library:digitakt'], ['digitone/configuration', 'configuration:digitone'],
    ['module/miniverb?report=1', 'module:miniverb'], ['digitakt/module/digihealth', 'module:digitakt-digihealth'],
    ['module/private', 'page-not-found'], ['digitone/module/unknown', 'page-not-found'],
    ['module-set/secret-id', 'module-set'], ['community-module/secret-id', 'community-module'],
    ['forum?search=secret', 'forum'], ['forum/new', 'forum-compose'], ['forum/shoutbox', 'forum-shoutbox'],
    ['privacy', 'privacy'], ['account/verify/private-token', 'account'], ['developer/private-id', 'developer'],
    ['__proto__', 'page-not-found'], ['admin?tab=statistics', null], ['admin/private', null], ['review', null],
    ['device/digitakt', null], ['devices', null], ['octatrack', null],
  ])('maps %s without exposing arbitrary route content', (route, page) => {
    expect(usagePage(route)).toBe(page)
    if (page) expect(isUsagePage(page)).toBe(true)
  })
  it.each(['__proto__', 'constructor', 'account/verify/secret', 'forum?search=secret', 'module:unknown', 'library:unknown', 'https://modwerk.app/#account', '', null, {}])('rejects non-catalog page keys: %s', value => expect(isUsagePage(value)).toBe(false))
})

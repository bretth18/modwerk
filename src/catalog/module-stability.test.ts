import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { ModuleStatistics } from '../community/module-statistics'
import { moduleStability } from './module-stability'

const now = Date.parse('2026-12-31T12:00:00Z')
const daysAgo = (days: number) => new Date(now - days * 86400000).toISOString()
const stats = (extra: Partial<ModuleStatistics> = {}): ModuleStatistics => ({ module_id: 'miniverb', average: 0, count: 0, likes: 0, downloads: 0, downloadsStarted: null, firstDownloadAt: null, openIssues: 0, lastIssueAt: null, ...extra })

describe('module stability grade', () => {
  it('starts every module at limited real-world testing and says what moves it up', () => {
    expect(moduleStability(stats(), {}, now)).toEqual({ level: 'limited', label: 'Limited real-world testing', detail: '0 downloads. No issue reports. Moves to “In regular use” after 100 downloads, 30 days in use and 30 days without a new report.' })
    expect(moduleStability(undefined, { hardware: 'Tested in the emulator only.' }, now)).toMatchObject({ level: 'limited', detail: 'Usage figures are unavailable right now, so this module is treated as untried. Tested in the emulator only.' })
  })

  it('needs downloads, time in use and quiet time together for each grade', () => {
    expect(moduleStability(stats({ downloads: 99, firstDownloadAt: daysAgo(40) }), {}, now).level).toBe('limited')
    expect(moduleStability(stats({ downloads: 400, firstDownloadAt: daysAgo(29) }), {}, now).level).toBe('limited')
    expect(moduleStability(stats({ downloads: 400, firstDownloadAt: daysAgo(40), lastIssueAt: daysAgo(10) }), {}, now)).toMatchObject({ level: 'limited', detail: expect.stringContaining('Latest issue report 10 days ago.') })
    expect(moduleStability(stats({ downloads: 100, firstDownloadAt: daysAgo(30), lastIssueAt: daysAgo(31) }), {}, now)).toEqual({ level: 'in-use', label: 'In regular use', detail: '100 downloads, the first 30 days ago. Latest issue report 31 days ago. Moves to “Lots of use, no recent issues” after 500 downloads, 90 days in use and 60 days without a new report.' })
    expect(moduleStability(stats({ downloads: 5000, firstDownloadAt: daysAgo(200), lastIssueAt: daysAgo(45) }), {}, now).level).toBe('in-use')
    expect(moduleStability(stats({ downloads: 500, firstDownloadAt: daysAgo(90) }), { hardware: 'A hardware test of this version was reported.' }, now)).toEqual({ level: 'proven', label: 'Lots of use, no recent issues', detail: '500 downloads, the first 90 days ago. No issue reports. A hardware test of this version was reported.' })
  })

  it('shows open reports instead of any grade, and a pending build before anything else', () => {
    const used = { downloads: 5000, firstDownloadAt: daysAgo(200) }
    expect(moduleStability(stats({ ...used, openIssues: 1, lastIssueAt: daysAgo(100) }), {}, now)).toMatchObject({ level: 'reported', label: '1 open issue report' })
    expect(moduleStability(stats({ openIssues: 3 }), {}, now).label).toBe('3 open issue reports')
    expect(moduleStability(stats({ ...used, openIssues: 3 }), { buildPending: true }, now)).toMatchObject({ level: 'pending', label: 'Build verification pending' })
  })

  it('treats a missing or unreadable first download as no time in use', () => {
    expect(moduleStability(stats({ downloads: 900, firstDownloadAt: 'not a date' }), {}, now).level).toBe('limited')
    expect(moduleStability(stats({ downloads: 900 }), {}, now).level).toBe('limited')
  })
})

describe('first download backfill', () => {
  it('dates earlier modules no earlier than their first retained day, else the start of counting', () => {
    const db = new DatabaseSync(':memory:')
    for (const file of ['0008_private_usage.sql', '0009_module_downloads.sql', '0042_usage_breakdowns.sql']) db.exec(readFileSync(new URL('../../migrations/' + file, import.meta.url), 'utf8'))
    db.exec("INSERT OR REPLACE INTO module_download_meta(key,value) VALUES('collection_started','2026-10-01T13:17:13.963Z'),('daily_started','2026-10-06T21:44:12.660Z')")
    db.exec("INSERT INTO module_downloads(module_id,downloads) VALUES('miniverb',106),('vector',14)")
    db.exec("INSERT INTO module_downloads_daily(day,module_id,downloads) VALUES('2026-10-07','miniverb',4),('2026-10-06','miniverb',2)")
    db.exec(readFileSync(new URL('../../migrations/0052_module_first_download.sql', import.meta.url), 'utf8'))
    expect(db.prepare('SELECT module_id,first_download_at FROM module_downloads ORDER BY module_id').all()).toEqual([{ module_id: 'miniverb', first_download_at: '2026-10-06' }, { module_id: 'vector', first_download_at: '2026-10-06' }])
  })
})

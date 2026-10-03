import { describe, expect, it } from 'vitest'
import { dailyRows, rankedModules, usageCsv, usageInsights } from './statistics-insights'
import type { UsageDay, UsageStatistics } from './usage-contract'
import type { AdminModuleInsight } from './admin-insights-contract'

const row = (day: string, visitors: number): UsageDay => ({day,visitors,page_views:visitors*2,configurations:0,builds:0,downloads:0,exports:0})
const data: UsageStatistics = {generatedAt:'2026-10-03T12:00:00Z',collectionStarted:'2026-09-29T12:00:00Z',from:'2026-09-27',to:'2026-10-03',days:7,
  rows:[row('2026-09-29',100),row('2026-10-01',12),row('2026-10-02',6),row('2026-10-03',999)]}

describe('admin statistics interpretation',() => {
  it('distinguishes unavailable history from zero days and excludes partial days from averages and peaks',() => {
    const insights = usageInsights(data)
    expect(dailyRows(data).map(({counts}) => counts?.visitors??null)).toEqual([null,null,100,0,12,6,999])
    expect(insights.totals.page_views).toBe(2234); expect(insights.today).toBe(999)
    expect(insights.completedDays).toBe(3); expect(insights.averageVisitors).toBe(6)
    expect(insights.activeDays).toBe(2); expect(insights.peak?.day).toBe('2026-10-01')
    expect(insights.compare('page_views')).toBeNull()
  })
  it('handles absent collection, a single partial day and completed zero-traffic days without inventing peaks',() => {
    const absent = usageInsights({...data,collectionStarted:null,rows:[]})
    expect(absent.rows.every(row => row.counts===null)).toBe(true); expect(absent.averageVisitors).toBeNull()
    const partial = usageInsights({...data,collectionStarted:'2026-10-03T12:00:00Z'})
    expect(partial.completedDays).toBe(0); expect(partial.peak).toBeNull()
    const zeros = usageInsights({...data,rows:[]})
    expect(zeros.averageVisitors).toBe(0); expect(zeros.peak).toBeNull()
  })
  it('compares completed windows, zero baselines and unavailable retention',() => {
    const full = {...data,collectionStarted:'2026-09-01T12:00:00Z',comparison:{from:'2026-09-21',to:'2026-09-26',rows:[row('2026-09-22',59)],unavailableReason:null}}
    const insights = usageInsights(full)
    expect(insights.compare('visitors')).toEqual({current:118,previous:59,percent:100})
    expect(insights.compare('builds')).toEqual({current:0,previous:0,percent:null})
    expect(usageInsights({...full,comparison:{...full.comparison,rows:[]}}).compare('visitors')).toEqual({current:118,previous:0,percent:null})
    expect(usageInsights({...full,comparison:{...full.comparison,unavailableReason:'retention'}}).compare('visitors')).toBeNull()
  })
  it('exports unavailable values as blanks and identifies partial coverage in CSV',() => {
    const csv = usageCsv(data).trimEnd().split('\n')
    expect(csv[1]).toBe('2026-09-27,uncollected,,,,,,')
    expect(csv[3]).toBe('2026-09-29,partial,100,200,0,0,0,0')
    expect(csv[4]).toBe('2026-09-30,complete,0,0,0,0,0,0')
    expect(csv.at(-1)).toBe('2026-10-03,partial,999,1998,0,0,0,0')
  })
  it('ranks unrated modules last, breaks rating ties by sample size and filters IDs without mutating the source',() => {
    const module = (title: string, ratingAverage: number|null, ratings: number): AdminModuleInsight => ({moduleId:title.toLowerCase()+'-id',title,available:true,ratingAverage,ratings,downloads:2,likes:0,comments:0,openIssues:0})
    const modules = [module('Zero',null,0),module('Beta',5,2),module('Alpha',5,1)]
    expect(rankedModules(modules,'ratingAverage','').map(module => module.title)).toEqual(['Beta','Alpha','Zero'])
    expect(rankedModules(modules,'downloads','').map(module => module.title)).toEqual(['Alpha','Beta','Zero'])
    expect(rankedModules(modules,'likes',' BETA-ID ').map(module => module.title)).toEqual(['Beta'])
    expect(modules[0].title).toBe('Zero')
  })
})

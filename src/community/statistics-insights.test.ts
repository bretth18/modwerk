import { describe, expect, it } from 'vitest'
import { accountDayValue, accountInsights, dailyRows, rankedModules, usageCsv, usageInsights } from './statistics-insights'
import type { UsageDay, UsageStatistics } from './usage-contract'
import type { AdminAccounts, AdminModuleInsight } from './admin-insights-contract'

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

const accountDay = (day: string, signups: number, completed: number, visitors: number | null, active: number | null = null) => ({day,signups,completed,visitors,active})
const accounts: AdminAccounts = {generatedAt:'2026-10-06T12:00:00Z',from:'2026-09-30',to:'2026-10-06',days:7,visitorsFrom:'2026-10-01',activeFrom:null,
  totals:{members:12,unverified:1,pendingSocial:0,suspended:0,deleted:0,administrators:1,newsOptIns:4,online:2,activeDay:3,activeWeek:5,activeMonth:8,postersMonth:3},
  signups:{today:2,last7:9,last30:20},methods:[{method:'credential',members:8},{method:'google',members:3},{method:'github',members:2},{method:'discord',members:0}],
  daily:[accountDay('2026-09-30',1,1,null),accountDay('2026-10-01',2,2,10),accountDay('2026-10-02',1,1,100),accountDay('2026-10-03',0,0,50),accountDay('2026-10-04',3,1,50),accountDay('2026-10-05',0,0,0),accountDay('2026-10-06',2,0,30)],
  previous:{from:'2026-09-24',to:'2026-09-29',signups:4,completed:4,visitors:null}}

describe('member statistics interpretation',() => {
  it('excludes today and uncollected days from totals, rates and comparisons',() => {
    const insights = accountInsights(accounts)
    expect(insights.completedDays).toBe(6)
    expect(insights.signups).toEqual({current:7,previous:4,percent:75})
    // Sign-ups before collection and on the partial first collection day are not divided by visitors.
    expect(insights.rate).toEqual({value:2,coveredDays:4,visitors:200,previous:null})
    expect(insights.completion).toEqual({signups:7,completed:5,percent:500/7,previous:100})
    expect(accounts.daily.map(row => insights.value(row,'rate'))).toEqual([null,null,1,0,6,0,200/30])
    expect(accounts.daily.map(row => insights.value(row,'completed'))).toEqual([1,2,1,0,1,0,0])
  })
  it('reports unavailable rates and zero baselines without dividing by zero',() => {
    const quiet = accountInsights({...accounts,visitorsFrom:null,daily:accounts.daily.map(row => ({...row,signups:0,completed:0,visitors:null})),previous:{...accounts.previous,signups:0,completed:0}})
    expect(quiet.signups).toEqual({current:0,previous:0,percent:null})
    expect(quiet.rate).toEqual({value:null,coveredDays:0,visitors:0,previous:null})
    expect(quiet.completion.percent).toBeNull(); expect(quiet.completion.previous).toBeNull()
    const compared = accountInsights({...accounts,previous:{...accounts.previous,visitors:400}})
    expect(compared.rate.previous).toBe(1)
    expect(accountDayValue(accountDay('2026-10-01',3,3,0),'rate',null)).toBe(0)
    expect(accountDayValue(accountDay('2026-10-01',3,3,0),'rate','2026-10-01')).toBeNull()
  })
  it('charts active members as counted, leaving days before counting began empty',() => {
    expect(accountDayValue(accountDay('2026-10-01',0,0,null,null),'active',null)).toBeNull()
    expect(accountDayValue(accountDay('2026-10-02',0,0,null,0),'active',null)).toBe(0)
    expect(accountDayValue(accountDay('2026-10-03',0,0,null,4),'active',null)).toBe(4)
  })
})

import { readFileSync,readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { developerApi } from '../../server/developers'
import { moduleStatistics } from '../../server/module-statistics'
import type { User } from '../../server/platform'
import { testDatabase } from './test-server'
import { communityModule } from './modules'
import { issueStatusStatements } from '../../server/issue-notifications'
import { updateReportTriage, type TriagedReport } from '../../server/report-triage'

const databases: DatabaseSync[]=[]
afterEach(()=>{vi.unstubAllGlobals();for(const db of databases.splice(0))db.close()})
function fixture(){
  const f=testDatabase();databases.push(f.db)
  const module=communityModule('sidechain-compressor')!
  const maker:User={id:'maker',display_name:'Maker',github_id:'273702472',github_login:'Zac-Kyoti'}
  const reporter:User={id:'listener',display_name:'Listener',username:'listener',email_verified:1}
  f.db.exec("INSERT INTO users(id,display_name,github_id,github_login) VALUES('maker','Maker','273702472','Zac-Kyoti'); INSERT INTO users(id,display_name,username,email_verified) VALUES('listener','Listener','listener',1)")
  f.db.prepare('INSERT INTO module_maintainers(module_id,user_id,github_login) VALUES(?,?,?)').run(module.id,maker.id,maker.github_login!)
  f.db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,context_json,maintainer_sharing) VALUES('private',?,?,'listener','Private title','PRIVATE report body','PRIVATE context',1)").run(module.id,module.author)
  const call=(body:unknown,who:User|null=maker)=>developerApi(new Request('https://modwerk.test/api/issues/private',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),f.adapter,who===reporter?reporter:null,false,who===reporter?null:who)
  const statistics=async()=> (await moduleStatistics(f.adapter)).find(row=>row.module_id===module.id)!
  return {...f,module,maker,reporter,call,statistics}
}

describe('report triage and applicable module defects',()=>{
  it('preserves a concurrent confirmation and rejects actions after a concurrent classification or closure',async()=>{
    const f=fixture(),snapshot=f.db.prepare('SELECT * FROM issues').get() as TriagedReport
    await f.call({triageState:'confirmed',affectedVersion:f.module.version,note:'Reproduced.'})
    await updateReportTriage(f.adapter,snapshot,{triageState:'needs_info',note:'Which pattern?'},{id:'maker',memberId:'maker'},'stale-wait',null)
    expect(f.db.prepare('SELECT triage_state,confirmed_at,affected_version FROM issues').get()).toMatchObject({triage_state:'needs_info',confirmed_at:expect.any(String),affected_version:f.module.version})
    expect(f.db.prepare("SELECT affected_version FROM issue_triage_events WHERE id='stale-wait'").get()!.affected_version).toBe(f.module.version)
    await updateReportTriage(f.adapter,snapshot,{reportKind:'bug',note:'Still a bug.'},{id:'maker'},'same-kind',null)
    expect(f.db.prepare('SELECT triage_state,confirmed_at FROM issues').get()).toMatchObject({triage_state:'needs_info',confirmed_at:expect.any(String)})
    await f.call({reportKind:'feature',note:'It is a suggestion.'})
    await expect(updateReportTriage(f.adapter,snapshot,{triageState:'confirmed',affectedVersion:'unknown',note:'It is a suggestion.'},{id:'maker'},'stale-confirm',null)).rejects.toThrow('report changed')
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM issue_triage_events WHERE id='stale-confirm'").get()!.count).toBe(0)
    await f.call({status:'closed',closureReason:'withdrawn',note:'Withdrawn.'})
    await expect(updateReportTriage(f.adapter,snapshot,{triageState:'needs_info',note:'More details.'},{id:'maker'},'stale-closed',null)).rejects.toThrow('report changed')
  })

  it('keeps private notes private, authenticates maintainers, and distinguishes reports from confirmed defects',async()=>{
    const f=fixture(),provider=vi.fn();vi.stubGlobal('fetch',provider)
    expect(await f.statistics()).toMatchObject({openIssues:1,confirmedIssues:0,unconfirmedIssues:1,lastConfirmedIssueAt:null})
    await expect(f.call({triageState:'needs_info',note:'Which track?'},f.reporter)).rejects.toThrow('authorized maintainer')
    await f.call({triageState:'needs_info',note:'PRIVATE follow-up question'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:0,needsInfoIssues:1,lastConfirmedIssueAt:null})
    await f.call({triageState:'confirmed',affectedVersion:f.module.version,note:'Reproduced with two tracks.'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:1,lastConfirmedIssueAt:expect.any(String)})
    await f.call({triageState:'needs_info',note:'Can you try another pattern?'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:1,needsInfoIssues:0})
    expect(provider).not.toHaveBeenCalled()
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM issue_triage_events').get()!.count).toBe(3)
    expect(f.db.prepare('SELECT user_id FROM notifications').all().every(row=>row.user_id==='listener')).toBe(true)
    f.db.exec('UPDATE issues SET maintainer_sharing=0')
    await expect(f.call({triageState:'investigating',note:'Checking.'})).rejects.toThrow('Report not found')
  })

  it('keeps unknown applicability visible and excludes older exact versions, suggestions and dismissed reports',async()=>{
    const f=fixture()
    await f.call({triageState:'confirmed',affectedVersion:'0.0.1',note:'Only reproduced on the old version.'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:0,lastConfirmedIssueAt:null})
    await f.call({triageState:'confirmed',affectedVersion:'unknown',note:'Version applicability is still unknown.'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:1})
    await f.call({reportKind:'feature',note:'This is an enhancement request.'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:0,unconfirmedIssues:0,lastConfirmedIssueAt:null})
    await f.call({reportKind:'bug',note:'Reclassifying after reproduction.'})
    await f.call({triageState:'confirmed',affectedVersion:f.module.version,note:'Reproduced.'})
    await f.call({status:'closed',closureReason:'not_reproducible',note:'The reproduction used stock behavior.'})
    expect(await f.statistics()).toMatchObject({confirmedIssues:0,lastConfirmedIssueAt:null})
    expect(f.db.prepare('SELECT closure_reason FROM issues').get()!.closure_reason).toBe('not_reproducible')
    await f.call({status:'open'})
    expect(f.db.prepare('SELECT closure_reason FROM issues').get()!.closure_reason).toBeNull()
  })

  it('does not attribute a confirmed configuration problem to all its modules',async()=>{
    const f=fixture()
    f.db.exec("UPDATE issues SET scope='configuration'")
    f.db.prepare('INSERT INTO issue_modules(issue_id,module_id,version) VALUES(?,?,?)').run('private',f.module.id,f.module.version)
    await expect(f.call({triageState:'confirmed',affectedVersion:f.module.version,note:'It fails.'})).rejects.toThrow('Use unknown')
    await f.call({triageState:'confirmed',affectedVersion:'unknown',note:'Reproduced in this configuration; cause unknown.'})
    expect(await f.statistics()).toMatchObject({openIssues:0,confirmedIssues:0,lastConfirmedIssueAt:null})
  })

  it('validates transitions and keeps closed report outcomes explicit',async()=>{
    const f=fixture()
    for(const body of [{triageState:'confirmed',note:'No version.'},{triageState:'confirmed',affectedVersion:'01.2.3',note:'Invalid version.'},{triageState:'invented',note:'No.'},{triageState:'needs_info',note:''},{triageState:'awaiting_verification',note:'Untested.'},{reportKind:'feature',triageState:'confirmed',note:'Mixed action.'}])await expect(f.call(body)).rejects.toThrow()
    await f.call({status:'closed',closureReason:'insufficient_information',note:'No reproduction details supplied.'})
    expect(f.db.prepare('SELECT status,closure_reason FROM issues').get()).toEqual({status:'closed',closure_reason:'insufficient_information'})
    await expect(f.call({triageState:'investigating',note:'Trying.'})).rejects.toThrow('Reopen')
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='issue_resolved'").get()!.count).toBe(0)
  })

  it('retains the command’s closure explanation when the signed GitHub closure arrives first',async()=>{
    const f=fixture()
    await f.adapter.batch(issueStatusStatements(f.adapter,'private','closed',null,'Zac-Kyoti',null,false))
    const closedAt=f.db.prepare('SELECT closed_at FROM issues').get()!.closed_at
    await f.adapter.batch(issueStatusStatements(f.adapter,'private','closed',null,'Zac-Kyoti',null,false,'insufficient_information','Please provide reproduction steps.'))
    expect(f.db.prepare('SELECT closure_reason,closure_note,closed_at FROM issues').get()).toEqual({closure_reason:'insufficient_information',closure_note:'Please provide reproduction steps.',closed_at:closedAt})
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(1)
  })
})

it('migrates old open and closed reports without inventing confirmation or historical outcomes',()=>{
  const db=new DatabaseSync(':memory:');databases.push(db)
  const files=readdirSync(new URL('../../migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort()
  for(const file of files.filter(name=>name<'0068_report_triage.sql'))db.exec(readFileSync(new URL('../../migrations/'+file,import.meta.url),'utf8'))
  db.exec("INSERT INTO users(id,display_name) VALUES('old-listener','Listener'); INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,status) VALUES('open','miniverb','author','old-listener','Title','Body','open'),('closed','miniverb','author','old-listener','Title','Body','closed')")
  db.exec(readFileSync(new URL('../../migrations/0068_report_triage.sql',import.meta.url),'utf8'))
  expect(db.prepare('SELECT status,triage_state,confirmed_at,closure_reason FROM issues ORDER BY id').all()).toEqual([{status:'closed',triage_state:'untriaged',confirmed_at:null,closure_reason:null},{status:'open',triage_state:'untriaged',confirmed_at:null,closure_reason:null}])
})

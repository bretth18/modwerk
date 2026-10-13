import { describe, expect, it, vi, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { VolatileBatchSession, type VolatileTransport } from './volatile-batch-session.ts'
import { VolatilePhase, VolatileResult, type VolatileRecord, type VolatileStatus } from './volatile-batch-wire.ts'

const base='1'.repeat(64), session='2'.repeat(64), baseline='3'.repeat(64), published='4'.repeat(64)
const observed={base,session,capabilities:64}
const zeros='0'.repeat(64)
function record(module=1, size=32): VolatileRecord {
 const data=new Uint8Array(size), view=new DataView(data.buffer)
 view.setUint32(0,0x4d57524d);view.setUint16(4,4);view.setUint32(28,module)
 return {module,participants:[module],data,sha256:createHash('sha256').update(data).digest('hex')}
}
type Facts=Omit<VolatileStatus,'base'|'session'>
function initial(): Facts {
 return {sequence:0,result:'ok',phase:'idle',transaction:0,generation:0,received:0,total:0,records:0,published:0,
  baseline:null,current:baseline,offer:null,latchHeld:false,required:0,touched:0,confirmed:0,
  limits:{stageBytes:100000,records:20,participants:20},poolBytes:786432}
}
function wire(f:Facts): Uint8Array {
 const data=new Uint8Array(212), view=new DataView(data.buffer)
 data.set([0x4d,0x57,0x56,0x53,1,VolatileResult.indexOf(f.result),VolatilePhase.indexOf(f.phase),
  8+(f.baseline?1:0)+(f.current?2:0)+(f.latchHeld?4:0)])
 for(const [at,value] of [[8,f.sequence],[12,f.transaction],[16,f.generation],[20,f.received],[24,f.total],
  [196,f.limits.stageBytes],[200,f.poolBytes]]) view.setUint32(at,value)
 for(const [at,value] of [[28,f.records],[30,f.published],[204,f.limits.records],[206,f.limits.participants]]) view.setUint16(at,value)
 for(const [at,hex] of [[32,base],[64,session],[96,f.baseline??zeros],[128,f.offer??zeros],[160,f.current??zeros]] as const)
  data.set(Buffer.from(hex,'hex'),at)
 data[192]=f.required;data[193]=f.touched;data[194]=f.confirmed
 return data
}
/** Independent synthetic board oracle. This proves host ownership/error paths,
 * never real reconstruction, source trust, DSP jobs, save inhibition or hardware. */
class Board implements VolatileTransport {
 facts=initial()
 frames:Uint8Array[]=[]
 bundle=new Uint8Array(0)
 command=0
 reads=0
 transform:(facts:Facts,command:number,read:number)=>Facts = facts=>facts
 submit=vi.fn(async (frame:Uint8Array,signal:AbortSignal)=>{
  if(signal.aborted) throw new Error('Cancelled synthetic transfer')
  this.frames.push(frame.slice());this.command=frame[5];this.reads=0
  const view=new DataView(frame.buffer,frame.byteOffset,frame.byteLength)
  this.facts.sequence=view.getUint32(8)
  switch(this.command){
   case 1:
    this.facts={...this.facts,phase:'receiving',transaction:9,generation:11,baseline,
     offer:Buffer.from(frame.slice(128,160)).toString('hex'),total:view.getUint32(160),latchHeld:true}
    this.bundle=new Uint8Array(this.facts.total);break
   case 2:
    this.bundle.set(frame.slice(100),view.getUint32(96));this.facts.received=view.getUint32(96)+frame.length-100;break
   case 3: this.facts.phase='verified';this.facts.records=new DataView(this.bundle.buffer).getUint16(10);break
   case 4: this.facts.phase='stoppedTrial';this.facts.current=published;this.facts.published=this.facts.records;this.facts.touched=3;break
   case 5: this.facts.phase='runningTrial';break
   case 6: case 7:
    this.facts={...initial(),sequence:this.facts.sequence,transaction:9,generation:11,baseline};break
   case 8:break
   default:throw new Error('Unexpected command')
  }
 })
 result=vi.fn(async (signal:AbortSignal)=>{
  if(signal.aborted) throw new Error('Cancelled synthetic read')
  return wire(this.transform({...this.facts},this.command,++this.reads))
 })
 state=vi.fn(async (signal:AbortSignal)=>{
  if(signal.aborted) throw new Error('Cancelled synthetic read')
  return wire(this.facts)
 })
}
const connect=(board:Board,options:Partial<Parameters<typeof VolatileBatchSession.connect>[2]>={})=>
 VolatileBatchSession.connect(board,observed,{visible:()=>true,...options})
afterEach(()=>vi.restoreAllMocks())

describe('private volatile session authority',()=>{
 it('stages twenty records without any intermediate publish/accept, then confirms complete rollback',async()=>{
  const board=new Board(),client=await connect(board)
  const staged=await client.stage(Array.from({length:20},(_,i)=>record(i+1)))
  expect(staged).toMatchObject({phase:'verified',records:20,published:0,current:baseline})
  expect(client.ownsTransaction).toBe(true)
  expect(board.frames.map(f=>f[5])).toEqual([1,2,3])
  expect(await client.activate()).toMatchObject({phase:'stoppedTrial',records:20,published:20,current:published})
  expect(await client.startTrial()).toMatchObject({phase:'runningTrial'})
  expect(await client.rollback()).toMatchObject({phase:'idle',current:baseline,baseline,latchHeld:false})
  expect(client.ownsTransaction).toBe(false)
  expect(board.frames.map(f=>f[5])).toEqual([1,2,3,4,5,6])
  expect(board.frames.every(f=>f.length<=4096&&f.length%64!==0)).toBe(true)
  await expect(client.stage([record()])).rejects.toThrow('fresh idle session')
 })
 it('preserves complete data over bounded chunks and serial monotonically increasing sequences',async()=>{
  const board=new Board(),client=await connect(board)
  await client.stage([record(1,8000),record(2)])
  const chunks=board.frames.filter(f=>f[5]===2)
  expect(chunks.length).toBe(3)
  expect(board.frames.map(f=>new DataView(f.buffer).getUint32(8))).toEqual([1,2,3,4,5])
  expect(new DataView(board.bundle.buffer).getUint16(10)).toBe(2)
  for(const frame of chunks) expect(frame.length%64).not.toBe(0)
 })
 it('copies package bytes/participants before awaiting and refuses invalid offers without a write',async()=>{
  const board=new Board(),client=await connect(board),pkg=record()
  const pending=client.stage([pkg]);pkg.data.fill(0);(pkg.participants as number[])[0]=2
  await pending
  expect(new DataView(board.bundle.buffer).getUint32(88)).toBe(1)
  expect(new DataView(board.bundle.buffer).getUint32(140)).toBe(0x4d57524d)
  const untouched=new Board(),fresh=await connect(untouched),bad=record();bad.data[0]^=1
  await expect(fresh.stage([bad])).rejects.toThrow();expect(untouched.frames).toEqual([])
 })
 it('refuses old capabilities before transport and active/cached queued sessions before writes',async()=>{
  const board=new Board()
  await expect(VolatileBatchSession.connect(board,{...observed,capabilities:7},{visible:()=>true})).rejects.toThrow('unavailable')
  expect(board.state).not.toHaveBeenCalled()
  board.facts={...initial(),result:'queued',sequence:1}
  await expect(connect(board)).rejects.toThrow('not confirmed');expect(board.frames).toEqual([])
 })
 it('a state read with consumed rollback tokens grants no ownership',async()=>{
  const board=new Board();board.facts={...initial(),transaction:9,generation:11,sequence:6,baseline}
  const client=await connect(board)
  expect(client.ownsTransaction).toBe(false)
  await expect(client.rollback()).rejects.toThrow('no acknowledged');expect(board.frames).toEqual([])
 })
 it('rechecks the complete idle baseline immediately before Begin',async()=>{
  const board=new Board(),client=await connect(board);board.facts.current=published
  await expect(client.stage([record()])).rejects.toThrow('Baseline changed')
  expect(board.frames).toEqual([]);expect(client.connectionTrusted).toBe(false)
 })
 it('waits through a queued unowned Begin without adopting cached state or retransmitting',async()=>{
  const board=new Board(),client=await connect(board)
  board.transform=(facts,command,read)=>command===1&&read===1?{...initial(),result:'queued',sequence:facts.sequence}:facts
  await client.stage([record()])
  expect(board.frames.filter(f=>f[5]===1)).toHaveLength(1)
  expect(board.state).toHaveBeenCalledTimes(2)
 })
 it.each(['out','result','malformed','busy','wrongBaseline','wrongToken'] as const)('never adopts/retries/releases a lost or ambiguous Begin (%s)',async(mode)=>{
  const board=new Board(),client=await connect(board)
  if(mode==='out') board.submit.mockImplementationOnce(async()=>{throw new Error('lost OUT')})
  if(mode==='result') board.result.mockRejectedValueOnce(new Error('lost result'))
  if(mode==='malformed') board.result.mockResolvedValueOnce(new Uint8Array(211))
  if(mode==='busy') board.transform=facts=>({...facts,result:'busy'})
  if(mode==='wrongBaseline') board.transform=facts=>({...facts,baseline:published})
  if(mode==='wrongToken') board.transform=facts=>({...facts,transaction:0})
  await expect(client.stage([record()])).rejects.toThrow()
  const count=board.submit.mock.calls.length
  expect(client.ownsTransaction).toBe(false);expect(client.connectionTrusted).toBe(false)
  for(const action of [()=>client.stage([record()]),()=>client.abort(),()=>client.rollback(),()=>client.touch()])
   await expect(action()).rejects.toThrow('unconfirmed')
  expect(board.submit.mock.calls).toHaveLength(count)
  if(mode==='out') expect(board.result).not.toHaveBeenCalled()
 })
 it('allows acknowledged asynchronous publication without assigning prior ACKs to the current operation',async()=>{
  const board=new Board(),client=await connect(board);await client.stage([record()])
  board.transform=(facts,command,read)=>command===4&&read===1?
   {...facts,result:'pending',phase:'publishing',current:null,required:1,touched:3,confirmed:1,published:0}:facts
  await client.activate();expect(board.frames.filter(f=>f[5]===4)).toHaveLength(1)
 })
 it('never repeats an unowned queued Begin when engine acknowledgement expires',async()=>{
  const board=new Board(),client=await connect(board,{timeoutMs:20})
  board.transform=facts=>({...initial(),sequence:facts.sequence,result:'queued'})
  await expect(client.stage([record()])).rejects.toThrow('not confirmed')
  expect(client.ownsTransaction).toBe(false);expect(board.frames.map(f=>f[5])).toEqual([1])
  await expect(client.abort()).rejects.toThrow('unconfirmed');expect(board.frames).toHaveLength(1)
 })
 it('pending publication expiry retains the last verified receipt and never invents rollback',async()=>{
  const board=new Board(),client=await connect(board,{timeoutMs:20});await client.stage([record()])
  board.transform=facts=>({...facts,result:'pending',phase:'publishing',published:0,current:null})
  await expect(client.activate()).rejects.toThrow('not confirmed')
  expect(client.status.phase).toBe('verified');expect(client.connectionTrusted).toBe(false)
  await expect(client.rollback()).rejects.toThrow('unconfirmed');expect(board.frames.map(f=>f[5])).toEqual([1,2,3,4])
 })
 it('waits for its exact sequence instead of treating an earlier cached reply as publication',async()=>{
  const board=new Board(),client=await connect(board);await client.stage([record()])
  board.transform=(facts,command,read)=>command===4&&read===1?{...facts,sequence:facts.sequence-1}:facts
  await client.activate();expect(board.frames.filter(f=>f[5]===4)).toHaveLength(1)
 })
 it.each(['changedOffer','partialPublication','quarantine','wrongSequence','changedLimits','wrongCoreAck','pendingRecordCount'] as const)('retains unknown work and forbids all further commands after %s',async(mode)=>{
  const board=new Board(),client=await connect(board);await client.stage([record()])
  board.transform=facts=>{
   if(mode==='changedOffer')return {...facts,offer:baseline}
   if(mode==='partialPublication')return {...facts,published:0}
   if(mode==='quarantine')return {...facts,result:'quarantined',phase:'quarantined',current:null}
   if(mode==='wrongSequence')return {...facts,sequence:facts.sequence+1}
   if(mode==='changedLimits')return {...facts,poolBytes:786431}
   if(mode==='pendingRecordCount')return {...facts,result:'pending',phase:'publishing',records:2,published:0}
   return {...facts,result:'pending',phase:'publishing',required:1,touched:1,confirmed:2}
  }
  await expect(client.activate()).rejects.toThrow()
  const count=board.frames.length;await expect(client.rollback()).rejects.toThrow('unconfirmed')
  expect(board.frames).toHaveLength(count);expect(client.connectionTrusted).toBe(false)
 })
 it('never mistakes a partial/mismatched rollback for restored baseline',async()=>{
  const board=new Board(),client=await connect(board);await client.stage([record()]);await client.activate()
  board.transform=facts=>({...facts,current:published})
  await expect(client.rollback()).rejects.toThrow();expect(client.connectionTrusted).toBe(false)
 })
 it('bounds polling, rejects a late reply and never overlaps it with another command',async()=>{
  const board=new Board(),client=await connect(board,{timeoutMs:20})
  let late!: (bytes:Uint8Array)=>void
  board.result.mockImplementationOnce(()=>new Promise(resolve=>{late=resolve}))
  const pending=client.stage([record()]);const failure=expect(pending).rejects.toThrow('not confirmed')
  await failure
  late(wire(board.facts));await Promise.resolve()
  expect(client.ownsTransaction).toBe(false);expect(client.status.phase).toBe('idle')
  await expect(client.rollback()).rejects.toThrow('unconfirmed');expect(board.frames).toHaveLength(1)
 })
 it('serializes operations and checks cancellation only between positively acknowledged commands',async()=>{
  const board=new Board(),client=await connect(board),controller=new AbortController()
  board.submit.mockImplementationOnce(async frame=>{
   board.frames.push(frame.slice());board.command=1;board.facts={...initial(),sequence:1,transaction:9,generation:11,
    phase:'receiving',baseline,offer:Buffer.from(frame.slice(128,160)).toString('hex'),
    total:new DataView(frame.buffer).getUint32(160),latchHeld:true};controller.abort()
  })
  const pending=client.stage([record()],{signal:controller.signal})
  await expect(client.rollback()).rejects.toThrow('in progress')
  await expect(pending).rejects.toThrow('cancelled')
  expect(client.connectionTrusted).toBe(true);expect(client.ownsTransaction).toBe(true)
  await client.abort();expect(board.frames.map(f=>f[5])).toEqual([1,7])
 })
 it('renewal is at most once a second and a hidden trial rolls back without Touch',async()=>{
  let visible=true, now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
  const board=new Board(),client=await connect(board,{visible:()=>visible})
  await client.stage([record()]);await client.activate();await client.startTrial()
  await expect(client.touch()).rejects.toThrow('once per second')
  now=1000;await client.touch()
  await expect(client.touch()).rejects.toThrow('once per second')
  visible=false;expect(await client.touch()).toMatchObject({phase:'idle',current:baseline})
  expect(board.frames.filter(f=>f[5]===8)).toHaveLength(1)
  expect(board.frames.at(-1)?.[5]).toBe(6)
 })
 it('Touch cannot extend the absolute trial duration, and no implicit playback starts',async()=>{
  let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
  const board=new Board(),client=await connect(board,{trialMs:2000})
  await client.stage([record()]);await client.activate()
  now=1000;await client.touch()
  now=2000;expect(await client.startTrial()).toMatchObject({phase:'idle'})
  expect(board.frames.some(f=>f[5]===5)).toBe(false)
 })
 it('never wraps/reuses an exhausted command sequence and bounds startup options',async()=>{
  const board=new Board();board.facts={...initial(),sequence:0xffffffff,transaction:9,generation:11,baseline}
  const client=await connect(board)
  await expect(client.stage([record()])).rejects.toThrow('exhausted');expect(board.frames).toEqual([])
  for(const options of [{timeoutMs:0},{timeoutMs:10000},{trialMs:120001},{trialMs:NaN}])
   await expect(connect(new Board(),options)).rejects.toThrow('bounded')
 })
})

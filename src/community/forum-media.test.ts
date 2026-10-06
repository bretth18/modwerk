import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { handleCommunity } from '../../server/transport'
import { cleanupForumMedia } from '../../server/forum-media'
import { FORUM_MEDIA } from './forum-contract'
import { oggCrc, oggOpus, opusPacketSamples } from './forum-media-client'
const databases:DatabaseSync[]=[]
const sent:{to:string[];text:string}[]=[]
const password='a long original test passphrase'
beforeEach(()=>{sent.length=0;vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{sent.push(JSON.parse(String(options.body)));return Response.json({id:crypto.randomUUID()})}))})
afterEach(()=>{vi.unstubAllGlobals();for(const db of databases.splice(0))db.close()})
const png=(size=64)=>{const bytes=new Uint8Array(size);bytes.set([137,80,78,71,13,10,26,10]);for(let index=8;index<size;index++)bytes[index]=index&255;return bytes}
const ogg=()=>{const bytes=new Uint8Array(200);bytes.set([79,103,103,83]);return bytes}
async function fixture(){
 const server=await testServer();databases.push(server.db)
 const objects=new Map<string,Uint8Array<ArrayBuffer>>()
 server.env.MEDIA={async put(key,bytes){objects.set(key,new Uint8Array(bytes))},async get(key,options){const bytes=objects.get(key);if(!bytes)return null;const part=options?.range?bytes.slice(options.range.offset,options.range.offset+options.range.length):bytes;return {body:new Response(part).body!}},async delete(key){objects.delete(key)}}
 async function member(username:string){
  const email=username+'@example.test'
  expect((await server.call('/auth/register','POST',{rulesVersion:COMMUNITY_RULES_VERSION,username,email,password})).status).toBe(202)
  const token=[...sent].reverse().find(message=>message.to[0]===email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
  expect((await server.call('/auth/verify','POST',{token,password})).status).toBe(200)
  return (await server.call('/auth/login','POST',{email,password})).headers.get('X-Octamod-Session')!
 }
 async function upload(bytes:Uint8Array<ArrayBuffer>,session:string){
  const headers=new Headers({Origin:'https://octamod.test','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/octet-stream'})
  if(session)headers.set('Authorization','Bearer '+session)
  return handleCommunity(new Request('https://api.example.test/api/forum/media',{method:'POST',headers,body:bytes}),server.env)
 }
 function media(id:string,init:{range?:string;admin?:string}={}){
  const headers=new Headers();if(init.range)headers.set('Range',init.range);if(init.admin)headers.set('X-Octamod-Admin',init.admin)
  return handleCommunity(new Request('https://api.example.test/api/forum/media/'+id,{headers}),server.env)
 }
 const admin=async()=>(await(await server.call('/auth/admin','POST',{key:'e'.repeat(64)})).json()).token as string
 return {...server,objects,member,upload,media,admin}
}
const thread={title:'Granular pad from Tapehead',body:'Here is how it sounds.',category:'general'}
describe('forum images and sound clips',()=>{
 it('accepts only verified members, real image/audio bytes and the size limits',async()=>{
  const f=await fixture(),session=await f.member('uploader')
  expect((await f.upload(png(),'')).status).toBe(401)
  expect((await f.upload(new TextEncoder().encode('#!/bin/sh\necho firmware please'.padEnd(80)),session)).status).toBe(415)
  expect((await f.upload(new Uint8Array([0xf0,0x00,0x20,0x3c,...new Array(60).fill(0)]),session)).status).toBe(415)
  expect((await f.upload(png(FORUM_MEDIA.maxImageBytes+1),session)).status).toBe(413)
  expect((await f.upload(png(FORUM_MEDIA.maxAudioBytes+1),session)).status).toBe(413)
  const created=await f.upload(png(),session);expect(created.status).toBe(201)
  expect(await created.json()).toMatchObject({kind:'image',mime:'image/png',bytes:64})
  expect(f.objects.size).toBe(1)
  expect(await(await f.call('/auth/session','GET',undefined,session)).json()).toMatchObject({forumMedia:true})
  delete f.env.MEDIA
  expect((await f.upload(png(),session)).status).toBe(503)
  expect(await(await f.call('/auth/session')).json()).toMatchObject({forumMedia:false})
 })
 it('attaches the author’s unused uploads to a post and serves them with byte ranges',async()=>{
  const f=await fixture(),author=await f.member('author'),other=await f.member('other')
  const image=(await(await f.upload(png(),author)).json()).id,sound=(await(await f.upload(ogg(),author)).json()).id,foreign=(await(await f.upload(png(),other)).json()).id
  expect((await f.media(image)).status).toBe(404)
  expect((await f.call('/forum/threads','POST',{...thread,attachments:[{id:foreign}]},author)).status).toBe(400)
  expect((await f.call('/forum/threads','POST',{...thread,attachments:[{id:image},{id:image}]},author)).status).toBe(400)
  expect((await f.call('/forum/threads','POST',{...thread,attachments:[{id:image,caption:'x'.repeat(301)}]},author)).status).toBe(400)
  expect((await f.call('/forum/threads','POST',{...thread,attachments:new Array(5).fill(0).map(()=>({id:crypto.randomUUID()}))},author)).status).toBe(400)
  const created=await f.call('/forum/threads','POST',{...thread,attachments:[{id:sound,caption:'Dry, then wet'},{id:image,caption:'  Tapehead page  '}]},author);expect(created.status).toBe(201)
  const {id}=await created.json()
  expect((await f.call('/forum/threads/'+id+'/replies','POST',{body:'Reusing it',attachments:[{id:image}]},author)).status).toBe(400)
  const detail=await(await f.call('/forum/threads/'+id)).json()
  expect(detail.posts[0].attachments).toEqual([{id:sound,kind:'audio',caption:'Dry, then wet'},{id:image,kind:'image',caption:'Tapehead page'}])
  const full=await f.media(image);expect(full.status).toBe(200)
  expect(Object.fromEntries(['content-type','x-content-type-options','content-security-policy','accept-ranges'].map(name=>[name,full.headers.get(name)]))).toEqual({'content-type':'image/png','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox",'accept-ranges':'bytes'})
  expect(new Uint8Array(await full.arrayBuffer())).toEqual(png())
  const part=await f.media(image,{range:'bytes=8-11'});expect(part.status).toBe(206);expect(part.headers.get('content-range')).toBe('bytes 8-11/64');expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([8,9,10,11])
  const tail=await f.media(image,{range:'bytes=-4'});expect(tail.headers.get('content-range')).toBe('bytes 60-63/64')
  const open=await f.media(image,{range:'bytes=60-'});expect(open.headers.get('content-range')).toBe('bytes 60-63/64')
  const outside=await f.media(image,{range:'bytes=64-'});expect(outside.status).toBe(416);expect(outside.headers.get('content-range')).toBe('bytes */64')
  expect((await f.media(image,{range:'bytes=0-1,4-5'})).status).toBe(200)
  // A reply can carry files too, and the thread's other member cannot remove them.
  const clip=(await(await f.upload(ogg(),author)).json()).id
  expect((await f.call('/forum/threads/'+id+'/replies','POST',{body:'Second take',attachments:[{id:clip}]},author)).status).toBe(201)
  expect((await(await f.call('/forum/threads/'+id)).json()).posts[1].attachments).toEqual([{id:clip,kind:'audio',caption:''}])
  expect((await f.call('/forum/media/'+clip,'DELETE',undefined,other)).status).toBe(404)
 })
 it('hides files with their post, lets authors and administrators remove them, and purges the bucket',async()=>{
  const f=await fixture(),author=await f.member('author'),admin=await f.admin()
  const image=(await(await f.upload(png(),author)).json()).id,sound=(await(await f.upload(ogg(),author)).json()).id
  const {id}=await(await f.call('/forum/threads','POST',{...thread,attachments:[{id:image},{id:sound}]},author)).json()
  const postId=(await(await f.call('/forum/threads/'+id)).json()).posts[0].id
  expect((await f.call('/admin/forum/posts/'+postId,'PATCH',{action:'hidden',value:true,reason:'Review'},'',admin)).status).toBe(200)
  expect((await f.media(image)).status).toBe(404)
  expect((await(await f.call('/forum/threads/'+id)).json()).posts[0].attachments).toEqual([])
  const moderated=await f.media(image,{admin});expect(moderated.status).toBe(200);expect(moderated.headers.get('cache-control')).toBe('private, no-store')
  expect((await(await f.call('/forum/threads/'+id,'GET',undefined,'',admin)).json()).posts[0].attachments).toHaveLength(2)
  expect((await f.call('/admin/forum/posts/'+postId,'PATCH',{action:'hidden',value:false,reason:'Fine'},'',admin)).status).toBe(200)
  expect((await f.media(image)).status).toBe(200)
  expect((await f.call('/admin/forum/media/'+sound,'PATCH',{action:'removed',value:true,reason:'Copyrighted loop'},'',admin)).status).toBe(200)
  expect((await f.call('/admin/forum/media/'+sound,'PATCH',{action:'removed',value:false,reason:'Undo'},'',admin)).status).toBe(400)
  expect((await f.call('/forum/media/'+image,'DELETE',undefined,author)).status).toBe(200)
  expect((await f.media(image)).status).toBe(404)
  expect((await(await f.call('/forum/threads/'+id)).json()).posts[0].attachments).toEqual([])
  const unused=(await(await f.upload(png(),author)).json()).id,fresh=(await(await f.upload(png(),author)).json()).id
  f.db.prepare("UPDATE forum_media SET created_at=datetime('now','-2 days') WHERE id=?").run(unused)
  expect(f.objects.size).toBe(4)
  await cleanupForumMedia(f.env)
  expect(f.db.prepare('SELECT id FROM forum_media').all()).toEqual([{id:fresh}])
  expect([...f.objects.keys()]).toEqual(['forum/'+fresh])
 })
 it('exports a member’s files and removes them when the account is deleted, keeping the text',async()=>{
  const f=await fixture(),author=await f.member('leaving')
  const image=(await(await f.upload(png(),author)).json()).id
  const {id}=await(await f.call('/forum/threads','POST',{...thread,attachments:[{id:image,caption:'Studio'}]},author)).json()
  const exported=await(await f.call('/auth/data-export','POST',{password},author)).json()
  expect(exported.data.postMedia).toMatchObject([{id:image,kind:'image',mime:'image/png',bytes:64,caption:'Studio'}])
  expect((await f.call('/auth/account','DELETE',{confirm:'DELETE',password},author)).status).toBe(200)
  expect((await f.media(image)).status).toBe(404)
  const detail=await(await f.call('/forum/threads/'+id)).json()
  expect(detail.posts[0]).toMatchObject({body:thread.body,attachments:[]})
  await cleanupForumMedia(f.env)
  expect(f.objects.size).toBe(0)
 })
 it('shows the newest posts with files in the Showcase with their reply page, leaving out bug reports, hidden posts and removed files',async()=>{
  const f=await fixture(),author=await f.member('author')
  type Item={id:string;thread_id:string;attachments:unknown[]}
  const showcase=async(query='')=>(await(await f.call('/forum/showcase'+query)).json()) as Item[]
  const photo=(await(await f.upload(png(),author)).json()).id
  const desk=await(await f.call('/forum/threads','POST',{...thread,machine:'digitakt',attachments:[{id:photo,caption:'Desk'}]},author)).json()
  const {id}=await(await f.call('/forum/threads','POST',{title:'Long jam thread',body:'Opening',category:'showcase',machine:'octatrack'},author)).json()
  const userId=String(f.db.prepare('SELECT user_id FROM forum_posts WHERE thread_id=?').get(id)!.user_id)
  for(let index=0;index<30;index++)f.db.prepare('INSERT INTO forum_posts(id,thread_id,user_id,body) VALUES(?,?,?,?)').run('jam-'+index,id,userId,'Reply '+index)
  const clip=(await(await f.upload(ogg(),author)).json()).id,still=(await(await f.upload(png(),author)).json()).id
  expect((await f.call('/forum/threads/'+id+'/replies','POST',{body:'Second take',attachments:[{id:clip},{id:still}]},author)).status).toBe(201)
  const bug=(await(await f.upload(png(),author)).json()).id
  const report=await(await f.call('/forum/threads','POST',{...thread,title:'Crash on load',attachments:[{id:bug}]},author)).json()
  f.db.prepare("UPDATE forum_threads SET category='issues' WHERE id=?").run(report.id)
  const items=await showcase()
  expect(items.map(item=>item.thread_id)).toEqual([id,desk.id])
  expect(items[0]).toMatchObject({page:1,category:'showcase',machine:'octatrack',username:'author',attachments:[{id:clip,kind:'audio',caption:''},{id:still,kind:'image',caption:''}]})
  expect(items[1]).toMatchObject({page:0,machine:'digitakt',attachments:[{id:photo,kind:'image',caption:'Desk'}]})
  expect(JSON.stringify(items)).not.toMatch(/user_id|email|object_key|bytes/)
  expect((await(await f.call('/forum/threads/'+id+'?page=1')).json()).posts.some((post:{id:string})=>post.id===items[0].id)).toBe(true)
  expect((await showcase('?machine=digitakt')).map(item=>item.thread_id)).toEqual([desk.id])
  expect((await showcase('?category=showcase')).map(item=>item.thread_id)).toEqual([id])
  expect((await f.call('/forum/showcase?machine=unknown')).status).toBe(400)
  expect((await f.call('/forum/showcase?category=issues')).status).toBe(400)
  // Thread rows say which kinds of files a discussion carries.
  const rows=(await(await f.call('/forum/threads')).json()).threads as {id:string;media_kinds:string|null}[]
  expect(rows.find(row=>row.id===id)!.media_kinds!.split(',').sort()).toEqual(['audio','image'])
  expect(rows.find(row=>row.id===desk.id)!.media_kinds).toBe('image')
  expect((await f.call('/forum/media/'+still,'DELETE',undefined,author)).status).toBe(200)
  expect((await showcase())[0].attachments).toEqual([{id:clip,kind:'audio',caption:''}])
  expect((await f.call('/forum/media/'+clip,'DELETE',undefined,author)).status).toBe(200)
  expect((await showcase()).map(item=>item.thread_id)).toEqual([desk.id])
  expect((await(await f.call('/forum/threads')).json()).threads.find((row:{id:string})=>row.id===id).media_kinds).toBeNull()
  const opening=(await(await f.call('/forum/threads/'+desk.id)).json()).posts[0].id
  await f.call('/admin/forum/posts/'+opening,'PATCH',{action:'hidden',value:true,reason:'Hide the photo'},'',await f.admin())
  expect(await showcase()).toEqual([])
 })
 it('caps uploads per member per day',async()=>{
  const f=await fixture(),session=await f.member('busy')
  for(let index=0;index<FORUM_MEDIA.dailyFiles;index++)expect((await f.upload(png(),session)).status).toBe(201)
  expect((await f.upload(png(),session)).status).toBe(429)
 })
})
describe('Ogg Opus muxing',()=>{
 it('computes the Ogg CRC and Opus packet durations',()=>{
  expect(oggCrc(new TextEncoder().encode('123456789'))).toBe(0x89a1897f)
  expect(opusPacketSamples(new Uint8Array([31<<3]))).toBe(960) // CELT 20 ms
  expect(opusPacketSamples(new Uint8Array([(31<<3)|3,3]))).toBe(2880) // three 20 ms frames
  expect(opusPacketSamples(new Uint8Array([(1<<3)|1]))).toBe(960*2) // two SILK 20 ms frames
 })
 it('writes header pages, laces packets and ends at the original length',()=>{
  const packets=Array.from({length:120},(_,index)=>{const packet=new Uint8Array(index===3?255:index===4?600:100);packet[0]=31<<3;return packet})
  const file=oggOpus(packets,2,312,120*960-500),pages:{flags:number;granule:bigint;sequence:number;packets:number[]}[]=[]
  const view=new DataView(file.buffer)
  for(let offset=0;offset<file.length;){
   expect(String.fromCharCode(...file.slice(offset,offset+4))).toBe('OggS')
   const count=file[offset+26],lacing=[...file.slice(offset+27,offset+27+count)],size=lacing.reduce((sum,value)=>sum+value,0),page=file.slice(offset,offset+27+count+size)
   const crc=view.getUint32(offset+22,true);page.fill(0,22,26);expect(oggCrc(page)).toBe(crc)
   const lengths:number[]=[];let current=0
   for(const value of lacing){current+=value;if(value<255){lengths.push(current);current=0}}
   pages.push({flags:file[offset+5],granule:view.getBigUint64(offset+6,true),sequence:view.getUint32(offset+18,true),packets:lengths})
   offset+=27+count+size
  }
  expect(String.fromCharCode(...file.slice(28,36))).toBe('OpusHead')
  expect(file[37]).toBe(2);expect(view.getUint16(38,true)).toBe(312)
  expect(pages.map(page=>page.sequence)).toEqual(pages.map((_,index)=>index))
  expect(pages[0].flags).toBe(2);expect(pages.at(-1)!.flags).toBe(4)
  expect(pages.slice(2).flatMap(page=>page.packets)).toEqual(packets.map(packet=>packet.length))
  expect(pages.at(-1)!.granule).toBe(BigInt(312+120*960-500))
  expect(pages[2].granule).toBe(BigInt(312+pages[2].packets.length*960))
 })
 it('never points the last granule past the encoded audio',()=>{
  const packets=Array.from({length:10},()=>new Uint8Array([31<<3,1,2,3])),file=oggOpus(packets,1,312,9600)
  const last=file.length-(27+10+10*4) // one page: header, ten lacing values, ten 4-byte packets
  expect(String.fromCharCode(...file.slice(last,last+4))).toBe('OggS')
  expect(new DataView(file.buffer).getBigUint64(last+6,true)).toBe(9600n)
 })
})

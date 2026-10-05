import { MemberPrompt } from './MemberPrompt'
import { useEffect, useState } from 'react'
import { api, apiFetch, post } from './api'
import { apiUrl, assetUrl } from '../hosting'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import type { PublicMedia } from './api'
import { useCommunity } from './context'
import { Icon } from '../components/Icon'
import { ModulePopularity } from './ModulePopularity'
import { moduleThreadId } from './modules'
import { ForumThreadView } from './ForumThreadView'
type Data = {ratings:{average:number|null;count:number};ownRating:number;likes:number;liked:boolean;downloads?:number;downloadsStarted?:string|null;media:PublicMedia[]}
function MediaPreview({item,privatePreview}:{item:PublicMedia;privatePreview:boolean}) {
  const [preview,setPreview]=useState<{id:string;url:string}|null>(null),[error,setError]=useState('')
  useEffect(()=>{
    if(!privatePreview)return
    let cancelled=false,url=''
    void apiFetch('/media/'+item.id).then(async result=>{
      if(!result.ok)throw new Error('This preview could not be loaded.')
      const blob=await result.blob()
      if(cancelled)return
      url=URL.createObjectURL(blob);setPreview({id:item.id,url})
    }).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}
  },[item.id,privatePreview])
  const url=privatePreview?(preview?.id===item.id?preview.url:''):apiUrl('/media/'+item.id)
  return <figure>{error?<p className="file-error" role="alert">{error}</p>:!url?<p role="status">Loading preview…</p>:item.kind==='image'?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.caption} loading="lazy" /></a>:<audio controls preload="none" src={url}>Audio preview</audio>}<figcaption>{item.caption}<span>{item.capture_type==='hardware'?'Hardware capture':item.capture_type==='emulator'?'Emulator capture':'Audio preview'}</span></figcaption></figure>
}
export function MediaGallery({media,privatePreview=false}:{media:PublicMedia[];privatePreview?:boolean}) {
  return <div className="media-gallery">{media.map(item=><MediaPreview key={item.id} item={item} privatePreview={privatePreview}/>)}</div>
}
export function ModuleCommunity({id,mode='all',onDiscuss}:{id:string;mode?:'all'|'media'|'discussion'|'overview'|'ratings';onDiscuss?:()=>void}) {
  const {session,refresh} = useCommunity()
  const document=MODULE_DOCUMENTS_BY_ID[id],sourceMedia=document?.media??[]
  const [data,setData] = useState<Data | null>(null), [rating,setRating] = useState(0), [error,setError] = useState(''), [busy,setBusy] = useState(false), [notice,setNotice] = useState('')
  useEffect(() => {
    let cancelled=false
    // A successful load clears an earlier failure, so a passing network blip does not leave a stale error.
    if (session.available) void api<Data>('/modules/' + id).then(value => {if (!cancelled) {setData(value);setRating(value.ownRating);setError('')}}).catch(error => {if(!cancelled)setError(error.message)})
    return () => {cancelled=true}
  },[id,session.available,session.user?.id])
  async function send(kind:'rating'|'like') {
    setBusy(true);setError('');setNotice('')
    try {
      await post('/modules/' + id + '/' + kind,kind==='like'?{liked:!data?.liked}:{value:rating})
      await refresh();setData(await api<Data>('/modules/' + id))
      setNotice(kind==='like'?(data?.liked?'Like removed.':'Liked.'):'Rating saved.')
    } catch(error){setError(error instanceof Error?error.message:'Unable to save.')} finally{setBusy(false)}
  }
  const mediaSection = <section className="detail-section"><div className="section-title"><h2>Screenshots & audio</h2><a className="text-button" href={'#submit/' + id}>Add media <Icon name="plus" size={15}/></a></div>{sourceMedia.length ? <div className="media-gallery">{sourceMedia.map(item=>{const url=assetUrl('module-media/'+id+'/'+document.version+'/'+item.path);return <figure key={item.path}>{item.captureType==='audio'?<audio controls preload="none" src={url}>Audio preview</audio>:<a href={url} target="_blank" rel="noreferrer"><img className={item.otUi ? 'ot-ui-capture' : undefined} src={url} alt={item.alt} loading="lazy"/></a>}<figcaption>{item.caption}<span>{item.captureType==='hardware'?'Hardware capture':item.captureType==='emulator'?'Emulator capture':'Audio preview'} · {item.credit} · {item.license}</span>{item.source!=='original'&&<a href={item.source} target="_blank" rel="noreferrer">Original source ↗</a>}</figcaption></figure>})}</div> : null}{!!data?.media.length && <MediaGallery media={data.media}/>} {!sourceMedia.length && !data?.media.length && <div className="media-empty"><Icon name="file" size={24}/><div><strong>No media yet</strong><p>Share a screenshot or audio preview via PR.</p></div></div>}</section>
  if(mode==='overview')return <>
    <div className="module-showcase">
      {mediaSection}
      <section className="ratings-overview" aria-label="Module ratings">
        <div className="section-title"><h2>Ratings</h2><button className="button button-quiet like-button" aria-label={(data?.liked?'Unlike ':'Like ')+id} aria-pressed={data?.liked??false} disabled={!session.user?.verified||!session.available||!data||busy} onClick={()=>void send('like')}>{data?.liked?'♥':'♡'} {data?.likes??'—'}</button></div>
        <ModulePopularity statistics={data??undefined}/>
        <div className="rating-empty"><strong>{data?.ratings.average?.toFixed(1)??'—'}</strong><div><span className="star-line" aria-hidden="true">{[1,2,3,4,5].map(i=><span key={i} className={data?.ratings.average && i<=Math.round(data.ratings.average)?'is-filled':''}><Icon name="star" size={16}/></span>)}</span><span role="status">{!session.available||(!data&&error)?'Ratings unavailable':!data?'Loading ratings…':data.ratings.count?data.ratings.count+(data.ratings.count===1?' rating':' ratings'):'No ratings yet'}</span></div></div>
        <button className="button button-quiet" onClick={onDiscuss}>Rate & discuss <Icon name="arrow" size={14}/></button>
        <p className="service-note">Ratings from registered members.</p>
        {!data&&error&&<button className="text-button" onClick={()=>{setError('');void api<Data>('/modules/'+id).then(value=>{setData(value);setRating(value.ownRating)}).catch(error=>setError(error.message))}}>Try again</button>}
      </section>
    </div>
    {error&&<p className="file-error" role="alert">{error}</p>}{notice&&<p className="success-note" role="status">{notice}</p>}
  </>
  return <>
    {mode !== 'discussion' && mode !== 'ratings' && mediaSection}
    {mode !== 'media' && <div className="community-grid">{mode !== 'ratings' && <section className="detail-section module-discussion forum-page"><ForumThreadView key={id} id={moduleThreadId(id)} embedded/></section>}
    <section className="detail-section ratings-section"><div className="section-title"><h2>Ratings</h2><button className="button button-quiet like-button" aria-label={(data?.liked?'Unlike ':'Like ')+id} aria-pressed={data?.liked??false} disabled={!session.user?.verified||!session.available||busy} onClick={()=>void send('like')}>{data?.liked?'♥':'♡'} {data?.likes??0}</button></div><ModulePopularity statistics={data??undefined}/><div className="rating-empty"><strong>{data?.ratings.average?.toFixed(1) ?? '—'}</strong><div><span className="star-line">{[1,2,3,4,5].map(i=><span key={i} className={data?.ratings.average && i<=Math.round(data.ratings.average)?'is-filled':''}><Icon name="star" size={16}/></span>)}</span><span>{data?.ratings.count ? data.ratings.count+(data.ratings.count===1?' rating':' ratings'):'No ratings yet'}</span></div></div><fieldset className="rating-picker" disabled={!session.user?.verified}><legend>Your rating</legend><div>{[1,2,3,4,5].map(i=><button key={i} className={rating>=i?'is-filled':''} aria-label={i+(i===1?' star':' stars')} aria-pressed={rating===i} onClick={()=>setRating(i)}><Icon name="star" size={23}/></button>)}</div></fieldset><button className="button button-quiet rating-save" disabled={!session.user?.verified||!session.available||busy||!rating} onClick={()=>void send('rating')}>Save rating</button><MemberPrompt/></section></div>}
    {mode !== 'media' && <p className="community-privacy">{mode === 'ratings' ? 'Ratings and likes are public.' : 'Usernames, posts, ratings and likes are public.'} Sign in to manage your activity across devices. Email addresses stay private. Older guest names remain unverified. Posts are moderated.</p>}
    {mode !== 'media' && !session.available && <p className="service-note">Community is unavailable. {mode === 'ratings' ? 'Ratings are paused.' : 'Discussions and ratings are paused.'}</p>}
    {error&&<p className="file-error" role="alert">{error}</p>}{notice&&<p className="success-note" role="status">{notice}</p>}
  </>
}

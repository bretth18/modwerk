import { useEffect, useState } from 'react'
import { api } from './api'
type Comment={id:string;module_id:string;body:string;author:string}
export function ModerationPanel(){
 const [items,setItems]=useState<Comment[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{void api<Comment[]>('/admin/comments').then(setItems).catch(error=>setError(error.message)).finally(()=>setLoading(false))},[])
 async function remove(id:string){try{await api('/comments/'+id,{method:'DELETE'});setItems(current=>current.filter(item=>item.id!==id))}catch(error){setError(error instanceof Error?error.message:'Unable to remove comment.')}}
 return <section className="configuration-section"><h2>Recent comments</h2><p className="service-note">Accounts verify email ownership; public display names are chosen by visitors. Older guest posts remain historical. Remove spam, abuse or private and infringing content.</p>{items.map(item=><article className="inbox-issue" key={item.id}><small>{item.module_id} · {item.author}</small><p>{item.body}</p><button className="text-button" onClick={()=>void remove(item.id)}>Remove comment</button></article>)}{loading&&<p className="service-note" role="status">Loading comments…</p>}{!loading&&!items.length&&!error&&<p className="service-note">No comments to moderate.</p>}{error&&<p className="file-error" role="alert">{error}</p>}</section>
}
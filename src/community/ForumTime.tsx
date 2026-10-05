import { useEffect, useState } from 'react'
function date(value:string){return new Date(value.includes('T')?value:value.replace(' ','T')+'Z')}
export function ForumTime({value,relative=false}:{value:string;relative?:boolean}){
  const [now,setNow]=useState(()=>Date.now())
  useEffect(()=>{if(!relative)return;const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>window.clearInterval(timer)},[relative])
  const time=date(value),full=time.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}),minutes=Math.floor((now-time.getTime())/60000)
  const label=!relative?full:minutes<0?full:minutes<1?'Just now':minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:minutes<10080?`${Math.floor(minutes/1440)}d ago`:time.toLocaleDateString(undefined,{month:'short',day:'numeric',...(time.getFullYear()!==new Date(now).getFullYear()?{year:'numeric' as const}:{})})
  return <time dateTime={time.toISOString()} title={full}>{label}</time>
}

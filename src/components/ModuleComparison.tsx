import { moduleHref } from '../routing'
import { useEffect, useRef } from 'react'
import { MODULES } from '../catalog/modules'
import { isModuleAvailable } from '../catalog/availability'
import { DETAILS } from '../catalog/details'
import { RESOURCES } from '../catalog/resources'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { moduleBuildPending } from '../catalog/build-support'
export function ModuleComparison({ids,onClose,onToggle,selected}:{ids:string[];onClose:()=>void;onToggle:(id:string)=>void;selected:string[]}){
 const ref=useRef<HTMLDialogElement>(null),modules=MODULES.filter(m=>ids.includes(m.id)&&isModuleAvailable(m.id))
 const records=MODULE_DOCUMENTS_BY_ID
 useEffect(()=>{ref.current?.showModal()},[])
 return <dialog ref={ref} className="comparison-dialog" aria-labelledby="comparison-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="section-title"><h2 id="comparison-title">Compare modules</h2><button className="icon-button" onClick={onClose} aria-label="Close comparison">×</button></div><div className="comparison-scroll" tabIndex={0} role="region" aria-label="Module comparison table"><table><thead><tr><th scope="col">Module</th>{modules.map(m=><th scope="col" key={m.id}><a href={moduleHref(m.id)} onClick={onClose}>{m.name} ↗</a><small>by <a href={m.authorUrl} target="_blank" rel="noreferrer">{m.authorName}</a></small></th>)}</tr></thead><tbody>{['Purpose','Location','Storage','Processing','Hardware record','Build status'].map(label=><tr key={label}><th scope="row">{label}</th>{modules.map(m=><td key={m.id}>{label==='Purpose'?m.description:label==='Location'?m.detail:label==='Storage'?RESOURCES[m.id].memory.value:label==='Processing'?RESOURCES[m.id].compute.value:label==='Build status'?moduleBuildPending(m.id)?'Verification pending':'Experimental':records[m.id].tests.hardwareStatus==='reported'?'Author-reported functional hardware test':records[m.id].tests.hardwareStatus!=='untested'?'Earlier hardware evidence; current catalog unqualified':'No hardware qualification'}</td>)}</tr>)}<tr><th scope="row">Configuration</th>{modules.map(m=><td key={m.id}><button className="button button-quiet" aria-pressed={selected.includes(m.id)} onClick={()=>onToggle(m.id)}>{selected.includes(m.id)?'Added':'Add '+m.name}</button></td>)}</tr></tbody></table></div><p className="service-note">Storage and processing values use different measurement methods. Open each module for conditions and test evidence. {modules.map(m=>DETAILS[m.id].family).join(' · ')}</p></dialog>
}

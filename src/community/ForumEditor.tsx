import { lazy, Suspense } from 'react'
import type { ComponentProps } from 'react'
import type { RichTextEditor as Editor } from './RichTextEditor'

const RichEditor=lazy(()=>import('./RichTextEditor').then(module=>({default:module.RichTextEditor})))
export function RichTextEditor(props:ComponentProps<typeof Editor>){
  return <Suspense fallback={<p className="service-note" role="status">Loading editor…</p>}><RichEditor {...props}/></Suspense>
}

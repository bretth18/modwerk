import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountPage } from './AccountPage'
import { CommunityContext, emptySession } from './context'

function render(loading:boolean){
 return renderToStaticMarkup(createElement(CommunityContext.Provider,{value:{session:emptySession,loading,developer:null,catalog:[],refresh:async()=>{},refreshDeveloper:async()=>{}}},createElement(AccountPage,{route:'account/login'})))
}
describe('community availability',()=>{
 it('shows a connection state while the session is being checked',()=>{
  const html=render(true)
  expect(html).toContain('Connecting to the community')
  expect(html).not.toContain('Community services are unavailable')
 })
 it('shows an unavailable state after the connection check fails',()=>{
  expect(render(false)).toContain('Community services are unavailable')
 })
})

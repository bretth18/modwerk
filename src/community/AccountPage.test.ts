import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountPage } from './AccountPage'
import { CommunityContext } from './context'
import type { DeveloperSession, Session } from './api'
import { DeveloperPage } from './DeveloperPage'
const session:Session={available:true,emailAvailable:true,registrationAvailable:true,admin:false,user:{id:'member',displayName:'Member',username:'member',verified:true}}
function render(route:string,developer:DeveloperSession|null=null){return renderToStaticMarkup(createElement(CommunityContext.Provider,{value:{session,developer,catalog:[],refresh:async()=>{},refreshDeveloper:async()=>{}}},createElement(AccountPage,{route})))}
describe('email action links in a signed-in browser',()=>{
 it('shows the recovery form so a member can use an emailed link without signing out',()=>{
  const html=render('account/reset/synthetic-private-token')
  expect(html).toContain('Choose a new password')
  expect(html).toContain('New password')
  expect(html).toContain('autoComplete="new-password"')
  expect(html).not.toContain('synthetic-private-token')
  expect(html).not.toContain('Your issue reports')
  expect(html).not.toContain('Active sessions')
 })
 it('shows the verification form even when another member is already signed in',()=>{
  const html=render('account/verify/synthetic-private-token')
  expect(html).toContain('Confirm your email')
  expect(html).toContain('Password you chose when registering')
  expect(html).not.toContain('Your issue reports')
 })
 it('keeps the normal account workspace available away from action links',()=>{
  const html=render('account')
  expect(html).toContain('Your account')
  expect(html).toContain('Active sessions')
  expect(html).toContain('Account removal')
 })
})
describe('developer account verification',()=>{
 it('offers verification on the account page without exposing the workspace to regular members',()=>{
  const html=render('account',{available:true,user:null})
  expect(html).toContain('Verify developer account with GitHub')
  expect(html).not.toContain('href="#developer"')
  expect(html).not.toContain('Developer workspace')
 })
 it('keeps workspace links hidden while checking verification or when services are unavailable',()=>{
  for(const developer of [null,{available:false,user:null}])expect(render('account',developer)).not.toContain('href="#developer"')
 })
 it('offers the workspace only after server-verified developer sign-in',()=>{
  const html=render('account',{available:true,user:{login:'irpina'}})
  expect(html).toContain('Verified developer: @irpina')
  expect(html).toContain('href="#developer"')
 })
 it('explains an unmatched GitHub account without showing a workspace link',()=>{
  const html=render('account/developer/unlisted',{available:true,user:null})
  expect(html).toContain('not listed as an author or maintainer')
  expect(html).not.toContain('href="#developer"')
 })
 it('shows account verification for direct developer and private-report links without developer access',()=>{
  for(const route of ['developer','developer/report/synthetic-private-report']){
   const html=renderToStaticMarkup(createElement(DeveloperPage,{route}))
   expect(html).toContain('Developer account')
   expect(html).not.toContain('Developer workspace')
   expect(html).not.toContain('Private module reports')
   expect(html).not.toContain('synthetic-private-report')
  }
 })
})

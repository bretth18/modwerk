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
 it.each([['forgot','Forgot your password?'],['resend','Verify your email']])('shows the %s request form while signed in', (mode,title)=>{
  const html=render('account/'+mode)
  expect(html).toContain(title)
  expect(html).toContain('Email address')
  expect(html).toContain('Send email')
  expect(html).not.toContain('Edit your profile')
  expect(html).not.toContain('Active sessions')
 })
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
  expect(html).toContain('Download your account data')
  expect(html).toContain('Edit your profile')
  expect(html).toContain('Delete account')
 })
 it.each(['account/sso/synthetic-private-code','account/sso'])('keeps %s in the social return flow through a session refresh',route=>{
  const html=render(route)
  expect(html).toContain('Completing sign-in')
  expect(html).not.toContain('Your account')
  expect(html).not.toContain('synthetic-private-code')
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

describe('combined Modwerk account layout',()=>{
 it('preserves social signup, optional consent and the return destination in the improved layout',()=>{
  const visitor:Session={available:true,emailAvailable:true,registrationAvailable:true,admin:false,user:null,ssoProviders:['google','github','discord']}
  const html=renderToStaticMarkup(createElement(CommunityContext.Provider,{value:{session:visitor,developer:{available:true,user:null},catalog:[],refresh:async()=>{},refreshDeveloper:async()=>{}}},createElement(AccountPage,{route:'account/register?next=digitakt/configuration'})))
  expect(html).toContain('Sign in with Google')
  for(const provider of ['GitHub','Discord'])expect(html).toContain('Continue with '+provider)
  expect(html).toContain('aria-label="Community account"')
  expect(html).toContain('aria-label="Account actions"')
  expect(html).toContain('aria-current="page"')
  expect(html).toContain('href="#account/login?next=digitakt%2Fconfiguration"')
  const rules=html.match(/<input[^>]*name="rulesAccepted"[^>]*>/)?.[0]
  const newsletter=html.match(/<input[^>]*name="newsletter"[^>]*>/)?.[0]
  expect(rules).toContain('required=""')
  expect(newsletter).toContain('type="checkbox"')
  expect(newsletter).not.toMatch(/checked|required/)
  expect(html).toContain('Verify developer account with GitHub')
  expect(html).not.toContain('href="#developer"')
 })
})

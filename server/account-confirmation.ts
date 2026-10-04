import { verifyPassword } from 'better-auth/crypto'
import type { Database } from './platform'
import { HttpError } from './security'

/** Password accounts confirm their password; social accounts require a fresh server session. */
export async function confirmAccount(db:Database,userId:string,body:Record<string,unknown>,sessionCreatedAt?:Date|string){
  const credential=await db.prepare("SELECT password FROM auth_accounts WHERE userId=? AND providerId='credential'").bind(userId).first<{password:string|null}>()
  if(credential?.password){
    if(typeof body.password!=='string'||body.password.length<15||body.password.length>128)throw new HttpError(400,'Enter your current password.')
    if(!await verifyPassword({hash:credential.password,password:body.password}))throw new HttpError(403,'Your password was not accepted.')
  }else{
    const age=sessionCreatedAt===undefined?NaN:Date.now()-new Date(sessionCreatedAt).getTime()
    if(!Number.isFinite(age)||age<0||age>=10*60*1000)throw new HttpError(403,'Sign in again to confirm this request. A sign-in within the last ten minutes is required.')
  }
}

import type { SocialProvider } from './social-login'
import { socialNames } from './social-login'

/** Native OAuth actions with locally served provider brand artwork. */
export function SocialButton({provider,disabled,onClick}:{provider:SocialProvider;disabled:boolean;onClick:()=>void}) {
  const google=provider==='google',label=google?'Sign in with Google':'Continue with '+socialNames[provider]
  return <button type="button" className={'button social-provider social-provider-'+provider} disabled={disabled} onClick={onClick} aria-label={label}>
    <img className={google?'social-provider-art':'social-provider-logo'} src={import.meta.env.BASE_URL+'auth/'+(google?'google-sign-in.svg':provider+'.svg')} width={google?180:20} height={google?40:20} alt="" aria-hidden="true"/>
    {!google&&<span>{label}</span>}
  </button>
}

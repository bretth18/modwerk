import { useCommunity } from './context'
export function MemberPrompt(){const {session}=useCommunity();return !session.user?.verified?<p className="service-note"><a href="#account/login">Sign in</a> or <a href="#account/register">create an account</a> to post, rate and report issues. Verify your email to participate.</p>:null}

import { useId } from 'react'
import { Icon } from '../components/Icon'
import { REPLY_STARTERS, starterHint, starterLabel, type ReplyStarter } from './reply-starters'

/** Above a module discussion's reply box: what kind of reply this is, plus the posts that belong in a thread of their own. */
export function ReplyStarters({ machine, machineName, moduleId, value, onChange, disabled }: { machine: string; machineName: string; moduleId: string | null; value: ReplyStarter | ''; onChange: (value: ReplyStarter | '') => void; disabled?: boolean }) {
  const hint = useId(), scope = '&machine=' + encodeURIComponent(machine) + (moduleId ? '&module=' + encodeURIComponent(moduleId) : '')
  return <div className="reply-starters">
    <div className="reply-starter-chips" role="group" aria-label="Kind of reply" aria-describedby={hint}>
      {REPLY_STARTERS.map(starter => <button key={starter} type="button" className="reply-starter" aria-pressed={value === starter} disabled={disabled} onClick={() => onChange(value === starter ? '' : starter)}>{starter === 'works' && <Icon name="check" size={13} />}{starterLabel(starter, machineName)}</button>)}
    </div>
    <p id={hint} className="reply-starter-hint">{starterHint(value)}</p>
    <p className="reply-starter-links"><a href={'#forum/new?category=configs' + scope}>Share a configuration<Icon name="arrow" size={13} /></a><a href={'#forum/new?category=showcase' + scope}>Post a recording<Icon name="arrow" size={13} /></a></p>
  </div>
}

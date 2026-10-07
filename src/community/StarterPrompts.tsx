import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { STARTER_MACHINES, starterPrompt, startersFor, type StarterMachine } from './starter-prompts'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 2000); return () => window.clearTimeout(timer) }, [copied])
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true) } catch { setCopied(false) } }
  return <button type="button" className="button button-quiet copy-button" onClick={copy}><Icon name={copied ? 'check' : 'file'} size={15} /><span aria-live="polite">{copied ? 'Copied' : label}</span></button>
}

export function StarterPrompts({ login, onLogin }: { login: string; onLogin: (login: string) => void }) {
  const [machine, setMachine] = useState<StarterMachine>('octatrack')
  const starters = startersFor(machine)
  const [starterId, setStarterId] = useState(starters[0].id)
  const [idea, setIdea] = useState('')
  const starter = starters.find(item => item.id === starterId) ?? starters[0]
  const prompt = starterPrompt(machine, starter, idea, login)
  return <div className="starter-prompts">
    <div className="starter-machines" role="group" aria-label="Machine">
      {STARTER_MACHINES.map(item => <button key={item.id} type="button" aria-pressed={machine === item.id} onClick={() => setMachine(item.id)}>{item.name}{item.note && <small>{item.note}</small>}</button>)}
    </div>
    <div className="starter-layout">
      <div className="starter-list" role="group" aria-label="What do you want to build?">
        {starters.map(item => <button key={item.id} type="button" aria-pressed={item.id === starter.id} onClick={() => setStarterId(item.id)}>
          <strong>{item.title}</strong><span>{item.summary}</span>{item.example && <small>Existing: {item.example}</small>}
        </button>)}
      </div>
      <div className="starter-panel">
        <label className="starter-field"><span>{starter.port ? 'Which module?' : 'Your idea'} <small>optional</small></span>
          <textarea rows={3} value={idea} onChange={event => setIdea(event.target.value)} placeholder={starter.port ? 'The module name and a link to its source' : 'What it does, its controls, how it should sound or behave'} />
        </label>
        <label className="starter-field"><span>GitHub login <small>optional</small></span>
          <input value={login} onChange={event => onLogin(event.target.value)} placeholder="your-github-login" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
        <div className="starter-prompt">
          <div className="starter-prompt-head"><span>Prompt for your coding agent</span><CopyButton text={prompt} label="Copy prompt" /></div>
          <pre tabIndex={0} aria-label="Starter prompt">{prompt}</pre>
        </div>
      </div>
    </div>
  </div>
}

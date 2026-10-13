import { Icon } from '../components/Icon'
import { INSTRUMENT_STEPS, RELEASE_STEPS, type DeveloperTask } from './developer-guidance'
import type { StarterMachine } from './starter-prompts'
import { DEVICES_BY_ID } from '../devices/registry'

export function DeveloperReleaseGuide({ repository, task, machine }: { repository: string; task: DeveloperTask; machine: StarterMachine }) {
  const guide = (path: string) => repository + '/blob/main/' + path
  const hasSdk = Boolean(DEVICES_BY_ID[machine]?.sdk)
  const steps = hasSdk ? RELEASE_STEPS[task] : INSTRUMENT_STEPS
  return <>
    <section className="developer-workflow" aria-labelledby="developer-workflow-title">
      <div className="developer-section-heading"><h2 id="developer-workflow-title">{!hasSdk ? 'Instrument integration' : task === 'create' ? 'Your first release' : 'Fixes and updates'}</h2><span className="subtle">Your agent follows these steps</span></div>
      <ol className="developer-release-flow">
        {steps.map((step, index) => <li key={step.title}>
          <span className="developer-stage-number" aria-hidden="true">{index + 1}</span>
          <h3>{step.title}</h3><p>{step.summary}</p>
          {index < 3 && <span className="developer-stage-arrow" aria-hidden="true"><Icon name="arrow" size={16} /></span>}
        </li>)}
      </ol>
      <p className="developer-flow-note">{!hasSdk ? 'No published SDK yet. Integrate and qualify this instrument before scaffolding or releasing a module.' : task === 'create' ? 'First release: owner review. Then registered authors can publish updates to their own modules.' : 'Reports stay open through push and merge. Resolve only after the published download and fix are verified.'}</p>
    </section>

    <section className="developer-ecosystem" aria-labelledby="developer-ecosystem-title">
      <div className="developer-section-heading"><h2 id="developer-ecosystem-title">Three separate catalogues</h2><span className="subtle">An Elekloader listing is optional</span></div>
      <div className="developer-ecosystem-grid">
        <a href="https://github.com/sambanks/octabam" target="_blank" rel="noreferrer"><strong>Octabam ↗</strong><span>Source modules & native remixer</span></a>
        <a href="#library"><strong>Modwerk</strong><span>Reviewed library & browser builder</span></a>
        <a href="https://github.com/irpina/elekloader" target="_blank" rel="noreferrer"><strong>Elekloader ↗</strong><span>Loader, shop & builder kit</span></a>
      </div>
      <div className="developer-builder-path"><span><strong>Today</strong> Octatrack: Octabam · Digitakt/Digitone: Elekloader kit · Digitakt II: OS 1.17 preview (downloads off)</span><Icon name="arrow" size={15} /><span><strong>Planned</strong> One shared builder</span></div>
    </section>

    <nav className="developer-help" aria-label="Developer guides">
      <a href={guide('docs/ADD_A_MODULE.md')} target="_blank" rel="noreferrer">Module guide ↗</a>
      <a href={guide('docs/MODULE_AUTHOR_UPDATES.md')} target="_blank" rel="noreferrer">Releases & reports ↗</a>
      <a href={guide(DEVICES_BY_ID[machine]?.sdk || 'docs/ADD_A_MACHINE.md')} target="_blank" rel="noreferrer">{DEVICES_BY_ID[machine]?.sdk ? 'Instrument SDK' : 'Instrument integration'} ↗</a>
      <a href="#account/developer">Creator settings & support</a>
    </nav>
  </>
}

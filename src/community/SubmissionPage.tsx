import { BackLink } from '../components/BackLink'
import { useState } from 'react'
import { CopyButton, StarterPrompts } from './StarterPrompts'
import { cloneCommands } from './starter-prompts'
import { sourceRepository } from '../hosting'
import { communityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
export function SubmissionPage({moduleId=''}:{moduleId?:string}) {
  const repository=sourceRepository()
  const module=communityModule(moduleId)
  const moduleRepository=repository||'https://github.com/repeat98/modwerk'
  const [login,setLogin]=useState('')
  const clone=cloneCommands(moduleRepository,login)
  if(module&&module.machine!=='octatrack')return <div className="community-page contribution-page"><BackLink href={moduleId?'#developer':'#library'}>{moduleId?'Developer workspace':'Module library'}</BackLink>
    <div className="page-heading"><div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>Update {module.name}</h1><p>{DEVICES_BY_ID[module.machine].name} · Current version {module.version}. Prepare source, documentation and media together in a GitHub pull request.</p></div><span className="pill">Owner review required</span></div>
    <section className="configuration-section"><h2>Start from the reviewed module</h2><p>Keep its licence, attribution and pinned source provenance. Increase the module’s semantic version for every code change (documentation and media edits need none), and keep the manifest, README, tutorial and test evidence synchronized.</p><div className="forum-actions"><a className="button button-primary" href={moduleRepository+'/tree/main/'+module.sourcePath} target="_blank" rel="noreferrer">Open module source ↗</a><a className="button button-quiet" href={moduleRepository+'/compare'} target="_blank" rel="noreferrer">Open a pull request ↗</a><a href={moduleRepository+'/blob/main/docs/SDK.md'} target="_blank" rel="noreferrer">Machine SDK & evidence rules ↗</a></div></section>
    <section className="configuration-section"><h2>Include the update evidence</h2><p>Use the machine’s v3 <code>modwerk.module.json</code> contract: source/build identity, compatibility, memory and load measurements, hardware coverage and actual UI captures where applicable. State the evidence tier and remaining limitations honestly. Documentation, tutorial, screenshots and credits must match this version.</p><p>Submit only original or properly licensed sources and reviewed media. Keep firmware, stock bytes, dumps and generated firmware builds local. Passing checks does not publish an update; owner merge approves that exact version. Pending or rejected updates keep the existing approved release available.</p></section>

  </div>
  const guide=(path:string)=>moduleRepository+'/blob/main/'+path
  return <div className="community-page contribution-page start-developing"><BackLink href={moduleId?'#developer':'#library'}>{moduleId?'Developer workspace':'Module library'}</BackLink>
    <div className="page-heading">
      <div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>{moduleId ? 'Improve a module' : 'Start developing'}</h1><p>Build your own effect, machine, MIDI generator or MIDI effect for the Octatrack, Digitakt or Digitone with a coding agent. Fork the repository, paste a starter prompt, test on your unit and open a pull request.</p></div>
      <span className="pill">Open source</span>
    </div>
    <ol className="start-steps">
      <li>
        <h2>Fork the repository</h2>
        <p>Your own copy of Modwerk on GitHub, with every SDK, guide and check.</p>
        <a className="button button-primary" href={moduleRepository+'/fork'} target="_blank" rel="noreferrer">Fork on GitHub ↗</a>
      </li>
      <li>
        <h2>Clone and install</h2>
        <p>Node 24 is all the website and documentation need. Octatrack native builds also need Python 3.10+, Docker and your own OS 1.40C file.</p>
        <div className="start-code"><pre>{clone}</pre><CopyButton text={clone}/></div>
      </li>
      <li>
        <h2>Paste a starter prompt</h2>
        <p>Open Claude Code, Codex or another coding agent in the folder and paste a prompt from below. It reads the guides, proposes a plan and scaffolds the module.</p>
      </li>
      <li>
        <h2>Test and open a pull request</h2>
        <p>Flash the build on your own unit, tell your agent what you saw and open a pull request. The owner reviews it and merging publishes that version.</p>
        <a className="button button-quiet" href={moduleRepository+'/compare'} target="_blank" rel="noreferrer">Open a pull request ↗</a>
      </li>
    </ol>
    <section className="configuration-section">
      <h2>Starter prompts</h2>
      <p className="start-lead">Choose your machine and what you want to build. Add your idea and copy the prompt into your agent, opened in your fork.</p>
      <StarterPrompts login={login} onLogin={setLogin}/>
    </section>
    <section className="configuration-section">
      <h2>What the pull request contains</h2>
      <p className="start-lead">One module per pull request, in <code>{'sdk/<machine>/modules/<id>/'}</code>. Your agent fills these in; <code>npm run module:doctor -- {'<id>'}</code> lists what is still missing.</p>
      <ul className="start-checklist">
        <li><strong>Source and build files</strong><span>Your original or properly licensed code, with <code>manifest.py</code> on the Octatrack or <code>build.json</code> on Digitakt and Digitone.</span></li>
        <li><strong>Manifest</strong><span><code>octamod.module.json</code> or <code>modwerk.module.json</code>: version, compatibility, controls, access steps, resources, evidence, authors and licences.</span></li>
        <li><strong>README.md</strong><span>Overview, every control, compatibility and limitations, and a tutorial of at least three steps.</span></li>
        <li><strong>TESTING.md</strong><span>Commands, the exact source revision, measurements and every hardware result, with model, OS, duration and limitations.</span></li>
        <li><strong>evidence/performance.json</strong><span>Worst-case cycles, a benchmark against the stock effects and a stress run, checked by <code>npm run perf:audit</code>. Required for every new Octatrack module.</span></li>
        <li><strong>LICENSE</strong><span>Every author’s terms and credit. Ported code keeps its source pinned to an exact commit.</span></li>
        <li><strong>media/</strong><span>An original 320×192 thumbnail and real screenshots of where to enable the module and its controls. Octatrack captures are black-and-white PNGs.</span></li>
      </ul>
    </section>
    <section className="configuration-section">
      <h2>Fast enough, and tough enough</h2>
      <p className="start-lead">An effect, a machine or a MIDI generator shares the unit with the stock instrument and with other modules. Before review, every new module proves it leaves them room. The audit is offline like the aliasing check: you measure with the harness on your computer, record the numbers and <code>npm run perf:audit -- check</code> judges them. <code>module:doctor</code> refuses a new module without a passing record.</p>
      <ul className="start-checklist">
        <li><strong>Cycle count</strong><span>The static floor of the dearest mode and the worst case you measured, times the instances you support, must fit what a core can spend. A MIDI module’s worst event must fit its deadline. Averages do not count.</span></li>
        <li><strong>Benchmark against stock</strong><span>An effect is compared with the stock effect closest in function; a MIDI module with the stock image under the same message flood. Costing several times the stock effect needs a written reason.</span></li>
        <li><strong>Stress run</strong><span>An effect: its instances on both cores, eight tracks, three LFOs per track and locked slots on every step, with guard and dirty-buffer checks. MIDI: notes, CC and clock at wire rate, stopped mid-note, with no stuck note and no hang.</span></li>
      </ul>
      <p className="service-note">A shared elekloader builder is coming that replaces the separate builders and is easy to extend to other machines. The record names no machine, so the same checks will carry over; until then the numbers come from the Octatrack harness, and Digitakt and Digitone modules report their measured budgets in TESTING.md.</p>
    </section>
    <div className="start-columns">
      <section className="configuration-section">
        <h2>How review works</h2>
        <p>Every pull request runs the same checks as CI. Passing them does not publish a module: the owner reads the reports, rights and screenshots, and merging approves that exact version. Increase the version for every code change; documentation and media edits need none.</p>
        <p>State honestly what you tested. Octatrack modules need a hardware report from a real unit; Digitakt and Digitone record their evidence tier. Digitakt and Digitone are in preview, so agree the scope with the owner first.</p>
      </section>
      <section className="configuration-section start-rights">
        <h2>Keep firmware out</h2>
        <p>Never commit Elektron firmware, extracted routines or tables, memory dumps or built images. Your OS file stays on your computer; stock code is referenced by address and hash and copied from each user’s own file when they build.</p>
        <p>Submit only original or properly licensed source and media and credit every author. Review is not automatic legal clearance.</p>
      </section>
    </div>
    <section className="configuration-section">
      <h2>Guides and help</h2>
      <div className="start-links">
        <a href={guide('docs/ADD_A_MODULE.md')} target="_blank" rel="noreferrer"><strong>Add or port a module ↗</strong><span>The full workflow, step by step</span></a>
        <a href={guide('docs/module-guides/README.md')} target="_blank" rel="noreferrer"><strong>Module guides ↗</strong><span>How each category behaves like the instrument</span></a>
        <a href={guide('docs/SDK.md')} target="_blank" rel="noreferrer"><strong>SDK overview ↗</strong><span>Contract, evidence tiers and machines</span></a>
        <a href={guide('sdk/machines/octatrack/README.md')} target="_blank" rel="noreferrer"><strong>Octatrack guide ↗</strong><span>Built on <span translate="no">octabam</span></span></a>
        <a href={guide('sdk/machines/digitakt/README.md')} target="_blank" rel="noreferrer"><strong>Digitakt guide ↗</strong><span>Core events and budgets</span></a>
        <a href={guide('sdk/machines/digitone/README.md')} target="_blank" rel="noreferrer"><strong>Digitone guide ↗</strong><span>Core events and budgets</span></a>
        <a href={guide('CONTRIBUTING.md')} target="_blank" rel="noreferrer"><strong>Contribution rules ↗</strong><span>What every pull request agrees to</span></a>
        <a href="https://discord.gg/mb7B2N7A7" target="_blank" rel="noreferrer"><strong>Discord ↗</strong><span>Ask other developers</span></a>
      </div>
      <p className="service-note">Octatrack development builds on <a href="https://github.com/sambanks/octabam" target="_blank" rel="noreferrer">octabam ↗</a>; Digitakt and Digitone on the public research of <a href="https://github.com/irpina/elekloader" target="_blank" rel="noreferrer">elekloader ↗</a> and <a href="https://github.com/m-dwyer/digikit" target="_blank" rel="noreferrer">digikit ↗</a>. You need no Modwerk account to contribute, only GitHub.</p>
    </section>
  </div>
}

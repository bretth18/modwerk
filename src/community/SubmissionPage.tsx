import { BackLink } from '../components/BackLink'
import { DevelopmentGuide } from './DevelopmentGuide'
import { assetUrl, sourceRepository } from '../hosting'
import { communityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
export function SubmissionPage({moduleId=''}:{moduleId?:string}) {
  const repository=sourceRepository()
  const module=communityModule(moduleId)
  const moduleRepository=repository||'https://github.com/repeat98/modwerk'
  if(module&&module.machine!=='octatrack')return <div className="community-page contribution-page"><BackLink href={moduleId?'#developer':'#library'}>{moduleId?'Developer workspace':'Module library'}</BackLink>
    <div className="page-heading"><div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>Update {module.name}</h1><p>{DEVICES_BY_ID[module.machine].name} · Current version {module.version}. Prepare source, documentation and media together in a GitHub pull request.</p></div><span className="pill">Owner review required</span></div>
    <section className="configuration-section"><h2>Start from the reviewed module</h2><p>Keep its licence, attribution and pinned source provenance. Increase the module’s semantic version for every code change (documentation and media edits need none), and keep the manifest, README, tutorial and test evidence synchronized.</p><div className="forum-actions"><a className="button button-primary" href={moduleRepository+'/tree/main/'+module.sourcePath} target="_blank" rel="noreferrer">Open module source ↗</a><a className="button button-quiet" href={moduleRepository+'/compare'} target="_blank" rel="noreferrer">Open a pull request ↗</a><a href={moduleRepository+'/blob/main/docs/SDK.md'} target="_blank" rel="noreferrer">Machine SDK & evidence rules ↗</a></div></section>
    <section className="configuration-section"><h2>Include the update evidence</h2><p>Use the machine’s v3 <code>modwerk.module.json</code> contract: source/build identity, compatibility, memory and load measurements, hardware coverage and actual UI captures where applicable. State the evidence tier and remaining limitations honestly. Documentation, tutorial, screenshots and credits must match this version.</p><p>Submit only original or properly licensed sources and reviewed media. Keep firmware, stock bytes, dumps and generated firmware builds local. Passing checks does not publish an update; owner merge approves that exact version. Pending or rejected updates keep the existing approved release available.</p></section>

  </div>
  return <div className="community-page contribution-page"><BackLink href={moduleId?'#developer':'#library'}>{moduleId?'Developer workspace':'Module library'}</BackLink>
    <div className="page-heading">
      <div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>{moduleId ? 'Improve a module' : 'Submit a module'}</h1><p>One contribution process for every machine. Submit source, documentation and media in one pull request.</p></div>
      <span className="pill">GitHub PRs only</span>
    </div>
    <section className="configuration-section contribution-start">
      <div>
        <h2>Start in the repository</h2>
        <p>Fork the Modwerk repository, choose the target machine and follow its SDK guide. Every new module, update, screenshot and audio preview goes through owner review. Merging the PR approves that exact version.</p>
        <p>Questions about developing or submitting a module? <a href="https://discord.gg/mb7B2N7A7" target="_blank" rel="noreferrer">Join the Discord ↗</a></p>
      </div>
      {repository ? <div className="contribution-links">
        <a className="button button-primary" href={repository + '/compare'} target="_blank" rel="noreferrer">Open a pull request ↗</a>
        <a className="button button-quiet" href={repository + '/blob/main/CONTRIBUTING.md'} target="_blank" rel="noreferrer">Read contribution rules ↗</a>
      </div> : <p className="service-note" role="status">The Modwerk repository link is not configured yet. Contribution links will appear here when it is connected.</p>}
    </section>
    <section className="configuration-section">
      <h2>Choose your machine’s SDK</h2>
      <ul className="contribution-files">
        <li><strong>Octatrack MKI / MKII</strong><span>Use the octabam SDK for DSP effects or ColdFire modules. Folders live in <code>{'sdk/octabam/modules/<id>/'}</code>. Existing modules keep <code>octamod.module.json</code> and their native <code>manifest.py</code>; follow the machine guide for the applicable contract.</span></li>
        <li><strong>Digitakt mk1</strong><span>Use the Digitakt SDK and <code>{'sdk/digitakt/modules/<id>/'}</code>. The shared Modwerk contract uses <code>modwerk.module.json</code>, a <code>build.json</code> specification and authored C or assembly under <code>src/</code>.</span></li>
        <li><strong>Digitone mk1 / Keys</strong><span>Use the Digitone SDK and <code>{'sdk/digitone/modules/<id>/'}</code>, with the same Modwerk contract and build layout. Declare this machine’s supported OS releases and resources.</span></li>
      </ul>
      <p className="service-note">Digitakt and Digitone are in preview. Source and documentation can be reviewed while firmware builds and downloads await verification. A machine listed for research is not automatically open for module publication; agree the scope with the owner first.</p>
      {repository && <div className="guide-links">
        <a href={repository + '/blob/main/docs/SDK.md'} target="_blank" rel="noreferrer">Modwerk SDK overview ↗</a>
        <a href={repository + '/blob/main/sdk/machines/octatrack/README.md'} target="_blank" rel="noreferrer">Octatrack guide ↗</a>
        <a href={repository + '/blob/main/sdk/machines/digitakt/README.md'} target="_blank" rel="noreferrer">Digitakt guide ↗</a>
        <a href={repository + '/blob/main/sdk/machines/digitone/README.md'} target="_blank" rel="noreferrer">Digitone guide ↗</a>
      </div>}
    </section>
    <section className="configuration-section">
      <h2>What goes into a module folder</h2>
      <ul className="contribution-files">
        <li><strong>Source & build declarations</strong><span>Your original or properly licensed code and the build files required by your machine’s SDK. Keep third-party authorship and pinned source provenance. Never include firmware or extracted Elektron code.</span></li>
        <li><strong>Module manifest</strong><span>The applicable <code>modwerk.module.json</code> or <code>octamod.module.json</code>: semantic version, machine and OS compatibility, controls, access steps, resource claims, evidence, authors, maintainers, licences and media.</span></li>
        <li><code>README.md</code><span>Complete overview, how to reach the module on the unit, every control, compatibility and limitations, licence and test references, plus a short practical tutorial matching the manifest.</span></li>
        <li><code>TESTING.md</code><span>Actual cycle and memory measurements, commands, tested version/source/build, model and OS, tester, date, workload, duration, results and limitations. Identify emulator results, author hardware reports and owner verification accurately.</span></li>
        <li><code>LICENSE</code><span>Full licence text, attribution and a declaration that the source and media are original or properly licensed. Reviewer verification does not provide automatic legal clearance.</span></li>
        <li><code>media/</code><span>An original thumbnail and actual hardware or emulator screenshots of the selection/enable location and relevant controls, with exact button/menu steps and version/build/setup provenance. Octatrack captures must follow the real black-and-white PNG style. Audio demonstrations are optional.</span></li>
      </ul>
      <p>Automatic USB modules without a dedicated UI must use the narrow, reviewer-verified <code>access.noUiReason</code> declaration. A photo, mockup or reconstructed display cannot replace actual UI evidence.</p>
      <div className="guide-links">
        <a href={assetUrl('module-repository.example.json')} download>Octatrack manifest template ↓</a>
        <a href={assetUrl('module-qualification.example.json')} download>Octatrack qualification template ↓</a>
        <a href={assetUrl('module-resource-impact.example.json')} download>Octatrack resource gauge template ↓</a>
      </div>
    </section>
    <DevelopmentGuide />
    <section className="configuration-section">
      <h2>Review happens on GitHub</h2>
      <p>Increase the module’s semantic version for every code change; documentation and media edits need none. Keep its manifest, documentation and catalog pin synchronized. PR checks validate the applicable machine contract, compatibility, resource claims, evidence and media. The owner reviews the actual reports, rights declarations and screenshots before merge.</p>
      <p>New Octatrack modules and updates require worst-case cycle counts under modulation and maximum load, exact memory regions and totals, populated CPU/DSP/memory gauges, and a hardware report from a real unit that states its model, duration, workload and limitations. Existing frozen versions keep their recorded evidence; do not extend their exemptions to new versions.</p>
      <p>For the shared Modwerk contract, record the evidence tier honestly: no evidence yet (draft), emulator, author hardware or owner verified. Publication requires measured memory/load, actual UI captures where applicable and at least author hardware evidence bound to the version and source. The machine guide defines the details; an evidence badge does not replace owner approval.</p>
      <p>Passing checks does not publish a module. Owner merge approves the version, and release verification must still pass. Pending PRs, rejected updates and failed builds keep the current approved publication available. Firmware stays on each user’s device and never enters source-build automation.</p>
      <p className="service-note">No Modwerk account or email is needed to prepare a contribution. Use your GitHub account to open the PR. Comments, ratings and issue reports require a verified Modwerk account.</p>
    </section>
  </div>
}

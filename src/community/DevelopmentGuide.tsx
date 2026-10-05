import { sourceRepository } from '../hosting'

export function DevelopmentGuide() {
  const repository = sourceRepository()
  return <aside className="development-guide">
    <span className="guide-eyebrow">Build something new</span>
    <h2>Developer quickstart</h2>
    <p>The Modwerk SDK gives each machine its own build and compatibility rules, with one contribution process. Octatrack development uses <a href="https://github.com/sambanks/octabam" target="_blank" rel="noreferrer">octabam ↗</a>. Digitakt and Digitone development follows their machine guides, with credit to the authors of <a href="https://github.com/irpina/elekloader" target="_blank" rel="noreferrer">elekloader ↗</a> and <a href="https://github.com/m-dwyer/digikit" target="_blank" rel="noreferrer">digikit ↗</a> for the public research. Preserve original authorship, licences and source pins.</p>
    <ol>
      <li>
        <strong>Fork and set up</strong>
        <p>Fork the Modwerk repository, use Node.js 24 and run <code>npm ci</code>. Follow the module guide: it covers porting from octabam or elekloader and writing your own, step by step. Keep your own original OS in local, ignored storage; it must never enter a PR or source-build job.</p>
        {repository && <a href={repository + '/blob/main/docs/ADD_A_MODULE.md'} target="_blank" rel="noreferrer">Add or port a module ↗</a>}
      </li>
      <li>
        <strong>Scaffold for your machine</strong>
        <p>For an Octatrack effect, run <code>npm run module:new -- my-effect --kind dsp --author your-github-login</code>; use <code>--kind coldfire</code> for a CPU module.</p>
        <p>For Digitakt, run <code>npm run module:new -- my-mod --machine digitakt --author your-github-login</code>. Use <code>--machine digitone</code> for Digitone. Keep authored source, build declarations, the applicable module manifest, documentation, licence and media together in the generated folder. A scaffold is a draft, not a qualified module.</p>
      </li>
      <li>
        <strong>Prove and document its behavior</strong>
        <p>Follow your machine’s measurement and hardware requirements. Record worst-case processing under modulation, mode changes and maximum load, exact memory use and the tested source/build. Attribute every hardware report and describe its model, OS, duration, workload and limitations. Emulator results alone do not qualify a release.</p>
        <p>New Octatrack modules and updates need a hardware report from a real unit that states its model, how long it ran, what was tested and the limitations. There is no minimum duration or track count. Populate CPU, DSP core and memory gauges with documented load estimates; those gauges do not show exact remaining headroom.</p>
        <p>Write complete control and compatibility documentation and a practical tutorial. Add an original thumbnail and actual UI captures showing where to select or enable the module and its relevant controls, with exact access steps and capture provenance. Follow the machine’s screenshot rules; Octatrack requires real black-and-white PNG captures. Keep tutorial steps and screenshot paths synchronized with README.</p>
      </li>
      <li>
        <strong>Validate and open a pull request</strong>
        <p>Run <code>npm run modules:generate</code>, <code>npm run check</code> and <code>npm run modules:check -- --base origin/main</code>. These application and metadata checks do not run firmware, DSP or hardware tests. Record native and hardware evidence separately, using the isolated development workflow.</p>
        <p>Submit code, documentation, evidence, media and rights declarations together. Increase the semantic version for every update. The owner verifies the actual reports before merging the PR; merge approves that version. The website does not accept direct module or firmware uploads.</p>
      </li>
    </ol>
    <div className="guide-rights">
      <strong>Respect intellectual property</strong>
      <p>Submit original or properly licensed source and media and credit all authors. Do not include Elektron firmware, extracted routines, tables, dumps or infringing third-party work. Stock content must be derived locally from each user’s own verified firmware. Contributor declarations and review are not automatic legal clearance.</p>
    </div>
  </aside>
}

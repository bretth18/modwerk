/** Copyable prompts that start a coding agent on a new module in a contributor's fork. */
export type StarterMachine = 'octatrack' | 'digitakt' | 'digitone'

export interface Starter {
  id: string
  title: string
  summary: string
  /** Module guides under docs/module-guides/, read before writing code. */
  guides: string[]
  /** The task, in the agent's words; `{idea}` is replaced by the contributor's idea. */
  task: string
  /** Ports start from an author's release instead of a scaffold. */
  port?: boolean
  example: string
}

export const STARTER_MACHINES: { id: StarterMachine; name: string; note?: string }[] = [
  { id: 'octatrack', name: 'Octatrack MKI / MKII' },
  { id: 'digitakt', name: 'Digitakt mk1', note: 'Preview' },
  { id: 'digitone', name: 'Digitone mk1 / Keys', note: 'Preview' },
]

const OCTATRACK: Starter[] = [
  { id: 'effect', title: 'An effect', summary: 'A new FX1 or FX2 effect on the DSP, such as a filter, delay or distortion.', guides: ['effects.md'], example: 'Mini Verb, Tape Echo, Character',
    task: 'Build a new FX1/FX2 effect: {idea}\nStart it as an insert effect (`--kind dsp`) unless it genuinely needs the shared bus, and explain why if it does. Every knob must be lockable and modulatable without zipper noise, and run `npm run fx:audit` for aliasing, clipping, DC and idle behaviour.' },
  { id: 'machine', title: 'A track machine', summary: 'A new sound engine in the track machine list.', guides: ['machines.md'], example: 'Analog BD, FM Synth',
    task: 'Build a new track machine that appears in the machine chooser and SRC SETUP: {idea}\nUse Analog BD (sdk/octabam/modules/analog-bassdrum/) as the worked example, leave other tracks untouched, and make every parameter lockable and usable as an LFO destination.' },
  { id: 'sequencer', title: 'A sequencer tool', summary: 'Generative steps, ratchets, quantizing: anything that acts in time.', guides: ['machines.md', 'sequencing.md'], example: 'Euclid, Scale Quantizer',
    task: 'Build a module that acts on the sequencer: {idea}\nFollow the instrument\'s own transport, tempo, track speed, scale, length and swing, as Euclid does. Never keep a clock of your own.' },
  { id: 'midi', title: 'MIDI & USB', summary: 'Map, filter or generate MIDI, or change what the unit does over USB.', guides: ['midi-usb.md'], example: 'CC Map, USB Audio',
    task: 'Build a MIDI or USB module: {idea}\nSay exactly which messages it consumes, passes through, maps or sends, and keep everything else behaving as stock.' },
  { id: 'workflow', title: 'A workflow tweak', summary: 'Playback, scenes, menus and settings: small changes that make the unit nicer to use.', guides: ['playback.md', 'scenes.md', 'system.md'], example: 'Repitch, Preview Vol, MIDI Scenes',
    task: 'Build a workflow module: {idea}\nPick the category (playback, scenes or system) whose guide fits best and tell me which one you chose. Defaults must be safe and a project must save and reload unchanged.' },
  { id: 'port', title: 'Port an octabam module', summary: 'Bring an existing octabam module to Modwerk with its author\'s credit.', guides: [], port: true, example: 'Sidechain Compressor',
    task: 'Port this octabam module to Modwerk: {idea}\nCopy it from octabam at an exact commit, record every copied file in sdk/imports/, keep the author\'s credit and full licence text, and compare the result with native octabam as the guide describes.' },
]

const DIGI: Starter[] = [
  { id: 'machine', title: 'A new machine', summary: 'A new SRC machine in one of the free machine slots.', guides: ['machines.md'], example: 'Digitakt: Digi Poly, Digi Mono, SOPHIE',
    task: 'Build a new SRC machine in one of the free machine slots (core_machines, slots 4–7): {idea}\nClaim the slot in platform.claims and keep the stock machines untouched.' },
  { id: 'effect', title: 'An effect', summary: 'Process the audio at the render hooks, such as an EQ or a saturator.', guides: ['effects.md'], example: 'Digitakt: Digi EQ',
    task: 'Build an audio effect on the render hooks (ev_render_in / ev_render_out): {idea}\nStay inside the shared memory and fast SRAM budgets and say how much of each it uses.' },
  { id: 'sequencer', title: 'A sequencer tool', summary: 'Ratchets, generative steps or anything else that acts in time.', guides: ['sequencing.md'], example: '',
    task: 'Build a module that acts on the sequencer: {idea}\nFollow the instrument\'s own transport, tempo, track speed and swing. Never keep a clock of your own.' },
  { id: 'midi', title: 'MIDI & USB', summary: 'Map, filter or generate MIDI.', guides: ['midi-usb.md'], example: '',
    task: 'Build a MIDI module: {idea}\nSay exactly which messages it consumes, passes through, maps or sends, and claim any SysEx id it uses.' },
  { id: 'workflow', title: 'A workflow tweak', summary: 'Playback, screens, keys and SETTINGS rows that make the unit nicer to use.', guides: ['playback.md', 'system.md'], example: 'Digitakt: Digi Utils, Digi Matrix; Digitone: digitables',
    task: 'Build a workflow module using the key, encoder, draw or SETTINGS events: {idea}\nPick the category (playback or system) whose guide fits best and tell me which one you chose. Only take the key or encoder events it needs and leave everything else to the OS.' },
  { id: 'port', title: 'Port an elekloader mod', summary: 'Bring a released .elemod mod to Modwerk with its author\'s credit.', guides: [], port: true, example: '',
    task: 'Port this elekloader mod to Modwerk: {idea}\nImport it with `npm run elekloader:update`, pin `source` to the author\'s commit, keep their credit, licence and README under upstream/, and record the import in sdk/imports/.' },
]

export function startersFor(machine: StarterMachine) { return machine === 'octatrack' ? OCTATRACK : DIGI }

const IDEA_PLACEHOLDER = '<describe your idea: what it does, its controls, and how it should sound or behave>'
const PORT_PLACEHOLDER = '<name the module and link its source>'

/** The files a starter prompt asks the agent to read, relative to the repository root. */
export function starterReading(machine: StarterMachine, starter: Starter) {
  const files = ['AGENTS.md', 'docs/ADD_A_MODULE.md', 'docs/module-guides/README.md', ...starter.guides.map(guide => 'docs/module-guides/' + guide)]
  return machine === 'octatrack' ? [...files, 'sdk/octabam/AGENTS.md'] : [...files, 'sdk/machines/' + machine + '/README.md']
}

export function starterPrompt(machine: StarterMachine, starter: Starter, idea = '', login = '') {
  const name = STARTER_MACHINES.find(item => item.id === machine)!.name
  const author = login.trim().replace(/^@/, '') || '<your-github-login>'
  const description = idea.trim() || (starter.port ? PORT_PLACEHOLDER : IDEA_PLACEHOLDER)
  const reading = starterReading(machine, starter).map(file => '- ' + file + (file === 'sdk/octabam/AGENTS.md' ? ' (the DSP and ColdFire traps)' : file === 'docs/ADD_A_MODULE.md' ? ' (the "' + (machine === 'octatrack' ? 'Octatrack' : 'Digitakt and Digitone') + '" section)' : ''))
  const scaffold = machine === 'octatrack' ? 'npm run module:new -- <id> --kind dsp|coldfire --author ' + author : 'npm run module:new -- <id> --machine ' + machine + ' --author ' + author
  const create = starter.port ? 'Create the module folder as the guide describes for a port.' : 'Scaffold it with `' + scaffold + '`.'
  return [
    'I am working in my fork of Modwerk, which builds custom firmware modules for Elektron instruments. Help me make a module for the ' + name + '.',
    '',
    starter.task.replace('{idea}', description),
    '',
    'Before you write code, read:',
    ...reading,
    '',
    'Then work step by step:',
    '1. Create a branch off main.',
    '2. Propose a module id, its controls and the exact button steps to reach it on the unit. Wait for my OK.',
    '3. ' + create,
    '4. Write the source, the manifest, README.md (with a tutorial of at least three steps), TESTING.md and LICENSE.',
    '5. Run `npm run module:doctor -- <id>` until every line is green, then `npm run check`.',
    '6. Tell me exactly what to test on my ' + name + ' and which screenshots to capture. Record only results I report back to you.',
    '',
    'Rules: never commit firmware, extracted stock code or tables, dumps or built images; my OS file stays outside the repository. Keep every author\'s credit and licence. Do not claim a test nobody ran.',
  ].join('\n')
}

export function cloneCommands(repository: string, login = '') {
  const [, owner = 'repeat98', name = 'modwerk'] = repository.match(/github\.com\/([^/]+)\/([^/]+)$/) ?? []
  const fork = login.trim().replace(/^@/, '') || '<your-github-login>'
  return ['git clone https://github.com/' + fork + '/' + name + '.git', 'cd ' + name, 'git remote add upstream https://github.com/' + owner + '/' + name + '.git', 'nvm use && npm ci'].join('\n')
}

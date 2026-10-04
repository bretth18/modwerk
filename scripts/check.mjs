import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this script through npm run check or npm run build.')

const children = new Set()
let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true
  for (const child of children) child.kill(signal)
  process.exitCode = signal === 'SIGINT' ? 130 : 143
})

async function run(name) {
  if (interrupted) return false
  const started = performance.now()
  console.log(`Starting ${name}`)
  return new Promise(resolve => {
    // Use npm's current CLI and Node runtime, preserving each script's flags and lifecycle hooks.
    const child = spawn(process.execPath, [npmCli, 'run', name], {
      cwd: root,
      stdio: ['inherit', 'pipe', 'pipe'],
    })
    children.add(child)
    const output = []
    child.stdout.on('data', chunk => output.push(chunk))
    child.stderr.on('data', chunk => output.push(chunk))
    child.on('error', error => output.push(Buffer.from(`${error.message}\n`)))
    child.on('close', code => {
      children.delete(child)
      // Group each task's diagnostics so concurrent failures remain readable.
      process.stdout.write(Buffer.concat(output))
      const passed = code === 0
      console.log(`${name}: ${passed ? 'passed' : 'FAILED'} (${((performance.now() - started) / 1000).toFixed(2)}s)`)
      resolve(passed)
    })
  })
}

async function build() {
  // A type error must still prevent bundling, as in the original build command.
  return await run('typecheck') && await run('build:bundle')
}

const started = performance.now()
const buildOnly = process.argv.includes('--build')
let passed = true
// Reject stale notices/catalog before generation can overwrite the evidence of staleness.
if (!buildOnly) passed = await run('licenses:check') && await run('machines:check') && await run('modules:check') && await run('elekloader:check')
// Finish generated notice/catalog/media writes before lint, tests, typecheck or bundling read them.
if (passed) passed = await run('licenses:generate') && await run('machines:generate') && await run('modules:generate')
if (passed) {
  const results = buildOnly
    ? [await build()]
    : await Promise.all([run('sdk:check'), run('lint'), run('test'), build()])
  passed = results.every(Boolean) && !interrupted
}
console.log(`${buildOnly ? 'Build' : 'Check'} ${passed ? 'passed' : 'FAILED'} in ${((performance.now() - started) / 1000).toFixed(2)}s`)
if (!passed && !process.exitCode) process.exitCode = 1

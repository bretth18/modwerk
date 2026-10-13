import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

const script = readFileSync(new URL('../public/app-startup.js', import.meta.url), 'utf8')

function start() {
  const classes = new Set(), listeners = []
  const window = { addEventListener: (...args) => listeners.push(args) }
  const document = { documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } } }
  runInNewContext(script, { window, document })
  const [type, onError, capture] = listeners[0]
  expect(type).toBe('error')
  expect(capture).toBe(true)
  return { classes, window, onError }
}

it('suppresses the static fallback before the app has loaded', () => {
  const { classes, onError } = start()
  expect(classes.has('app-js')).toBe(true)
  for (const tagName of ['IMG', 'LINK']) onError({ target: { tagName } })
  expect(classes.has('app-js')).toBe(true)
})

it('restores the fallback when a script fails to load', () => {
  const { classes, onError } = start()
  onError({ target: { tagName: 'SCRIPT' } })
  expect(classes.has('app-js')).toBe(false)
})

it('restores the fallback when app execution fails', () => {
  const { classes, window, onError } = start()
  onError({ target: window })
  expect(classes.has('app-js')).toBe(false)
})

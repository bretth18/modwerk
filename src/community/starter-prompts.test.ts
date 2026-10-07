import { existsSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SubmissionPage } from './SubmissionPage'
import { cloneCommands, STARTER_MACHINES, starterPrompt, starterReading, startersFor } from './starter-prompts'

const all = STARTER_MACHINES.flatMap(machine => startersFor(machine.id).map(starter => ({ machine: machine.id, starter })))

describe('starter prompts', () => {
  it('only ask the agent to read files that exist', () => {
    for (const { machine, starter } of all) for (const file of starterReading(machine, starter)) expect(existsSync(file), machine + '/' + starter.id + ': ' + file).toBe(true)
  })

  it('scaffold with the command for the machine and keep placeholders until filled', () => {
    expect(starterPrompt('octatrack', startersFor('octatrack')[0])).toContain('npm run module:new -- <id> --kind dsp|coldfire --author <your-github-login>')
    expect(starterPrompt('digitone', startersFor('digitone')[0])).toContain('npm run module:new -- <id> --machine digitone --author <your-github-login>')
    const filled = starterPrompt('digitakt', startersFor('digitakt')[1], 'A tilt EQ with one knob', '@octo-dev')
    expect(filled).toContain('A tilt EQ with one knob')
    expect(filled).toContain('--author octo-dev')
    expect(filled).not.toMatch(/<describe|\{idea\}/)
  })

  it('send ports through the import path instead of a scaffold', () => {
    for (const { machine, starter } of all.filter(item => item.starter.port)) expect(starterPrompt(machine, starter)).not.toContain('module:new')
  })

  it('clone the contributor’s fork and track the source repository', () => {
    expect(cloneCommands('https://github.com/repeat98/modwerk', 'octo-dev')).toBe('git clone https://github.com/octo-dev/modwerk.git\ncd modwerk\ngit remote add upstream https://github.com/repeat98/modwerk.git\nnvm use && npm ci')
  })
})

describe('start developing page', () => {
  it('leads with forking and the starter prompts', () => {
    const html = renderToStaticMarkup(createElement(SubmissionPage))
    expect(html).toContain('<h1>Start developing</h1>')
    expect(html).toContain('/fork"')
    expect(html).toContain('Copy prompt')
  })
})

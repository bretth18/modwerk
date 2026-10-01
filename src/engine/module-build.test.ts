import { describe, expect, it } from 'vitest'
import { compiledModuleSource, validateCompiledModules } from './module-build'
describe('source-built module identity', () => {
  it('binds verified compiled modules while excluding pending MIDI Scenes', () => {
    const source = compiledModuleSource()
    expect(Object.keys(source.moduleVersions)).toHaveLength(10)
    expect(source.moduleVersions).not.toHaveProperty('midi-scenes')
    expect(source.sourceTreeSha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('rejects stale or missing compiled versions before firmware composition', () => {
    const source = { sourceCommit:null, sourceTreeSha256:'a'.repeat(64), moduleVersions:{ spectrum:'1.0.0' } }
    expect(() => validateCompiledModules(source,[{id:'spectrum',version:'1.0.1'}])).toThrow('Rebuild')
    expect(() => validateCompiledModules(source,[{id:'spectrum',version:'1.0.0'},{id:'euclid',version:'1.0.0'}])).toThrow('versions differ')
    expect(() => validateCompiledModules({...source,sourceCommit:'main'},[{id:'spectrum',version:'1.0.0'}])).toThrow('identity')
  })
})

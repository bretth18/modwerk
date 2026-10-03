import { describe, expect, it } from 'vitest'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { MODULES } from './modules'
import { MODULE_DOCUMENTS_BY_ID } from './documents'
import { checkSelection } from './compatibility'
import { requireFolderQualification } from '../../scripts/module-qualification.mjs'
import current from '../../sdk/octabam/modules/midi-scenes/recipe.json'
import historical from '../../sdk/drafts/midi-scenes/recipe.json'
import provenance from '../../sdk/imports/midi-scenes-release-4f9a894.json'
import requested from '../engine/assets/requested-packages.json'
const folder = resolve('sdk/octabam/modules/midi-scenes')
const document = MODULE_DOCUMENTS_BY_ID['midi-scenes']
describe('exact owner-approved MIDISC2.0 release', () => {
  it('promotes the unchanged guarded author image and binds every release file', () => {
    expect({ ...current, moduleVersion: historical.moduleVersion }).toEqual(historical)
    expect(current.moduleVersion).toBe('0.2.4-experimental')
    for (const [path, hash] of Object.entries(provenance.files)) {
      expect(createHash('sha256').update(readFileSync(resolve(folder,path))).digest('hex')).toBe(hash)
    }
    expect(document.tests.hardwareStatus).toBe('reported')
    expect(document.tests.qualification).toBeUndefined()
    expect(document.tests.releaseWaiver?.imageSha256).toBe(current.mainSha256)
    expect(requested.objects.some(object=>object.moduleId==='midi-scenes')).toBe(false)
    expect(requested.groups.some(group=>group.moduleId==='midi-scenes')).toBe(false)
  })
  it('rejects every companion while allowing only the exact standalone selection', () => {
    expect(checkSelection(['midi-scenes']).checked).toBe(true)
    for(const companion of MODULES.filter(module=>module.id!=='midi-scenes')) {
      const result=checkSelection(['midi-scenes',companion.id])
      expect(result.checked).toBe(false)
      expect(result.conflicts.some(conflict=>conflict.description.includes('standalone'))).toBe(true)
    }
  })
  it('cannot extend approval to future versions, changed source or changed documentation', async () => {
    const copy=mkdtempSync(resolve(tmpdir(),'octamod-midisc-approval.'))
    try {
      cpSync(folder,copy,{recursive:true})
      expect(await requireFolderQualification(copy,document,new Map())).toBe('owner-approved-standalone')
      await expect(requireFolderQualification(copy,{...document,version:'0.2.5-experimental'},new Map())).rejects.toThrow('publication requires')
      writeFileSync(resolve(copy,'README.md'),readFileSync(resolve(copy,'README.md'),'utf8')+'Changed documentation\n')
      await expect(requireFolderQualification(copy,document,new Map())).rejects.toThrow('exact source, image and folder')
      cpSync(resolve(folder,'README.md'),resolve(copy,'README.md'))
      writeFileSync(resolve(copy,'patch.py'),'raise AssertionError("do not execute source")\n')
      await expect(requireFolderQualification(copy,document,new Map())).rejects.toThrow('exact source, image and folder')
    } finally { rmSync(copy,{recursive:true,force:true}) }
  })
})

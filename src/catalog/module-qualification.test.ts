import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { parseModuleDocument, requireModuleQualificationForPublication, type ModuleQualification } from './module-contract'
import { moduleFolderSha256, moduleNativeSourceSha256, parseQualificationBaseline, requireFolderQualification } from '../../scripts/module-qualification.mjs'
import example from '../../public/module-repository.example.json'
import baseline from '../../sdk/module-qualification-baseline.json'
import catalog from './module-documents.json'

import { qualificationFixture, qualificationMedia, qualificationReadme, qualificationPng } from './test-fixtures/qualification'

function measured(q:ModuleQualification=qualificationFixture()) { return parseModuleDocument({...example,media:[qualificationMedia],access:{...example.access,screenshots:[qualificationMedia.path]},tests:{...example.tests,hardwareStatus:'verified',qualification:q}}) }

describe('module qualification hard gates',()=>{
  it('keeps drafts parseable but requires complete worst-case, memory and hardware evidence for publication',()=>{
    expect(()=>requireModuleQualificationForPublication(parseModuleDocument(example))).toThrow('worst-case cycles, exact memory and hardware')
    expect(()=>requireModuleQualificationForPublication(measured())).not.toThrow()
    for(const field of ['cycles','memory','hardware','documentation']) {
      const q=qualificationFixture() as unknown as Record<string,unknown>;delete q[field]
      expect(()=>measured(q as unknown as ModuleQualification)).toThrow('required field')
    }
  })
  it('rejects nominal/unknown/fractional counts, absent modulation scenarios and over-budget configurations',()=>{
    for(const value of [null,0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1]) {
      const q=qualificationFixture();q.cycles[0].worstCase=value as number
      expect(()=>measured(q)).toThrow('exact integer')
    }
    const q=qualificationFixture();q.cycles[0].budget=399
    expect(()=>requireModuleQualificationForPublication(measured(q))).toThrow('real-time budget')
    q.cycles[0].conditions.parameterModulation=''
    expect(()=>measured(q)).toThrow('parameterModulation')
    q.cycles=[]
    expect(()=>measured(q)).toThrow('every processor')
    expect(()=>measured({...qualificationFixture(),cycles:[...qualificationFixture().cycles,...qualificationFixture().cycles]})).toThrow('duplicates')
    const unknown=qualificationFixture();(unknown.cycles[0] as unknown as {method:string}).method='unmeasured'
    expect(()=>measured(unknown)).toThrow('method')
  })
  it('rejects estimated, inconsistent or ambiguous memory accounting',()=>{
    for(const mutate of [
      (q:ModuleQualification)=>{q.memory.regions[0].bytes++},
      (q:ModuleQualification)=>{q.memory.regions[0].words=1.5},
      (q:ModuleQualification)=>{q.memory.perInstanceBytes++},
      (q:ModuleQualification)=>{q.memory.sharedBytes++},
      (q:ModuleQualification)=>{q.memory.totalBytes++},
      (q:ModuleQualification)=>{q.memory.regions.push({...q.memory.regions[0]})},
      (q:ModuleQualification)=>{q.memory.regions=[]}
    ]) { const q=qualificationFixture();mutate(q);expect(()=>measured(q)).toThrow() }
  })
  it('requires current-version evidence and preserves detailed hardware failures',()=>{
    for(const status of ['historical','untested']) expect(()=>requireModuleQualificationForPublication(parseModuleDocument({...example,media:[qualificationMedia],tests:{...example.tests,hardwareStatus:status,qualification:qualificationFixture()}}))).toThrow('passed hardware')
    for(const status of ['pending','failed'] as const) { const q=qualificationFixture();q.hardware.status=status;expect(()=>requireModuleQualificationForPublication(measured(q))).toThrow('passed hardware') }
    for(const check of ['audioContinuity','transport','controls','memoryIntegrity','recovery'] as const) { const q=qualificationFixture();q.hardware.checks[check]='failed';expect(()=>requireModuleQualificationForPublication(measured(q))).toThrow('passed hardware') }
    for(const change of [{durationMinutes:59},{audioTracks:7}]) { const q=qualificationFixture();Object.assign(q.hardware,change);expect(()=>requireModuleQualificationForPublication(measured(q))).not.toThrow() }
    const underloaded=qualificationFixture();underloaded.hardware.maxInstances=1
    expect(()=>requireModuleQualificationForPublication(measured(underloaded))).toThrow('maximum instance count')
    const q=qualificationFixture();q.moduleVersion='0.0.1'
    expect(()=>requireModuleQualificationForPublication(measured(q))).toThrow('this module version')
    for(const field of ['sourceSha256','imageSha256']) expect(()=>measured({...qualificationFixture(),[field]:'main'})).toThrow('SHA-256')
    const malformed=qualificationFixture();malformed.hardware.project.sha256='';expect(()=>measured(malformed)).toThrow()
    malformed.hardware.testedOn='2026-02-30';expect(()=>measured(malformed)).toThrow('test date')
    for(const report of ['firmware.bin','octamod.module.json','qualification.example.json','README.md','../TESTING.md']) {
      const q=qualificationFixture();q.hardware.report=report;expect(()=>measured(q)).toThrow()
    }
  })
  it('accepts an attributed functional report without inventing a stress pass and binds its identities',()=>{
    const q:ModuleQualification={...qualificationFixture(),hardware:{kind:'functional',status:'reported',model:null,testedOn:'2026-10-02',tester:'contributor',sourceRevision:example.tests.evidenceRevision,imageSha256:qualificationFixture().imageSha256,summary:'Owner-reviewed hardware operation report.',limitations:['Duration, model and maximum load were not reported.'],report:'TESTING.md'}}
    const reported=()=>parseModuleDocument({...example,media:[qualificationMedia],tests:{...example.tests,hardwareStatus:'reported',qualification:q}})
    expect(()=>requireModuleQualificationForPublication(reported())).not.toThrow()
    const hardware=q.hardware
    if(!('kind' in hardware)) throw new Error('Expected functional fixture')
    hardware.imageSha256='f'.repeat(64)
    expect(()=>requireModuleQualificationForPublication(reported())).toThrow('tested source and image')
    hardware.imageSha256=q.imageSha256;hardware.sourceRevision='e'.repeat(40)
    expect(()=>requireModuleQualificationForPublication(reported())).toThrow('tested source and image')
    hardware.sourceRevision=example.tests.evidenceRevision;hardware.limitations=[]
    expect(reported).toThrow('limits of the reported hardware test')
  })
  it('retains exactly the existing eleven versions and their honest evidence without filling in measurements',async()=>{
    expect(baseline.modules).toHaveLength(11)
    const frozen=parseQualificationBaseline(baseline)
    for(const module of catalog.modules.filter(m=>!['cc-map','previewvol'].includes(m.id))) {
      const folder=resolve('sdk/octabam/modules',module.id),record=frozen.get(module.id)
      const unchanged=record?.version===module.version&&record.folderSha256===await moduleFolderSha256(folder)
      expect(await requireFolderQualification(folder,parseModuleDocument(module),frozen)).toBe(unchanged?'retained':module.id==='midi-scenes'?'owner-approved-standalone':'qualified')
    }
  })
  it('binds exemptions to complete folder contents and qualification to the native source',async()=>{
    const folder=mkdtempSync(resolve(tmpdir(),'octamod-qualification-test.'))
    try {
      mkdirSync(resolve(folder,'media'))
      writeFileSync(resolve(folder,'manifest.py'),'raise AssertionError("never execute module source")\n')
      writeFileSync(resolve(folder,'README.md'),qualificationReadme)
      writeFileSync(resolve(folder,'media/ui.png'),qualificationPng)
      writeFileSync(resolve(folder,'TESTING.md'),'Synthetic fixture report\n')
      const draft=parseModuleDocument(example),frozen=new Map([[draft.id,{id:draft.id,version:draft.version,folderSha256:await moduleFolderSha256(folder)}]])
      expect(await requireFolderQualification(folder,draft,frozen)).toBe('retained')
      writeFileSync(resolve(folder,'README.md'),qualificationReadme+'Changed documentation\n')
      await expect(requireFolderQualification(folder,draft,frozen)).rejects.toThrow('publication requires')
      const document=measured();document.tests.qualification!.sourceSha256=await moduleNativeSourceSha256(folder,document)
      expect(await requireFolderQualification(folder,document,frozen)).toBe('qualified')
      writeFileSync(resolve(folder,'manifest.py'),'raise AssertionError("changed unreviewed source")\n')
      await expect(requireFolderQualification(folder,document,frozen)).rejects.toThrow('source SHA-256 differs')
      document.tests.qualification!.sourceSha256=await moduleNativeSourceSha256(folder,document)
      writeFileSync(resolve(folder,'runtime-data.txt'),'Original synthetic runtime coefficients\n')
      await expect(requireFolderQualification(folder,document,frozen)).rejects.toThrow('source SHA-256 differs')
      document.tests.qualification!.sourceSha256=await moduleNativeSourceSha256(folder,document)
      writeFileSync(resolve(folder,'TESTING.md'),' \n')
      await expect(requireFolderQualification(folder,document,frozen)).rejects.toThrow('report is empty')
    } finally { rmSync(folder,{recursive:true,force:true}) }
  })
})

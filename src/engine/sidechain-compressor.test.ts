import { describe, expect, it } from 'vitest'
import { MODULES } from '../catalog/modules'
import { checkSelection } from '../catalog/compatibility'
import { reconstructSidechain } from './sidechain-compressor'
import { parseModuleDocument, requireModuleQualificationForPublication } from '../catalog/module-contract'
import document from '../../sdk/octabam/modules/sidechain-compressor/octamod.module.json'
describe('Sidechain standalone release',()=>{
 it('allows the standalone profile and rejects every companion in both orders',()=>{
  expect(checkSelection(['sidechain-compressor']).checked).toBe(true)
  for(const module of MODULES.filter(m=>m.id!=='sidechain-compressor'))for(const ids of [[module.id,'sidechain-compressor'],['sidechain-compressor',module.id]]){
   const result=checkSelection(ids);expect(result.checked).toBe(false);expect(result.issues.join(' ')).toContain('standalone')
  }
 })
 it('refuses an incorrect base without mutating it',async()=>{
  const base=new Uint8Array(1024),saved=base.slice()
  await expect(reconstructSidechain(base)).rejects.toThrow('unmodified original')
  expect(base).toEqual(saved)
 })
 it('limits the hardware exception to this exact module/version with both processor and memory records',()=>{
  expect(()=>requireModuleQualificationForPublication(parseModuleDocument(document))).not.toThrow()
  for(const changed of [{id:'other-compressor'},{version:'0.1.1-experimental'}])expect(()=>requireModuleQualificationForPublication(parseModuleDocument({...document,...changed}))).toThrow()
  const missing=structuredClone(document);missing.tests.qualification.cycles=[]
  expect(()=>parseModuleDocument(missing)).toThrow()
 })
})

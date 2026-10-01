import { it, expect } from 'vitest'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import example from '../../public/module-repository.example.json'

it('checks real PR publication changes without executing module source', () => {
  const root=mkdtempSync(resolve(tmpdir(),'octamod-publication-test.'))
  const folder=resolve(root,'sdk/octabam/modules',example.id)
  const document={...structuredClone(example),access:{...example.access,screenshots:[] as string[]}}
  const catalog={schemaVersion:1,sourceRevision:'a'.repeat(40),modules:[{id:document.id,version:document.version}]}
  const put=(path:string,value:string)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,value)}
  const save=()=>{
    put(resolve(folder,'octamod.module.json'),JSON.stringify(document))
    put(resolve(root,'sdk/catalog.json'),JSON.stringify(catalog))
  }
  const run=(...args:string[])=>spawnSync(process.execPath,['scripts/modules.mjs',...args],{cwd:root,encoding:'utf8'})
  const failure=()=>{const result=run('--base','HEAD','--write');expect(result.status).not.toBe(0);return result.stderr}
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'})
  try {
    for(const path of ['scripts/modules.mjs','src/catalog/module-contract.ts','src/catalog/versions.ts','src/catalog/module-folder.ts']){
      mkdirSync(dirname(resolve(root,path)),{recursive:true})
      copyFileSync(resolve(path),resolve(root,path))
    }
    for(const path of ['manifest.py','README.md','TESTING.md','LICENSE'])put(resolve(folder,path),path==='manifest.py'?'raise AssertionError("module source must never execute")':'Fixture document\n')
    save()
    expect(run('--write').status).toBe(0)
    git('init','--quiet')
    git('add','.')
    git('-c','user.name=Publication test','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Legacy publication fixture')
    // Existing publications remain readable while new media is being prepared.
    expect(run('--base','HEAD').status).toBe(0)
    put(resolve(folder,'README.md'),'Documentation update\n')
    expect(failure()).toContain('greater module version')
    document.version='0.1.1'
    catalog.modules[0].version=document.version
    save()
    expect(failure()).toContain('actual screenshots')
    const path='media/ui.png'
    document.access.screenshots=[path]
    // Synthetic image fixture exercises file validation, not authenticity review.
    const media={path,captureType:'emulator',caption:'Fixture location and controls',alt:'Fixture LCD',credit:'Test fixture',license:'CC0-1.0',source:'original',otUi:{page:'FX1 SETUP',shows:'location-and-controls',firmware:'1.40C',moduleVersion:'0.1.0',imageSha256:'a'.repeat(64),setup:'Synthetic metadata fixture'}}
    const withMedia={...document,media:[media]}
    const saveMedia=()=>{save();put(resolve(folder,'octamod.module.json'),JSON.stringify(withMedia))}
    mkdirSync(resolve(folder,'media'))
    writeFileSync(resolve(folder,path),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=','base64'))
    saveMedia()
    expect(failure()).toContain('this module version')
    media.otUi.moduleVersion=document.version
    saveMedia()
    expect(run('--base','HEAD','--write').status).toBe(0)
    // A pre-existing draft folder newly added to the catalog must also qualify.
    git('reset','--hard','HEAD')
    git('clean','-fd')
    document.version='0.1.0'
    document.access.screenshots=[]
    catalog.modules=[]
    save()
    expect(run('--write').status).toBe(0)
    git('add','.')
    git('-c','user.name=Publication test','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Unpublished draft fixture')
    catalog.modules=[{id:document.id,version:document.version}]
    save()
    expect(failure()).toContain('actual screenshots')
  } finally { rmSync(root,{recursive:true,force:true}) }
})

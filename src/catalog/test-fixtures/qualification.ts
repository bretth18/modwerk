import type { ModuleQualification } from '../module-contract'
import example from '../../../public/module-repository.example.json'

// Synthetic evidence exercises validation only; it is never a module measurement.
export function qualificationFixture(): ModuleQualification {
  const conditions={parameterExtremes:'Every parameter minimum/maximum and branch boundary.',parameterModulation:'All controls under simultaneous LFOs, p-locks, MIDI CC and scene sweeps.',modeSwitching:'Repeated and interrupted mode, bypass and Part changes.',maxLoad:'Eight tracks; maximum voices/instances; both FX slots and USB active.',inputConditions:'Silence, impulses, full-scale noise, feedback and denormals.'}
  return {documentation:{tutorial:{title:'Quick tutorial',steps:['Select an audio track and enable the module.','Move the controls while playing a sample.','Compare the output and check the response.']},screenshots:['media/ui.png'],screenshotStyle:'black-and-white'},moduleVersion:example.version,sourceSha256:'a'.repeat(64),imageSha256:'b'.repeat(64),cycles:[{processor:'dsp',worstCase:100,maxConfiguration:400,maxInstances:4,budget:500,unit:'cycles/sample',method:'emulator',conditions,report:'TESTING.md'}],memory:{regions:[{name:'Program',space:'dsp-p',words:100,wordBits:24,bytes:300,scope:'shared'},{name:'State and buffers',space:'dsp-y',words:20,wordBits:24,bytes:60,scope:'instance'}],perInstanceBytes:60,sharedBytes:300,maxInstances:8,totalBytes:780,conditions:'Includes program, state, tables and buffers; no heap or extra stack. Padding counted separately.',report:'TESTING.md'},hardware:{status:'passed',model:'MKII',testedOn:'2026-10-02',tester:'Fixture tester',project:{name:'Synthetic fixture',sha256:'c'.repeat(64),recipe:'Locally generated project; record generator revision, settings and file hashes.'},durationMinutes:60,audioTracks:8,midiTracks:8,maxInstances:8,conditions,checks:{audioContinuity:'passed',transport:'passed',controls:'passed',memoryIntegrity:'passed',recovery:'passed'},report:'TESTING.md'}}
}

export const qualificationMedia = {path:'media/ui.png',captureType:'emulator',caption:'Synthetic test location and controls',alt:'Synthetic fixture LCD',credit:'Test fixture',license:'CC0-1.0',source:'original',otUi:{page:'FX1 SETUP',shows:'location-and-controls',firmware:'1.40C',moduleVersion:example.version,imageSha256:'a'.repeat(64),setup:'Synthetic fixture, not hardware evidence'}}
export const qualificationReadme = `# Fixture module

## Overview
Original fixture signal path and intended uses.

## Controls
Document each control, default, range and interaction.

## Usage
Practical setup instructions.

### Quick tutorial
1. Select an audio track and enable the module.
2. Move the controls while playing a sample.
3. Compare the output and check the response.

## Compatibility and limitations
Record models, OS, placement, conflicts and limitations.

## Tests and measurements
See TESTING.md for the synthetic fixture report.

## Authorship and licences
Original test fixture, MIT attribution.

## Screens and audio
![Synthetic test LCD](media/ui.png)
`
export const qualificationPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=','base64')

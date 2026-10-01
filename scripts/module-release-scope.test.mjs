import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const python = process.platform === 'win32' ? 'python' : 'python3'
function metadataCheck(body) {
  // Loading these standard-library-only definitions never evaluates SDK manifests or assembles code.
  const setup = `import runpy, json
r = runpy.run_path('scripts/build-module-packages.py')
ORDER, REQUESTED = r['ORDER'], r['REQUESTED']
scope, retain = r['requested_release_scope'], r['retain_pending_requested']
`
  return execFileSync(python, ['-B', '-c', setup + body], { cwd: root, encoding: 'utf8' }).trim()
}
describe('release planning with pending MIDI Scenes', () => {
  it('excludes the pending source from discovery while retaining the three reviewed requested modules', () => {
    const actual = metadataCheck(`catalog = json.load(open('sdk/catalog.json'))
ids = [m['id'] for m in catalog['modules'] if json.load(open('sdk/octabam/modules/' + m['id'] + '/octamod.module.json')).get('build', {}).get('status') != 'pending']
print(json.dumps(scope(ids)))
`)
    expect(JSON.parse(actual)).toEqual(['analog-bassdrum', 'usb-audio-out-tracks-main-cue', 'quantizer'])
  })
  it('retains inactive verified rows verbatim, in their original order, and never pins the pending version', () => {
    expect(metadataCheck(`baseline = json.load(open('src/engine/assets/requested-packages.json'))
ids = [id for id in REQUESTED if id != 'midi-scenes']
compiled = {field: [dict(row, compiled=True) for row in baseline[field] if row['moduleId'] != 'midi-scenes'] for field in ['objects', 'groups']}
result = retain(compiled, baseline, ids)
for field in ['objects', 'groups']:
    assert len(result[field]) == len(baseline[field])
    for row, old in zip(result[field], baseline[field]):
        if row['moduleId'] == 'midi-scenes': assert row == old
        else: assert row['compiled'] is True
assert 'midi-scenes' not in baseline['moduleVersions']
print('preserved')
`)).toBe('preserved')
  })
  it('fails closed on unsupported scope, changed active object inventory, and a pending version pin', () => {
    expect(metadataCheck(`def rejects(action):
    try: action()
    except ValueError: return
    raise AssertionError('Expected rejection')
for invalid in [ORDER + ['unknown'], ORDER[:-1], ORDER + REQUESTED + ['midi-scenes'], ORDER + ['midi-scenes']]:
    rejects(lambda: scope(invalid))
baseline = json.load(open('src/engine/assets/requested-packages.json'))
ids = [id for id in REQUESTED if id != 'midi-scenes']
compiled = {field: [row for row in baseline[field] if row['moduleId'] != 'midi-scenes'] for field in ['objects', 'groups']}
compiled['objects'] = compiled['objects'][1:]
rejects(lambda: retain(compiled, baseline, ids))
baseline['moduleVersions']['midi-scenes'] = 'unverified'
rejects(lambda: retain(compiled, baseline, ids))
print('rejected')
`)).toBe('rejected')
  })
})

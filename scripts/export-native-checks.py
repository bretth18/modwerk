"""Record native declaration/ledger checks for every module selection that contains the given module.

A selection is recorded when the native resource ledger finds no collision among its modules and the platform modules they need
(USB Audio Out brings USB MIDI). The ledger reads module declarations and sources only: no firmware is read and nothing is built.
Existing records are never removed or rewritten; with --verify-existing every one of them is checked again first.

    python3 scripts/export-native-checks.py PRIVATE_SDK_ROOT --app . --include sidechain-compressor \\
        --scope miniverb,tapeecho,euclid,repitch,tapehead,analog-bassdrum,usb-audio-out-tracks-main-cue,quantizer,previewvol,cc-map --write

PRIVATE_SDK_ROOT is a copy of sdk/octabam, so its modules, tools, platform and dsp folders must equal the app's.
"""
import argparse, hashlib, json, os, pathlib, sys


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('root', type=pathlib.Path)
    p.add_argument('--app', type=pathlib.Path, required=True)
    p.add_argument('--include', required=True, help='Module id every recorded selection contains')
    p.add_argument('--scope', required=True, help='Comma-separated module ids that may accompany it')
    p.add_argument('--verify-existing', action='store_true', help='Check every committed record again; fail if one is no longer clean')
    p.add_argument('--write', action='store_true', help='Append the new records to src/catalog/native-metadata.json')
    p.add_argument('--output', type=pathlib.Path, help='With --write, write the table here instead (the app is read-only in a container)')
    a = p.parse_args()
    root, app = a.root.resolve(), a.app.resolve()
    for directory in ['modules', 'platform', 'tools', 'dsp']:
        files = lambda base: {str(f.relative_to(base)): sha(f) for f in (base / directory).rglob('*') if f.is_file() and '__pycache__' not in f.parts and f.suffix != '.pyc'}
        if files(root) != files(app / 'sdk/octabam'):
            p.error('The private SDK differs from the reviewed source: ' + directory)
    os.chdir(root)
    os.environ['XBUS'] = '1'   # every Modwerk native build relocates a bus client's scratch into the shared window
    sys.path[:0] = [str(root / 'tools')]
    import toolpath  # noqa: F401
    from remix import ledger, registry
    from remix.schema import Remix
    path = app / 'src/catalog/native-metadata.json'
    metadata = json.loads(path.read_text())
    known = registry.modules()
    byid = {m.name: m for m in known.values()}

    def clean(ids):
        keys = tuple(byid[i].key for i in ids) + (('USB MIDI',) if 'usb-audio-out-tracks-main-cue' in ids else ())
        remix = registry.with_platform(Remix(name='checks', doc='Declaration check only.', modules=keys, fallback='NONE'), known)
        return not ledger.check(registry.selected(remix))

    if a.verify_existing:
        # MIDI Scenes is a standalone replacement, not ledger-composed, so its records are not re-run.
        composed = [key for key in metadata['checks'] if 'midi-scenes' not in key]
        stale = [key for key in composed if not clean(key.split('+'))]
        if stale:
            p.error(str(len(stale)) + ' recorded selections are no longer clean, e.g. ' + stale[0])
        print(f'All {len(composed)} existing ledger-composed records still pass ({len(metadata["checks"]) - len(composed)} MIDI Scenes records not re-run).')
    scope = a.scope.split(',')
    unknown = [i for i in [a.include, *scope] if i not in byid]
    if unknown:
        p.error('Unknown module: ' + ', '.join(unknown))
    recorded, refused = {}, []
    for mask in range(1 << len(scope)):
        ids = [i for bit, i in enumerate(scope) if mask >> bit & 1] + [a.include]
        key = '+'.join(sorted(ids))
        if clean(ids):
            recorded[key] = []
        else:
            refused.append(key)
    fresh = {key: value for key, value in recorded.items() if key not in metadata['checks']}
    print(f'{len(recorded)} clean selections contain {a.include}; {len(refused)} refused by the ledger; {len(fresh)} not yet recorded.')
    for key in refused[:5]:
        print('  refused:', key)
    if a.write and fresh:
        metadata['checks'].update(fresh)
        (a.output or path).write_text(json.dumps(metadata, indent=2) + '\n')
        print('Appended', len(fresh), 'records.')


if __name__ == '__main__':
    main()

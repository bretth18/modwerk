#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""The runtime packages the site loads onto an Octatrack over USB (module sets), built from source with no firmware.

  npm run octatrack:module-packages                 # writes public/octatrack-modules/ID/VERSION.mwrm and the manifest
  npm run octatrack:module-packages -- --check      # rebuilds every package and compares it byte for byte
  npm run octatrack:module-packages -- --check --stock OCTATRACK_OS1.40C.bin   # and: no run of the stock OS inside

Each package is exactly what the local path makes (sdk/runtime/loader/build.py --dsp, as the elekloader README runs
it): the module's DSP package from src/engine/assets/dsp-packages.json (dsp_packages.py rebuilds that from source) and
its FX page recipe, with the figures the manifest (src/engine/assets/octatrack-module-packages.json) keeps for it. Only
DSP effects without ColdFire code: hybrid modules (TAPE ECHO, EUCLID) and converted ColdFire modules copy stock bytes
into their packages until loader ABI 7 carries their SHA-256 instead. To add a module, add its entry (id and figures)
to the manifest and run this.

Every package is checked to have no stock-code sites and no ColdFire hooks, the only places a package carries stock
bytes. --stock also scans it, and its DSP words packed in three bytes either way round, for runs of 12 or more bytes
that appear in the stock OS image too, counted by their non-zero bytes (zero padding and empty header fields match
anywhere), and fails on 12 (TAPE ECHO's private package shows 19; E-Verb's DSP words share 10 by chance). Needs Elekloader
(--upstream, default ~/.cache/modwerk-upstream/elekloader) to unpack the OS. Node 24 for the page recipe."""
import argparse, hashlib, json, shutil, struct, subprocess, sys, tempfile
from pathlib import Path

APP = Path(__file__).resolve().parents[4]
BUILD = APP / 'sdk/runtime/loader/build.py'
DSP = APP / 'src/engine/assets/dsp-packages.json'
MANIFEST = APP / 'src/engine/assets/octatrack-module-packages.json'
PUBLIC = APP / 'public'
SEED, LIMIT = 12, 12  # bytes: a shared run worth looking at; its non-zero bytes that fail


def build(entry, out):
    """One package through build.py, as the README's command line makes it."""
    args = [sys.executable, '-B', str(BUILD), '--dsp', '%s:%s' % (DSP, entry['id']), '--slots', entry['slots'],
            '--cycles', str(entry['cycles']), '--cycles-kind', entry['cyclesKind'], '--state', str(entry['state']), '-o', str(out)]
    if entry.get('buffer'):
        args += ['--buffer', str(entry['buffer'])]
    subprocess.run(args, check=True, capture_output=True, text=True, cwd=APP)
    return out.read_bytes()


def runs(data, stock):
    """Stretches of `data` (from their start) that also appear in `stock`, at least SEED bytes: their non-zero bytes."""
    grams = {}
    for at in range(len(data) - SEED + 1):
        if data[at:at + SEED].count(0) <= SEED // 2:  # zero-heavy seeds match everywhere and only slow the scan down
            grams.setdefault(data[at:at + SEED], []).append(at)
    found = {}
    for at in range(len(stock) - SEED + 1):
        for start in grams.get(stock[at:at + SEED], ()):
            n = SEED
            while start + n < len(data) and at + n < len(stock) and data[start + n] == stock[at + n]:
                n += 1
            found[start] = max(found.get(start, 0), n - data[start:start + n].count(0))
    return found


def dsp_words(data):
    """An ABI 6 package without stock-code sites or hooks: its DSP words packed big- and little-endian."""
    image, _, relocations, hooks, sites = struct.unpack_from('>IIIII', data, 8)
    if data[:6] != b'MWRM\0\6' or sites or hooks:
        raise ValueError('Not an ABI 6 DSP effect without stock-code sites and hooks.')
    words = struct.unpack_from('>I', data, 32)[0]
    values = struct.unpack_from('>%dI' % words, data, 68 + image + 4 * relocations)
    return [b''.join(v.to_bytes(3, order) for v in values) for order in ('big', 'little')]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--check', action='store_true', help='rebuild and compare; write nothing, exit 1 on a difference')
    ap.add_argument('--stock', type=Path, help='the stock OS (.bin): fail on any run of it copied into a package')
    ap.add_argument('--upstream', type=Path, default=Path.home() / '.cache/modwerk-upstream/elekloader')
    a = ap.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    versions = {m['id']: m['version'] for m in json.loads((APP / 'sdk/catalog.json').read_text())['modules']}
    dsp = {p['id']: p for p in json.loads(DSP.read_text())['packages']}
    stock = None
    if a.stock:
        sys.path.insert(0, str(a.upstream.expanduser().resolve()))
        from elekloader import formats
        parsed, device, _ = formats.load(str(a.stock))
        stock = formats.main_image(parsed, device)
    failed, entries = 0, []
    with tempfile.TemporaryDirectory() as work:
        for entry in manifest['packages']:
            version = versions[entry['id']]
            if dsp[entry['id']]['version'] != version:
                sys.exit('%s: dsp-packages.json holds %s, the catalogue %s; rebuild it with dsp_packages.py first.' % (
                    entry['id'], dsp[entry['id']]['version'], version))
            data = build(entry, Path(work) / 'p.mwrm')
            views = [data] + dsp_words(data)
            path = 'octatrack-modules/%s/%s.mwrm' % (entry['id'], version)
            name = data[50:66].split(b'\0')[0].decode('latin-1')
            made = dict(entry, version=version, name=name, module=data[28:32].hex(), bytes=len(data),
                        sha256=hashlib.sha256(data).hexdigest(), path=path)
            entries.append(made)
            if a.check:
                same = made == entry and (PUBLIC / path).is_file() and (PUBLIC / path).read_bytes() == data
                print('%-18s %s %s' % (entry['id'], made['sha256'][:16], 'identical' if same else 'DIFFERS: run without --check'))
                failed += not same
            else:
                if not entries[:-1]:  # only the current versions stay published
                    shutil.rmtree(PUBLIC / 'octatrack-modules', ignore_errors=True)
                (PUBLIC / path).parent.mkdir(parents=True, exist_ok=True)
                (PUBLIC / path).write_bytes(data)
            if stock is not None:
                longest = 0
                for view in views:
                    for start, n in sorted(runs(view, stock).items()):
                        longest = max(longest, n)
                        if n >= LIMIT:
                            print('  %s: a run at %d with %d non-zero bytes is also in the stock OS' % (entry['id'], start, n))
                print('  %-16s most non-zero bytes in a run shared with the stock OS: %d (fails at %d)' % (entry['id'], longest, LIMIT))
                failed += longest >= LIMIT
    if not a.check:
        MANIFEST.write_text(json.dumps(dict(manifest, packages=entries), indent=2) + '\n')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()

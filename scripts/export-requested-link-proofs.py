"""Refresh GNU link fingerprints from stock-free requested ELF packages.

Historical MIDI Scenes 8.2 fixtures remain unchanged: that port is archived.
Run in the reviewed toolchain, with the app read-only and output kept separate.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assets = args.app / 'src/engine/assets'
    record = json.loads((assets / 'requested-link-proofs.json').read_text())
    packages = json.loads((assets / 'requested-packages.json').read_text())
    objects = {obj['label']: obj for obj in packages['objects']}
    refreshed = 0
    with tempfile.TemporaryDirectory(prefix='requested-link-proofs-') as temporary:
        work = Path(temporary)
        for proof in record['proofs']:
            if 'midi-scenes' in proof['ids']:
                continue
            inputs = []
            for index, label in enumerate(proof['labels']):
                obj = objects[label]
                data = bytes.fromhex(obj['code'])
                if hashlib.sha256(data).hexdigest() != obj['sha256']:
                    raise ValueError('Corrupt authored object: ' + label)
                path = work / f'{index}.o'
                path.write_bytes(data)
                inputs.append(str(path))
            elf, binary = work / 'linked.elf', work / 'linked.raw'
            subprocess.run(['m68k-elf-ld', '-Ttext=0x40a955e0', '-o', str(elf), *inputs], check=True, capture_output=True)
            subprocess.run(['m68k-elf-objcopy', '-O', 'binary', str(elf), str(binary)], check=True, capture_output=True)
            rows = subprocess.check_output(['m68k-elf-nm', str(elf)], text=True).splitlines()
            raw = binary.read_bytes()
            proof.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                         exports={row[2]: int(row[0], 16) for line in rows
                                  if len(row := line.split()) == 3 and row[1].isupper() and row[1] != 'U'})
            refreshed += 1
    args.output.write_text(json.dumps(record, indent=2) + '\n')
    print(f'Refreshed {refreshed} GNU link proofs; archived MIDI Scenes fixtures preserved. No firmware input.')


if __name__ == '__main__':
    main()

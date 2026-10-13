"""Actual SRC panel switch followed by a fresh CS1 boot, never a posted project reload.

Run in the isolated native container. --project is an owned stock fixture.
Firmware, project copies, CS1, logs and memory dumps stay in --output.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, required=True)
    parser.add_argument('--baseline-image', type=Path, required=True)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--emu', type=Path, required=True)
    parser.add_argument('--resume', action='store_true', help='Reuse fingerprinted completed panel captures; boot every case in a fresh process')
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() and not args.resume:
        raise ValueError('Use a fresh private output directory or --resume')
    output.mkdir(parents=True, exist_ok=args.resume)
    sys.path[:0] = [str(args.sdk/'tools/harness'), str(args.sdk/'tools/hw')]
    from ab_fixture import prepare
    import ot_project as otp
    stock = (args.sdk/'out/raw/section_3_MAIN_OS.bin').read_bytes()
    defaults = stock[0x400d320c-0x40000400:0x400d320c-0x40000400+12]
    card = output/'card.img'
    if not args.resume:
        project = prepare(args.project, output/'project')
        for path in project.glob('bank*.work'):
            def mutate(data):
                for part in range(8):
                    base = otp.PART_BASE + part * otp.PART_STRIDE + 9
                    for track in range(8):
                        for page, values in ((0x2a, defaults[:6]), (0x1da, defaults[6:])):
                            at = base + page + 30*track + 6
                            data[at:at+6] = values
            otp._bank_write(project, int(path.stem[4:]), mutate, guard=False)
        subprocess.run([sys.executable, str(args.sdk/'tools/emu/ot_emu/stage_card.py'), str(project),
                        'OCTABAM', 'RIG', '--tree', str(output/'tree'), '--out', str(card)], check=True)
    elif not card.is_file():
        raise ValueError('Resume requires the original private card image')
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    def key(code, gap=600, hold=300):
        return [(gap, f'key {code:#x} down'), (hold, f'key {code:#x} up')]
    setup = key(0x10) + [(600, 'key 0x2d down'), (300, 'key 0x22 down'),
                           (300, 'key 0x22 up'), (300, 'key 0x2d up')]
    assign = setup + sum((key(0x20, 250, 60) for _ in range(6)), []) + key(0x31)
    # The selected SRC SETUP row remains AB (5); four UP events select FLEX (1).
    switch = key(0x32) + setup + sum((key(0x33, 250, 60) for _ in range(4)), []) + key(0x31)
    cases = [('baseline-switch', args.baseline_image, assign+switch, False),
             ('candidate-switch', args.sdk/'out/mainos_bus.bin', assign+switch, True),
             ('baseline-retain-ab', args.baseline_image, assign, True)]
    report = {'schema': 1, 'candidateVersion': '0.1.5-experimental',
              'emulatorSha256': hashlib.sha256(args.emu.read_bytes()).hexdigest(), 'cases': [],
              'physicalHardware': 'not tested', 'outputMatrix': 'not tested'}
    for label, image, events, restored in cases:
        folder = output/label; folder.mkdir(exist_ok=args.resume)
        now = 0; lines = []
        for delay, event in events+[(800, 'quit')]:
            now += delay; lines.append(f'{now} {event}\n')
        script = folder/'events.txt'; script.write_text(''.join(lines))
        common = [str(args.emu), '--image', str(image), '--card', str(card), '--set', 'OCTABAM',
                  '--project', 'RIG', '--load-ms', '20000', '--mkii', '--dsp']
        spans = f'0x10000000,0x100000={folder}/cs1.bin;0x40170f60,25288={folder}/live.bin;0x100a4ece,25288={folder}/shadow.bin'
        identity = {'mainOsSha256': digest(image), 'emulatorSha256': digest(args.emu),
                    'cardSha256': digest(card), 'eventsSha256': digest(script)}
        capture = folder/'capture.json'
        if args.resume and capture.is_file():
            assert json.loads(capture.read_text()) == identity, (label, 'resume identity changed')
            assert all((folder/name).is_file() for name in ('cs1.bin', 'live.bin', 'shadow.bin', 'switch.log'))
        else:
            with (folder/'switch.log').open('w') as log:
                subprocess.run(common+['--live-script', str(script), '--mem-dump', spans], stdout=log,
                               stderr=subprocess.STDOUT, check=True, timeout=600)
            capture.write_text(json.dumps(identity, indent=2)+'\n')
        before = (folder/'live.bin').read_bytes()
        # Ensure the events reached their intended machine, before testing the boot.
        assert before[0x22] == 1, (label, 'not FLEX')
        signature = b'AB\x01' if label.endswith('retain-ab') else bytes(3)
        assert before[60:63] == signature, (label, 'panel selection', before[60:63])
        shadow = (folder/'shadow.bin').read_bytes()
        assert shadow[60:63] == signature, (label, 'shadow signature')
        if label.startswith('candidate'):
            for part in (before, shadow):
                assert part[48:54] == defaults[:6] and part[480:486] == defaults[6:]
        spans = f'0x40170f60,25288={folder}/boot-live.bin;0x100a4ece,25288={folder}/boot-shadow.bin'
        with (folder/'boot.log').open('w') as log:
            subprocess.run(common+['--mount', '--no-post', '--cs1-in', str(folder/'cs1.bin'),
                                   '--mem-dump', spans], stdout=log, stderr=subprocess.STDOUT,
                           check=True, timeout=600)
        boot_log = (folder/'boot.log').read_text()
        assert 'LOAD PROJECT posted: no' in boot_log, (label, 'posted reload')
        assert 'ILLEGAL' not in boot_log, (label, 'illegal')
        after = (folder/'boot-live.bin').read_bytes()
        machines = list(after[0x22:0x2a])
        if restored:
            assert machines == [1]*8, (label, 'bank rejected', machines)
            assert after[60:63] == signature, (label, 'signature changed on boot')
            assert after[48:54] == before[48:54] and after[480:486] == before[480:486]
        else:
            assert machines == [0]*8, (label, 'baseline no longer reproduces', machines)
        report['cases'].append({'case': label, 'mainOsSha256': hashlib.sha256(image.read_bytes()).hexdigest(),
                                'actualSrcPanelEvents': True, 'freshProcessCs1Boot': True,
                                'postedProjectReload': False, 'bankRestored': restored,
                                'trackMachinesAfterBoot': machines})
        print('PASS', label, 'restored' if restored else 'reproduced bank rejection', flush=True)
        (output/'evidence.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    main()

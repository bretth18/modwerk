# Run only inside the private network/credential-isolated native proof workspace.
import pathlib
import sys
import json

sys.path.insert(0, str(pathlib.Path('tools').resolve()))
import toolpath
from remix import registry, ledger
from remix.schema import Module, Kind, Claims, DspRange

module = registry.by_key('SIDECHAIN_COMPRESSOR')
cases = [
    ('private-keybus', DspRange('y', 0x800, 0x20, 'Synthetic private keybus overlap')),
    ('shared-key-window', DspRange('y', 0x3e00, 0x20,
                                 'Synthetic shared overlap', half_relative=True)),
]
for name, claim in cases:
    other = Module(name='overlap-probe', key='OVERLAP_PROBE', kind=Kind.CF_PATCH,
                   doc='Synthetic claim only; no executable contribution',
                   claims=Claims(dsp_ranges=(claim,)))
    errors = ledger.check([module, other])
    assert errors and any('overlap' in error.lower() for error in errors), (name, errors)
    print(name + ': refused independently')

other = Module(name='disjoint-probe', key='DISJOINT_PROBE', kind=Kind.CF_PATCH,
               doc='Disjoint synthetic claim only; no executable contribution',
               claims=Claims(dsp_ranges=(DspRange('y', 0xa00, 0x20, 'Disjoint'),)))
assert not ledger.check([module, other]), 'Disjoint synthetic claim must remain valid'
print('disjoint private claim: accepted')
report_path = pathlib.Path('native-evidence.json')
report = json.loads(report_path.read_text())
report.setdefault('rejections', {}).update(syntheticKeybusAndWindowOverlap=True,
                                         independentlyProbed=['private-keybus', 'shared-key-window'],
                                         disjointClaimAccepted=True)
report_path.write_text(json.dumps(report, indent=2) + '\n')

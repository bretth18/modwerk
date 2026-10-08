#!/usr/bin/env python3
"""Conservative instruction-word budget, not chip timing qualification.

The repository cycle counter rejects branched/nested callees. Charge the
entire word span of each reachable callee at each call (including mutually
exclusive forward arms), and four extra cycles per call and branch. There
are no backward branches or counted loops inside any callee. First-call
setup is charged to every 16-frame block. Memory/contention stalls are not
modeled; hardware must still establish deadline safety.
"""
import json
import os
import pathlib
import re
import tempfile
import verify

HERE=pathlib.Path(__file__).resolve().parent

def main():
    with tempfile.TemporaryDirectory() as d:
        _,s,words,_=verify.assemble(pathlib.Path(d))
        source=(HERE/"chorus.asm").read_text()
        # Refuse changed call topology instead of silently understating it.
        spans={"sample":source.split("ac_sample:\n")[1].split("ac_frameend:\n")[0],
               "sine":source.split("ac_sine:\n")[1].split("ac_channel:\n")[0],
               "channel":source.split("ac_channel:\n")[1].split("ac_tap:\n")[0],
               "tap":source.split("ac_tap:\n")[1]}
        calls=lambda text:re.findall(r"^\s*bsr\s+(\w+)",text,re.M)
        assert calls(spans['sample'])==['ac_sine','ac_channel','ac_channel']
        assert calls(spans['channel'])==['ac_tap']*4
        assert not calls(spans['sine']) and not calls(spans['tap'])
        for text in spans.values():
            labels={m.group(1):m.start() for m in re.finditer(r"^(\w+):",text,re.M)}
            for m in re.finditer(r"^\s*b(?:ra|cc|cs|eq|ne|ge|lt|gt|le|mi|pl)\s+(\w+)",text,re.M):
                assert labels[m.group(1)]>m.start(), 'Non-forward branch needs a new bound'
            assert not re.search(r"^\s*(?:do|rep|jmp|jsr)\b",text,re.M)
        branch_cost=lambda text:4*len(re.findall(r"^\s*b(?:ra|cc|cs|eq|ne|ge|lt|gt|le|mi|pl)\b",text,re.M))
        tap=verify.ORG+words-s['ac_tap']
        channel=s['ac_tap']-s['ac_channel']+4*(tap+4)+branch_cost(spans['channel'])
        sine=s['ac_channel']-s['ac_sine']+branch_cost(spans['sine'])
        sample=s['ac_frameend']+1-s['ac_sample']+(sine+4)+2*(channel+4)+branch_cost(spans['sample'])
        # Include endpoint helpers, first-call seeding, loop entry and return.
        control=s['ac_sample']-s['proc']+3*(s['ac_sine']-s['ac_endpoint']+4)+16
        bound=sample+(control+15)//16
        split_bound=sample+(2*control+15)//16
        record={'version':'0.1.0-experimental','programWords':words,'tableWords':1026,
                'model':'instruction words plus conservative call/branch surcharge; no contention stalls',
                'perSampleLoopUpperBound':sample,'perCallSetupUpperBound':control,
                'perSampleAt16FramesUpperBound':bound,'perSampleAt16FramesWithSplitUpperBound':split_bound,
                'fourFx2InstancesPerCoreUpperBound':4*split_bound,
                'stateSpanWords':56,'stereoBufferWordsPerInstance':16384,
                'perCoreFourInstanceReservedWords':4*(0x100+16384),
                'coldfire':'No authored ColdFire routine; existing platform and stock editor paths not bounded here.',
                'hardwareTiming':'unmeasured'}
        print(json.dumps(record,indent=2))
        if os.environ.get('CHORUS_BOUNDS_RESULTS'):
            pathlib.Path(os.environ['CHORUS_BOUNDS_RESULTS']).write_text(json.dumps(record,indent=2)+'\n')

if __name__=='__main__':
    main()

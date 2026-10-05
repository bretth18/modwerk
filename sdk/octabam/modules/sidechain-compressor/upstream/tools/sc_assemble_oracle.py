# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Zac-Kyoti
# Exact sc_assemble function extracted from the pinned standalone builder.
def sc_assemble(tok, org):
    """assemble patch_sc_dsp3.asm at `org`, append the gain/f tables.
    Two passes so the two `move #>table,r1` widths don't shift.
    `tok` is one payload's DSP dict entry (corebase/fcorebase/sbase/fsbase/
    gcnt/gseed/foreign_br -- the cross-core build tokens).
    Returns (words, sctap, scdet, moncommit)."""

    def one(gt, ft):
        src = SC_SRC.read_text().replace('@COREBASE@', tok['corebase']).replace('@FCOREBASE@', tok['fcorebase']).replace('@SBASE@', tok['sbase']).replace('@FSBASE@', tok['fsbase']).replace('@GCNT@', tok['gcnt']).replace('@GSEED@', tok['gseed']).replace('@FOREIGN_BR@', tok['foreign_br']).replace('$fab1e0', f'${gt:x}').replace('@FTAB_R1@', f'move    #>${ft:x},r1').replace('@LPEDGE@', f'${sc_tables.lp_edge():x}').replace('@HPEDGE@', f'${sc_tables.hp_edge():x}').replace('@KGNA@', f'${sc_tables.kgn_smooth_a():x}')
        a = ROOT / 'out/patch_sc_dsp3.asm'
        a.write_text(src)
        o = ROOT / 'out/patch_sc_dsp3.bin'
        r = subprocess.run([str(DSP_ASM), '-in', str(a), '-org', f'{org:x}', '-out', str(o)], capture_output=True, text=True, cwd=ROOT)
        if r.returncode:
            sys.exit(f'dsp_asm failed:\n{r.stdout}\n{r.stderr}')
        raw = o.read_bytes()
        return [int.from_bytes(raw[i:i + 3], 'little') for i in range(0, len(raw), 3)]
    code = one(org, org)
    n = len(code)
    code = one(org + n, org + n + sc_tables.GAIN_N)
    assert len(code) == n, 'cave size shifted between the two sizing passes'
    words = code + sc_tables.gain_table() + sc_tables.flt_table()
    if len(words) > DONOR_WORDS:
        sys.exit(f"cave {len(words)} words > SPRING REVERB donor's {DONOR_WORDS}")
    (ROOT / 'out/patch_sc_dsp3_code.bin').write_bytes(b''.join((w.to_bytes(3, 'little') for w in code)))
    d = subprocess.run([str(DIS), '-in', str(ROOT / 'out/patch_sc_dsp3_code.bin'), '-pc', f'{org:x}', '-le'], capture_output=True, text=True).stdout
    if ' dc ' in d or 'InvalidInstruction' in d or 'mpysu' in d or ('macsu' in d):
        sys.exit(f'cave did not round-trip clean:\n{d}')
    rts = dsp_asm_util.find_rts(d, org)
    return (words, org, org + rts[0] + 1, org + rts[3] + 1)

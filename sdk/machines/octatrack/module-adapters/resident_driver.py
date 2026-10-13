# SPDX-License-Identifier: GPL-3.0-or-later
"""Private frame-driver metadata and exact generated-transport seams.

This does not alter the preserved upstream sources or admit runtime modules.
Apply transport() only after build_core's existing DSP/width substitutions.
"""


def controller_c(prepared):
    lines = ['#include "stock_hook_driver.h"']
    declared = set()
    for row in prepared['receipt']:
        tag = row['tag']
        for fragment in row['packedFragments']:
            symbol = fragment['symbol']
            if symbol not in declared:
                lines.append('extern const uint8_t %s[], %s_end[];' % (symbol, symbol))
                declared.add(symbol)
        lines += ['static const struct mw_hook_fragment fragments_%s[] = {' % tag] + [
            '{%s,%s_end,%du},' % (f['symbol'], f['symbol'], f['authoredBytes']) for f in row['packedFragments']] + ['};']
        lines += ['static const struct mw_hook_record records_%s[] = {' % tag] + [
            '{%du,%su,%du,%du},' % (1 if r['space'] == 'x' else 2, r['address'], r['words'], r['owner'])
            for r in row['records']] + ['};']
    lines += ['const struct mw_hook_boot_core modwerk_hook_boot[2] = {'] + [
        '{fragments_%s,records_%s,%du,%du,%du},' % (r['tag'], r['tag'], len(r['packedFragments']), len(r['records']), r['authoredBytes'])
        for r in prepared['receipt']] + ['};']
    return '\n'.join(lines) + '\n'


def transport(text):
    """Closed op10 CAS and op11 fixed-resource reset, using real frame jobs."""
    def change(old, new):
        nonlocal text
        if text.count(old) != 1:
            raise ValueError('Generated resident transport seam changed: ' + old[:70])
        text = text.replace(old, new)
    change('op!=DL_BASE && op!=DL_PEEK)) return 0;',
           'op!=DL_BASE && op!=DL_PEEK && op!=10u)) return 0;\n'
           '    if(op==10u && (id&~(c ? 5u:7u) || init&~(c ? 5u:7u) || proc)) return 0;')
    change('opcode==DL_BASE || opcode==DL_PEEK || opcode==DL_SUM) {',
           'opcode==DL_BASE || opcode==DL_PEEK || opcode==DL_SUM || opcode==10u) {')
    change('        if(opcode==DL_WRITE) {', '        if(opcode==DL_WRITE || opcode==11u) {')
    change('            t[7]=(uint16_t)j->expected; t[56]=(uint16_t)(j->expected>>16);',
           '            t[7]=(uint16_t)(opcode==11u ? j->id:j->expected); t[56]=(uint16_t)(j->expected>>16);')
    change('int dl_job_status(unsigned c) {', '''/* Fixed feature/logical-offset upload; the DSP maps its owned ranges independently. */
int dl_hook_reset_start(unsigned c,unsigned feature,unsigned offset,unsigned count,const uint32_t *words) {
    unsigned total=feature==1u ? 1042u : feature==2u ? 193u : feature==4u ? 3776u : 0u;
    if(c>1 || jobs[c].state || !total || (c && feature==2u) || !words || !count || count>DL_DATA ||
       offset>=total || count>total-offset || (feature==1u && offset<528u && count>528u-offset)) return 0;
    for(unsigned i=0;i<count;++i) if(words[i]>0xffffffu) return 0;
    jobs[c].upload.words=words; jobs[c].upload.relocations=0; jobs[c].upload.relocation_count=0;
    jobs[c].upload.count=(uint16_t)count; jobs[c].upload.offset=(uint16_t)offset;
    jobs[c].position=0; jobs[c].opcode=11u; jobs[c].id=(uint16_t)feature;
    publish(); jobs[c].state=1; return 1;
}
int dl_job_status(unsigned c) {''')
    return text

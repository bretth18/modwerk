#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Guarded private generation seams for actual dynamic-buffer bookkeeping.

Imported sources stay exact. Apply after the base's DSP/WIDTH edits. The board
policy must bind every effect handle to its actual source/package generation;
this adapter neither admits a module nor assumes head safety from a name.
"""
def buffers(text):
    changes = (
        ('#include "buffers.h"\n', '#include "buffers.h"\n'
         'extern int modwerk_dsp_buffer_permitted(unsigned,unsigned,unsigned,unsigned);\n'),
        ('        if(same && b->live[i]!=DL_BUF_NONE && (reader || !b->known[i])) target[i]=b->live[i];',
         '        if(same && b->live[i]!=DL_BUF_NONE && (reader || !b->known[i])) {\n'
         '            if(reader && !modwerk_dsp_buffer_permitted(dl_buffers_core(i),kind_of(i),b->live[i],ids[i])) return DL_BUF_MEMORY;\n'
         '            target[i]=b->live[i];\n'
         '        }'),
        ('        unsigned free=b->valid[c][k]&~taken&0xfu, n=0;',
         '        unsigned free=b->valid[c][k]&~taken&0xfu, n=0;\n'
         '        for(unsigned block=0;block<DL_BUF_BLOCKS;++block)\n'
         '            if((free>>block&1u) && !modwerk_dsp_buffer_permitted(c,k,block,ids[i])) free&=~(1u<<block);'),
    )
    for old,new in changes:
        if text.count(old)!=1: raise ValueError('Private buffer-placement seam changed; review the source.')
        text=text.replace(old,new)
    return text


def manager(text):
    """All maps need safe instance placement; busy transitions deny a reset.

    Whole-buffer bounds are deliberately conservative. Exact reviewed fixed
    P/X/Y claims are checked separately by the board's private identity registry.
    """
    changes = (
        ('#include "buffers.h"\n', '#include "buffers.h"\n#include "stock_hook_resources.h"\n'
         'int modwerk_stock_hook_export_idle(void);\nint modwerk_saved_set_busy(void);\n'),
        ('int dl_selection_prepare(const struct dl_selection *s,uint32_t token) {\n',
         'int dl_selection_prepare(const struct dl_selection *s,uint32_t token) {\n'
         '    if(!modwerk_stock_hook_export_idle() || modwerk_saved_set_busy()) return DL_SELECT_UNAVAILABLE;\n'),
        ('int dl_publication_prepare(const uint8_t ids[16],const uint8_t sources[8],uint32_t token) {\n',
         'int dl_publication_prepare(const uint8_t ids[16],const uint8_t sources[8],uint32_t token) {\n'
         '    if(!modwerk_stock_hook_export_idle() || modwerk_saved_set_busy()) return DL_SELECT_UNAVAILABLE;\n'),
        ('int dl_move(unsigned c,unsigned p,unsigned offset) {\n',
         'int dl_move(unsigned c,unsigned p,unsigned offset) {\n'
         '    if(!modwerk_stock_hook_export_idle() || modwerk_saved_set_busy()) return 0;\n'),
        ('    if(!phase && queued_token) {',
         '    if(!phase && queued_token && modwerk_stock_hook_export_idle() && !modwerk_saved_set_busy()) {'),
        ('    dl_publication_tick();\n',
         '    if(!modwerk_stock_hook_export_idle() || modwerk_saved_set_busy()) return;\n'
         '    dl_publication_tick();\n'),
        ('        /* The Y buffer plan beside the code plan: both fit, or neither is taken.\n'
         '         * Only under the 16K program map: with stock\'s map every slot keeps\n'
         '         * its stock block, exactly as without this planner. */',
         '        /* Exact-source head/tail leases apply before initialization on\n'
         '         * both maps. Code and whole contiguous rings fit together. */'),
        ('        if(dl_pmap16) {\n', '        { /* Private policy applies to both stock and 16K maps. */\n'),
        ('int dl_publication_idle(void) { return phase==0; }',
         'int dl_hook_buffer_ranges_idle(unsigned feature) {\n'
         '    if(!initialized || phase || waiting || queued_token || buffers.open) return 0;\n'
         '    struct mw_hook_span live[16],target[16]; unsigned nl=0,nt=0;\n'
         '    for(unsigned i=0;i<16;++i) {\n'
         '        unsigned c=dl_buffers_core(i),k=i>=8;\n'
         '        if((buffers.live[i]!=DL_BUF_NONE && buffers.live[i]>=DL_BUF_BLOCKS) || (buffers.target[i]!=DL_BUF_NONE && buffers.target[i]>=DL_BUF_BLOCKS)) return 0;\n'
         '        if(buffers.live[i]!=DL_BUF_NONE) live[nl++]=(struct mw_hook_span){dl_buffers_base(c,k,buffers.live[i]),k ? 16384u : 3072u,(uint8_t)c,MW_HOOK_Y};\n'
         '        if(buffers.target[i]!=DL_BUF_NONE) target[nt++]=(struct mw_hook_span){dl_buffers_base(c,k,buffers.target[i]),k ? 16384u : 3072u,(uint8_t)c,MW_HOOK_Y};\n'
         '    }\n'
         '    return mw_hook_ranges_idle(feature,live,nl,target,nt,3u);\n'
         '}\n'
         'int dl_publication_idle(void) { return phase==0; }'),
    )
    for old,new in changes:
        if text.count(old)!=1: raise ValueError('Private buffer-manager seam changed; review the source.')
        text=text.replace(old,new)
    return text

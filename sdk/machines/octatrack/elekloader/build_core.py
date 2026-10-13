#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Private Modwerk core source recipe; all linking/packing belongs to Elekloader.

No stock bytes or generated packages are committed. No USB or hardware access.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
APP = HERE.parents[3]
VERSION = '0.3.1-modwerk-dev.1'
FIELDS = {'build': 17, 'os': 17, 'modules': 4096, 'configuration': 65,
          'source': 65, 'fx1': 1024, 'fx2': 1024, 'hidden': 1024}
# RAM boot (boot.s): the gate replaces the OS entry's `movea.l #0x48000000,%sp`.
BOOT_GATE = (0x40000412, '2e7c48000000')
# The startup (boot_anim.s) replaces the logo loop's first instructions, `pea -1; clr.l -(%sp)`.
BOOT_LOGO = (0x400559c6, '4878ffff42a7')
OS_FIRST, OS_VEROFF, BOOT_IMAGE_BYTES = 0x4fefffe4, 0xde648, 0x140000  # boot.s, boot.h
BOOT_RESERVE = (0x40a955e0, 0x41495de0)  # boot.s RESERVE_LO/HI: the gate scans only there
# REMIX SWITCH's DSP park (dsp_park.asm, assembled by Octabam's dsp_asm), by
# P address, written into both payloads over dead `jmp *` vectors.
DSP_PARK = {
    0x1e: (0x0bf080, 0x000020),  # jsr >$20, host command $0F's vector
    0x20: (0x330000, 0x08d32c, 0x08d328, 0x08d324, 0x08d320, 0x04d3d5, 0x04d3d7, 0x07b495, 0x000000,
           0x07b497, 0x000000, 0x0a8406, 0x0a8407, 0x0a8426, 0x0444bc, 0x44f400, 0x000034, 0x04c4bc,
           0x000000, 0x000004, 0x05f439, 0x000300, 0x0cc300, 0x000000, 0x084e06, 0x0cc300, 0x000000,
           0x085006, 0x221100, 0x218400, 0x0c0006),
    0x06: (0x06c400, 0x00000a, 0x0cc300, 0x000000, 0x085886, 0x0abd4e, 0x0abe4e, 0x0ae180),
}
# --dsp-loader: Octabam's DSP dynamic loading (dsp_loader.py, dsp.c), unchanged
# but for the seams named in DSP_EDITS, and its ColdFire hooks (address, stock
# SHA-256 as Octabam guards them, label in its hooks.s).
DYNLOAD = APP / 'sdk/octabam/platform/dsp-dynload-transport'
DYNLOAD_SOURCES = ('transfer.c', 'transfer.h', 'allocator.c', 'allocator.h', 'manager.c', 'selection.c', 'selection.h',
                   'buffers.c', 'buffers.h', 'publication.h')
DYNLOAD_HOOKS = (
    (0x40004bc0, 8, '560d267844d7aa23140680beb751fac814290c76527d653fc41fbbb43c830cbf', 'dl_state7'),  # frame DMA: packets to both cores
    (0x400526e4, 8, '3e7c95b32f444fd280cb96b2a6ea90525fe223d6e6b9352086d2cf41941ae854', 'dl_fx1_guard'),
    (0x40052474, 8, '3e7c95b32f444fd280cb96b2a6ea90525fe223d6e6b9352086d2cf41941ae854', 'dl_fx2_guard'),
    (0x4004a8a4, 6, '20577862965e35b56da3cc4660ac5df6a325e455467496552d181b68fff15e2d', 'dl_part_guard'),
    # Modwerk's: core 1's packet right after stock's own push to core 1 (dsp_core1.s), at frame-transfer state 3.
    (0x400049ca, 8, '2945c558a5df272b3fb2ef6df3e3ab594b0c2c162f29c38ba624c3ec610c71f5', 'dl_state3'),
    # Modwerk's: the project's map of module effect handles in project.work (fxmap.s, fxmap.c), beside the
    # seams PLAY MODES and SCALE QUANTIZER patch, so both still install on this base (catalogue_overlaps).
    (0x400866e2, 8, '6b5f250f244620fe2acc97ddca8e7e1fa03b3b7a174ef7dc7bada335f1777378', 'mw_project_begin'),
    (0x40088224, 6, '5cf9e6109ce8cb58a9bf4dc66339e546dd063412195eeb9d8290218748e8fdd2', 'mw_project_line'),
    (0x400888c8, 6, '456d2abcb4566bd836c3fca9361d944909299ab5f3722ff6ec74affc41e77689', 'mw_project_write'),
    (0x4008540e, 6, 'c607734f7f97b4a13e2047f38d5e2feace1aa3018ec9f19742f612139e7ac0bd', 'mw_project_end'),
    # Modwerk's: the shared wide dial for module pages' controls with more than five labels (fxpage.s).
    (0x40047a3c, 6, '9b2c003ba4d776237ad71bef15451bfea4447f2acca77ef6922dcea6ac52ca78', 'mw_wide_dial'),
    # Modwerk's: main's idle spin counts the ColdFire's idle time (status.s, status.c). Its last init call only:
    # stock's spin stays, where ot_emu parks main again after a bench call.
    (0x4001fc96, 6, '2edb8c17ea73bf5ecd097ec929f3bfd6f8a74c81b11080d0d74efd55bec6b416', 'mw_idle'))
# Catalogue modules allowed to patch what this base owns, and why (docs/OCTATRACK_ELEKLOADER_MIGRATION.md).
BASE_OWNS = {'usb-audio-out-tracks-main-cue': 'the base owns the USB configuration',
             'midi-scenes': 'its writes meet Elekloader\'s own sites; it needs a port'}


def catalogue_overlaps(sites):
    """Catalogue modules a site of this base would lock out: each must still install over the stock bytes
    it patches or keeps, beside the base (PLAY MODES once met the project map's seams)."""
    from elekloader.sdk import octabam as port
    ob = port.Octabam(str(APP / 'sdk/octabam'))
    base = [(int(s['addr'], 16), len(bytes.fromhex(s['stock']))) for s in sites]
    found = []
    for name, m in sorted(ob.modules.items()):
        spans = ([(d.site, max(len(d.expect), d.pad_to or 6)) for d in m.detours] + [(p.addr, len(p.expect)) for p in m.pokes] +
                 [(k.addr, len(k.expect)) for k in m.keeps] + [(site, 6) for t in m.tables for site, _ in t.refs])
        if name not in BASE_OWNS and any(a < b + bn and b < a + n for a, n in spans for b, bn in base):
            found.append(name)
    return found


# PROJ's root list: its descriptor (row count at +0), its rows pointer and the four stock rows (Octabam's MAINMENU.md
# sections 1-5). The window is five rows tall and stock fills four: MODWERK is the fifth, as Octabam's BRAIN does.
ROOT_MENU, ROOT_ROWS_POINTER, ROOT_ROWS = 0x400cbd8c, 0x400cbda4, 0x400cc698
ICON_MASK = 0x400cbfc4  # the stock categories' shared second plane
# MODWERK's icon, a module: 19 columns x 8 rows, one long per column, its pixels in the high byte, bit 0 the top row.
ICON = ('.....#...#...#.....',
        '...#############...',
        '...#...........#...',
        '...#.##........#...',
        '...#...........#...',
        '...#...........#...',
        '...#############...',
        '.....#...#...#.....')
# Chip cycles per sample each core's eight FX slots may use (core 0, core 1): 90% of the 4,532-cycle frame less stock's
# own work without effects, measured on the owner's MKII on 11 October 2026 (scripts/octatrack-measure.py: core 0 ~959,
# it mixes; core 1 ~514; one pattern playing). The 90% ceiling is the owner's choice.
DSP_ALLOWANCE = (3120, 3565)
# The dearest stock effect per slot, chip cycles: DJ EQUALIZER, 342 a sample on the same unit (its 331 executed
# instructions in the emulator, stock_dsp_worst.py, run at about one a cycle). Every slot without a module is charged it.
DSP_RESERVE = 342
# Effect ids the base handles (fxids.h MODWERK_FX_IDS; docs/OCTATRACK_MORE_EFFECT_IDS.md). 32 only to bisect.
FX_IDS = 128
VALIDATOR_CLAMPS = (0x400023b6, 0x400023bc, 0x400023de, 0x400023e4)  # the Part validator's moveq #31, FX1 then FX2
FX_WORDS = (FX_IDS + 31) // 32
# Modules installed at once and their memory (loader.h; owner, 12 October 2026: up to 128 modules). About 5 KB a
# module today; the pool is taken from sample memory at boot (core-ot's arena pages), and modset.c keeps a copy of
# the set as staged beside it.
RUNTIME_MODULES = 128
RUNTIME_POOL_BYTES = 768 * 1024
DSP_EDITS = {
    # The FX selectors read their chooser list through these LEA operands, which the chooser composer repoints.
    'selection.c': (('static uint8_t paste[6322]={0};', 'static uint8_t paste[6322]; /* in .bss, which the core clears at boot: '
                     'the image stays under the 1.25 MiB a RAM boot takes */'),
                    ('descriptor=((volatile uint32_t *)(slot ? 0x400d6090u : 0x400d6060u))[s->row];',
                     'descriptor=((volatile uint32_t *)*(volatile uint32_t *)(slot ? 0x40052496u : 0x40052706u))[s->row];'),
                    # An FX pick that meets another slot's transaction waits, the latest per slot, and is replayed
                    # through the stock setter once the manager is idle. A waiting pick names its own track and
                    # chooser row (row bit 15): the panel may have moved on, which used to cancel it.
                    ('static unsigned pending=0, replay=0;',
                     'static unsigned pending=0, replay=0;\n'
                     'static uint8_t later_row[16]; /* per slot: FX1 T1-T8, then FX2 */\n'
                     'static uint32_t later=0, later_bank=0, later_part=0;\n'
                     'volatile uint32_t dl_selection_queued=0;\n'
                     'int dl_publication_idle(void);'),
                    ('    s->track=*(volatile uint8_t *)0x80000000u;\n'
                     '    s->slot=slot; s->source=source;\n'
                     '    s->row=slot>=2 ? row : *(volatile uint32_t *)(slot ? 0x460d5ca8u : 0x460d5c94u);',
                     '    s->track=slot<2 && row ? (row>>8)&7u : *(volatile uint8_t *)0x80000000u;\n'
                     '    s->slot=slot; s->source=source;\n'
                     '    s->row=slot>=2 ? row : row ? row&0xffu : *(volatile uint32_t *)(slot ? 0x460d5ca8u : 0x460d5c94u);'),
                    ('    ((void (*)(void))(slot ? 0x40052474u : 0x400526e4u))();\n}\n#endif',
                     '    /* The setter reads the current track and the chooser\'s cursor: a waiting pick\'s, for the call. */\n'
                     '    volatile uint8_t *track=(volatile uint8_t *)0x80000000u;\n'
                     '    volatile uint32_t *cursor=(volatile uint32_t *)(slot ? 0x460d5ca8u : 0x460d5c94u);\n'
                     '    uint8_t was_track=*track; uint32_t was_row=*cursor;\n'
                     '    if(row) { *track=(uint8_t)((row>>8)&7u); *cursor=row&0xffu; }\n'
                     '    ((void (*)(void))(slot ? 0x40052474u : 0x400526e4u))();\n'
                     '    if(row) { *track=was_track; *cursor=was_row; }\n}\n#endif'),
                    ('    if(pending) {\n        /* A paste',
                     '    if(slot<2) {\n'
                     '        unsigned i=slot*8+request.track;\n'
                     '        later&=~(1u<<i);\n'
                     '        if(pending && (queued.slot!=slot || queued.track!=request.track)) {\n'
                     '            if(request.before[i]==request.target[i]) return 1;\n'
                     '            if(later && (later_bank!=request.bank || later_part!=request.part)) { later=0; ++dl_selection_cancelled; }\n'
                     '            later_bank=request.bank; later_part=request.part;\n'
                     '            later_row[i]=(uint8_t)request.row; later|=1u<<i; ++dl_selection_queued;\n'
                     '            return 2;\n'
                     '        }\n'
                     '    }\n'
                     '    if(pending) {\n        /* A paste'),
                    ('void dl_selection_tick(void) {\n    struct dl_selection current;\n    if(!pending) return;\n'
                     '    if(!dl_selection_capture(queued.slot,queued.row,queued.source,&current)',
                     '/* The next waiting FX pick, through its stock setter and guard as the panel made it; a bank or\n'
                     ' * Part change drops them (they edited the Part that was active). */\n'
                     'static void next(void) {\n'
                     '    if(!later) return;\n'
                     '    if(*(volatile uint32_t *)0x46c82456u!=later_bank || *(volatile uint8_t *)0x80000003u!=later_part) {\n'
                     '        later=0; ++dl_selection_cancelled; return;\n'
                     '    }\n'
                     '    if(!dl_publication_idle()) return;\n'
                     '    unsigned i=0;\n'
                     '    while(!(later>>i&1u)) ++i;\n'
                     '    later&=~(1u<<i);\n'
                     '    dl_selection_apply(i/8,0x8000u|(i&7u)<<8|later_row[i],0);\n'
                     '}\n'
                     'void dl_selection_tick(void) {\n    struct dl_selection current;\n    if(!pending) { next(); return; }\n'
                     '    unsigned given=queued.slot<2 ? 0x8000u|queued.track<<8|queued.row : queued.row;\n'
                     '    if(!dl_selection_capture(queued.slot,given,queued.source,&current)'),
                    ('    replay=1; dl_selection_apply(queued.slot,queued.row,queued.source); replay=0;',
                     '    replay=1; dl_selection_apply(queued.slot,given,queued.source); replay=0;')),
    # Modules register effects at run time (dsp.c), and admission charges their cycles.
    'manager.c': (('extern const struct dl_package dl_catalog[32];', 'extern struct dl_package dl_catalog[32];'),
                  # A moved package (dl_move) uploads its new copy and binds it like a new one; its old copy stays live
                  # and bound until the bind, and is freed at the retirement.
                  ('    return allocator.target[c][p].present && !allocator.live[c][p].present;\n}',
                   '    return allocator.target[c][p].present && (!allocator.live[c][p].present ||\n'
                   '           allocator.target[c][p].offset!=allocator.live[c][p].offset);\n}'),
                  ('void dl_selection_commit(uint32_t token) {',
                   '/* Modwerk (dsp.c\'s compaction): p\'s code on core c to `offset` while it runs; only when idle. */\n'
                   'int dl_move(unsigned c,unsigned p,unsigned offset) {\n'
                   '    if(phase || !initialized || !dl_residency_enabled) return 0;\n'
                   '    uint32_t token=auto_serial+1; if(!token) token=0x80000000u;\n'
                   '    if(dl_allocator_move(&allocator,c,p,offset,token)!=DL_ALLOC_OK) return 0;\n'
                   '    auto_serial=token; begin(allocator.active,token,1); phase=2; /* placed: upload, bind, commit, free */\n'
                   '    return 1;\n'
                   '}\n'
                   'void dl_selection_commit(uint32_t token) {'),
                  # A core's channel held by another job (status.c's meter reads, dsp.c's probes) is a wait, not a
                  # refusal: the next tick tries again. Only a start the transfer layer refused outright refuses.
                  ('        if(!waiting) { report(DL_SELECT_UNAVAILABLE); if(phase==8) { cancelling=1; phase=7; cursor=0; } }',
                   '        if(!waiting && dl_job_status((unsigned)i/8)==-2) { report(DL_SELECT_UNAVAILABLE); if(phase==8) { cancelling=1; phase=7; cursor=0; } }'),
                  ('        if(!waiting) { report(DL_SELECT_UNAVAILABLE); cancelling=1; }',
                   '        if(!waiting && dl_job_status(c)==-2) { report(DL_SELECT_UNAVAILABLE); cancelling=1; }'),
                  # status.c: the delay-buffer blocks each core's slots hold, FX1 and FX2 (core 0 bits 0-7, core 1 8-15).
                  ('static struct dl_buffers buffers={0};',
                   'static struct dl_buffers buffers={0};\n'
                   'uint32_t dl_buffers_in_use(void) {\n'
                   '    uint32_t m=0;\n'
                   '    for(unsigned i=0;i<16;++i) {\n'
                   '        if(buffers.live[i]!=DL_BUF_NONE) m|=1u<<(buffers.live[i]+((i&7)<4 ? 8u : 0u)+(i>=8 ? 4u : 0u));\n'
                   '    }\n'
                   '    return m;\n'
                   '}'),
                  ('extern const struct code dl_codes[2][32];', 'extern struct code dl_codes[2][32];'),
                  ('dl_allocator_init(&allocator,dl_catalog,0,0,0,0);',
                   'dl_allocator_init(&allocator,dl_catalog,0,0,MODWERK_DSP_ALLOWANCE0,MODWERK_DSP_ALLOWANCE1);'),
                  # A module installed while tracks name its effect: observe afresh and park those slots until bound.
                  ('int dl_publication_idle(void) { return phase==0; }',
                   'int dl_publication_idle(void) { return phase==0; }\n'
                   'void dl_residency_nudge(void) { observed_valid=0; for(unsigned i=0;i<16;++i) last[i]=255; }\n'
                   '/* Modwerk diagnostics (dsp.c\'s report): phase | cursor << 8 | waiting << 16 | result << 24 */\n'
                   'uint32_t dl_manager_state(void) { return phase|cursor<<8|waiting<<16|(uint32_t)(result&0xff)<<24; }\n'
                   '#ifndef DL_NATIVE_TEST\n/* Modwerk\'s self-test (dsp.c): a slot on core c running id p runs bound code. */\n'
                   'int dl_bound(unsigned c,unsigned p) { return c<2 && p<32 && slot_bound(c,p); }\n#endif\n'
                   '/* ... and where p\'s code sits on core c: its table offset, -1 when it is not placed. */\n'
                   'int dl_placed(unsigned c,unsigned p) { return c<2 && p<32 && allocator.live[c][p].present ? (int)(DL_CODE_START+allocator.live[c][p].offset) : -1; }\n'
                   '/* ... in an arena of this many words (0 until its core answered a probe). */\n'
                   'unsigned dl_arena(unsigned c) { return c<2 ? allocator.capacity[c] : 0; }'),
                  # dsp.c's self-test places effects by the live array alone: what it holds there is what a parked
                  # slot waits for, not the Part's byte (else the slot is let go to NONE and never loads).
                  ('static unsigned intended(unsigned i) {\n',
                   'volatile uint8_t dl_intended_override[16]={255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255};\n'
                   'static unsigned intended(unsigned i) {\n    if(dl_intended_override[i]!=255) return dl_intended_override[i];\n'),
                  # A pick made while the manager runs its own transaction waits its turn instead of being refused.
                  ('static void advance(void) {\n    if(!phase) return;',
                   'static uint8_t queued_ids[16]={0};\nstatic uint32_t queued_token=0;\n'
                   'static void advance(void) {\n'
                   '    if(!phase && queued_token) { uint32_t t=queued_token; queued_token=0; begin(queued_ids,t,0); }\n'
                   '    if(!phase) return;'),
                  # What needs no DSP job (a Part change within the preloaded set) is ready at once, so the
                  # stock Part change runs in the same tick, as on stock.
                  ('    if(phase) return DL_SELECT_UNAVAILABLE;\n'
                   '    for(unsigned i=0;i<8;++i) if(s->target_source[i]>4) return DL_SELECT_UNAVAILABLE;\n'
                   '    begin(s->target,token,0); advance(); return result;',
                   '    for(unsigned i=0;i<8;++i) if(s->target_source[i]>4) return DL_SELECT_UNAVAILABLE;\n'
                   '    if(phase) { bytes(queued_ids,s->target,16); queued_token=token; return DL_SELECT_WAIT; }\n'
                   '    begin(s->target,token,0);\n'
                   '    for(unsigned n=0;n<4 && phase && phase!=5 && !waiting;++n) advance();\n'
                   '    return result;'),
                  # Preload the union of the bank's Parts: every transaction also holds the effects the four Parts
                  # name (allocator.c's keep), so a Part change only flips dispatch, and the observer reloads when
                  # that changes (a project or bank load, a Part edit). Modules are kept firmly; the bank's stock
                  # effects too while they fit, else they load as a Part selects them (a Part change then waits
                  # for an upload: COMPRESSOR, 9 packets, on the unit, 11 October 2026). Memory is admitted over
                  # the union, cycles over the target, which is one Part.
                  ('static unsigned observed_valid=0;',
                   'static unsigned observed_valid=0;\nstatic uint32_t observed_held[2]={0,0}; /* parts() when last observed */'),
                  ('static unsigned needed(unsigned index,unsigned mode) {',
                   '/* What the current bank\'s four Parts name, per core: modules (keep), stock effects loaded on demand\n'
                   ' * (soft), and the modules ids names (named). A pattern queued from another bank adds the Part it will\n'
                   ' * play: queued bank and pattern 0x800065bf/c0, equal to the current ones when nothing waits; its Part,\n'
                   ' * bank + pattern * 0x8ed8 + 0x8e57 (Octabam PARTS.md). */\n'
                   'extern const uint32_t modwerk_dsp_modules;\n'
                   'static void parts(const uint8_t ids[16],uint32_t keep[2],uint32_t named[2],uint32_t soft[2]) {\n'
                   '    uint32_t bank=*(volatile uint32_t *)0x46c82456u;\n'
                   '    keep[0]=keep[1]=named[0]=named[1]=soft[0]=soft[1]=0;\n'
                   '    unsigned qb=*(volatile uint8_t *)0x800065bfu,qp=*(volatile uint8_t *)0x800065c0u,qpart=4u;\n'
                   '    uint32_t queued=0x400e21e0u+qb*0x9b340u;\n'
                   '    if(bank && qb<16u && qp<16u && queued!=bank) qpart=*(volatile uint8_t *)(uintptr_t)(queued+qp*0x8ed8u+0x8e57u);\n'
                   '    for(unsigned n=0;n<6;++n) for(unsigned i=0;i<16;++i) {\n'
                   '        unsigned p=n==4 ? ids[i] : n==5 ? (qpart<4u ? *(volatile uint8_t *)(uintptr_t)(queued+0x8ed80u+qpart*6322u+i) : 255u)\n'
                   '                 : bank ? *(volatile uint8_t *)(uintptr_t)(bank+0x8ed80u+n*6322u+i) : 255u;\n'
                   '        if(p>=32 || dl_catalog[p].resident || !(dl_catalog[p].slots&(i<8 ? 1u:2u))) continue;\n'
                   '        if(!(modwerk_dsp_modules>>p&1u)) { if(n!=4) soft[(i&7)<4 ? 1:0]|=1u<<p; continue; }\n'
                   '        (n==4 ? named : keep)[(i&7)<4 ? 1:0]|=1u<<p;\n'
                   '    }\n'
                   '}\n'
                   'static unsigned needed(unsigned index,unsigned mode) {'),
                  # A target naming a module no Part holds yet must fit beside all of them; anything else that does
                  # not (a bank that never fitted) falls back to loading what it runs.
                  ('        int r=dl_allocator_prepare(&allocator,desired,current);\n',
                   '        uint32_t named[2],soft[2];\n'
                   '        parts(desired,allocator.keep,named,soft);\n'
                   '        uint32_t firm[2]={allocator.keep[0],allocator.keep[1]};\n'
                   '        allocator.keep[0]|=soft[0]; allocator.keep[1]|=soft[1];\n'
                   '        int r=dl_allocator_prepare(&allocator,desired,current);\n'
                   '        if((r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (soft[0]|soft[1])) {\n'
                   '            allocator.keep[0]=firm[0]; allocator.keep[1]=firm[1];\n'
                   '            r=dl_allocator_prepare(&allocator,desired,current);\n'
                   '        }\n'
                   '        if((r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (allocator.keep[0]|allocator.keep[1]) &&\n'
                   '           (automatic || !((named[0]&~allocator.keep[0])|(named[1]&~allocator.keep[1])))) {\n'
                   '            allocator.keep[0]=allocator.keep[1]=0;\n'
                   '            r=dl_allocator_prepare(&allocator,desired,current);\n'
                   '        }\n'),
                  ('    for(unsigned i=0;i<16;++i) if(ids[i]!=observed[i]) changed=1;\n    if(!changed) return;',
                   '    for(unsigned i=0;i<16;++i) if(ids[i]!=observed[i]) changed=1;\n'
                   '    uint32_t held[2],named[2],soft[2];\n'
                   '    parts(ids,held,named,soft);\n'
                   '    held[0]|=soft[0]; held[1]|=soft[1];\n'
                   '    if(held[0]!=observed_held[0] || held[1]!=observed_held[1]) changed=1;\n'
                   '    observed_held[0]=held[0]; observed_held[1]=held[1];\n'
                   '    if(!changed) return;'),
                  ('    if(token!=current) return DL_SELECT_UNAVAILABLE;\n    advance(); return result;',
                   '    if(token!=current && token!=queued_token) return DL_SELECT_UNAVAILABLE;\n'
                   '    advance(); return token==current ? result : DL_SELECT_WAIT;'),
                  ('void dl_selection_cancel(uint32_t token) { if(token==current && phase && phase!=6) rollback(); }',
                   'void dl_selection_cancel(uint32_t token) {\n'
                   '    if(token==queued_token) queued_token=0;\n'
                   '    else if(token==current && phase && phase!=6) rollback();\n}')),
    # The switch frame runs the outgoing effect's first sub-block, then the incoming one's init and its
    # second: no instance runs twice, so no overlap charge (it would refuse stock picks beside modules).
    'allocator.c': (('    uint32_t steady[2]={0,0},overlap[2]={0,0};', '    uint32_t steady[2]={0,0};'),
                    ('    overlap[0]=steady[0]; overlap[1]=steady[1];\n'
                     '    for(unsigned i=0;i<16;++i) {\n'
                     '        unsigned p=a->active[i],c=core_of(i);\n'
                     '        if(p==DL_NONE || p==ids[i]) continue;\n'
                     '        uint32_t cost=a->catalog[p].cycles;\n'
                     '        if(cost>a->allowance[c]-overlap[c]) return DL_ALLOC_CYCLES;\n'
                     '        overlap[c]+=cost;\n'
                     '    }\n', ''),
                    # Place what keep holds on a core after the target's own ids (manager.c's union of Parts).
                    ('    for(unsigned i=0;i<16;++i) {\n'
                     '        unsigned p=ids[i];\n'
                     '        if(core_of(i)!=c || p==DL_NONE || a->catalog[p].resident || a->target[c][p].present) continue;',
                     '    for(unsigned i=0;i<16+DL_PACKAGES;++i) {\n'
                     '        unsigned p=i<16 ? (core_of(i)==c ? ids[i] : DL_NONE) : (a->keep[c]>>(i-16)&1u ? i-16 : DL_NONE);\n'
                     '        if(p==DL_NONE || a->catalog[p].resident || a->target[c][p].present) continue;'),
                    # A big package (a quarter of the arena or more) goes as high as it fits, the rest as low: a hole
                    # left under a big one could never close once the core's free words are fewer than its own (dsp.c's
                    # compaction moves code by copying it whole).
                    ('        uint32_t base=0,align=pkg->alignment;\n        for(;;) {',
                     '        uint32_t base=0,align=pkg->alignment;\n'
                     '        if(pkg->words*4u>=a->capacity[c]) {\n'
                     '            if(pkg->words>a->capacity[c]) return DL_ALLOC_MEMORY;\n'
                     '            for(base=(a->capacity[c]-pkg->words)&~(align-1);;) {\n'
                     '                unsigned moved=0;\n'
                     '                for(unsigned j=0;j<n && !moved;++j)\n'
                     '                    if(base<(uint32_t)used[j].offset+used[j].words && base+pkg->words>used[j].offset) {\n'
                     '                        if(used[j].offset<pkg->words) return DL_ALLOC_MEMORY;\n'
                     '                        base=(used[j].offset-pkg->words)&~(align-1); moved=1;\n'
                     '                    }\n'
                     '                if(!moved) break;\n'
                     '            }\n'
                     '        } else for(;;) {'),
                    # Compaction without a gap (owner, 11 October 2026): one live package gets a new copy at `offset`,
                    # uploaded and bound while the old one runs, then the old is freed; never over live code.
                    ('int dl_allocator_cancel(struct dl_allocator *a,uint32_t token) {',
                     '/* Modwerk: one live package to `offset` on core c, everything else where it is: a new copy, uploaded\n'
                     ' * and bound while the old one runs, then freed (dsp.c). Never over live code, its own old copy included. */\n'
                     'int dl_allocator_move(struct dl_allocator *a,unsigned c,unsigned p,unsigned offset,uint32_t token) {\n'
                     '    if(a->phase || !token || token==a->token || c>1 || p>=DL_PACKAGES || !a->live[c][p].present) return DL_ALLOC_STALE;\n'
                     '    unsigned n=a->live[c][p].words,align=a->catalog[p].alignment;\n'
                     '    if(!align || (offset&(align-1)) || offset+n>a->capacity[c]) return DL_ALLOC_MEMORY;\n'
                     '    for(unsigned q=0;q<DL_PACKAGES;++q)\n'
                     '        if(a->live[c][q].present && offset<(unsigned)a->live[c][q].offset+a->live[c][q].words &&\n'
                     '           offset+n>a->live[c][q].offset) return DL_ALLOC_TRANSITION;\n'
                     '    copy(a->target,a->live,sizeof a->target);\n'
                     '    a->target[c][p].offset=(uint16_t)offset;\n'
                     '    copy(a->requested,a->active,16); a->token=token; a->ready=0; a->required=(uint8_t)(1u<<c); a->phase=1;\n'
                     '    return DL_ALLOC_OK;\n'
                     '}\n'
                     'int dl_allocator_cancel(struct dl_allocator *a,uint32_t token) {')),
    'allocator.h': (('int dl_allocator_cancel(struct dl_allocator *,uint32_t token);',
                     'int dl_allocator_cancel(struct dl_allocator *,uint32_t token);\n'
                     'int dl_allocator_move(struct dl_allocator *,unsigned core,unsigned p,unsigned offset,uint32_t token);'),
                    ('    uint8_t phase, required, ready;\n};',
                     '    uint8_t phase, required, ready;\n'
                     '    uint32_t keep[2]; /* Modwerk: more ids to place per core, beside the target\'s own */\n};'),),
    # No reads from a DSP (dsp_receiver.asm says why): the receiver answers in the host flags, an upload
    # carries its sum for the receiver to check, and each core's table is the build's (dsp_loader.py).
    # eDMA channel 0 keeps stock's ATTR, which reads its source in 16-byte bursts: an unaligned source
    # stops the channel at its start with a source address error (the probe-A freeze, 10 October 2026).
    # PEEK (8, dsp_receiver.asm): one bit of a DSP P word per packet, its answer HF3; dsp.c reads the
    # receiver's mismatch record with it. Its refusals are bits, so they count neither as rejects nor errors.
    'transfer.h': (('DL_BYPASS=6, DL_BASE=7 };', 'DL_BYPASS=6, DL_BASE=7, DL_PEEK=8, DL_SUM=9 };'),),
    'transfer.c': (('op!=DL_BYPASS && op!=DL_BASE)) return 0;', 'op!=DL_BYPASS && op!=DL_BASE && op!=DL_PEEK)) return 0;'),
                   # A refusal for cycles reads as the DSP being full, not failing (owner, 11 October 2026).
                   ('reason==3 ? "DSP OVERLOAD"', 'reason==3 ? "DSP FULL"'),
                   ('opcode==DL_BYPASS || opcode==DL_BASE) {', 'opcode==DL_BYPASS || opcode==DL_BASE || opcode==DL_PEEK || opcode==DL_SUM) {'),
                   # SUM (9, dsp_receiver.asm; dsp.c's self-test): the expected sum's high byte in word 56, as a WRITE's.
                   ('            t[4]=j->id; t[5]=j->init; t[7]=j->proc;\n',
                    '            t[4]=j->id; t[5]=j->init; t[7]=j->proc;\n            if(opcode==DL_SUM) t[56]=(uint16_t)(j->expected>>16);\n'),
                   ('int dl_job_status(unsigned c) {',
                    '/* Modwerk: does the code at table offset `offset` sum, over `count` words (1-256), to `expected`? */\n'
                    'int dl_sum_start(unsigned c,unsigned offset,unsigned count,uint32_t expected) {\n'
                    '    if(c>1 || jobs[c].state || !count || count>256 || offset<DL_CODE_START || offset+count>dl_pool_words[c]) return 0;\n'
                    '    jobs[c].opcode=DL_SUM; jobs[c].id=(uint16_t)count; jobs[c].init=(uint16_t)offset;\n'
                    '    jobs[c].proc=(uint16_t)expected; jobs[c].expected=expected&0xffffffu;\n'
                    '    publish(); jobs[c].state=1; return 1;\n}\n'
                    'int dl_job_status(unsigned c) {'),
                   # The longest time between two frames, DTCN3 counts (132 MHz): the self-test's frame-timing check.
                   ('unsigned dl_frame(void) {\n    ++dl_frames;',
                    'volatile uint32_t dl_frame_gap=0;\nstatic uint32_t frame_at=0;\n'
                    'unsigned dl_frame(void) {\n'
                    '    { uint32_t now=*(volatile uint32_t *)0xfc07c00cu, d=now-frame_at; frame_at=now; if(d>dl_frame_gap) dl_frame_gap=d; }\n'
                    '    ++dl_frames;'),
                   ('volatile uint16_t dl_tx[2][DL_WORDS]={{0}}, dl_rx[2][32]={{0}};',
                    'volatile uint16_t dl_tx[2][DL_WORDS] __attribute__((aligned(16)))={{0}}, '
                    'dl_rx[2][32] __attribute__((aligned(16)))={{0}};'),
                   ('static uint32_t requests=0, stages=0;',
                    'static uint32_t requests=0, stages=0;\n'
                    'unsigned modwerk_dsp_flags(unsigned core); /* dsp.c: HF2 (handled, toggles) | HF3 (refused) << 1 */\n'
                    'static unsigned flags_sent[2]={0,0};'),
                   ('volatile uint32_t dl_pool_base[2]={0,0}, dl_pool_words[2]={0,0};',
                    'volatile uint32_t dl_pool_base[2]={MODWERK_DSP_TABLE0,MODWERK_DSP_TABLE1}, '
                    'dl_pool_words[2]={MODWERK_DSP_WORDS0,MODWERK_DSP_WORDS1};'),
                   ('                j->expected=(j->expected+value)&0xffffffu;\n            }\n',
                    '                j->expected=(j->expected+value)&0xffffffu;\n            }\n'
                    '            t[7]=(uint16_t)j->expected; t[56]=(uint16_t)(j->expected>>16);\n'),
                   # Development (dev.c request 19): a finished PEEK goes again at once, from the frame interrupt, so
                   # a fault that takes one packet in thousands shows in seconds (the DSP stalls of 11 October 2026).
                   ('                pending[c]=0;\n                UNCACHED(dl_tx[c])[0]=0;\n            } else if',
                    '                pending[c]=0;\n                UNCACHED(dl_tx[c])[0]=0;\n'
                    '                if(dl_storm && jobs[c].state==3 && jobs[c].opcode==DL_PEEK) { jobs[c].state=1; ++dl_storm_sent; }\n'
                    '            } else if'),
                   ('volatile uint32_t dl_request_probe=0,', 'volatile uint32_t dl_storm=0, dl_storm_sent=0;\nvolatile uint32_t dl_request_probe=0,'),
                   ('    pending[c]=sequence[c]; age[c]=0;',
                    '    pending[c]=sequence[c]; age[c]=0; flags_sent[c]=modwerk_dsp_flags(c);'),
                   ('        volatile uint16_t *r=UNCACHED(dl_rx[c]);\n', ''),
                   ('            if(r[0]==DL_ACK && r[1]==pending[c]) {\n'
                    '                unsigned valid=r[2]==0 && r[3]==c;\n'
                    '                if(jobs[c].state==2 && jobs[c].opcode==DL_WRITE)\n'
                    '                    valid=valid && (((uint32_t)r[5]<<16)|r[4])==jobs[c].expected;\n'
                    '                if(valid) {\n'
                    '                    ++dl_accepted[c];\n'
                    '                    if(r[6] && r[7]>DL_CODE_START && r[6]+r[7]<=DL_POOL_LIMIT) {\n'
                    '                        dl_pool_words[c]=r[7]; dl_pool_base[c]=r[6];\n'
                    '                    }\n'
                    '                } else',
                    '            unsigned flags=modwerk_dsp_flags(c);\n'
                    '            if((flags^flags_sent[c])&1u) {\n'
                    '                unsigned valid=!(flags&2u);\n'
                    '                if(jobs[c].state==2 && (jobs[c].opcode==DL_PEEK || jobs[c].opcode==DL_SUM)) {}\n'
                    '                else if(valid) ++dl_accepted[c];\n'
                    '                else'),
                   ('        dl_show_message(text,0x30);\n    }\n}\n',
                    '        dl_show_message(text,0x30);\n    }\n}\n'
                    '/* Modwerk: the watchdog (dsp.c) gives up what is in flight, as a timeout would. */\n'
                    'void dl_abort(void) {\n'
                    '    for(unsigned c=0;c<2;++c) if(pending[c] || jobs[c].state==2) {\n'
                    '        ++dl_errors; pending[c]=0; UNCACHED(dl_tx[c])[0]=0;\n'
                    '        if(jobs[c].state==2) jobs[c].state=4;\n'
                    '    }\n'
                    '}\n')),
    # Writes only: no read phases, no write to a core with no packet waiting, and at state 7 core 0's
    # packet only: core 1's goes right after stock's own push to core 1 (dsp_core1.s, hardware 10 Oct 2026).
    # Measured: EPORT pin 1 is core 0's host request, which its next frame's bank word raises. dl_pin7 counts
    # frames whose state 7 saw it high; dl_straddle counts packets during which it changed (the frame began
    # while the packet was written, so the receiver may read a torn one).
    'hooks.s': (('        .global dl_state7, dl_tick', '        .global dl_state7, dl_tick, dl_phase, dl_rx_nbytes, dl_early, dl_pin7, dl_straddle'),
                ('dl_rx_nbytes: .long 0\n', 'dl_rx_nbytes: .long 0\ndl_early: .long 0     | state-7 visits with channel 0 still running\n'
                 'dl_pin7: .long 0\ndl_straddle: .long 0\ndl_pin_sent: .long 0  | 4 | pin 1 when a packet started, 0 none\n'),
                ('        jsr dl_frame\n', '        move.b 0xfc094005,%d0\n        btst #1,%d0\n        beq 1f\n        addq.l #1,dl_pin7\n'
                 '1:\n        jsr dl_frame\n'),
                ('dl_complete:\n', 'dl_complete:\n        move.l dl_pin_sent,%d0\n        beq 1f\n        clr.l dl_pin_sent\n'
                 '        move.b 0xfc094005,%d1\n        andi.l #2,%d1\n        addq.l #4,%d1\n        cmp.l %d0,%d1\n        beq 1f\n'
                 '        addq.l #1,dl_straddle\n1:\n'),
                ('        cmpi.l #3,%d2\n        bcs dl_write\n        cmpi.l #5,%d2\n        bcs dl_read\n',
                 '        cmpi.l #2,%d2           | phase 1, core 0, only\n        bcs dl_write\n'),
                ('dl_write:\n        subq.l #1,%d2\n',
                 'dl_write:\n        subq.l #1,%d2\n'
                 '        move.l %d2,%d0\n'
                 '        lsl.l #7,%d0\n'
                 '        lea dl_tx,%a0\n'
                 '        adda.l #UNCACHED,%a0\n'
                 '        tst.w (%a0,%d0.l)\n'
                 '        bne dl_send\n'
                 '        move.l dl_phase,%d2\n'
                 '        bra dl_next\n'
                 'dl_send:\n'
                 '        move.b 0xfc094005,%d0\n'
                 '        andi.l #2,%d0\n'
                 '        addq.l #4,%d0\n'
                 '        move.l %d0,dl_pin_sent\n')),
}
# The state-7 entry (build_core.py --dsp-hook). Stock can visit state 7 while its last
# transfer still runs on eDMA channel 0: in state 5 it starts state 6's transfer inline,
# and the stale completion of state 5 then dispatches state 7 early. Stock's state 7 only
# unmasks, so that is harmless to stock, but a packet started then rewrites channel 0 and
# the host port under stock's transfer (the probe-A freeze, 10 October 2026, inferred).
# A start not yet taken up (START) or a minor loop running (ACTIVE) counts as running too.
# Both count those visits (dl_early). guard: such a visit only unmasks, as stock's does,
# and the packet goes at the next visit. usbin: Octabam's USB AUDIO IN entry (no channel-1
# acknowledge, no channel-1 NBYTES save), unguarded, for comparison on the unit.
STATE7_ENTRY = ('        moveq #1,%d0\n'
                '        move.b %d0,0xfc04401c   | acknowledge our channel-1 completion too\n'
                '        move.l dl_phase,%d2\n'
                '        bne dl_next\n')
GUARD_ENTRY = ((STATE7_ENTRY,
               '        moveq #1,%d0\n'
               '        move.b %d0,0xfc04401c   | acknowledge our channel-1 completion too\n'
               '        move.w 0xfc04501e,%d0   | TCD0 CSR: idle is DONE (bit 7), not ACTIVE (6), no START (0)\n'
               '        andi.l #0xc1,%d0\n'
               '        cmpi.l #0x80,%d0\n'
               '        beq dl_idle\n'
               '        addq.l #1,dl_early\n'
               '        move.l dl_phase,%d2\n'
               '        bne dl_return           | our own transfer still runs: its completion comes\n'
               '        movem.l (%sp),%d2-%d7/%a2-%a6\n'
               '        lea 44(%sp),%sp\n'
               '        moveq #1,%d1\n'
               '        move.b %d1,0xfc04801d   | what stock\'s early visit does\n'
               '        jmp DONE\n'
               'dl_idle:\n'
               '        move.l dl_phase,%d2\n'
               '        bne dl_next\n'),)
# Hardware bisect of the probe-A freeze (10 October 2026), each guard plus one change:
# pretend: the packet is built and its job runs, but nothing touches eDMA or the host port;
# noflags: real delivery, the host flags never read; long: 96 halfwords, USB AUDIO IN AB's length.
# The effect id width (docs/OCTATRACK_MORE_EFFECT_IDS.md, step 3): Octabam's transport sized and bounded by the base's
# MODWERK_FX_IDS (fxids.h) instead of 32, its id masks as id sets. Applied after DSP_EDITS, to the text they leave.
WIDTH_EDITS = {
    'allocator.h': (('#include <stdint.h>\n#define DL_PACKAGES 32\n',
                     '#include <stdint.h>\n#include "fxids.h"\n#define DL_PACKAGES MODWERK_FX_IDS /* Modwerk: the base\'s effect ids */\n'),
                    ('    uint32_t keep[2]; /* Modwerk: more ids to place per core, beside the target\'s own */',
                     '    fx_set keep[2]; /* Modwerk: more ids to place per core, beside the target\'s own */')),
    'allocator.c': (('(a->keep[c]>>(i-16)&1u ? i-16 : DL_NONE)', '(fx_in(a->keep[c],i-16) ? i-16 : DL_NONE)'),),
    'transfer.h': (('#include <stdint.h>\n#define DL_WORDS 64\n', '#include <stdint.h>\n#include "fxids.h"\n#define DL_WORDS 64\n'),),
    'transfer.c': (('    if(c>1 || jobs[c].state || id>=32 ||', '    if(c>1 || jobs[c].state || id>=MODWERK_FX_IDS ||'),),
    'selection.c': (('s->track>7 || s->row>=32 || !s->bank) return 0;', 's->track>7 || s->row>=MODWERK_LIST_ROWS || !s->bank) return 0;'),
                    ('        if(id>31) return 0;', '        if(id>=MODWERK_FX_IDS) return 0;')),
    'buffers.h': (('#include <stdint.h>\n', '#include <stdint.h>\n#include "fxids.h"\n'),
                  ('                       const uint8_t reads[32]);', '                       const uint8_t reads[MODWERK_FX_IDS]);')),
    'buffers.c': (('                       const uint8_t reads[32]) {', '                       const uint8_t reads[MODWERK_FX_IDS]) {'),
                  ('!(running[i]<32 && reads[running[i]])', '!(running[i]<MODWERK_FX_IDS && reads[running[i]])'),
                  ('        unsigned reader=ids[i]<32 && reads[ids[i]];\n        unsigned same=',
                   '        unsigned reader=ids[i]<MODWERK_FX_IDS && reads[ids[i]];\n        unsigned same='),
                  ('        unsigned reader=ids[i]<32 && reads[ids[i]];\n        if(!reader',
                   '        unsigned reader=ids[i]<MODWERK_FX_IDS && reads[ids[i]];\n        if(!reader')),
    'manager.c': (
        ('extern struct dl_package dl_catalog[32];', 'extern struct dl_package dl_catalog[DL_PACKAGES];'),
        ('extern struct code dl_codes[2][32];', 'extern struct code dl_codes[2][DL_PACKAGES];'),
        ('static uint32_t observed_held[2]={0,0};', 'static fx_set observed_held[2];'),
        ('static uint32_t stubbed[2]={0,0};', 'static fx_set stubbed[2];'),
        ('extern const uint32_t dl_stub_at_boot;', 'extern const fx_set dl_stub_at_boot;'),
        ('        for(unsigned p=0;p<32;++p) if(allocator.live[c][p].present) words+=allocator.live[c][p].words;',
         '        for(unsigned p=0;p<DL_PACKAGES;++p) if(allocator.live[c][p].present) words+=allocator.live[c][p].words;'),
        ('extern const uint32_t modwerk_dsp_modules;\nstatic void parts(const uint8_t ids[16],uint32_t keep[2],uint32_t named[2],uint32_t soft[2]) {',
         'static void parts(const uint8_t ids[16],fx_set keep[2],fx_set named[2],fx_set soft[2]) {'),
        ('    keep[0]=keep[1]=named[0]=named[1]=soft[0]=soft[1]=0;',
         '    for(unsigned c=0;c<2;++c) keep[c]=named[c]=soft[c]=(fx_set){{0}};'),
        ('        if(p>=32 || dl_catalog[p].resident || !(dl_catalog[p].slots&(i<8 ? 1u:2u))) continue;\n'
         '        if(!(modwerk_dsp_modules>>p&1u)) { if(n!=4) soft[(i&7)<4 ? 1:0]|=1u<<p; continue; }\n'
         '        (n==4 ? named : keep)[(i&7)<4 ? 1:0]|=1u<<p;',
         '        if(p>=DL_PACKAGES || dl_catalog[p].resident || !(dl_catalog[p].slots&(i<8 ? 1u:2u))) continue;\n'
         '        unsigned k=(i&7)<4 ? 1:0;\n'
         '        if(!fx_in(modwerk_fx_modules,p)) { if(n!=4) soft[k]=fx_with(soft[k],p); continue; }\n'
         '        if(n==4) named[k]=fx_with(named[k],p); else keep[k]=fx_with(keep[k],p);'),
        ('    unsigned c=index/32,p=index%32;\n    if(mode==6)', '    unsigned c=index/DL_PACKAGES,p=index%DL_PACKAGES;\n    if(mode==6)'),
        ('!allocator.live[c][p].present && !((stubbed[c]>>p)&1u);', '!allocator.live[c][p].present && !fx_in(stubbed[c],p);'),
        ('            if(desired[i]<32 && !dl_catalog[desired[i]].resident) probe=1;',
         '            if(desired[i]<DL_PACKAGES && !dl_catalog[desired[i]].resident) probe=1;'),
        ('        uint32_t named[2],soft[2];\n        parts(desired,allocator.keep,named,soft);\n'
         '        uint32_t firm[2]={allocator.keep[0],allocator.keep[1]};\n'
         '        allocator.keep[0]|=soft[0]; allocator.keep[1]|=soft[1];',
         '        fx_set named[2],soft[2];\n        parts(desired,allocator.keep,named,soft);\n'
         '        fx_set firm[2]={allocator.keep[0],allocator.keep[1]};\n'
         '        allocator.keep[0]=fx_or(allocator.keep[0],soft[0]); allocator.keep[1]=fx_or(allocator.keep[1],soft[1]);'),
        ('(r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (soft[0]|soft[1])) {',
         '(r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (fx_any(soft[0]) || fx_any(soft[1]))) {'),
        ('(r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (allocator.keep[0]|allocator.keep[1]) &&\n'
         '           (automatic || !((named[0]&~allocator.keep[0])|(named[1]&~allocator.keep[1])))) {\n'
         '            allocator.keep[0]=allocator.keep[1]=0;',
         '(r==DL_ALLOC_MEMORY || r==DL_ALLOC_TRANSITION) && (fx_any(allocator.keep[0]) || fx_any(allocator.keep[1])) &&\n'
         '           (automatic || !(fx_any(fx_less(named[0],allocator.keep[0])) || fx_any(fx_less(named[1],allocator.keep[1]))))) {\n'
         '            allocator.keep[0]=allocator.keep[1]=(fx_set){{0}};'),
        ('            uint8_t reads[32], now[16];\n            for(unsigned p=0;p<32;++p) reads[p]=dl_catalog[p].buffer;',
         '            uint8_t reads[DL_PACKAGES], now[16];\n            for(unsigned p=0;p<DL_PACKAGES;++p) reads[p]=dl_catalog[p].buffer;'),
        ('        unsigned c=cursor/32;\n        int s=dl_job_status(c);', '        unsigned c=cursor/DL_PACKAGES;\n        int s=dl_job_status(c);'),
        ('            unsigned bit=1u<<(cursor%32);\n            if(phase==3) stubbed[c]&=~bit;\n'
         '            else if(phase==4 || phase==6 || phase==7) {\n'
         '                if(phase==4 || dl_bypass_unbound) stubbed[c]|=bit; else stubbed[c]&=~bit;',
         '            unsigned id=cursor%DL_PACKAGES;\n            if(phase==3) stubbed[c]=fx_without(stubbed[c],id);\n'
         '            else if(phase==4 || phase==6 || phase==7) {\n'
         '                stubbed[c]=phase==4 || dl_bypass_unbound ? fx_with(stubbed[c],id) : fx_without(stubbed[c],id);'),
        ('    while(cursor<64 && !needed(cursor,mode)) ++cursor;\n    if(cursor<64) {\n        unsigned c=cursor/32,p=cursor%32;',
         '    while(cursor<2u*DL_PACKAGES && !needed(cursor,mode)) ++cursor;\n    if(cursor<2u*DL_PACKAGES) {\n'
         '        unsigned c=cursor/DL_PACKAGES,p=cursor%DL_PACKAGES;'),
        ('        if(p>=32 || dl_catalog[p].resident || slot_bound(c,p)) continue;',
         '        if(p>=DL_PACKAGES || dl_catalog[p].resident || slot_bound(c,p)) continue;'),
        ('        if(p!=last[i] && p<32 && !dl_catalog[p].resident && !slot_bound(c,p) &&\n'
         '           (((stubbed[c]|dl_stub_at_boot)>>p)&1u)) {',
         '        if(p!=last[i] && p<DL_PACKAGES && !dl_catalog[p].resident && !slot_bound(c,p) &&\n'
         '           (fx_in(stubbed[c],p) || fx_in(dl_stub_at_boot,p))) {'),
        ('    uint32_t held[2],named[2],soft[2];\n    parts(ids,held,named,soft);\n'
         '    held[0]|=soft[0]; held[1]|=soft[1];\n'
         '    if(held[0]!=observed_held[0] || held[1]!=observed_held[1]) changed=1;',
         '    fx_set held[2],named[2],soft[2];\n    parts(ids,held,named,soft);\n'
         '    held[0]=fx_or(held[0],soft[0]); held[1]=fx_or(held[1],soft[1]);\n'
         '    if(!fx_same(held[0],observed_held[0]) || !fx_same(held[1],observed_held[1])) changed=1;'),
        ('        if(p>=32 || !dl_catalog[p].qualified', '        if(p>=DL_PACKAGES || !dl_catalog[p].qualified'),
        ('int dl_bound(unsigned c,unsigned p) { return c<2 && p<32 && slot_bound(c,p); }',
         'int dl_bound(unsigned c,unsigned p) { return c<2 && p<DL_PACKAGES && slot_bound(c,p); }'),
        ('int dl_placed(unsigned c,unsigned p) { return c<2 && p<32 && allocator.live',
         'int dl_placed(unsigned c,unsigned p) { return c<2 && p<DL_PACKAGES && allocator.live'),
    ),
}
DSP_HOOK_EDITS = {
    'guard': {'hooks.s': GUARD_ENTRY},
    'pretend': {'hooks.s': GUARD_ENTRY + (('        moveq #1,%d2\n        move.l %d2,dl_phase\n        bra dl_write\n',
                                           '        bra dl_complete           | pretend: no transfer\n'),)},
    'noflags': {'hooks.s': GUARD_ENTRY,
                'transfer.c': (('flags_sent[c]=modwerk_dsp_flags(c);', 'flags_sent[c]=0;'),
                               ('            unsigned flags=modwerk_dsp_flags(c);\n', '            unsigned flags=0;\n'))},
    'long': {'hooks.s': GUARD_ENTRY + (('        move.w #63,%d0\n        move.w %d0,0x2000001c\n',
                                        '        move.w #95,%d0\n        move.w %d0,0x2000001c\n'),
                                       ('        move.w #0x8002,%d0\n        move.w %d0,0xfc045014\n'
                                        '        move.w #0x8002,%d0\n        move.w %d0,0xfc04501c\n',
                                        '        move.w #0x8003,%d0\n        move.w %d0,0xfc045014\n'
                                        '        move.w #0x8003,%d0\n        move.w %d0,0xfc04501c\n'))},
    'usbin': {'hooks.s': ((STATE7_ENTRY,
               '        move.w 0xfc04501e,%d0\n'
               '        andi.l #0xc1,%d0\n'
               '        cmpi.l #0x80,%d0\n'
               '        beq 1f\n'
               '        addq.l #1,dl_early\n'
               '1:\n'
               '        move.l dl_phase,%d2\n'
               '        bne dl_next\n'),
              ('        move.l 0xfc045028,%d0\n        move.l %d0,dl_rx_nbytes\n', ''),
              ('        move.l dl_rx_nbytes,%d0\n        move.l %d0,0xfc045028\n', ''))},
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True, stderr=subprocess.PIPE).strip()


def private_output(path):
    path = path.resolve()
    if path.exists():
        raise ValueError('Choose a new private output directory.')
    try:
        git(path.parent, 'rev-parse', '--show-toplevel')
    except subprocess.CalledProcessError:
        pass
    else:
        raise ValueError('All generated source, stock and packages must stay outside Git.')
    path.mkdir()
    return path


def ctext(value):
    if not isinstance(value, str) or any(ord(c) < 32 or ord(c) > 126 for c in value):
        raise ValueError('Logger identity must contain bounded printable ASCII.')
    return json.dumps(value, ensure_ascii=True)


def stock_reference(parts, offset, length, address):
    """Replace a zero source placeholder with an Elekloader stock-copy recipe.

    This changes data parts only, never layout, relocations or instructions.
    The linker recovers the guarded bytes from the owner's verified stock.
    """
    if not isinstance(offset, int) or not isinstance(length, int) or offset < 0 or length <= 0:
        raise ValueError('Stock replay requires a positive bounded source span.')
    before, after, at, found = [], [], 0, 0
    end = offset + length
    for part in parts:
        size = len(part[1]) // 2 if part[0] == 'hex' else part[2]
        lo, hi = max(at, offset), min(at + size, end)
        if lo >= hi:
            (before if at < offset else after).append(part)
        else:
            if part[0] != 'hex' or any(bytes.fromhex(part[1])[lo-at:hi-at]):
                raise ValueError('Stock replay is not a zero source placeholder.')
            if lo > at:
                before.append(['hex', part[1][:(lo-at)*2]])
            if hi < at + size:
                after.append(['hex', part[1][(hi-at)*2:]])
            found += hi-lo
        at += size
    if offset < 0 or found != length:
        raise ValueError('Stock replay is outside the source section.')
    return before + [['stock', hex(address), length]] + after


def strip(document, fills, words, image, load):
    """-> a copy of `document` without the stock DSP words each fill names, checked against `words(fill)`, the
    words its recipe recovers. Format-2 cannot copy stock into a site or reorder bytes, so these leave as gaps:
    the kit refuses the package until src/engine/elekloader/octatrack-base.ts inserts them from the user's own
    firmware. In a section (the ColdFire's packed copies) a word is big-endian, in a DSP payload site little-endian."""
    document = json.loads(json.dumps(document))
    for fill in sorted(fills, key=lambda f: -f['offset']):  # from the end: earlier offsets stay where they were
        start, end = fill['offset'], fill['offset'] + 3 * fill['count']
        if 'section' in fill:
            expected = b''.join(w.to_bytes(3, 'big') for w in words(fill))
            kept, removed, at = [], b'', 0
            for part in document['sections'][fill['section']]['parts']:
                size = len(part[1]) // 2 if part[0] == 'hex' else part[2]
                data = bytes.fromhex(part[1]) if part[0] == 'hex' else image[int(part[1], 16) - load:][:size]
                lo, hi = max(at, start) - at, min(at + size, end) - at
                if lo >= hi:
                    kept.append(part)
                else:
                    removed += data[lo:hi]
                    for a, b in ((0, lo), (hi, size)):  # what is left of the part, each piece its own part
                        if a < b:
                            kept.append(['hex', data[a:b].hex()] if part[0] == 'hex' else ['stock', hex(int(part[1], 16) + a), b - a])
                at += size
            document['sections'][fill['section']]['parts'] = kept
        else:
            expected = b''.join(w.to_bytes(3, 'little') for w in words(fill))
            site = next(s for s in document['sites'] if s['addr'] == fill['site'])
            removed = bytes.fromhex(site['new'])[start:end]
            site['new'] = site['new'][:2 * start] + site['new'][2 * end:]
        if removed != expected:
            raise ValueError('A stock DSP fill does not name the bytes it removes: %s.' % fill)
    return document


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stock', type=Path, required=True)
    parser.add_argument('--upstream', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cross', default='m68k-elf-', help='Use Modwerk\'s reviewed GNU toolchain.')
    parser.add_argument('--dev', action='store_true',
                        help='Development base: drive and watch the unit over USB (dev.c) and stream MAIN/CUE as USB audio. Never for users.')
    parser.add_argument('--dsp-hook', choices=tuple(DSP_HOOK_EDITS), default='guard',
                        help="with --dsp-loader: the state-7 entry, guard (default); usbin, pretend, noflags, long: hardware bisect variants")
    parser.add_argument('--dsp-probe', choices=('A', 'B', 'S', 'W', 'M', 'X'),
                        help='Hardware probe of the DSP loader (dsp_loader.PROBES): A delivery only, B answer only, '
                             'S stock DSP payloads (the ColdFire transport alone; nothing answers); '
                             'W full loader, but one word per upload packet to pinpoint a rejected word; '
                             'M (emulator check) a wrong sum on the upload chunk at word 48, so the receiver keeps a record and the tick reads it; '
                             'X the full loader, and the receivers watch X:$7a92-$7fff for anything that writes it (dev request 26).')
    parser.add_argument('--dsp-loader', action='store_true',
                        help='Load every DSP effect, stock and module, on demand (needs ELEKLOADER_DSP_ASM, Node 24).')
    parser.add_argument('--dsp-burn', type=int, default=0,
                        help='with --dsp-loader, calibration only: core 0\'s receiver spends this many more cycles (2-4094, even) every frame; negative, core 1\'s.')
    parser.add_argument('--fx-ids', type=int, choices=(32, 128), default=128,
                        help='with --dsp-loader: the base\'s effect ids (fxids.h, the dispatch and chooser tables; '
                             'docs/OCTATRACK_MORE_EFFECT_IDS.md). 32, the old width, only to bisect a fault.')
    args = parser.parse_args()
    global FX_IDS, FX_WORDS
    FX_IDS, FX_WORDS = args.fx_ids, (args.fx_ids + 31) // 32
    os.environ['ELEKLOADER_CROSS'] = args.cross
    upstream = args.upstream.resolve()
    pin = json.loads((APP / 'vendor/elekloader/kit/kit.json').read_text())['commit']
    if git(upstream, 'rev-parse', 'HEAD') != pin or git(upstream, 'status', '--porcelain', '--untracked-files=no'):
        parser.error('Use the exact clean tracked Elekloader checkout pinned by Modwerk.')
    sys.path.insert(0, str(upstream))
    from elekloader import dsp, formats, elemod, patch
    from elekloader.sdk import build as sdk
    stock, device, release = formats.load(str(args.stock))
    if device.key != 'octatrack' or release.version != '1.40C':
        parser.error('Original Octatrack 1.40C required.')
    image = formats.main_image(stock, device)
    if sha(image) != release.main_sha256:
        parser.error('Original, unmodified MAIN image required.')
    stock_sha = sha(args.stock.read_bytes())
    out = private_output(args.output)
    source = out / 'source'; source.mkdir()
    logger = APP / 'sdk/runtime/logging'
    guards = json.loads((logger / 'stock-guards.json').read_text())
    for key, guard in guards.items():
        at = guard['address'] - device.main_load
        if at < 0 or sha(image[at:at+guard['length']]) != guard['sha256']:
            raise ValueError('Logger stock ABI guard failed: ' + key)
    original_core = upstream / 'mods/core-ot'
    recipe = json.loads((original_core / 'mod.json').read_text())
    for name in ('core-ot.s', 'bus.s', 'gate.s'):
        shutil.copyfile(original_core / name, source / name)
    bootstrap = (source / 'core-ot.s').read_text()
    marker = '3:      clr.l   (%a1)+'
    if bootstrap.count(marker) != 1:
        raise ValueError('Pinned boot clear seam changed; review before porting.')
    bootstrap = bootstrap.replace(marker, '''3:      cmpa.l  #modwerk_retained_start + UNCACHED, %a1
        bne.s   5f
        lea     8192(%a1), %a1
        sub.l   #2048, %d0
        beq.s   4f
5:      clr.l   (%a1)+''')
    (source / 'core-ot.s').write_text(bootstrap)
    for p in logger.iterdir():
        if p.suffix in ('.c', '.h') and p.name != 'identity.c':
            shutil.copyfile(p, source / p.name)
    adapter = (source/'stock_140c.c').read_text()
    io_macro = '#define io octamod_log_io'
    if adapter.count(io_macro) != 1:
        raise ValueError('Logger I/O alias seam changed; review the port.')
    # Keep io an array lvalue: stock calls use sizeof io for its capacity.
    adapter = adapter.replace(io_macro,
        '#define io (*(uint8_t (*)[512])((uintptr_t)&octamod_log_retained + 6144u + 0x08000000u))\n'
        'typedef char modwerk_io_capacity[(sizeof io == 512)?1:-1];')
    (source/'stock_140c.c').write_text(adapter)
    # The recorder's zeroed buffers to .bss, which core-ot.s clears at boot: 43 KB of zeros out of the image, which a
    # RAM boot must keep under 1.25 MiB (BOOT_IMAGE_BYTES), as selection.c's paste buffer (DSP_EDITS).
    recorder = (source/'octamod_log_firmware.c').read_text()
    zeroed = (('previous = {0}, snapshot = {0};', 'previous, snapshot;'), ('__attribute__((aligned(512))) = {0};', '__attribute__((aligned(512)));'))
    if any(recorder.count(old) != 1 for old, _ in zeroed):
        raise ValueError('The recorder\'s buffers changed; review the .bss edit.')
    for old, new in zeroed:
        recorder = recorder.replace(old, new)
    (source/'octamod_log_firmware.c').write_text(recorder)
    upload = APP / 'sdk/runtime/upload'
    for name in ('upload.c', 'upload.h', 'sha256.c', 'wire.c', 'wire.h', 'vendor.c', 'vendor.h'):
        shutil.copyfile(upload / name, source / name)
    loader = APP / 'sdk/runtime/loader'
    for name in ('loader.c', 'loader.h', 'modwerk_module.h'):
        shutil.copyfile(loader / name, source / name)
    # The base owns the USB configuration and the EP0 unknown-request tail.
    spec = importlib.util.spec_from_file_location('modwerk_usb_base', HERE/'usb_base.py')
    usb = importlib.util.module_from_spec(spec); spec.loader.exec_module(usb)
    for name in ('ep0.c', 'fxids.h', 'runtime.c', 'runtime.h', 'boot.c', 'boot.h', 'boot.s', 'modset.c', 'boot_anim.c', 'boot_anim.s', 'crash.c', 'crash.s') + (('dev.c',) if args.dev else ()):
        shutil.copyfile(HERE / name, source / name)
    # The startup (boot_anim.c) draws the art the shared startup sources describe, with this base's version.
    spec = importlib.util.spec_from_file_location('modwerk_base_art', APP / 'sdk/runtime/startup/base_art.py')
    base_art = importlib.util.module_from_spec(spec); spec.loader.exec_module(base_art)
    (source / 'boot_art.h').write_text(base_art.header(VERSION.split('-')[0]))
    dsp_sites, dsp_layout, rows = [], None, None
    if args.dsp_loader:
        spec = importlib.util.spec_from_file_location('modwerk_dsp_loader', HERE/'dsp_loader.py')
        loader_dsp = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader_dsp)
        for name in DYNLOAD_SOURCES + ('hooks.s',):
            text = (DYNLOAD / name).read_text()
            edits = DSP_EDITS.get(name, ()) + WIDTH_EDITS.get(name, ()) + DSP_HOOK_EDITS[args.dsp_hook].get(name, ())
            if name == 'transfer.c' and args.dsp_probe == 'W':
                # One word per upload packet: the count of accepted packets before a reject is the exact
                # index of the first word the DSP read back wrong (device report rejected0/accepted0).
                edits += (('unsigned n=j->upload.count-j->position;\n            if(n>DL_DATA) n=DL_DATA;',
                           'unsigned n=j->upload.count-j->position;\n            if(n>1) n=1;'),
                          ('unsigned n=jobs[c].upload.count-jobs[c].position;\n                        if(n>DL_DATA) n=DL_DATA;',
                           'unsigned n=jobs[c].upload.count-jobs[c].position;\n                        if(n>1) n=1;'))
            if name == 'transfer.c' and args.dsp_probe == 'M':
                edits += (('            t[7]=(uint16_t)j->expected;', '            t[7]=(uint16_t)(j->expected^(j->position==48));'),)
            for old, new in edits:
                if text.count(old) != 1:
                    raise ValueError('Octabam DSP loader seam changed in %s; review the port.' % name)
                text = text.replace(old, new)
            (source / ('dsp_hooks.s' if name == 'hooks.s' else name)).write_text(text)
        shutil.copyfile(HERE / 'dsp.c', source / 'dsp.c')
        shutil.copyfile(HERE / 'dsp_core1.s', source / 'dsp_core1.s')
        for name in ('fxmap.c', 'fxmap.s', 'fxpage.c', 'fxpage.s', 'status.c', 'status.s', 'status.h', 'selftest.h'):
            shutil.copyfile(HERE / name, source / name)
        for lea, stock_list in ((0x40052496, 0x400d6090), (0x40052706, 0x400d6060)):
            if int.from_bytes(image[lea - device.main_load:lea - device.main_load + 4], 'big') != stock_list:
                raise ValueError('An FX selector no longer reads its chooser list at %#x.' % lea)
        dsp_sites, dsp_layout = loader_dsp.recipe(image, device, dsp, lambda path: sdk.dsp_assemble(path, str(source)), str(source),
                                                  args.dsp_probe if args.dsp_probe in ('A', 'B', 'X') else None, args.dsp_burn, FX_IDS)
        chooser_sites, chooser_lists = loader_dsp.choosers(image, FX_IDS)
        # The Part validator (0x40002318; bank load, battery restore) clears an id that reads negative and clamps one
        # above 31 to 31: four `moveq #31` (docs/OCTATRACK_MORE_EFFECT_IDS.md). Past 32 ids they clamp to the last.
        for at in (VALIDATOR_CLAMPS if FX_IDS != 32 else ()):
            word = image[at - device.main_load:at - device.main_load + 2]
            if word[0] & 0xf1 != 0x70 or word[1] != 31:
                raise ValueError('The Part validator\'s clamp at %#x is not moveq #31.' % at)
            chooser_sites.append(dict(addr=hex(at), stock=word.hex(), op='bytes', new=bytes((word[0], FX_IDS - 1)).hex()))
        dsp_sites += chooser_sites
    (source/'usb_base.h').write_text(usb.header())
    (source/'usb_base.s').write_text(usb.assembly(args.dev))
    if args.dev:  # USB AUDIO OUT MAIN CUE (usb_base.py): Octabam's source with our interface numbers
        (source/'usbaudio.s').write_text(usb.audio_assembly())
        (source/'remix.inc').write_text(usb.AUDIO_INC)
    # Identity describes this core-only private base. Later selections need
    # their complete module/version/chooser identities regenerated explicitly.
    folders = (logger, upload, loader, HERE) + ((DYNLOAD,) if args.dsp_loader else ())
    inputs = {str(p.relative_to(APP)): sha(p.read_bytes()) for folder in folders
              for p in sorted(folder.iterdir()) if p.is_file() and p.suffix in ('.c', '.h', '.s', '.asm', '.py', '.json')}
    if args.dev:
        for path in (usb.AUDIO_SOURCE, usb.AUDIO_DESCRIPTORS):
            inputs[str(path.relative_to(APP))] = sha(path.read_bytes())
    if args.dsp_loader:
        for name in ('src/engine/assets/stock-dsp-metadata.json', 'src/engine/assets/chooser-metadata.json',
                     'scripts/octatrack-module-page.mjs'):
            inputs[name] = sha((APP / name).read_bytes())
    inputs.update({'elekloader/' + p.name: sha(p.read_bytes()) for p in original_core.iterdir() if p.is_file()})
    artwork = APP / 'sdk/runtime/startup/artwork.json'
    inputs['sdk/runtime/startup/artwork.json'] = sha(artwork.read_bytes())
    inputs['sdk/runtime/startup/build.py'] = sha((artwork.parent/'build.py').read_bytes())
    inputs['sdk/runtime/startup/base.json'] = sha((artwork.parent/'base.json').read_bytes())
    inputs['sdk/runtime/startup/base_art.py'] = sha((artwork.parent/'base_art.py').read_bytes())
    source_hash = sha(json.dumps(inputs, sort_keys=True, separators=(',', ':')).encode())
    chooser = json.loads((APP/'src/engine/assets/chooser-metadata.json').read_text())
    configuration = dict(fx1=['NONE', *chooser['stockFx1']], fx2=['NONE', *chooser['stockFx2']],
                         hidden=[], logger='0.2.0', modules=[], os='1.40C', source=source_hash, stockfx2=True,
                         usb=dict(interfaces=['msc', 'modwerk-vendor'], vendor=1, submit=True, backend='runtime-loader-3'),
                         boot='ram-1', **({'dev': ['key', 'panel', 'state', 'screen', 'usb-audio-main-cue']} if args.dev else {}))
    if args.dsp_loader:
        configuration.update(dsp=dict(loader='dsp-dynload-3', stock='on-demand', rows='runtime',
                                      allowance=DSP_ALLOWANCE, reserve=DSP_RESERVE, probe=args.dsp_probe, burn=args.dsp_burn, hook=args.dsp_hook, arena=[dsp_layout[t]['tableWords'] - loader_dsp.SAVED for t in 'AB']))
    identity = sha(json.dumps(configuration, separators=(',', ':')).encode())
    values = dict(build=identity[:16], os='1.40C', modules='', configuration=identity,
                  source=source_hash, fx1=';'.join(configuration['fx1']),
                  fx2=';'.join(configuration['fx2']), hidden='')
    definitions = '#include <stdint.h>\n#include "octamod_log_port.h"\n'
    # IDENTIFY reports this configuration identity as the installed base.
    definitions += 'const uint8_t modwerk_base_digest[32] = {%s};\n' % ','.join(
        '0x' + identity[i:i+2] for i in range(0, 64, 2))
    for key, size in FIELDS.items():
        if len(values[key]) >= size:
            raise ValueError('Logger identity field exceeds capacity: ' + key)
        definitions += f'char olog_{key}[{size}] = {ctext(values[key])};\n'
    definitions += 'const struct octamod_log_identity octamod_log_identity = {\n' + ','.join(
        'olog_' + key for key in FIELDS) + ',1};\n'
    definitions += 'typedef char retained_fits[(sizeof(struct octamod_log_retained_state)<=6144)?1:-1];\n'
    if args.dsp_loader:  # dsp.c and manager.c: stock and module effect ids (the null stub until bound), the catalog, each core's arena
        stock = sum(1 << fx for fx in dsp_layout['A']['stock'])
        words = lambda ids: ', '.join('%#xu' % (ids >> 32 * w & 0xffffffff) for w in range(FX_WORDS))  # an fx_set (fxids.h)
        definitions += '#include "allocator.h"\nconst fx_set dl_stub_at_boot = {{%s}};\nconst uint32_t dl_pmap16 = 0;\n' % words(
            dsp_layout['A']['free'] | stock)
        definitions += 'const fx_set modwerk_fx_modules = {{%s}};\n' % words(dsp_layout['A']['free'])
        # fxmap.c: today's catalogue assignments, what a project without '#MODWERK_FX=' lines names.
        names = {m['id']: m['name'] for m in json.loads((APP / 'src/catalog/module-documents.json').read_text())['modules']}
        legacy = [(m['fxId'], m['id']) for m in chooser['modules'] if dsp_layout['A']['free'] >> (m.get('fxId') or 0) & 1]
        definitions += 'struct fx_legacy { uint32_t module; uint32_t id; char name[16]; };\n'
        definitions += 'const struct fx_legacy modwerk_fx_legacy[] = {%s};\nconst uint32_t modwerk_fx_legacy_count = %d;\n' % (
            ', '.join('{%#xu, %d, %s}' % (int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], 'big'), fx,
                                           ctext(names.get(key, key)[:15])) for fx, key in legacy), len(legacy))
        definitions += loader_dsp.catalog_c(dsp_layout, DSP_RESERVE, FX_IDS) + chooser_lists
        # PROJ > MODWERK (status.c's pages): the four stock root rows, copied, then MODWERK with its icon and list. The
        # list descriptor ships initialised (7 visible rows): stock's boot init does not know it (MAINMENU.md section 1).
        if int.from_bytes(image[ROOT_MENU - device.main_load:][:4], 'big') != 4 or \
                int.from_bytes(image[ROOT_ROWS_POINTER - device.main_load:][:4], 'big') != ROOT_ROWS:
            raise ValueError('PROJ\'s root menu is not the four stock rows; review the MODWERK category.')
        stock_rows = image[ROOT_ROWS - device.main_load:][:4 * 24]
        columns = [sum(1 << r for r in range(8) if ICON[r][c] == '#') << 24 for c in range(19)]
        leaves = (('load', 'load'), ('modules', 'modules'), ('missing', 'missing'), ('test', 'test'))
        definitions += ('struct menu_row { const void *label, *window, *action, *value, *child; uint32_t page; };\n'
                        'extern char modwerk_menu_label[], %s;\nvoid %s;\n' % (
                            ', '.join('modwerk_%s_label[]' % label for label, _ in leaves),
                            ', '.join('modwerk_%s_menu(int)' % action for _, action in leaves)) +
                        'static const uint32_t modwerk_icon_plane[19] = {%s};\n' % ', '.join('%#010xu' % c for c in columns) +
                        'static const struct { uint32_t width, height, one; const uint32_t *plane, *mask; } modwerk_icon =\n'
                        '    {0x13, 0x09, 0x01, modwerk_icon_plane, (const uint32_t *)%#xu};\n' % ICON_MASK +
                        'static const struct menu_row modwerk_menu_rows[%d] = {\n%s};\n' % (len(leaves), ',\n'.join(
                            '    {modwerk_%s_label, 0, (const void *)modwerk_%s_menu, 0, 0, 0}' % leaf for leaf in leaves)) +
                        '/* count, scroll, cursor, selection, visible rows, count, rows: the menu engine writes it */\n'
                        'struct { uint32_t count, scroll, cursor, selection, visible, count_again; const struct menu_row *rows; }\n'
                        '    modwerk_menu_list = {%d, 0, 0, 0, 7, %d, modwerk_menu_rows};\n' % (len(leaves), len(leaves)) +
                        'const struct menu_row modwerk_root_rows[5] = {%s,\n    {modwerk_menu_label, &modwerk_icon, 0, 0, &modwerk_menu_list, 0}};\n' % (
                            ',\n'.join('    {' + ', '.join('(const void *)%#xu' % int.from_bytes(stock_rows[24 * r + 4 * f:][:4], 'big')
                                                          for f in range(5)) + ', %#xu}' % int.from_bytes(stock_rows[24 * r + 20:][:4], 'big')
                                         for r in range(4))))
        definitions += 'const uint16_t modwerk_dsp_arena[2] = {%d, %d};\n' % tuple(
            dsp_layout[t]['tableWords'] - loader_dsp.SAVED for t in ('A', 'B'))
    (source/'identity.c').write_text(definitions)
    # Only authored zero placeholders: stock is recovered by format-2 parts.
    spec = importlib.util.spec_from_file_location('modwerk_logger_package', logger/'package.py')
    package = importlib.util.module_from_spec(spec); spec.loader.exec_module(package)
    (source/'hooks.s').write_text(package.hooks(guards))
    (source/'retained.s').write_text('''.section .bss
.balign 512
.globl modwerk_retained_start, modwerk_retained_end, octamod_log_retained
modwerk_retained_start:
octamod_log_retained:
.skip 8192
modwerk_retained_end:
''')
    recipe.update(version=VERSION, title='Modwerk base prototype', author='irpina; Modwerk contributors',
                  license='GPL-3.0-or-later',
                  description='Private core-only Elekloader base with logger/startup, a USB vendor interface and a runtime module loader (hooks and stock-code sites); NOT a flash candidate.')
    recipe['sources'] += [p.name for p in sorted(source.glob('*.c'))] + ['hooks.s', 'retained.s', 'usb_base.s', 'boot.s', 'boot_anim.s', 'crash.s'] + (
        ['dsp_hooks.s', 'dsp_core1.s', 'fxmap.s', 'fxpage.s', 'status.s'] if args.dsp_loader else []) + (['usbaudio.s'] if args.dev else [])
    recipe['cflags'] = ['-std=c99', '-ffreestanding', '-fno-builtin', '-fno-common',
                        '-fno-zero-initialized-in-bss', '-fno-tree-loop-distribute-patterns',
                        '-fno-merge-constants', '-fno-asynchronous-unwind-tables', '-fno-unwind-tables',
                        '-Wall', '-Wextra', '-Werror', '-DMODWERK_FX_IDS=%du' % FX_IDS] + (['-DMODWERK_DSP_XWATCH'] if args.dsp_probe == 'X' else []) + [
                        '-DRUNTIME_MODULES=%du' % RUNTIME_MODULES, '-DRUNTIME_POOL_BYTES=%du' % RUNTIME_POOL_BYTES] + (['-DMODWERK_DEV'] if args.dev else []) + (
        ['-DMODWERK_DSP_LOADER', '-DMODWERK_DSP_ALLOWANCE0=%d' % DSP_ALLOWANCE[0], '-DMODWERK_DSP_ALLOWANCE1=%d' % DSP_ALLOWANCE[1],
         '-DMODWERK_DSP_RESERVE=%d' % DSP_RESERVE] +
        ['-DMODWERK_DSP_%s%d=%d' % (key, n, dsp_layout[t][field]) for n, t in enumerate('AB')
         for key, field in (('TABLE', 'table'), ('WORDS', 'tableWords'), ('MISS', 'miss'), ('METER', 'meter'))] if args.dsp_loader else [])
    for key in ('idle', 'job', 'transport', 'open', 'read', 'write', 'close'):
        guard = guards[key]; n = guard.get('patchLength', guard['length'])
        at = guard['address'] - device.main_load
        # The USB transport is serviced on the engine before the logger's idle hook.
        target = usb.IDLE_HOOK if key == 'idle' else 'olog_' + key + '_hook'
        recipe['sites'].append(dict(addr=hex(guard['address']), stock=image[at:at+n].hex(),
                                    op='jmp', target=target))
    recipe['sites'] += usb.sites(lambda addr, n: image[addr-device.main_load:addr-device.main_load+n], args.dev)
    # RAM boot: the gate at the OS entry, and the DSP park in both payloads.
    at = BOOT_GATE[0] - device.main_load
    if image[at:at+6].hex() != BOOT_GATE[1]:
        raise ValueError('The OS entry changed; review the RAM boot gate.')
    recipe['sites'].append(dict(addr=hex(BOOT_GATE[0]), stock=BOOT_GATE[1], op='jmp', target='modwerk_boot_gate'))
    # The startup: boot_anim.s replaces the stock logo loop from its first instruction.
    at = BOOT_LOGO[0] - device.main_load
    if image[at:at+6].hex() != BOOT_LOGO[1]:
        raise ValueError('The stock logo loop changed; review boot_anim.s.')
    recipe['sites'].append(dict(addr=hex(BOOT_LOGO[0]), stock=BOOT_LOGO[1], op='jmp', target='modwerk_boot_loop'))
    for tag in ('A', 'B'):
        for lo, words in DSP_PARK.items():
            addr = dsp.p_span(image, device, tag, lo, lo + len(words)); at = addr - device.main_load
            if [dsp.w24(image, at + 3*k) for k in range(len(words))] != [0 if k % 2 else 0x0c0000 | (lo + k)
                                                                        for k in range(len(words))]:
                raise ValueError('Payload %s P:%#x is not the dead vectors the park replaces.' % (tag, lo))
            recipe['sites'].append(dict(addr=hex(addr), stock=image[at:at+3*len(words)].hex(), op='bytes',
                                        new=b''.join(w.to_bytes(3, 'little') for w in words).hex(), kind='data'))
    # The machine-neutral loader's events (sdk/runtime/loader/loader.h), from core-ot's bus.
    recipe.setdefault('subscribe', []).extend(dict(event='ev_' + e, fn='modwerk_runtime_' + e, order=90)
                                              for e in ('tick', 'draw', 'key', 'enc'))
    recipe['subscribe'].append(dict(event='ev_draw', fn='modwerk_boot_draw', order=10))  # boot_anim.c, while it runs
    # The host time limit counts on the same tick (ep0.c).
    recipe['subscribe'].append(dict(event='ev_tick', fn='modwerk_ep0_tick', order=91))
    recipe['subscribe'].append(dict(event='ev_tick', fn='modwerk_crash_tick', order=96))  # crash.c: restart after a crash
    if args.dev:  # the screen as composed, modules' drawing included
        recipe['subscribe'].append(dict(event='ev_draw', fn='modwerk_dev_draw', order=95))
    if args.dsp_loader:  # the DSP manager's UI work (its own hook was the UI tick, 0x4005221e) and its ColdFire hooks
        recipe['subscribe'].append(dict(event='ev_tick', fn='modwerk_dsp_tick', order=92))  # dsp.c's test picks
        recipe['subscribe'].append(dict(event='ev_tick', fn='dl_ui', order=93))
        # The status modal (status.c): CUE + PROJ before stock and the modules see it, drawn under the dev capture.
        recipe['subscribe'] += [dict(event='ev_key', fn='modwerk_status_key', order=89),
                                dict(event='ev_enc', fn='modwerk_status_enc', order=89),
                                dict(event='ev_tick', fn='modwerk_status_tick', order=94),
                                dict(event='ev_draw', fn='modwerk_status_draw', order=94)]
        for addr, n, guard, label in DYNLOAD_HOOKS:
            stock = image[addr - device.main_load:addr - device.main_load + n]
            if sha(stock) != guard:
                raise ValueError('Stock bytes at %#x are not the ones the DSP loader hooks.' % addr)
            recipe['sites'].append(dict(addr=hex(addr), stock=stock.hex(), op='jmp', target=label))
        recipe['sites'] += [] if args.dsp_probe == 'S' else dsp_sites
        recipe['sites'] += [dict(addr=hex(ROOT_MENU), stock=image[ROOT_MENU - device.main_load:][:4].hex(), op='bytes', kind='data',
                                 new='00000005'),
                            dict(addr=hex(ROOT_ROWS_POINTER), stock=image[ROOT_ROWS_POINTER - device.main_load:][:4].hex(), op='ptr',
                                 target='modwerk_root_rows')]
    spec = importlib.util.spec_from_file_location('modwerk_startup', artwork.parent/'build.py')
    startup = importlib.util.module_from_spec(spec); spec.loader.exec_module(startup)
    for guard, authored in startup.writes():
        at = guard['address'] - device.main_load
        if sha(image[at:at+len(authored)]) != guard['sha256']:
            raise ValueError('Startup stock table guard failed.')
        recipe['sites'].append(dict(addr=hex(guard['address']), stock=image[at:at+len(authored)].hex(),
                                    op='bytes', new=authored.hex(), kind='data'))
    # A detour's way back must not land inside a patched site (fxmap.s once returned two bytes short).
    spans = [(int(site['addr'], 16), len(bytes.fromhex(site['stock']))) for site in recipe['sites']]
    inside = sorted({hex(t) for f in source.glob('*.s') for t in map(lambda h: int(h, 16), re.findall(
        r'\bj(?:mp|sr)\s+0x([0-9a-fA-F]+)', f.read_text())) for a, n in spans if a < t < a + n})
    if inside:
        raise ValueError('Base code jumps into the middle of a patched site: ' + ', '.join(inside))
    locked = catalogue_overlaps(recipe['sites'])
    if locked:
        raise ValueError('Base sites overlap what these catalogue modules patch: ' + ', '.join(locked))
    (source/'mod.json').write_text(json.dumps(recipe, indent=2)+'\n')
    path, _ = sdk.build(str(source), str(args.stock), str(out/'package'))
    document = json.loads(Path(path).read_text())
    for key in ('idle', 'job', 'transport', 'open', 'read', 'write', 'close'):
        section, offset = document['symbols']['olog_replay_' + key]
        guard = guards[key]; n = guard.get('patchLength', guard['length'])
        document['sections'][section]['parts'] = stock_reference(
            document['sections'][section]['parts'], offset, n, guard['address'])
    Path(path).write_text(json.dumps(document, indent=1)+'\n')
    if args.dsp_loader:  # the package without stock bytes, for Git and the browser: base.elemod and base-fills.json
        fills = [fill for t in 'AB' for fill in dsp_layout[t]['fills']]
        for n, t in enumerate('AB'):
            for fx, words in sorted(dsp_layout[t]['words'].items()):
                section, offset = document['symbols']['stock%d_%d_packed' % (n, fx)]
                fills.append(dict(tag=t, fx=fx, first=0, count=len(words), section=section, offset=offset))
        recovered = lambda f: (dsp_layout[f['tag']]['words'][f['fx']] if 'fx' in f else
                               dsp_layout[f['tag']]['shared'][f['shared']])[f['first']:f['first'] + f['count']]
        (out/'base.elemod').write_text(json.dumps(strip(document, fills, recovered, image, device.main_load), indent=1)+'\n')
        (out/'base-fills.json').write_text(json.dumps(fills, indent=1)+'\n')
        # What the base's source hash covers, so a test without the stock file sees the package go stale.
        (out/'base-sources.json').write_text(json.dumps(dict(folders=[str(f.relative_to(APP)) for f in folders], sources=inputs),
                                                        indent=1, sort_keys=True)+'\n')
    mod = elemod.load_any(path)
    if set(mod.imports) - {'__run_load','__run_start','__run_words','__bss_start','__bss_words',
                      'arena_base','__arena_pages','__arena_fill','__arena_clear',
                      'ev_tick','ev_draw','ev_key','ev_enc','ev_midi','ev_frame'}:
        raise ValueError('Core has unexpected unresolved imports: ' + str(mod.imports))
    outputs, manifest = patch.build(str(args.stock), [path], version='ELEKLOADER')
    mapping = manifest.pop('_map')
    for ext, data in outputs.items():
        target = out / ('NOT_FLASH_CANDIDATE.' + ext); target.write_bytes(data)
        if sha(target.read_bytes()) != sha(data):
            raise ValueError('Saved file hash differs.')
    if args.dsp_loader and any(mapping[name] % 16 for name in ('dl_tx', 'dl_rx')):
        raise ValueError('The DSP loader packet buffers must be 16-byte aligned for eDMA channel 0.')
    (out/'symbols.json').write_text(json.dumps(mapping, indent=2)+'\n')
    stage = mapping['modwerk_boot_stage']
    if stage % 16 or not BOOT_RESERVE[0] <= stage <= BOOT_RESERVE[1] - 320 - BOOT_IMAGE_BYTES:
        raise ValueError('The RAM boot stage at %#x is outside the reserve the gate scans.' % stage)
    # The unpacked image a RAM boot sends (`npm run device -- boot`); private like the rest.
    main_out = formats.main_image(formats.parse(str(out/'NOT_FLASH_CANDIDATE.bin'), device), device)
    if (int.from_bytes(main_out[:4], 'big') != OS_FIRST or len(main_out) > BOOT_IMAGE_BYTES or
            main_out[OS_VEROFF:OS_VEROFF+2] != image[OS_VEROFF:OS_VEROFF+2]):
        raise ValueError('The built MAIN image cannot be booted from RAM.')
    (out/'MAIN.raw').write_bytes(main_out)
    report = dict(schema=1, kind='modwerk-elekloader-base-prototype', coreVersion=VERSION,
                  upstream=pin, sources=inputs, configuration=configuration, configurationHash=identity,
                  dspLoader={t: {k: (hex(v) if isinstance(v, int) else v) for k, v in dsp_layout[t].items() if k not in ('words', 'shared')} for t in dsp_layout} if dsp_layout else None,  # no stock words in proofs
                  packageSha256=sha(Path(path).read_bytes()), manifest=manifest,
                  savedHashes={ext:sha(data) for ext,data in outputs.items()},
                  productionReady=False, hardware='not tested', emulator='not tested',
                  limitations=['Up to 128 ColdFire runtime modules at once (hooks on ev_tick, ev_draw, ev_key and ev_enc, stock-code sites that no two modules share) in a 768 KiB pool reclaimed once no task can reach a module; no data-table sites, MIDI or frame hooks, or DSP modules and DSP resource ledger yet.',
                               'The base owns the USB configuration: USB MIDI/Audio cannot be combined with it yet.',
                               'RAM boot (boot.s): any host on the vendor interface can boot a whole OS image without a confirmation on the unit; development only. Nothing it does writes flash; the image must carry NOR\'s bootstrap version.',
                               'Logger retention/ABI and modified bootstrap require emulator/hardware qualification.',
                               'Core-only identity; catalogue selections need exact configuration integration.'])
    (out/'proofs.json').write_text(json.dumps(report, indent=2)+'\n')
    if sha(args.stock.read_bytes()) != stock_sha:
        raise ValueError('Input stock file changed.')
    print('Private source-linked core prototype saved. Do not flash; qualification is pending.')


if __name__ == '__main__':
    main()

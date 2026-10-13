/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Compile the actual guarded private manager; expose its bookkeeping only to
 * this native fixture. Transfer flags are mocked; no stock memory is read. */
#include <stdint.h>
/* DL_NATIVE_TEST omits observer storage that the base diagnostics still name.
 * Supply storage only; preparation/queue/packet/retirement logic stays exact. */
static uint32_t auto_serial=0x80000000u;
static unsigned observed_valid;
static uint8_t last[16];
#include "manager.c"
#include <assert.h>
struct dl_package dl_catalog[MODWERK_FX_IDS];
struct code dl_codes[2][MODWERK_FX_IDS];
const uint32_t dl_pmap16=0;
const fx_set dl_stub_at_boot={{0}},modwerk_fx_modules={{0}};
volatile uint32_t dl_pool_base[2]={0},dl_pool_words[2]={0},dl_modal_pending;
static int hook_idle=1,saved;
static unsigned starts;
int modwerk_stock_hook_export_idle(void) { return hook_idle; }
int modwerk_saved_set_busy(void) { return saved; }
int modwerk_dsp_buffer_permitted(unsigned c,unsigned k,unsigned b,unsigned id) { (void)c;(void)k;(void)b;(void)id;return 0; }
int dl_command_start(unsigned c,unsigned op,unsigned id,unsigned init,unsigned proc) {
    (void)c;(void)op;(void)id;(void)init;(void)proc; ++starts;return 1;
}
int dl_upload_start(unsigned c,const struct dl_upload *u) { (void)c;(void)u; ++starts;return 1; }
int dl_job_status(unsigned c) { (void)c;return 0; }
void dl_job_release(unsigned c) { (void)c; }
int main(void) {
    struct dl_selection selection={0}; uint8_t ids[16]={0},sources[8]={0};
    for(unsigned scenario=0;scenario<2;++scenario) {
        hook_idle=scenario!=0; saved=scenario!=0;
        assert(dl_selection_prepare(&selection,23)==DL_SELECT_UNAVAILABLE);
        assert(dl_publication_prepare(ids,sources,24)==DL_SELECT_UNAVAILABLE);
        assert(dl_move(0,32,64)==0);
        assert(!phase && !current && !starts);
        queued_token=25; advance();
        assert(queued_token==25 && !phase && !current && !starts);
        queued_token=0;
    }
    hook_idle=1;saved=0;queued_token=25;advance();
    assert(!queued_token && phase==1 && current==25 && starts==1);
    phase=0;waiting=0;initialized=1;dl_buffers_init(&buffers,0);
    for(unsigned i=0;i<16;++i) buffers.live[i]=buffers.target[i]=DL_BUF_NONE;
    assert(dl_hook_buffer_ranges_idle(1));
    buffers.live[14]=2;assert(!dl_hook_buffer_ranges_idle(1));
    buffers.live[14]=DL_BUF_NONE;buffers.target[10]=2;assert(!dl_hook_buffer_ranges_idle(1));
    buffers.target[10]=DL_BUF_NONE;buffers.open=1;assert(!dl_hook_buffer_ranges_idle(1));
    buffers.open=0;queued_token=1;assert(!dl_hook_buffer_ranges_idle(1));
    queued_token=0;buffers.live[0]=7;assert(!dl_hook_buffer_ranges_idle(1));
    return 0;
}

/* SPDX-License-Identifier: GPL-3.0-or-later
 * Actual generated frame jobs. The clock is a host fixture; packet logic,
 * HF2/HF3 acknowledgement and timeout ownership are the production source. */
#include <assert.h>
#include "transfer.h"
int dl_hook_reset_start(unsigned,unsigned,unsigned,unsigned,const uint32_t *);
volatile uint32_t test_clock;
static unsigned flags[2];
unsigned modwerk_dsp_flags(unsigned core) { return flags[core]; }
void dl_selection_tick(void) {}
void dl_residency_tick(void) {}
void dl_show_message(const char *text,unsigned duration) { (void)text; (void)duration; }
static void answer(unsigned core,unsigned refused) {
    flags[core]=(flags[core]^1u)&1u;
    if(refused) flags[core]|=2u;
    dl_frame();
}
static void checksum(unsigned core) {
    unsigned sum=0;
    for(unsigned i=0;i<DL_WORDS;++i) sum+=dl_tx[core][i];
    assert(!(sum&65535u));
}
int main(void) {
    uint32_t words[24];
    for(unsigned i=0;i<24;++i) words[i]=(0x123456u+i*0x731u)&0xffffffu;
    assert(!dl_hook_reset_start(0,1,0,0,words));
    assert(!dl_hook_reset_start(0,1,0,25,words));
    assert(!dl_hook_reset_start(2,1,0,1,words));
    assert(!dl_hook_reset_start(1,2,0,1,words));
    assert(!dl_hook_reset_start(0,8,0,1,words));
    assert(!dl_hook_reset_start(0,1,527,2,words));
    assert(!dl_hook_reset_start(0,1,1042,1,words));
    words[0]=0x1000000u;
    assert(!dl_hook_reset_start(0,4,0,1,words)); words[0]=0x123456u;
    for(unsigned core=0;core<2;++core) {
        assert(dl_hook_reset_start(core,1,528,24,words));
        assert(!dl_command_start(core,10,0,1,0));
        dl_frame(); checksum(core);
        assert(dl_tx[core][2]==11u && dl_tx[core][3]==core && dl_tx[core][4]==24u);
        assert(dl_tx[core][5]==528u && dl_tx[core][7]==1u);
        for(unsigned i=0;i<24;++i)
            assert((((uint32_t)dl_tx[core][8+2*i]<<8)|dl_tx[core][9+2*i])==words[i]);
        assert(dl_job_status(core)==0); dl_job_release(core);
        assert(dl_job_status(core)==0); /* release cannot abandon a pending ACK */
        answer(core,0); assert(dl_job_status(core)==1); dl_job_release(core);
        assert(!dl_command_start(core,10,0,8,0));
        assert(!dl_command_start(core,10,0,1,1));
        if(core) assert(!dl_command_start(core,10,0,2,0));
        assert(dl_command_start(core,10,0,5,0)); dl_frame(); checksum(core);
        assert(dl_tx[core][4]==0 && dl_tx[core][5]==5 && dl_tx[core][7]==0);
        answer(core,1); assert(dl_job_status(core)==-1); dl_job_release(core);
        assert(dl_hook_reset_start(core,4,3775,1,words)); dl_frame();
        for(unsigned i=0;i<64;++i) dl_frame();
        assert(dl_job_status(core)==-1); dl_job_release(core);
        assert(dl_job_status(core)==-2);
    }
    return 0;
}

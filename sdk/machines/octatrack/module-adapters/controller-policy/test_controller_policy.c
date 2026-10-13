/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "controller_policy.h"
#include <assert.h>
#include <limits.h>
#include <string.h>

int main(void)
{
    unsigned char guard[32], before[32];
    memset(guard, 0xa5, sizeof guard);
    memcpy(before, guard, sizeof guard);
    assert(modwerk_controller_policy_entries() == 0);
    for (unsigned core = 0; core < 2; ++core)
        for (unsigned id = 0; id < 64; ++id)
            assert(!modwerk_stock_hook_buffer_policy(core, id,
                (struct mw_hook_buffer_claim *)(void *)guard));
    assert(!modwerk_stock_hook_buffer_policy(UINT_MAX, UINT_MAX, 0));
    for (unsigned feature = 0; feature < 8; ++feature)
        assert(!modwerk_stock_hook_fixed_ranges_idle(feature));
    assert(!modwerk_stock_hook_fixed_ranges_idle(UINT_MAX));
    assert(memcmp(guard, before, sizeof guard) == 0);
    return 0;
}

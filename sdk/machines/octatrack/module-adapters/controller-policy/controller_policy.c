/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "controller_policy.h"

/* No private source-bound declarations have been qualified in this bridge.
 * These mandatory strong definitions permit a closed-policy native link;
 * module names, effect IDs and absent policy never establish admission. */
unsigned modwerk_controller_policy_entries(void) { return 0; }

int modwerk_stock_hook_buffer_policy(unsigned core, unsigned id,
                                    struct mw_hook_buffer_claim *out)
{
    (void)core; (void)id; (void)out;
    return 0;
}

int modwerk_stock_hook_fixed_ranges_idle(unsigned feature)
{
    (void)feature;
    return 0;
}

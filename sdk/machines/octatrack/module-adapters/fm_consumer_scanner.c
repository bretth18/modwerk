/* SPDX-License-Identifier: MIT */
#include "machine_lifetime.h"
static int read_target(void *context,uint32_t address,void *out,uint32_t length) {
    (void)context;
    const volatile uint8_t *from=(const volatile uint8_t *)(uintptr_t)address;
    volatile uint8_t *to=out;
    while(length--) *to++=*from++;
    return 1;
}
int scan(uint32_t lo,uint32_t hi) { return machine_ui_lifetime(read_target,0,lo,hi); }

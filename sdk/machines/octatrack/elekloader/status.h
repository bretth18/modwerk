/* SPDX-License-Identifier: GPL-3.0-or-later
 * What status.c's MODULE LOAD page reads from dsp.c: each installed module effect and what it costs. */
#ifndef MODWERK_STATUS_H
#define MODWERK_STATUS_H
#include <stdint.h>
struct modwerk_module_load {
    char name[16];
    uint32_t cycles;  /* an instance's chip cycles a sample, of a frame's 4,532 */
    uint8_t id;       /* its handle (effect id) */
    uint8_t measured; /* 1: a hardware figure; 0: 7/4 of an emulator claim (an estimate) */
    uint8_t slots[2]; /* slots running it on core 0 (T5-T8) and core 1 (T1-T4) */
};
unsigned modwerk_dsp_module_loads(struct modwerk_module_load *out); /* dsp.c: how many, at most MODWERK_FX_IDS */
#endif

/* SPDX-License-Identifier: GPL-3.0-or-later
 * Host check of status.c's keys: with the dialog closed every key reaches stock, TRIG 1 (code 0) included
 * (a release swallowed there left bank changes to pattern 1 undone on the unit, 11 October 2026); CUE +
 * PROJ opens it and takes PROJ's release; NO closes it and takes its own. */
#include "status.c"
#include <stdio.h>

static unsigned failures;
#define CHECK(x) do { if (!(x)) { failures++; fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, #x); } } while (0)
/* What status.c reads from the rest of the base; the keys never touch it. */
volatile uint32_t dl_frames, dl_residency_words[2], modwerk_dsp_meter_bits, modwerk_dsp_meter[5];
volatile int32_t modwerk_dsp_meter_core;
const uint16_t modwerk_dsp_arena[2];
int modwerk_dsp_meter_read(unsigned core, unsigned first, unsigned words) { (void)core, (void)first, (void)words; return 0; }
uint32_t dl_buffers_in_use(void) { return 0; }
unsigned modwerk_runtime_active(void) { return 0; }
volatile struct selftest modwerk_selftest;
volatile uint32_t modwerk_selftest_key;
static int selftest_starts, selftest_aborts, menu_closes;
void modwerk_test_close_menu(void) { ++menu_closes; }
int modwerk_selftest_start(void) { ++selftest_starts; return 1; }
void modwerk_selftest_abort(void) { ++selftest_aborts; }
void modwerk_selftest_refresh(void) {}
uint32_t modwerk_runtime_free(uint32_t *largest) { if (largest) *largest = 0; return 0; }
/* dsp.c's MISSING list: `listed` modules at handles 20 and up; modset.c's restore. */
static unsigned listed;
volatile uint32_t modwerk_runtime_ticks;
unsigned modwerk_dsp_missing_list(uint8_t *out, unsigned first, unsigned most)
{
    (void)first, (void)most;
    for (unsigned i = 0; i < listed; ++i) {
        uint8_t *e = out + 4u + 24u * i;
        for (unsigned c = 0; c < 24u; ++c) e[c] = 0;
        e[0] = (uint8_t)(20u + i), e[8] = 'm', e[9] = 'o', e[10] = 'd', e[11] = (uint8_t)('a' + i);
    }
    out[0] = 'M', out[1] = 'W', out[2] = 'M', out[3] = (uint8_t)listed;
    return 4u + 24u * listed;
}
static int restored;
int modwerk_modset_restored(void) { return restored; }
volatile uint32_t modwerk_modset_result;
/* The memory box: picks (the guard's completed count) and USB accepts. */
uint8_t modwerk_test_live_fx[16];
volatile uint32_t dl_selection_completed, modwerk_boot_accepted;
const fx_set modwerk_fx_modules = {{1u << 27 | 1u << 29}};
/* dsp.c's MODULE LOAD list: `installed` modules. */
static unsigned installed;
unsigned modwerk_dsp_module_loads(struct modwerk_module_load *out)
{
    for (unsigned i = 0; i < installed; ++i) out[i] = (struct modwerk_module_load){{'m', (char)('a' + i)}, 400u, (uint8_t)(20u + i), 0, {0, 1}};
    return installed;
}
int main(void)
{
    CHECK(!modwerk_status_key(0, 1) && !modwerk_status_key(0, 0)); /* TRIG 1, dialog closed */
    CHECK(!modwerk_status_key(CUE, 1));
    CHECK(modwerk_status_key(PROJ, 1) && modwerk_status_key(PROJ, 0)); /* CUE + PROJ: open, its release taken */
    CHECK(!modwerk_status_key(CUE, 0));
    CHECK(modwerk_status_key(0, 1) && modwerk_status_key(0, 0));       /* open: keys stay with the dialog */
    CHECK(modwerk_status_key(NO, 1) && modwerk_status_key(NO, 0));     /* NO closes, its release taken */
    CHECK(!modwerk_status_key(0, 1) && !modwerk_status_key(0, 0));     /* closed again: TRIG 1 reaches stock */
    extern int modwerk_test_menu_open;
    modwerk_test_menu(0);                                              /* reached with PROJ's menu closed (a chooser's YES) */
    CHECK(!selftest_starts && !modwerk_status_key(0, 1) && !modwerk_status_key(0, 0)); /* nothing happens */
    modwerk_test_menu_open = 1;
    modwerk_test_menu(0);                                              /* PROJ > MODWERK > SELF TEST */
    CHECK(!menu_closes); modwerk_status_close_menu(); modwerk_status_close_menu();
    CHECK(menu_closes == 1);                                           /* PROJ's menu closed once, after the row's dispatch */
    CHECK(selftest_starts == 1 && modwerk_status_key(YES, 1) && modwerk_status_key(YES, 0)); /* started; keys stay with the page */
    CHECK(modwerk_status_key(NO, 1) && selftest_aborts == 1 && modwerk_status_key(NO, 0));  /* NO aborts and closes */
    CHECK(!modwerk_status_key(0, 1) && !modwerk_status_key(0, 0));     /* closed: TRIG 1 reaches stock */
    /* The missing modules' page: not before the boot's restore is over, then once the list holds still. */
    listed = 5; missing_check(); missing_check();
    CHECK(open == CLOSED);                                             /* the restore is not over: all still missing */
    restored = 1, modwerk_modset_result = 1; missing_check();
    CHECK(open == MISSING && missing_top == 0);
    CHECK(modwerk_status_key(DOWN, 1) && modwerk_status_key(DOWN, 0) && missing_top == 1);
    modwerk_status_key(DOWN, 1); modwerk_status_key(DOWN, 0);
    CHECK(missing_top == 1);                                           /* five names, four rows: no further */
    CHECK(modwerk_status_key(UP, 1) && modwerk_status_key(UP, 0) && missing_top == 0);
    CHECK(modwerk_status_key(0, 1) && modwerk_status_key(0, 0));       /* other keys stay with the page */
    CHECK(modwerk_status_key(YES, 1) && open == CLOSED && modwerk_status_key(YES, 0));
    missing_check(); CHECK(open == CLOSED);                            /* told already: it stays closed */
    listed = 6; missing_check(); CHECK(open == CLOSED);                /* a new one: not until it holds still */
    missing_check(); CHECK(open == MISSING);
    listed = 7; missing_check(); missing_check();                      /* one more while it shows: it is on the page */
    CHECK(modwerk_status_key(NO, 1) && open == CLOSED && modwerk_status_key(NO, 0));
    missing_check(); missing_check(); CHECK(open == CLOSED);           /* so NO closes it for good (12 October 2026) */
    listed = 0; missing_check(); CHECK(open == CLOSED);                /* all installed: it closes */
    /* The memory box: after a pick that puts a module on one slot, or an accept; not after a Part change. */
    memory_tick();
    modwerk_test_live_fx[8] = 27; ++dl_selection_completed; memory_tick();
    CHECK(open == MEMORY);                                             /* E-Verb picked on T1 FX2 */
    CHECK(!modwerk_status_key(YES, 0) && open == MEMORY);              /* the pick's YES release: it stays */
    CHECK(!modwerk_status_key(0, 1) && open == CLOSED);                /* a press closes it and goes on to stock */
    modwerk_test_live_fx[9] = 27, modwerk_test_live_fx[10] = 29; ++dl_selection_completed; memory_tick();
    CHECK(open == CLOSED);                                             /* two slots changed: a Part change */
    ++modwerk_boot_accepted; memory_tick();
    CHECK(open == MEMORY);
    for (unsigned i = 0; i < 90u; ++i) memory_tick();
    CHECK(open == CLOSED);                                             /* gone after a second and a half */
    /* PROJ > MODWERK's other rows: each opens its page; NO closes it. */
    modwerk_load_menu(0);
    CHECK(open == SHOWN && modwerk_status_key(NO, 1) && open == CLOSED && modwerk_status_key(NO, 0));
    modwerk_missing_menu(0);
    missing_check();
    CHECK(open == MISSING);                                            /* asked for: it stays with nothing missing */
    CHECK(modwerk_status_key(YES, 1) && open == CLOSED && modwerk_status_key(YES, 0));
    installed = 6; modwerk_modules_menu(0);
    CHECK(open == MODULE_LOAD && modules_top == 0);
    for (unsigned i = 0; i < 4u; ++i) modwerk_status_key(DOWN, 1), modwerk_status_key(DOWN, 0);
    CHECK(modules_top == 2);                                           /* six modules, four rows: no further */
    CHECK(modwerk_status_key(UP, 1) && modwerk_status_key(UP, 0) && modules_top == 1);
    CHECK(modwerk_status_key(0, 1) && modwerk_status_key(0, 0) && open == MODULE_LOAD); /* other keys stay with the page */
    CHECK(modwerk_status_key(NO, 1) && open == CLOSED && modwerk_status_key(NO, 0));
    modwerk_test_menu_open = 0; modwerk_modules_menu(0);
    CHECK(open == CLOSED);                                             /* only from the open menu */
    if (failures) return 1;
    puts("status keys: ok");
    return 0;
}

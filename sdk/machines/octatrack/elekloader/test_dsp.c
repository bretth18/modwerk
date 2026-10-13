/* SPDX-License-Identifier: GPL-3.0-or-later
 * Host check of the DSP effect glue (cc -DMODWERK_HOST -DMODWERK_DSP_ALLOWANCE0=3120 -DMODWERK_DSP_ALLOWANCE1=3565
 * -DMODWERK_DSP_RESERVE=342):
 * admission against the arena, the instance block, cycles, free ids and
 * effects in use, and the catalog the DSP manager reads. */
#include "dsp.c"
#include "fxmap.c"
#include <stdio.h>
#include <string.h>
const struct fx_legacy modwerk_fx_legacy[] = {{0x873d83ccu, 27, "E-Verb"}};
int modwerk_fxpage_build(unsigned id, uint8_t *recipe, uint32_t bytes, unsigned slots) { (void)id; (void)recipe; (void)bytes; (void)slots; return 1; }
void modwerk_fxpage_drop(unsigned id) { (void)id; }
const uint32_t modwerk_fx_legacy_count = 1;
static char written[256];
static int capture(uint32_t file, const void *data, unsigned length)
{
    (void)file;
    strncat(written, (const char *)data, length);
    return 1;
}

static unsigned failures;
#define CHECK(x) do { if (!(x)) { failures++; fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, #x); } } while (0)
/* The compaction planner: the moves it plans, applied, until it has none; every copy clear of live code. */
static unsigned seed = 2026;
static unsigned rnd(void) { seed = seed * 1103515245u + 12345u; return seed >> 16; }
static void by_address(unsigned *at, unsigned *n, unsigned *align, unsigned k)
{
    for (unsigned i = 1; i < k; ++i)
        for (unsigned j = i; j && at[j - 1] > at[j]; --j) {
            unsigned t = at[j]; at[j] = at[j - 1], at[j - 1] = t;
            t = n[j], n[j] = n[j - 1], n[j - 1] = t;
            t = align[j], align[j] = align[j - 1], align[j - 1] = t;
        }
}
static unsigned pack(unsigned *at, unsigned *n, unsigned *align, unsigned k, unsigned cap) /* the moves it took */
{
    unsigned moves = 0, which, to;
    for (; moves < 64u && modwerk_compact_plan(at, n, align, k, cap, &which, &to); ++moves) {
        CHECK(to + n[which] <= cap && !(to & (align[which] - 1u)));
        for (unsigned q = 0; q < k; ++q) CHECK(to >= at[q] + n[q] || to + n[which] <= at[q]); /* never over live code */
        at[which] = to, by_address(at, n, align, k);
    }
    return moves;
}
static int fits(const unsigned *at, const unsigned *n, unsigned k, unsigned to, unsigned size)
{
    for (unsigned q = 0; q < k; ++q) if (to < at[q] + n[q] && to + size > at[q]) return 0;
    return 1;
}
static void planner(void)
{
    /* Random layouts, blocks anywhere. */
    unsigned roomy = 0, roomy_packed = 0, tight = 0, tight_packed = 0, most = 0;
    for (unsigned trial = 0; trial < 20000u; ++trial) {
        unsigned at[32], n[32], align[32], k = 0, cap = 5075u, pos = 0, used = 0, largest = 0, want = 2u + rnd() % 9u;
        while (k < want) {
            unsigned size = 100u + rnd() % 1600u, gap = rnd() % 3u ? 0 : rnd() % 900u;
            if (pos + gap + size > cap) break;
            at[k] = pos + gap, n[k] = size, align[k] = rnd() % 4u ? 1u : 4u, at[k] &= ~(align[k] - 1u);
            if (k && at[k] < at[k - 1] + n[k - 1]) at[k] = (at[k - 1] + n[k - 1] + align[k] - 1u) & ~(align[k] - 1u);
            if (at[k] + size > cap) break;
            pos = at[k] + size, used += size, largest = size > largest ? size : largest, ++k;
        }
        unsigned moves = pack(at, n, align, k, cap), packed = !modwerk_compact_left(at, n, align, k, cap);
        most = moves > most ? moves : most;
        if (cap - used >= 2u * largest) ++roomy, roomy_packed += packed; else ++tight, tight_packed += packed;
    }
    printf("compaction planner: %u/%u roomy random layouts packed, %u/%u tight ones, at most %u moves\n", roomy_packed, roomy, tight_packed, tight, most);
    CHECK(roomy_packed * 100u >= roomy * 99u && most <= 32u);
    /* Churn as on the unit: blocks come and go, placed as the allocator does (build_core.py: a quarter of the arena or
     * more as high as it fits, the rest as low), and the planner packs after each step. A placement refused although
     * the free words would hold it is what a hole costs. */
    unsigned at[32], n[32], align[32], k = 0, cap = 5075u, steps = 0, adds = 0, refused = 0, split = 0, left_over = 0;
    most = 0;
    for (unsigned step = 0; step < 200000u; ++step) {
        if (k && (k == 8u || rnd() % 2u)) { /* one comes off */
            unsigned r = rnd() % k;
            for (unsigned i = r; i + 1u < k; ++i) at[i] = at[i + 1], n[i] = n[i + 1], align[i] = align[i + 1];
            --k;
        } else { /* one goes on: most 200-800 words, some up to 1,200, a few big */
            unsigned size = rnd() % 10u < 7u ? 200u + rnd() % 600u : rnd() % 3u ? 800u + rnd() % 400u : 1269u + rnd() % 450u;
            unsigned a = rnd() % 4u ? 1u : 4u, free = cap, to = 0, found = 0;
            for (unsigned q = 0; q < k; ++q) free -= n[q];
            if (size * 4u >= cap) {
                for (unsigned t = (cap - size) & ~(a - 1u);; t -= a) { if (fits(at, n, k, t, size)) { to = t, found = 1; break; } if (t < a) break; }
            } else {
                for (unsigned t = 0; t + size <= cap; t += a) if (fits(at, n, k, t, size)) { to = t, found = 1; break; }
            }
            ++adds;
            if (!found) { refused += free >= size + 3u; continue; } /* 3: alignment */
            at[k] = to, n[k] = size, align[k] = a, ++k, by_address(at, n, align, k);
        }
        unsigned moves = pack(at, n, align, k, cap), left = modwerk_compact_left(at, n, align, k, cap);
        most = moves > most ? moves : most, ++steps;
        if (left) ++split, left_over = left > left_over ? left : left_over;
    }
    printf("compaction churn: %u steps, %u placements, %u refused with the words free; %u steps left free words split "
           "(at most %u outside the largest run), at most %u moves\n", steps, adds, refused, split, left_over, most);
    CHECK(most <= 32u);
}
#if MODWERK_FX_IDS > 32
const fx_set modwerk_fx_modules = {{1u << 26 | 1u << 27, 1u << (40 - 32)}}; /* a handle past 32 too */
#else
const fx_set modwerk_fx_modules = {{1u << 26 | 1u << 27}};
#endif
/* identity.c's catalog: SPRING REV (21) a stock package loaded on demand, every other id what stock runs. */
#define STOCK4 STOCK, STOCK, STOCK, STOCK
struct dl_package dl_catalog[MODWERK_FX_IDS] = {STOCK4, STOCK4, STOCK4, STOCK4, STOCK4, STOCK, {1063, 1, MODWERK_DSP_RESERVE, 2, 0, 1, 1}, STOCK, STOCK, STOCK4, STOCK4};
struct code dl_codes[2][MODWERK_FX_IDS];
const uint16_t modwerk_dsp_arena[2] = {2320, 2300};
static int idle = 1;
int dl_publication_idle(void) { return idle; }

/* All handles held: FULL; past 32 ids the fixture's third handle, 40, is still free and goes to the newcomer. */
static int full_or_40(const struct runtime_dsp *none, struct runtime_dsp t) /* a copy: admission writes the id it gives */
{
    int r = modwerk_machine_dsp_admit(none, &t);
    return MODWERK_FX_IDS > 32u ? r == RUNTIME_OK && t.id == 40 : r == RUNTIME_FULL;
}
#define FULL_OR_40(t) full_or_40(&none, (t))
int main(void)
{
    for (unsigned k = 32; k < MODWERK_FX_IDS; ++k) dl_catalog[k] = (struct dl_package)STOCK; /* identity.c's stubs */
    static const uint32_t words[3] = {1, 2, 3};
    static const uint16_t relocations[1] = {0};
    struct runtime_dsp none = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "", 0, 0, 0};
    struct runtime_dsp fx = {words, relocations, 3, 1, 1, 2, 244, 0, 26, 1, RUNTIME_MODELED, 70, 70, 1, "Test FX", 0, 0, 0};
    CHECK(modwerk_machine_dsp_admit(&none, &none) == RUNTIME_OK && modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK);
    /* The effect id is a handle: the preferred one when it is a free module id, else the lowest free module id. */
    fx.id = 27; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK && fx.id == 27);
    fx.id = 21; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK && fx.id == 26); /* a stock effect's id */
    fx.id = MODWERK_FX_IDS + 8; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK && fx.id == 26); /* past the ids */
    fx.id = 26;
    /* The smaller core's arena, the instance block, a known cycle figure within the allowance. */
    fx.count = 2301; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_MEMORY);
    fx.count = 2300; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK);
    fx.count = 3; fx.state = 133; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_MEMORY);
    fx.state = 70; fx.buffer = 3073; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_MEMORY); /* FX1's 3K block */
    fx.slots = 2; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK);                          /* FX2's 16K block */
    fx.buffer = 16385; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_MEMORY);
    fx.slots = 1; fx.buffer = 0; fx.kind = 0; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_CYCLES);
    /* Chip cycles, against the smaller core (core 0 here): an instance fits beside seven dearest stock slots. */
    fx.kind = RUNTIME_HARDWARE; fx.cycles = MODWERK_DSP_ALLOWANCE0 - 7 * MODWERK_DSP_RESERVE + 1; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_CYCLES);
    fx.cycles = MODWERK_DSP_ALLOWANCE0 - 7 * MODWERK_DSP_RESERVE; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK);
    /* An emulator figure is charged at 7/4: the largest that still fits, and one more. */
    fx.kind = RUNTIME_MODELED; fx.cycles = (4 * (MODWERK_DSP_ALLOWANCE0 - 7 * MODWERK_DSP_RESERVE) - 3) / 7; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_OK);
    fx.cycles += 1; CHECK(modwerk_machine_dsp_admit(&none, &fx) == RUNTIME_CYCLES);
    fx.kind = RUNTIME_MODELED; fx.cycles = 244;
    /* Published: the manager's catalog names the code for both cores. */
    modwerk_machine_dsp_switch(&none, &fx);
    CHECK(dl_catalog[26].words == 3 && !dl_catalog[26].resident && dl_catalog[26].qualified && dl_catalog[26].slots == 1 &&
          dl_catalog[26].cycles == (244 * 7 + 3) / 4 && dl_catalog[26].alignment == 1 && !dl_catalog[26].buffer); /* 7/4 of its claim */
    CHECK(dl_catalog[0].cycles == MODWERK_DSP_RESERVE && dl_catalog[0].resident && dl_catalog[21].cycles == MODWERK_DSP_RESERVE &&
          !dl_catalog[21].resident); /* NONE; a stock package */
    CHECK(dl_codes[0][26].words == words && dl_codes[1][26].words == words && dl_codes[1][26].count == 3 && dl_codes[1][26].init == 1 &&
          dl_codes[1][26].proc == 2 && dl_codes[0][26].relocations == relocations && dl_codes[0][26].relocation_count == 1);
    /* Another module preferring 26 gets 27; with both held there is none left; a replacement keeps its own. */
    struct runtime_dsp other = fx;
    other.module = 71; CHECK(modwerk_machine_dsp_admit(&none, &other) == RUNTIME_OK && other.id == 27);
    modwerk_machine_dsp_switch(&none, &other);
    struct runtime_dsp third = fx;
    third.module = 72; CHECK(FULL_OR_40(third));
    third = other; third.id = 26; CHECK(modwerk_machine_dsp_admit(&other, &third) == RUNTIME_OK && third.id == 27);
    modwerk_machine_dsp_switch(&other, &none);
    /* A track running it, or the manager mid-transaction, keeps it: removal and replacement wait. */
    modwerk_test_live_fx[13] = 26;
    CHECK(modwerk_machine_dsp_admit(&fx, &none) == RUNTIME_IN_USE && modwerk_machine_dsp_admit(&fx, &fx) == RUNTIME_IN_USE);
    /* MODULE LOAD (status.c): the one module, unfloored 7/4 of its claim, an estimate, on T6 FX2 (core 0). */
    struct modwerk_module_load loads[MODWERK_FX_IDS];
    CHECK(modwerk_dsp_module_loads(loads) == 1 && loads[0].id == 26 && loads[0].cycles == (244 * 7 + 3) / 4 &&
          !loads[0].measured && loads[0].slots[0] == 1 && !loads[0].slots[1]);
    modwerk_test_live_fx[13] = 4; idle = 0;
    CHECK(modwerk_machine_dsp_admit(&fx, &none) == RUNTIME_BUSY && modwerk_machine_dsp_admit(&fx, &fx) == RUNTIME_BUSY);
    third = fx; third.module = 73;
    CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_OK && third.id == 27); /* a new effect may register mid-transaction */
    idle = 1;
    CHECK(modwerk_machine_dsp_admit(&fx, &none) == RUNTIME_OK);
    modwerk_machine_dsp_switch(&fx, &none);
    CHECK(dl_catalog[26].resident && !dl_catalog[26].words && dl_catalog[26].qualified && dl_catalog[26].cycles == MODWERK_DSP_RESERVE &&
          !dl_codes[0][26].words && !dl_codes[1][26].count);
    /* What the current bank names: the live effects and every Part, working and saved; module ids only. */
    static uint8_t bank[0x9504a + 4 * 6322];
    for (unsigned i = 0; i < 16; ++i) modwerk_test_live_fx[i] = i < 8 ? 4 : 8;
    modwerk_test_live_fx[2] = 26;
    CHECK(modwerk_dsp_used().w[0] == 1u << 26);         /* no project yet: the live effects only */
    modwerk_test_bank = bank;
    bank[0x8ed80 + 3 * 6322 + 9] = 27;                  /* Part 4's FX2 on T2 */
    bank[0x9504a + 1 * 6322 + 0] = 27;                  /* Part 2's saved copy, FX1 on T1 */
    bank[0x8ed80 + 5] = 21;                             /* SPRING REV: stock, not a module */
    CHECK(modwerk_dsp_used().w[0] == (1u << 26 | 1u << 27));
    modwerk_test_live_fx[2] = 4; bank[0x8ed80 + 3 * 6322 + 9] = 0;
    CHECK(modwerk_dsp_used().w[0] == 1u << 27);
    /* What runs dry: an uninstalled module's effect only; a stock effect loads its package. */
    modwerk_test_live_fx[3] = 27; modwerk_test_live_fx[9] = 21;
    CHECK(modwerk_dsp_dry().w[0] == 1u << 27);
#if MODWERK_FX_IDS > 32
    /* Past 32 ids: handle 40 counts as 40, never as 8 (an `& 31` would run it as stock's id 8). */
    modwerk_test_live_fx[4] = 40;
    CHECK(fx_in(modwerk_dsp_used(), 40) && !fx_in(modwerk_dsp_used(), 8) && fx_in(modwerk_dsp_dry(), 40) && !fx_in(modwerk_dsp_dry(), 8));
    modwerk_test_live_fx[4] = 4;
#endif
    modwerk_machine_dsp_switch(&none, &fx); fx.id = 27; modwerk_machine_dsp_switch(&none, &fx);
    CHECK(!fx_any(modwerk_dsp_dry()));
    /* The watchdog: frames still for 30 ticks while a transfer is in flight, reported once; frames moving or no transfer, never. */
    unsigned fired = 0;
    for (unsigned t = 0; t < 100; ++t) fired += modwerk_dsp_stalled(500u + t, 1);   /* frames advance */
    for (unsigned t = 0; t < 100; ++t) fired += modwerk_dsp_stalled(42857u, 0);     /* nothing in flight */
    CHECK(!fired);
    for (unsigned t = 1; t <= 29; ++t) CHECK(!modwerk_dsp_stalled(42857u, 1));
    CHECK(modwerk_dsp_stalled(42857u, 1));                                            /* the 30th still tick */
    for (unsigned t = 0; t < 100; ++t) CHECK(!modwerk_dsp_stalled(42857u, 1));       /* once */
    CHECK(!modwerk_dsp_stalled(42858u, 1));
    /* The project's map (fxmap.c): '#MODWERK_FX=' lines in, only module handles, a failed load changes nothing. */
    for (unsigned k = 0; k < MODWERK_FX_IDS; ++k) release(k);
    for (unsigned i = 0; i < 16u; ++i) modwerk_test_live_fx[i] = 0;
    modwerk_fxmap_begin(0); modwerk_fxmap_line("#MODWERK_FX=26:00000099:1:Parse only", 1); /* the parse-only pass */
    modwerk_fxmap_begin(1);
    modwerk_fxmap_line("#MODWERK_FX=26:00000047:2:Mod G", 0);
    modwerk_fxmap_line("#MODWERK_FX=27:00000046:1:Mod F", 0);
    modwerk_fxmap_line("#MODWERK_FX=21:00000048:1:Stock", 0);   /* a stock effect's id: not a module handle */
    modwerk_fxmap_line("#PLAY_MODES=01", 0);
    modwerk_fxmap_loaded(0);
    char name[16];
    modwerk_fxmap_name(26, name);
    CHECK(modwerk_fxmap_handle(0x46) == 27 && modwerk_fxmap_handle(0x47) == 26 && !modwerk_fxmap_module(21) &&
          modwerk_fxmap_handle(0x99) < 0 && !strcmp(name, "Mod G") && modwerk_test_map.e[26].layout == 2);
    uint32_t generation = modwerk_fxmap_generation();
    modwerk_fxmap_begin(1); modwerk_fxmap_line("#MODWERK_FX=26:00000050:1:Other", 0); modwerk_fxmap_loaded(-1);
    CHECK(modwerk_fxmap_handle(0x47) == 26 && modwerk_fxmap_generation() == generation);
    /* Handles follow the map: 0x46 goes to 27 whatever it prefers; with 26 and 27 named and used, a third finds none. */
    modwerk_test_live_fx[0] = 26; modwerk_test_live_fx[8] = 27;
    third = fx; third.module = 0x46; third.id = 26;
    CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_OK && third.id == 27);
    third.module = 0x48; third.id = 27;
    CHECK(FULL_OR_40(third));
    /* A module holding the handle the map gives another lets go, then takes its own once the manager is idle. */
    third.module = 0x46; third.id = 26; modwerk_machine_dsp_switch(&none, &third); /* installed under the last project */
    modwerk_fxmap_begin(1);                                                      /* then this project loads */
    modwerk_fxmap_line("#MODWERK_FX=26:00000047:2:Mod G", 0); modwerk_fxmap_line("#MODWERK_FX=27:00000046:1:Mod F", 0);
    modwerk_fxmap_loaded(0);
    rebind_tick();
    CHECK(!owner[26] && !owner[27] && rebinding && dl_catalog[26].resident);   /* let go: those slots run dry */
    for (unsigned i = 0; i < 4u; ++i) rebind_tick();
    CHECK(owner[27] == 0x46 && !owner[26] && !rebinding && dl_catalog[27].words == 3 && dl_codes[1][27].words == words &&
          modwerk_fxmap_handle(0x46) == 27);
    /* Saving: one line per handle the project uses. */
    modwerk_test_write = capture;
    modwerk_fxmap_write(7);
    CHECK(!strcmp(written, "#MODWERK_FX=26:00000047:2:Mod G\r\n#MODWERK_FX=27:00000046:1:Mod F\r\n"));
    /* MISSING: what the project names that no installed module answers for (0x47 at 26 is not installed). */
    uint8_t list[316];
    CHECK(modwerk_dsp_missing_list(list, 0, MODWERK_MISSING_PAGE) == 28 && !memcmp(list, "MWM\1", 4) && list[4] == 26 &&
          list[7] == 2 && list[11] == 0x47 && !strcmp((const char *)list + 12, "Mod G"));
    CHECK(modwerk_dsp_missing_list(list, 1, MODWERK_MISSING_PAGE) == 4 && !memcmp(list, "MWM\0", 4)); /* the next page: empty */
#if MODWERK_FX_IDS > 32
    { /* A map a 32-id base left: kept, widened, sealed as this base's (fxmap.c widened). */
        uint32_t *w = (uint32_t *)&modwerk_test_map, sum = 0x5a17u;
        int before = modwerk_fxmap_handle(0x46);
        w[0] = 0x4d574658u; /* 'MWFX', the 32-id layout: entries 0-31, then its sum */
        for (unsigned i = 0; i < (8u + 24u * 32u) / 4u; ++i) sum = sum * 31u + w[i];
        w[(8u + 24u * 32u) / 4u] = sum;
        CHECK(before >= 0 && modwerk_fxmap_handle(0x46) == before && modwerk_test_map.magic == (0x4d574600u | MODWERK_FX_IDS));
    }
#endif
    /* A project without lines names today's assignments. */
    modwerk_fxmap_begin(1); modwerk_fxmap_loaded(0);
    CHECK(modwerk_fxmap_handle(0x873d83ccu) == 27 && !modwerk_fxmap_module(26));
    written[0] = 0; modwerk_fxmap_write(7);
    CHECK(!strcmp(written, "#MODWERK_FX=27:873d83cc:0:E-Verb\r\n"));
    /* A handle an old project uses for a module no map or catalogue names is never handed to another module. */
    modwerk_test_live_fx[0] = 26; third.module = 0x49; third.id = 26;
    CHECK(FULL_OR_40(third));
    modwerk_test_live_fx[0] = 0;
    CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_OK && third.id == 26);
    /* A pinned effect id (its ColdFire code names it): that id or none, never another. */
    third.pinned = 1; third.module = 0x4a; third.id = 26;
    CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_OK && third.id == 26);
    third.id = 27; CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_FULL);   /* 27 is held */
    third.module = 0x873d83ccu; third.id = 26; CHECK(modwerk_machine_dsp_admit(&none, &third) == RUNTIME_FULL); /* the map has it at 27 */
    third.pinned = 0;
    planner();
    if (failures) { fprintf(stderr, "%u DSP glue checks failed\n", failures); return 1; }
    puts("Octatrack DSP glue: admission (ids, arena, instance block, cycles, effects in use), the catalog, the effects a bank names, the stall watchdog, the project handle map and rebinding passed.");
    return 0;
}

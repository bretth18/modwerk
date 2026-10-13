/* SPDX-License-Identifier: GPL-3.0-or-later
 * Host check of boot_anim.c on a simulated clock (20 ms per composed frame), as an MKII and as an MKI:
 * it runs to its end and ends on exactly the authored frame (boot_expect.h, from base_art.final_pixels),
 * never writes outside the frame, drives one LED channel with levels 0-15, keeps every lamp dark while the
 * mark builds, lights the module's answer, its run and the wave, and leaves every lamp dark; on an MKII it sets channel A
 * white first and calls the firmware's colour scheme as the boot did before the logo at the end, on an
 * MKI neither. test_recipe.py generates both headers. */
#include <stdio.h>
#include <string.h>
#include "boot_anim.c"
#include "boot_expect.h"

static unsigned failures;
#define CHECK(x) do { if (!(x)) { failures++; fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, #x); } } while (0)

volatile uint32_t host_dtcn3;
uint32_t host_mkii, host_intensity = 1;
int32_t host_lamps[134];
const uint32_t host_white[3] = {0x0c, 0x30, 0x44};
static unsigned char memory[1024 + 64];   /* the frame with 32 guard bytes either side */
static unsigned char *const frame = memory + 32;
static int levels[134], frames, odd_lit, out_of_range, build_lit, answer_lit, run_lit, wave_lit, wave_full;
static int whites, wrong_palette, schemes, scheme_args[4], scheme_while_on;

void host_clear(void *window, int a, int b) { (void)window; (void)a; (void)b; }
void host_led_on(int id) { (void)id; }
void host_led_off(int id) { (void)id; }
void host_led_send(void) {}

void host_palette(int id, int reg, int r, int g, int b)
{
    if (reg != 1 || id & 1 || r != 0x30 || g != r || b != r || frames) wrong_palette++;
    whites++;
}

void host_scheme(int level, int backlight, int lists, int keys)
{
    scheme_args[0] = level, scheme_args[1] = backlight, scheme_args[2] = lists, scheme_args[3] = keys;
    scheme_while_on += on;
    schemes++;
}

void host_led_level(int id, int level)
{
    if (level < 0 || level > 15) out_of_range++;
    if (id & 1 && level) odd_lit++;
    if (level && now < T_WAIT) build_lit++;
    if (level == 15 && now >= T_WAVE) wave_full++;
    if (level && id == 0 && now >= T_WAIT && now < T_FLY0) answer_lit++;
    if (level >= 8 && now >= T_FLY0 && now < T_DOCK) run_lit++;
    if (level && now > T_WAVE + 400) wave_lit++;
    levels[id] = level;
}

void host_compose(void)
{
    memset(memory, 0xa5, sizeof memory);
    memset(frame, 0, 1024);
    modwerk_boot_draw(frame);
    for (int i = 0; i < 32; i++)
        CHECK(memory[i] == 0xa5 && memory[32 + 1024 + i] == 0xa5);
    frames++;
    host_dtcn3 += 132000u * 20;
}

static void run(uint32_t mkii)
{
    host_mkii = mkii, frames = odd_lit = out_of_range = build_lit = answer_lit = run_lit = wave_lit = wave_full = 0;
    whites = wrong_palette = schemes = scheme_while_on = 0;
    int window;
    modwerk_boot_run(&window);
    CHECK(frames >= T_END / 20 - 1 && frames <= T_END / 20 + 1);
    CHECK(!on);
    unsigned char expect[1024] = {0};
    for (int i = 0; i < BOOT_EXPECT; i++) {
        int bit = 63 - boot_expect[i][1];
        expect[boot_expect[i][0] * 8 + (bit >> 3)] |= (unsigned char)(0x80 >> (bit & 7));
    }
    CHECK(memcmp(frame, expect, 1024) == 0);
    CHECK(out_of_range == 0 && odd_lit == 0);
    CHECK(build_lit == 0 && answer_lit > 0 && run_lit > 0 && wave_lit > 0 && wave_full > 0);
    for (int id = 0; id < 134; id++)
        CHECK(levels[id] == 0);
    if (mkii) {
        CHECK(whites == 67 && wrong_palette == 0);
        CHECK(schemes == 1 && scheme_while_on == 0);
        CHECK(scheme_args[0] == 1 && scheme_args[1] == 0 && scheme_args[2] == 1 && scheme_args[3] == 0);
    } else
        CHECK(whites == 0 && schemes == 0);
    int32_t x, y;   /* the run ends in the detached tile's place */
    module(T_DOCK, &x, &y);
    CHECK(x == DOCK_X && y == DOCK_Y);
}

int main(void)
{
    for (int i = 0; i < 67; i++)   /* a 17 x 4 grid of lamps over a panel-sized area, the LCD among them */
        host_lamps[2 * i] = 1500 + i % 17 * 2000, host_lamps[2 * i + 1] = 2500 + i / 17 * 3800;
    run(1);
    run(0);
    if (failures) fprintf(stderr, "%u failures\n", failures);
    return failures != 0;
}

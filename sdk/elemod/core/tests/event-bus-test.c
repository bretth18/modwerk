/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <assert.h>
#include "event-bus.h"

static int sequence[8], count, ctrl, bmp, brain, event, menu;
static void record(int value) { assert(count < 8); sequence[count++] = value; }
static void tick_a(void *p) { assert(p == &ctrl); record(1); }
static void tick_b(void *p) { assert(p == &ctrl); record(2); }
static void draw_a(void *p, void *q) { assert(p == &bmp && q == &ctrl); record(3); }
static int key_a(void *p, void *q) { assert(p == &brain && q == &event); record(4); return 0; }
static int key_b(void *p, void *q) { assert(p == &brain && q == &event); record(5); return -7; }
static int forbidden(void *p, void *q) { (void)p; (void)q; assert(0); return 0; }
static void settings_a(void *p) { assert(p == &menu); record(6); }
static void render_a(void) { record(7); }
mw_tick_handler ev_tick[] = {tick_a, tick_b, 0};
mw_draw_handler ev_draw[] = {draw_a, 0};
mw_input_handler ev_key[] = {key_a, key_b, forbidden, 0};
mw_input_handler ev_enc[] = {key_a, 0};
mw_settings_handler ev_settings[] = {settings_a, 0};
mw_render_handler ev_render_in[] = {render_a, 0};
mw_render_handler ev_render_out[] = {0};
#ifdef MODWERK_DIGITONE
static void voice_a(int voice, int track, void *p) { assert(voice == 7 && track == 2 && p == &event); record(8); }
static int hold_a(void *p, void *q, int track) { assert(p == &brain && q == &event && track == 3); record(9); return 12; }
static int hold_forbidden(void *p, void *q, int track) { (void)p; (void)q; (void)track; assert(0); return 0; }
mw_voice_handler ev_voice_on[] = {voice_a, 0};
mw_hold_handler ev_hold[] = {hold_a, hold_forbidden, 0};
#endif
int main(void) {
    mw_dispatch_tick(&ctrl); assert(count == 2 && sequence[0] == 1 && sequence[1] == 2);
    count = 0; mw_dispatch_draw(&bmp, &ctrl); assert(count == 1 && sequence[0] == 3);
    count = 0; assert(mw_dispatch_key(&brain, &event) == -7); assert(count == 2 && sequence[1] == 5);
    count = 0; assert(mw_dispatch_enc(&brain, &event) == 0); assert(count == 1 && sequence[0] == 4);
    count = 0; mw_dispatch_settings(&menu); assert(count == 1 && sequence[0] == 6);
    count = 0; mw_dispatch_render_in(); assert(count == 1 && sequence[0] == 7);
    count = 0; mw_dispatch_render_out(); assert(count == 0);
    ev_key[0] = 0; assert(mw_dispatch_key(&brain, &event) == 0);
    ev_tick[0] = 0; mw_dispatch_tick(&ctrl); assert(count == 0);
#ifdef MODWERK_DIGITONE
    mw_dispatch_voice(7, 2, &event); assert(count == 1 && sequence[0] == 8);
    count = 0; assert(mw_dispatch_hold(&brain, &event, 3) == 12); assert(count == 1 && sequence[0] == 9);
    ev_hold[0] = 0; assert(mw_dispatch_hold(&brain, &event, 3) == 0);
#endif
    return 0;
}

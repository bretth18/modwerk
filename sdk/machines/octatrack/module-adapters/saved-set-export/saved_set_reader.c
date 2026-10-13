/* SPDX-License-Identifier: GPL-3.0-or-later
 * Engine-only OS1.40C adapter. Caller also refuses pending save/upload/DSP work. */
#include <stdint.h>
#include "saved_set_export.h"
struct file_object { uint32_t word[6]; };
extern int olog_stock_open(struct file_object *, const char *, const char *, void *, unsigned);
extern int olog_stock_read(struct file_object *, void *, unsigned);
extern int olog_stock_close(struct file_object *);
/* Includes the logger's gate and no save/upload/trial/DSP publication work.
 * The integrating base must implement this seam; there is no permissive default. */
int modwerk_saved_set_safe(void);
#ifdef MODWERK_HOST
extern uint8_t modwerk_test_export_io[512];
int modwerk_test_export_size(struct file_object *);
#define IO modwerk_test_export_io
#define SIZE(f) modwerk_test_export_size(f)
#else
extern uint8_t octamod_log_retained[];
#define IO ((uint8_t *)((uintptr_t)octamod_log_retained + 6144u + 0x08000000u))
static int saved_size(const struct file_object *f)
{
    uint32_t target = *(volatile uint32_t *)0x46c8241eu;
    if (!msx_size_target_allowed(target)) return -1;
    return ((int (*)(uint32_t))(uintptr_t)target)(f->word[0]);
}
#define SIZE(f) saved_size(f)
#endif
enum msx_status modwerk_saved_set_read(uint32_t slot, uint8_t *out, uint32_t capacity, uint32_t *length)
{
    if (length) *length = 0;
    if (slot > 1u || !out || !length || capacity != MSX_CAPACITY) return MSX_INVALID;
    if (!modwerk_saved_set_safe()) return MSX_UNSAFE;
    struct file_object f;
    if (olog_stock_open(&f, slot ? "/MODWERK1.SET" : "/MODWERK0.SET", "r", IO, 512) < 0) return MSX_READ_FAILED;
    enum msx_status result = MSX_READY;
    int size = SIZE(&f);
    if (size <= 0 || (uint32_t)size > capacity) result = MSX_INVALID;
    for (uint32_t at = 0; result == MSX_READY && at < (uint32_t)size; at += 512u) {
        uint32_t n = (uint32_t)size - at; if (n > 512u) n = 512u;
        if (!modwerk_saved_set_safe()) result = MSX_UNSAFE;
        else if (olog_stock_read(&f, out + at, n) != 1) result = MSX_READ_FAILED;
    }
    /* Close also on gate loss: do not strand an opened stock descriptor. */
    if (olog_stock_close(&f) < 0) result = MSX_READ_FAILED;
    if (result == MSX_READY && !modwerk_saved_set_safe()) result = MSX_UNSAFE;
    if (result == MSX_READY) *length = (uint32_t)size;
    return result;
}

/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <stdio.h>
#include <string.h>
#include "saved_set_export.h"
#include "upload.h"
#define CHECK(x) do { if (!(x)) { fprintf(stderr, "failed line %u: %s\n", __LINE__, #x); return 1; } } while (0)
struct file_object { uint32_t word[6]; };
uint8_t modwerk_test_export_io[512];
static struct msx_export state;
static uint8_t file[MSX_CAPACITY], collected[MSX_CAPACITY];
static int gate, open_fail, read_fail, close_fail, drop_after_read, size_value;
static unsigned opens, reads, closes, position, selected;
static int bad_call;
int modwerk_saved_set_safe(void) { return gate; }
int olog_stock_open(struct file_object *f, const char *path, const char *mode, void *io, unsigned n)
{
    ++opens;
    if (strcmp(mode, "r") || io != modwerk_test_export_io || n != 512u) bad_call = 1;
    if (!strcmp(path, "/MODWERK0.SET")) selected = 0;
    else if (!strcmp(path, "/MODWERK1.SET")) selected = 1;
    else bad_call = 1;
    f->word[0] = 71; position = 0;
    return open_fail ? -1 : 0;
}
int modwerk_test_export_size(struct file_object *f) { if (f->word[0] != 71) bad_call = 1; return size_value; }
int olog_stock_read(struct file_object *f, void *out, unsigned n)
{
    ++reads;
    if (!gate || f->word[0] != 71 || !n || n > 512u || position + n > MSX_CAPACITY) bad_call = 1;
    if (read_fail) return 0;
    memcpy(out, file + position, n); position += n;
    if (drop_after_read) gate = 0;
    return 1;
}
int olog_stock_close(struct file_object *f) { ++closes; if (f->word[0] != 71) bad_call = 1; return close_fail ? -1 : 0; }
static uint32_t be32(const uint8_t *p) { return (uint32_t)p[0] << 24 | (uint32_t)p[1] << 16 | (uint32_t)p[2] << 8 | p[3]; }
static void fresh(void)
{
    memset(&state, 0, sizeof state); gate = 1; open_fail = read_fail = close_fail = drop_after_read = bad_call = 0;
    opens = reads = closes = position = selected = 0; size_value = 1001;
    for (unsigned i = 0; i < MSX_CAPACITY; ++i) file[i] = (uint8_t)(i * 17u + 33u);
    memcpy(file, "MWST", 4);
}
static void interrupted_hash(const uint8_t *p, uint32_t n, uint8_t out[32])
{
    mu_sha256(p, n, out); msx_reset(&state); (void)msx_begin(&state, 1);
}
int main(void)
{
    CHECK(msx_size_target_allowed(0x4001b888u));
    CHECK(msx_size_target_allowed(0x40018a0cu));
    CHECK(!msx_size_target_allowed(0));
    CHECK(!msx_size_target_allowed(0x400148c0u));
    CHECK(!msx_size_target_allowed(0x4001b888u + 2));
    uint8_t meta[MSX_METADATA_BYTES], chunk[MSX_CHUNK_BYTES + 2], digest[32]; uint32_t length = 123;
    fresh(); CHECK(!msx_begin(&state, 2) && !msx_begin(&state, UINT32_MAX));
    CHECK(msx_begin(&state, 0) && !msx_begin(&state, 1));
    msx_metadata(&state, meta); CHECK(meta[5] == MSX_PENDING && !be32(meta + 12));
    for (unsigned i = 16; i < sizeof meta; ++i) CHECK(!meta[i]);
    CHECK(!msx_chunk(&state, 0, chunk));
    msx_service(&state, 1, modwerk_saved_set_read, mu_sha256);
    CHECK(state.status == MSX_READY && opens == 1 && closes == 1 && reads == 2 && !bad_call);
    CHECK(state.length == 1001); msx_metadata(&state, meta); mu_sha256(file, 1001, digest);
    CHECK(!memcmp(meta, "MWSE", 4) && meta[4] == 1 && meta[6] == 0 && be32(meta + 8) == 1 && be32(meta + 12) == 1001);
    CHECK(!memcmp(meta + 16, digest, 32) && !memcmp(meta + 48, file + 20, 32));
    for (unsigned index = 0, at = 0; at < state.length; ++index) {
        memset(chunk, 0xa5, sizeof chunk); CHECK(msx_chunk(&state, index, chunk + 1));
        CHECK(chunk[0] == 0xa5 && chunk[MSX_CHUNK_BYTES + 1] == 0xa5);
        CHECK(!memcmp(chunk + 1, "MWSC", 4) && be32(chunk + 9) == 1 && be32(chunk + 13) == at);
        unsigned n = be32(chunk + 21); CHECK(n && n <= MSX_CHUNK_DATA && be32(chunk + 17) == state.length);
        memcpy(collected + at, chunk + 33, n); for (unsigned i = n; i < MSX_CHUNK_DATA; ++i) CHECK(!chunk[33 + i]); at += n;
    }
    CHECK(!memcmp(collected, file, 1001) && !msx_chunk(&state, 3, chunk) && !msx_chunk(&state, UINT32_MAX, chunk));
    CHECK(!msx_release(&state, 0) && !msx_release(&state, 2) && msx_release(&state, 1) && !msx_chunk(&state, 0, chunk));
    CHECK(msx_begin(&state, 1)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(selected == 1 && state.token == 2 && state.status == MSX_READY);
    fresh(); CHECK(msx_begin(&state, 0)); msx_service(&state, 0, modwerk_saved_set_read, mu_sha256);
    CHECK(state.status == MSX_UNSAFE && !opens && !reads && !closes);
    fresh(); gate = 0; CHECK(modwerk_saved_set_read(0, collected, MSX_CAPACITY, &length) == MSX_UNSAFE && !length && !opens);
    fresh(); open_fail = 1; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_READ_FAILED && opens == 1 && !closes);
    const int sizes[] = {-1, 0, MSX_CAPACITY + 1};
    for (unsigned i = 0; i < sizeof sizes / sizeof sizes[0]; ++i) {
        fresh(); size_value = sizes[i]; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_INVALID && closes == 1 && !reads);
    }
    fresh(); read_fail = 1; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_READ_FAILED && closes == 1 && !state.length);
    fresh(); close_fail = 1; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_READ_FAILED && closes == 1 && !state.length);
    fresh(); drop_after_read = 1; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_UNSAFE && reads == 1 && closes == 1 && !state.length && !bad_call);
    fresh(); CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, interrupted_hash);
    CHECK(state.status == MSX_PENDING && state.token == 2 && state.slot == 1 && !state.length && !msx_chunk(&state, 0, chunk));
    msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_READY && selected == 1);
    fresh(); state.token = 65535u; CHECK(!msx_begin(&state, 0));
    fresh(); size_value = MSX_CAPACITY; CHECK(msx_begin(&state, 0)); msx_service(&state, 1, modwerk_saved_set_read, mu_sha256); CHECK(state.status == MSX_READY && state.length == MSX_CAPACITY);
    CHECK(msx_chunk(&state, (MSX_CAPACITY - 1u) / MSX_CHUNK_DATA, chunk)); CHECK(!msx_chunk(&state, (MSX_CAPACITY - 1u) / MSX_CHUNK_DATA + 1u, chunk));
    CHECK(!bad_call && position == MSX_CAPACITY && closes == 1);
    CHECK(modwerk_saved_set_read(2, collected, MSX_CAPACITY, &length) == MSX_INVALID);
    CHECK(modwerk_saved_set_read(0, collected, MSX_CAPACITY - 1, &length) == MSX_INVALID);
    CHECK(modwerk_saved_set_read(0, 0, MSX_CAPACITY, &length) == MSX_INVALID);
    CHECK(modwerk_saved_set_read(0, collected, MSX_CAPACITY, 0) == MSX_INVALID);
    puts("Fixed saved-set snapshots: bounds, hash/chunks, two readonly paths, gate/IO/close failures and interrupted publication passed."); return 0;
}

/* Host test for the OCTAMOD.LOG ring and formatter (DRAFT).
 *   cc -std=c99 -Wall -Wextra -Werror -DOCTAMOD_LOG_HOST -I.. host_test.c ../octamod_log.c
 *   ./a.out expected.log          compare with the committed fixture
 *   ./a.out --write expected.log  regenerate it
 * The fixture is also parsed by src/community/ot-log.test.ts, so the C
 * writer and the web validator cannot drift apart silently. */
#include <stdio.h>
#include <string.h>
#include "octamod_log.h"

static struct octamod_log_ring ring, previous;
static char file[OCTAMOD_LOG_FILE_SIZE];
static int failures;
#define CHECK(x) do { if (!(x)) { fprintf(stderr, "FAIL %s:%d %s\n", __FILE__, __LINE__, #x); ++failures; } } while (0)

static const struct octamod_log_identity identity = { "0123456789abcdef", "1.40C", "repitch@0.1.0;miniverb@0.1.2",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "FILTER;REPITCH", "MINIVERB;DELAY", "", 1 };

int main(int argc, char **argv)
{
    /* Cold boot: garbage RAM is not recovered. */
    memset(&ring, 0xA5, sizeof ring);
    CHECK(octamod_log_boot(&ring, &previous) == 0);
    CHECK(ring.boot == 1 && ring.head == 0);

    /* Session 1 overflows the ring: 300 records, 44 dropped, then a fault. */
    for (uint32_t i = 0; i < 299; ++i)
        octamod_log(&ring, 1000u + i * 3u, i % 50 ? OLOG_I : OLOG_W, OLOG_TAG('R','P','T','C'), (uint16_t)(i & 0xffu), i, ~i);
    octamod_log(&ring, 0x00ABCDEFu, OLOG_F, OLOG_TAG('F','L','T',0), 0x0003, 0x4000406Au, 0x2700u);
    CHECK(ring.head == 300);

    /* A crash scribbles one record; the formatter must still emit valid text. */
    ring.records[(299u - 3u) & (OCTAMOD_LOG_RECORDS - 1u)].tag = 0x00FF1234u;
    octamod_log_seal(&ring);

    /* Warm reset: session 1 is recovered, session 2 starts at boot 2. */
    CHECK(octamod_log_boot(&ring, &previous) == 1);
    CHECK(ring.boot == 2 && ring.head == 0 && previous.boot == 1 && previous.head == 300);
    octamod_log(&ring, 10, OLOG_I, OLOG_TAG('B','O','O','T'), 0x0001, 0x00000140u, 0);
    octamod_log(&ring, 25, OLOG_I, OLOG_TAG('C','A','R','D'), 0x0002, 0, 0);
    octamod_log(&ring, 40, OLOG_E, OLOG_TAG('D','S','P',0), 0x0010, 0x0000002Au, 0x00000001u);

    /* A corrupted header is not recovered. */
    struct octamod_log_ring scratch = ring, lost;
    scratch.head ^= 1u;
    CHECK(octamod_log_boot(&scratch, &lost) == 0 && scratch.boot == 1);

    /* Invalid identities are refused rather than written. */
    struct octamod_log_identity bad = identity;
    bad.build = "XYZ";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);
    bad = identity; bad.modules = "has space";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);

    bad = identity; bad.modules = "no-version";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);
    bad = identity; bad.modules = "x@1.2.3;";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);
    bad = identity; bad.configuration = "short";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);
    bad = identity; bad.modules = "x@1.0.0;x@1.0.1";
    CHECK(octamod_log_format(&ring, &previous, &bad, file) == 0);
    struct octamod_log_ring snap;
    CHECK(octamod_log_snapshot(&ring, &snap) == 1 && snap.head == ring.head);
    scratch = ring; scratch.head = UINT32_MAX; scratch.count = 256;
    scratch.dropped = UINT32_MAX; octamod_log_seal(&scratch);
    octamod_log(&scratch, 99, OLOG_E, OLOG_TAG('W','R','A','P'), 1, 0, 0);
    CHECK(scratch.head == 0 && scratch.count == 256 && scratch.dropped == UINT32_MAX);
    CHECK(octamod_log_format(&scratch, 0, &identity, file) > 0);
    CHECK(strstr(file, "E WRAP 0001") != NULL);

    uint32_t used = octamod_log_format(&ring, &previous, &identity, file);
    CHECK(used > 0 && used < OCTAMOD_LOG_FILE_SIZE);
    for (uint32_t i = used; i < OCTAMOD_LOG_FILE_SIZE; ++i) CHECK(file[i] == '\n');
    CHECK(memcmp(file, "# OCTAMOD-LOG v2\n", 17) == 0);
    CHECK(strstr(file, "# dropped=44\n") != NULL);
    CHECK(strstr(file, "# recovered=1\n") != NULL);

    if (argc == 3 && !strcmp(argv[1], "--write")) {
        FILE *f = fopen(argv[2], "wb");
        CHECK(f && fwrite(file, 1, used, f) == used && fclose(f) == 0);
    } else if (argc == 2) {
        static char expected[OCTAMOD_LOG_FILE_SIZE + 1];
        FILE *f = fopen(argv[1], "rb");
        size_t n = f ? fread(expected, 1, sizeof expected, f) : 0;
        if (f) fclose(f);
        CHECK(n == used && !memcmp(expected, file, used));
    }
    if (failures) return 1;
    puts("octamod-log host test: ok");
    return 0;
}

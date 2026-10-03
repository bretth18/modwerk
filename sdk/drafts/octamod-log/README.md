# OCTAMOD.LOG logger (draft)

A low-level event log for the Octatrack, so issue reports arrive with what the device actually did. Modules record compact binary events into a RAM ring. The ring is written to `/OCTAMOD.LOG` on the CF card only at safe points, and users attach that file to issue reports on octamod.app.

**Status: draft, not buildable, not in the catalog.** It sits outside native discovery, like the OctaKit draft. The portable ring and formatter are complete and host-tested. Every point that touches stock firmware is unresolved, and the firmware glue fails to compile with `#error` until each one is established against the owner's own OS 1.40C image. Nothing here has run in the emulator or on hardware.

## Files

| File | Role |
| --- | --- |
| `octamod_log.h`, `octamod_log.c` | Ring buffer, interrupt-safe append, reset recovery, fixed-size text formatter. No firmware dependencies. |
| `octamod_log_firmware.c` | Boot, fault and flush hooks plus the card write. Intentionally fails to build. |
| `FORMAT.md` | The file format shared with the website parser. |
| `tests/host_test.c`, `tests/expected.log` | Host test and the fixture it must reproduce byte-for-byte. `src/community/ot-log.test.ts` parses the same fixture. |

## Design

- **Logging never touches the card.** `octamod_log()` does a few stores with the SR interrupt mask at 7, so it is safe from tasks and ISRs and costs no formatting time in an audio-critical path.
- **Flush only where the firmware already does card I/O**: once after boot-time card mount, and after SAVE PROJECT's own writes. Never from an interrupt and never during playback.
- **Fixed-size file.** It is always 32 768 bytes and rewritten in place. After the first creation, flushing never allocates clusters or modifies the FAT.
- **Crash breadcrumbs.** The ring lives in a no-init section. If a reset leaves SDRAM intact, the next boot recovers the previous session, including a `FLT` record with the faulting PC, and writes it as `# recovered=1`.
- **Defensive output.** A record corrupted by a crash is written as `W LOG 0BAD` instead of invalid text, so the website still accepts the file.

## Open research (blocks promotion)

1. **Card write entry and open mode.** The known file API table (`0x46c8241e` size, `0x46c82422` close, `0x46c82426` read, `0x46c8242a` open, `0x46c8243e` seek) has unidentified slots between `0x46c8242e` and `0x46c8243a`. Identify the sector write and the mode that opens for in-place writing (or creation) by disassembly. Prove it in the emulator with `--card-rw` against a FAT image, and diff the image before and after. A wrong pointer can corrupt the card.
2. **Hook sites with `stock_guard` hashes**: early boot (A), the exception vector entry (B), and post-card-mount plus post-SAVE PROJECT (C). Each needs a `Detour` with a stock guard computed from the owner's image, like every other ColdFire module.
3. **No-init placement and SDRAM retention.** Place `.octamod_noinit` outside the region the stock C runtime clears, then measure whether a watchdog or crash reset on MKI and MKII keeps it. If it does not, crash breadcrumbs are lost, but boot and flush logs still work.
4. **RAM budget.** 5 KiB of ring, 5 KiB of recovered copy and a 32 KiB format buffer. Account for them in the module resource estimate, or replace the buffer with a per-sector streaming formatter.
5. **Tick source.** Bind `octamod_log_ticks()` to the stock tick counter.
6. **Composer identity.** The browser composer must emit `octamod_log_identity`, the same configuration hash, OS and `id@version` list the report form sends.
7. **Module instrumentation API.** Expose `octamod_log_event()` through the ColdFire link so modules can log, and document each module's tag and codes.
8. **Qualification.** Full current-version qualification (cycles, memory, hardware) per [the module qualification contract](../../../docs/MODULE_QUALIFICATION.md) before it can enter the catalog. The website starts requiring a log once a catalog module with id `octamod-log` exists (`src/community/issue-context.ts`).

## Test

```sh
cd sdk/drafts/octamod-log/tests
cc -std=c99 -Wall -Wextra -Werror -DOCTAMOD_LOG_HOST -I.. host_test.c ../octamod_log.c -o host_test
./host_test expected.log
```

See `TESTING.md`.

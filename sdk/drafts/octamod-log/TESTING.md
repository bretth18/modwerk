# Testing

| Check | Result | Revision |
| --- | --- | --- |
| Host test: cold boot, ring overflow (300 records, 44 dropped), fault record, corrupted record, warm-reset recovery, corrupted header, invalid identity, padding | Pass (`cc` C99, `-Wall -Wextra -Werror`, Linux x86-64) | this draft |
| Fixture `tests/expected.log` parsed by the website validator | Pass (`src/community/ot-log.test.ts`) | this draft |
| ColdFire cross-compile | Not run: `m68k-elf` toolchain unavailable; firmware glue fails by design with `#error` | — |
| Emulator (`--card-rw`) | Not run: needs the owner's firmware image and the unresolved hook sites | — |
| Hardware | Not run | — |

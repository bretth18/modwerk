# Play Modes: memory

From the octamod build 19 (`out/platform/runtime/runtime.elf`, this
module's linked unit, Octaplay `1d2e9dc`):

| region | space | bytes | notes |
|---|---|---|---|
| code: C engine and glue, 35 detour stubs and entries | SDRAM platform reserve | 6,628 | `.text` from 0x40a955e0 to `pm_state` |
| read-only data: mode names, keys, tables | SDRAM platform reserve | 102 | `.rodata`, 51 + 1 align + 50 |
| state: `pm_state` 224, flags 4, popup 16, held key 4, restart 4, project line 40, current row 2 + 2 align, pattern table 4,352, clipboard / undo rows 34 + 2 align | SDRAM platform reserve | 4,684 | in `.text`, loader-owned, explicitly initialised |
| battery table: 'PMNV', 256 × 9, sum | CS1 battery RAM 0x100f8600..0x100f8f06 | 2,310 | stock references nothing in 0x100f859c..0x100fff00 |

Total 13,724 bytes, all shared (one table for all tracks and patterns; no
per-track copies). Stack: at most 104 bytes below the caller's arguments
(`evidence/cycles.md`). No heap, no DSP memory, no OS-image cave space, no
effect slot. As every DRAM module, the build's platform reserve takes about
10 MB of sample memory (shared with any other DRAM module).

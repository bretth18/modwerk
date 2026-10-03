# OCTAMOD.LOG v1

The text file the on-device logger writes to the CF card root as `/OCTAMOD.LOG`. Users attach it to issue reports; the website validates it with [`src/community/ot-log.ts`](../../../src/community/ot-log.ts) before anything is uploaded, and the Worker validates it again.

The grammar is strict on purpose. An upload that passes can only be this log, so firmware, samples and project files can never be sent by mistake.

## Bytes

- Printable ASCII (0x20–0x7E) and line feeds only. A carriage return before a line feed is tolerated.
- The device always writes exactly 32 768 bytes. Content is followed by line-feed padding, so rewriting the file reuses its clusters and never changes the FAT.
- The website accepts at most 64 KiB.

## Lines

```text
# OCTAMOD-LOG v1                         magic, always line 1
# build=0123456789abcdef                 16 lowercase hex (configuration hash) or "unknown"
# os=1.40C                               base OS version
# modules=repitch@0.1.0;miniverb@0.1.2   composed modules, id@semver, ";"-separated
# boot=1                                 starts a session (one per power-up)
# recovered=1                            this session was recovered after a reset
# dropped=44                             records overwritten before this flush
00044 0000046C I RPTC 002C 0000002C FFFFFFD3
```

`build`, `os` and `modules` must appear before the first `# boot=`. `recovered` and `dropped` belong to the session that follows the latest `boot`. A file usually holds the recovered previous session (the one that crashed or was switched off), then the current session.

Record fields are space-separated and fixed-width:

| Field | Width | Meaning |
| --- | --- | --- |
| seq | 5 decimal | record index in the session, modulo 100 000 |
| ticks | 8 hex | firmware tick counter at the event |
| level | 1 | `D` debug, `I` info, `W` warning, `E` error, `F` fault |
| tag | 1–4 of `A–Z 0–9 _` | who logged it |
| code | 4 hex | tag-specific event code |
| a, b | 8 hex each | event arguments |

## Reserved tags

| Tag | Code | a | b |
| --- | --- | --- | --- |
| `BOOT` | `0001` logger started | 1 if the previous session was recovered | 0 |
| `FLT` | exception vector number | faulting PC | format/vector word |
| `LOG` | `0002` flush done | bytes written | 1 ok / 0 failed |
| `LOG` | `0BAD` record unreadable after a reset (level `W`) | raw a | raw b |
| `CARD` | reserved for card events | | |

A module logs with its own short tag (for example `RPTC` for Repitch) and documents its codes in its README.

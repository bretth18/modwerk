# Unwired, bounded Analog BD Part-root observation

`part_roots.c` prepares a board-side observer of the reviewed eleven task
stacks, saved registers and original backend-entry context. It reads actual
current-TCB/ready-list metadata, derives bounded spans from the fixed task
geometry, probes longs at two-byte alignment and rereads metadata/context.
Unknown tasks, list cycles/duplicates, partial reads, bad stacks, changed
metadata, malformed state and capacity overflow refuse. No host-supplied
span list, task rows or completeness bit is accepted.

Each step performs at most eight reader calls. Actual ColdFire SR must be
level4; lower/unlocked and level5+ masks refuse before scanning. The helper
never writes SR. A real task lock and independently qualified snapshot must
remain held throughout every step, with the original entry context alive.
Endpoint rereads cannot prove absence of ABA if a caller releases/reacquires
the snapshot between chunks. Frame levels5/6 must remain enabled. Native
instructions/read counts are not physical latency or interrupt-delivery proof.

The source-known Part interiors are all16 banks' working/saved records, the
four current working/saved CS1 mirrors, and stock's full-Part clipboard and
undo buffers. The two buffers are included conservatively even when their
current clipboard kind describes another operation. The private native probe
executes the exact original Part copy/paste routines across all16banks,
four Parts and both RAM aliases. It proves both6322-byte copies and the
clipboard kind17 producer/caller; the undo dispatcher caller is source-
inspected only. Imported module sources remain exact.

`MW_AB_ROOT_BYTES_SCANNED` means only that the root bytes were observed.
`mw_ab_part_roots_extra` returns1 for an observed known Part base, and always
returns-1 at end/unknown. It never returns complete0: arbitrary temporary
Part-capable roots and their complete producer/caller closure remain unproven.
Zero matches cannot establish semantic Part completeness. The conservative
AB/1 marker fence must therefore retain unknown state.

The supplied old/new extents must come from independently verified immutable
board associations and cover the whole canonical physical allocations,
including headers/sites/data. Pointer values retain their actual read aliases;
observational comparisons resolve those aliases to physical addresses. A
matching reference records its predecessor/candidate bit; unknown records
both. This bitmask never grants generation identity, allocation publication,
DSP disable/job acknowledgment, UI/foreign-root clearance or retirement.
Those gates remain separate and must retain both owners while this observer
is incomplete. No production reader, context capture, snapshot lease, loader
wiring, enable path or public admission is implemented here.

The private probe refuses drift of original MAIN and the reviewed runtime/
context checkpoints before compiling. The runtime source pin is
`e2a1b0653cb0e89bcba3be63399c51e0b7427b2d02917c3260e8e5b204057a98`;
the entry-wrapper pin is
`7c811eb9f3bccef7b03a129f2ebe00ba477422f07315e682f6211d761aacf44b`.
It independently compares the eleven task records, records stock-span hashes
and builds fresh authored ColdFire helpers at two origins. All firmware,
linked images, logs and receipts stay in a new private directory outside Git:

```sh
lockf -k /tmp/modwerk-check.lock python3 -B \
  sdk/machines/octatrack/module-adapters/analog-bd-parts/probe_part_roots.py \
  --main PRIVATE_ORIGINAL_MAIN --native BUILT_OCTABAM \
  --runtime-source EXACT_REVIEWED_RUNTIME --context-source EXACT_REVIEWED_CONTEXT \
  --out NEW_PRIVATE_DIRECTORY
```

The CI fixture uses authored synthetic memory only. The private probe exercises
original stock clipboard routines and freshly compiled observation code; it
does not boot a complete candidate or qualify physical frame deadlines, actual
board snapshot coherence, asynchronous generation adoption, DSP/audio,
persistence, recovery or reboot.

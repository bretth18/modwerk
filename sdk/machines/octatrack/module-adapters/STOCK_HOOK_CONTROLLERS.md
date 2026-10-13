# Private stock-hook controller preparation

`stock_hook_controllers.py` prepares source-pinned derivatives of the exact
imported Sidechain normalizer and Output Matrix page producer. It does not
publish packages, modify the public base, register controller identities or
admit any runtime module. Original SDK sources remain byte-exact.

The strong ABI in `stock_hook_write_lease.h` requires the actual board backend
to resolve the reviewed controller entry to its complete immutable owned image,
encoded/source hashes and generation. Only actual ACKed and released PUBLISHING
or CF-confirmed ACTIVE bindings can acquire a write lease. An unlocked boolean
query is insufficient. Backend identity, lock, generation, job and retirement
facts cannot come from a host or uploaded ready bit.

The wrappers use caller-stack opaque storage and save all input registers.
After successful Begin they restore only CCR, retaining the backend interrupt
mask across source-owned writes. They preserve the actual authored output
registers/CCR around End. Refused Begin replays only the displaced stock LEA or
phone-byte load; failed End exits without replay, retry or notification. The
backend must refuse nested/reused active leases and restore IRQ state from its
independent active record even if caller storage is corrupt. Neither wrapper
contains a stock call, wait, redraw or notification in its held span.

Only `sc_norm` and `page_levels` are prepared write entries. The original
formatter, descriptor, menu, encoder and project-load functions have no new
runtime authority. They need their own source and retained-root contracts.
There is no encoded SHA, board association or production lease implementation.
The fixture supplies synthetic ABI events at fixed private test addresses.
Returned refusal events are not a test of the production backend's nesting or
reuse implementation.

Output Matrix mode changes are refused in the scoped derivative. Its original
conversion writes all sixteen banks' working and saved Parts, current CS1
copies, live levels, dirty flags and mode/cue mirrors. Disabling/unpatching a
mode-2 project before a verified complete conversion and all current/paused/
saved/CUE root fences would reinterpret destination codes as stock cue levels.
A host mode-off flag or a shortened conversion cannot authorize retirement.
The separate original-source oracle proves conversion semantics, not a runtime
transaction. Its MIDI notifications/redraw must also remain outside any held
span. Before enabling a full conversion, implement an interruptible board-owned
transaction that retains source/image/resources while safely yielding to frames.

Run source-only SDK tests normally. Run actual emulator evidence locally with
the owner's exact original MAIN and built native Octabam archives:

```sh
lockf -k /tmp/modwerk-check.lock python3 -B \
  sdk/machines/octatrack/module-adapters/probe_stock_hook_controllers.py \
  --main PRIVATE_ORIGINAL_MAIN --native PRIVATE_NATIVE_OCTABAM --out NEW_PRIVATE_DIR
```

The tool refuses changed imported sources, firmware identity, non-private or
Git output directories and nonempty outputs. It compares fresh native links at
two origins to relocation replay, then executes original and scoped controllers
against independent memory/register/stack oracles. Outputs and logs are private;
never commit them or use firmware in CI. The receipt records exact authored,
compiler-input and native-archive hashes plus unbound identities.

Executed instructions are distinct from modeled cycles and physical timing.
See `docs/OCTATRACK_HARDWARE_TRAPS.md`: work masking level 5 or above must remain
well under 200 microseconds. Native loops and a clean instruction budget do not
prove backend overhead, physical timing, DSP/audio headroom, complete-base fit,
Part persistence or reboot behavior. Public admission remains closed.

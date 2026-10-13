# Octatrack module-set verifier

`verify-octatrack-module-sets.mjs` uses the frontend MCP service's exported tool API. It defaults to read-only catalogue, package-integrity and connected-capability checks. It does not implement another USB transport. Use Node 24 and a checkout that includes `scripts/frontend-mcp.mjs` with its matching frontend bridge and catalogue. Select the source root at startup; it cannot be changed by a tool request.

Only one process may use the USB bridge at a time. Select an existing bridge explicitly; this runner does not start one, reset the bus or install a base. Stop other device clients before running it. Use an isolated private data directory, as required by the MCP service.

```sh
node scripts/verify-octatrack-module-sets.mjs \
  --mcp-server /private/checked-source/scripts/frontend-mcp.mjs \
  --frontend-root /private/checked-source \
  --socket /private/selected-usb-bridge.sock \
  --data-dir /private/verifier-workspace \
  --all-staged
```

Without `--all-staged`, it preflights E-Verb, Mini Verb, TapeHead and Air Chorus. With it, the selected frontend must also publish Preview Vol and Repitch. Requirements come from the actual connected base and packages; an older base receives no invented capabilities. Every preflight finishes before a trial can start.

Add `--trial --expect-base <exact-64-character-IDENTIFY-hash>` only when trials on that exact private candidate are authorized. Each trial retains every installed module, adds one absent package, runs the frontend's physical self-test, then Undoes it. Before the next trial, the runner verifies the starting base, active identity, inventory and saved module count. Packages already present are retained without reinstallation; legacy inventory provides a layout, not their exact package hash, so replacing them would lack proven rollback bytes.

The frontend loader accepts every earlier change in a multi-package update before starting the last trial. Therefore this runner and the MCP trial guard refuse multiple changes. `--all-staged --trial` exercises individual additions beside the baseline; the complete six-module selection remains **preflight evidence only**. Simultaneous coexistence requires separately authorized acceptance or a future atomic module-set transaction.

Receipts contain identities, package hashes and observed trial/Undo results. They contain no firmware or raw memory. A failed run produces no success receipt, stops the matrix and closes the service so it can Undo an owned trial. A disconnect or failed recovery still needs an operator to inspect the unit before another trial. The runner has no Keep, flash, reboot, panel-key, Part-save or API-write operation.

Self-test and restored inventory do not establish audible behavior, multiple track/slot/core instance isolation, Part/project behavior or physical reboot persistence. Qualify those against the exact candidate under [hardware guidance](../docs/OCTATRACK_DRIVING.md) and [hardware traps](../docs/OCTATRACK_HARDWARE_TRAPS.md). A RAM boot does not qualify a flashed image's reboot persistence. Saved module sets are base-bound; preserve the original private set files before any separately authorized candidate Keep/persistence test.

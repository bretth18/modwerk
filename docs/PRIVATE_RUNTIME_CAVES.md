# Private Octatrack cave preparation

`scripts/prepare-runtime-caves.py` prepares CC Map and Recorder Loop Fix against
the immutable reviewed #486 builder snapshot
`e86283a61338a85634089ad68b01117355dda65a`. It leaves the public catalogue,
qualified base, runtime admission and imported module sources unchanged. These
packages are private development artifacts, not published module updates or
flash instructions.

Use Node 24 and the native `m68k-elf` toolchain. Keep the original extracted
Octatrack 1.40C MAIN, candidate base MAIN and its exact `symbols.json` outside
Git. The script requires the pinned stock MAIN hash, verifies the candidate's
moved arena against its boot references, and uses two addresses inside that
candidate's uncached runtime pool for independent fresh GNU links. The original
MAIN section loads at `0x40000400`; file offsets are relative to that address.

```sh
lockf -k /tmp/modwerk-check.lock python3 -B scripts/prepare-runtime-caves.py \
  --module cc-map \
  --builder-root /private/IMMUTABLE-486-CHECKOUT \
  --stock-main /private/original-1.40C-MAIN.raw \
  --base-image /private/candidate/MAIN.raw \
  --base-symbols /private/candidate/symbols.json \
  --capture --out /private/NEW-cc-capture
```

Capture writes a hash-only recipe and receipt, plus private compiler scratch;
it emits no package. Review any compiled stock coincidences against the exact
authored source and native oracle. A reconstruction may name a bounded,
complete-instruction coincident StockCopy with its source purpose, compiled
span hash and stock address/hash. It may not fill code with arbitrary constants.
Copies cannot overlap one another, relocation words or the declared entry
replay. The unchanged trusted `stock_recipe.apply` checks the exact source,
image and span. Rerun with `--recipe /private/reviewed-recipe.json` and a new
`--out` to save a package only after every guard and the existing strict scan
pass. Changed inputs invalidate the recipe. Directories use mode 0700 and files
0600; output inside any worktree or an existing directory is refused.

The adapter checks each untouched cave against its original native declaration
before changing its runtime integration. CC Map hooks the complete eight-byte
stock code entry, leaving the MIDI dispatch table alone. Nonmapped CCs tail
through a hash-backed replay of the displaced entry, then continue beyond the
hook, avoiding recursive dispatch. Its three internal references stay inside
the owned image. Recorder Loop Fix retains all eight authored jsr/rejoin paths
and census-checks its eleven null-buffer literals before binding them to the
candidate's moved audio arena. Unsupported dependencies, table writes,
formatters, fixed caves and unported resource claims refuse.

Synthetic negatives run in the normal SDK suite. With a native cross compiler,
they also link an authored fixture at two uncached runtime-pool addresses and
compare it with the relocated image. These checks establish code identity,
guarded reconstruction and address arithmetic. They do not establish a physical
USB install, task/cache safety, MIDI behavior, recorder audio, timing, companion
compatibility or Part/project/physical-reboot persistence. Keep those
qualification steps tied to the exact candidate source/base/package before
public admission; never carry an older module's hardware result onto this port.

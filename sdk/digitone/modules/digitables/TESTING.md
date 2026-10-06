# digitables testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.2:

- OS 1.43: built and verified, core 2.2 with digitables 1.3, SHA-256 prefix `aea014f61feb5230`.

This is a build check against the owner’s stock files, kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.43: combines with digihealth.

## Upstream

The author reports testing on a Digitone mk1 (3–4 October 2026): the TBL page, the table editor, the fast speeds, the Mod Menu and ADD steps. Not yet checked: the tables restored at power-up, and the arpeggiator with tables. The author’s documentation in [upstream/README.md](upstream/README.md) adds that the Digitone Keys runs the same OS file but has not been tried, that the power-up step cannot be shown in the author’s emulator, that portamento has not been tried with tables, and that digitables links with digihealth 1.1 in elekloader’s lint but the two have not been run together.

Those results belong to the author’s v1.3 build with elekloader’s toolchain and core-dn1 2.2; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digitables-1.3.elemod` release object for OS 1.43 (SHA-256 `a9a2335d0f0c80c17103062bb731a3560af5aca3b05b1b4650713dd273ca5511`) contains 5,248 B in `.run`, 3,765 B in `.bss` and 48 B of table contributions (12 entries of 4 B: its 7 event subscriptions and its 5 table contributions): **9,061 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

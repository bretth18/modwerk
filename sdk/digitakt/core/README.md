# Digitakt core

The Modwerk core for the Digitakt: a small boot copier and the shared event bus every elemod module links against. [interface.json](interface.json) is its contract: the events, tables and exports it provides (interface 2.1), its claimed resources and its memory areas. `npm run modules:check` rejects modules that use anything the interface does not provide.

**Status:** in development. Modwerk writes its own core from the interface's public documentation (credited in the [Digitakt SDK guide](../../machines/digitakt/README.md)); no other core's source is copied. Interface 2.1 is the compatibility target. The original [shared foundation](../../elemod/core/README.md) supplies boot-only and UI-hook development probes, with a tested dispatcher and tick/draw/key/encoder adapters. SETTINGS rows, render hooks, timer setup and SRC machine integration are pending. Neither probe provides this full interface or enables module downloads.

# Digitone core

The Modwerk core for the Digitone: a small boot copier and the shared event bus every elemod module links against. [interface.json](interface.json) is its contract: the events, tables and exports it provides (interface 2.2), its claimed resources and its memory areas. `npm run modules:check` rejects modules that use anything the interface does not provide.

**Status:** in development. Modwerk writes its own core from the interface's public documentation (credited in the [Digitone SDK guide](../../machines/digitone/README.md)); no other core's source is copied. Interface 2.2 is the compatibility target. The original [shared foundation](../../elemod/core/README.md) supplies boot-only and UI-hook development probes, with a tested dispatcher and tick/draw/key/encoder adapters. SETTINGS rows, render and voice/hold hooks, timer setup, parameter slots, pages, project data and the Mod Menu are pending. Neither probe provides this full interface or enables module downloads.

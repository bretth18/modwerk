# Digitone modules

Each mod is a folder here: `modwerk.module.json`, README, TESTING, licence, `src/` and `media/`. Create one with `npm run module:new -- my-mod --machine digitone --author your-github-login`. See [the Digitone SDK guide](../../machines/digitone/README.md).

## Module guides

| Module | Guide |
| --- | --- |
| [digihealth](digihealth/README.md) | Enable SYSTEM INFO and interpret the effects/mix load and free-RAM readout on OS 1.43. |

| [Digitables](digitables/README.md) | Select a modulation table and edit its steps. |

The guides cover controls, access steps, a practical tutorial and the existing evidence limits. The frontend reads the same descriptions from each module's manifest. Digitone's digihealth has no FAST AUDIO setting and does not measure the FM voice CPU.

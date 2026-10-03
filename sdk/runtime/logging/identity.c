/* Fixed capacity fields are populated by the local composer, before packing.
 * These contain configuration metadata only, never firmware or user paths. */
#include "octamod_log_port.h"
char olog_build[17] = {0};
char olog_os[17] = {0};
char olog_modules[4096] = {0};
char olog_configuration[65] = {0};
char olog_source[65] = {0};
char olog_fx1[1024] = {0};
char olog_fx2[1024] = {0};
char olog_hidden[1024] = {0};
const struct octamod_log_identity octamod_log_identity = {
    olog_build, olog_os, olog_modules, olog_configuration, olog_source,
    olog_fx1, olog_fx2, olog_hidden, 0
};

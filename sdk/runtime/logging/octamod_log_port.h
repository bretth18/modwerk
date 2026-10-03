/* Original platform boundary. No paths or file contents enter events. */
#ifndef OCTAMOD_LOG_PORT_H
#define OCTAMOD_LOG_PORT_H
#include "octamod_log.h"
#define OLOG_FLUSH_INTERVAL 1800u /* thirty seconds of the nominal 60 Hz UI clock */
#define OLOG_FLUSH_RECORDS 64u
struct octamod_log_retained_state {
    char configuration[65];
    uint8_t alignment[3]; /* explicit 4-byte ring alignment on ColdFire and host */
    struct octamod_log_ring ring;
};
extern struct octamod_log_retained_state octamod_log_retained;
extern const struct octamod_log_identity octamod_log_identity;
void octamod_log_platform_init(void);
uint32_t octamod_log_next_correlation(void);
uint32_t octamod_log_ticks(void);
/* Engine context, mounted card, stopped transport/independent tracks/USB disk. */
int octamod_log_can_flush(void);
/* Exactly size bytes, successful close required; refuse foreign files. */
unsigned octamod_log_start_slot(void);
int octamod_log_write_checkpoint(unsigned slot, const char *data, uint32_t size, uint32_t used);
void octamod_log_capture_state(uint32_t correlation);
void octamod_log_on_boot(void);
void octamod_log_event(enum octamod_log_level, uint32_t, uint16_t, uint32_t, uint32_t);
void octamod_log_fault(uint32_t format_sr, uint32_t pc);
int octamod_log_flush(unsigned requested);
void octamod_log_engine_begin(uint32_t job);
void octamod_log_engine_idle(void);
void octamod_log_transport(uint32_t request);
void octamod_log_io_error(uint32_t operation, int32_t result);
#endif

// Firmware regression for live ORIGINAL TEMPO changes on two Repitch tracks.
// Uses the octabam probe approach, Copyright (c) 2026 Sam Banks, MIT.
// The complete retained notice is in sdk/octabam/LICENSE.
// Compile/run only in the reviewed isolated native toolchain, with a private
// Repitch MAIN OS image. No firmware, cards or memory dumps enter the repository.
#include <algorithm>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>
#include "machine.h"
#include "mc68k/Musashi/m68k.h"
#include "mc68k/cpuState.h"
namespace {
constexpr uint32_t lanes = 0x80000510, voices = 0x800049d8, states = 0x80004898;
constexpr uint32_t curState = 0x800062a4, projectTempo = 0x8000181c;
constexpr uint32_t trampoline = 0x47000000, stack = 0x47100000, sentinel = 0x47300000;
struct Probe {
 std::vector<uint8_t> image;
 int failures = 0;
 void check(const char* label, bool ok) {
  failures += !ok;
  std::printf("[%s] %s\n", ok ? "PASS" : "FAIL", label);
 }
 static bool runTo(ot::Machine& m, uint32_t site, uint32_t until, unsigned budget = 400) {
  const uint8_t code[] = {0xa9, 0x3c, 0, 0, 0, 0x20, 0x4e, 0xf9,
   uint8_t(site >> 24), uint8_t(site >> 16), uint8_t(site >> 8), uint8_t(site)};
  for(unsigned i = 0; i < sizeof(code); ++i) m.write8(trampoline + i, code[i]);
  m68k_set_reg(m.getCpuState(), M68K_REG_PC, trampoline);
  unsigned steps = 0;
  while(m.pc() != until && steps++ < budget) if(!m.step()) return false;
  return m.pc() == until;
 }
};
}
int main(int argc, char** argv) {
 if(argc != 2) { std::fprintf(stderr, "Usage: repitch-original-tempo-probe PRIVATE-MAIN-OS.bin\n"); return 2; }
 std::ifstream input(argv[1], std::ios::binary);
 Probe p;
 p.image.assign(std::istreambuf_iterator<char>(input), {});
 if(!input || p.image.size() < 1112560) { std::fprintf(stderr, "Missing/incomplete private MAIN OS image\n"); return 2; }
	// ORIGINAL TEMPO is a live sample attribute. Keep both voices in the
	// same machine: the older matrix constructs a new machine for every
	// source tempo and cannot detect a stale cached rate or cross-track edit.
	// Use the actual FLEX/STATIC slot settings addresses, and the stock
	// setter called by the audio editor's ORIGINAL TEMPO control.
	for(const bool swapRoutes : {false, true}) {
		ot::Machine m(p.image);
		auto* cpu = m.getCpuState();
		constexpr uint32_t sampleSettings[] = {0x100b14f0, 0x100d5f78};
		constexpr unsigned tracks[] = {0, 4};
		bool ok = true;
		m.write32(projectTempo, 2880);
		for(unsigned i = 0; i < 2; ++i) {
			const unsigned t = tracks[i];
			const uint32_t lane = lanes + 48 * t, sample = sampleSettings[i];
			const bool autoMode = bool(i) != swapRoutes;
			m.write16(lane, i ? 0x1c00 : 0x5800); // PTCH must stay inactive
			m.write16(lane + 6, 0x7f00);
			m.write16(lane + 10, 0);
			m.write8(lane + 27, 0);
			m.write8(lane + 28, autoMode ? 1 : 4); // AUTO + sample REPITCH, direct RPCH
			m.write32(voices + 168 * t + 8, sample);
			m.write8(voices + 168 * t + 20, i ? 0 : 1); // STATIC, FLEX
			m.write32(sample + 0x110, autoMode ? 4 : 2);
			m.write32(sample + 0x114, i ? 2160 : 2880);
			m.write32(sample + 0x12c, 0);
			m.write32(sample + 0x130, 88200);
			m.write32(sample + 0x134, 0);
		}
		const auto recalculate = [&](unsigned i) {
			const uint32_t state = states + 40 * tracks[i];
			m.write32(curState, state);
			m.write32(stack + 64, 0x10);
			m68k_set_reg(cpu, M68K_REG_A3, state);
			m68k_set_reg(cpu, M68K_REG_A6, lanes + 48 * tracks[i]);
			m68k_set_reg(cpu, M68K_REG_D5, 26);
			m68k_set_reg(cpu, M68K_REG_SP, stack);
			ok &= Probe::runTo(m, 0x4000406a, 0x40004108) &&
			      m68k_get_reg(cpu, M68K_REG_SP) == stack;
			const uint64_t source = m.read32(sampleSettings[i] + 0x114);
			const uint32_t want = uint32_t(std::min<uint64_t>(0x08000000, 0x04000000ull * 2880 / source));
			ok &= m.read32(state + 36) == want;
			return m.read32(state + 36);
		};
		recalculate(0); recalculate(1);
		for(unsigned i = 0; i < 2; ++i) {
			const unsigned other = 1 - i;
			const uint32_t otherTempo = m.read32(sampleSettings[other] + 0x114);
			const uint32_t otherIncrement = recalculate(other);
			const auto snapshotOther = [&]() {
				std::vector<uint8_t> bytes;
				struct Span { uint32_t address; unsigned count; };
				for(const Span span : {Span{sampleSettings[other], 0x448},
				                      Span{voices + 168 * tracks[other], 168},
				                      Span{lanes + 48 * tracks[other], 48},
				                      Span{states + 40 * tracks[other], 40}})
					for(unsigned offset = 0; offset < span.count; ++offset)
						bytes.push_back(m.read8(span.address + offset));
				return bytes;
			};
			const auto otherBefore = snapshotOther();
			for(const unsigned originalTempo : {5760u, 1440u, 2904u, 2160u}) {
				m.write32(stack, sentinel);
				m.write32(stack + 4, sampleSettings[i]);
				m.write32(stack + 8, originalTempo);
				m.write32(stack + 12, 88200);
				m68k_set_reg(cpu, M68K_REG_SP, stack);
				ok &= Probe::runTo(m, 0x40099090, sentinel, 2000) &&
				      m68k_get_reg(cpu, M68K_REG_SP) == stack + 4;
				ok &= m.read32(sampleSettings[i] + 0x114) == originalTempo;
				recalculate(i);
				ok &= recalculate(other) == otherIncrement &&
				      m.read32(sampleSettings[other] + 0x114) == otherTempo &&
				      snapshotOther() == otherBefore;
			}
		}
		p.check(swapRoutes
		        ? "live ORIGINAL TEMPO: FLEX AUTO/REPITCH + STATIC RPCH update independently; PTCH inactive"
		        : "live ORIGINAL TEMPO: FLEX RPCH + STATIC AUTO/REPITCH update independently; PTCH inactive", ok);
	}

 return p.failures ? 1 : 0;
}

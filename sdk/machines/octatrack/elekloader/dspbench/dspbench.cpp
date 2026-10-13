// SPDX-License-Identifier: GPL-3.0-or-later
// Modwerk's DSP bench: one Octatrack effect on the dsp56300 emulator core, called as stock calls it, so two
// builds of a module can be compared word for word (dspbench.py). No stock image and no Octabam tooling.
//
//   dspbench -code FILE -init HEX -proc HEX -blocks N -out FILE [-in FILE] [-params FILE] [-split N]
//
// -code   the effect's words, 24-bit little-endian, relocated for P:$2000
// -in     int32 little-endian stereo frames (L, R), 16 a block; silence when absent
// -params lines "block,k0,...,k5": knob values 0-127 from that block on (stock hands knob << 16 at r6+n)
// -split  frames in a block's first call (1-15); the second call takes the rest, as a trig mid-block does
// -clobber 1: noise over stock's scratch X:$20-$FF before every call, as the other effects of a frame leave it
// -out    int32 stereo frames as the effect left them
// Prints the instructions executed a block, mean and peak. Not chip cycles: a displacement or two-word operand
// costs the chip more, and the emulator models no stalls; measure cycles on the unit (status meters).
//
// Build (the dsp56300 tree beside ELEKLOADER_DSP_ASM, with its library's flags):
//   V=.../dsp56300; B=$V/build/source
//   c++ -O3 -DNDEBUG -flto -std=gnu++17 -DASMJIT_STATIC -DDSP56300_DEBUGGER=0 -I $V/source -I $V/source/asmjit/src \
//     dspbench.cpp $B/dsp56kEmu/libdsp56kEmu.a $B/dsp56kBase/libdsp56kBase.a $B/asmjit/libasmjit.a -lpthread -o dspbench
//
// Stock's convention, as MINIVERB and the stock effects read it: audio interleaved in X at r0, processed in
// place, n7 frames a call; knobs at X:(r6+0..5); the instance's state at r7; X:$213 points at a cell holding
// its Y buffer's base (16K words, aligned for modulo addressing). m registers linear on entry.
#include "dsp56kEmu/dsp.h"
#include "dsp56kEmu/memory.h"
#include "dsp56kEmu/peripherals.h"

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <map>
#include <memory>
#include <string>
#include <vector>

using namespace dsp56k;

namespace {
constexpr TWord CODE = 0x2000, AUDIO = 0x0000, STATE = 0x6000, KNOBS = 0x6100, CELL = 0x5000, BUFFER = 0x4000;
constexpr TWord SENTINEL = 0x03f000; // a mapped P address the rts returns to

std::vector<uint8_t> slurp(const char* path)
{
    std::ifstream f(path, std::ios::binary);
    if (!f) { std::fprintf(stderr, "cannot read %s\n", path); std::exit(2); }
    return std::vector<uint8_t>((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
}

bool call(DSP& dsp, TWord pc)
{
    dsp.setPC(SENTINEL);
    dsp.jsr(pc);
    for (uint32_t i = 0; i < 20000000u; ++i) {
        if (dsp.getPC().toWord() == SENTINEL) return true;
        dsp.execInterpreter(); // a whole DO loop runs inside one call
    }
    return false;
}
} // namespace

int main(int argc, char** argv)
{
    std::map<std::string, std::string> a;
    for (int i = 1; i + 1 < argc; i += 2) a[argv[i]] = argv[i + 1];
    if (!a.count("-code") || !a.count("-init") || !a.count("-proc") || !a.count("-blocks") || !a.count("-out")) {
        std::fprintf(stderr, "usage: dspbench -code FILE -init HEX -proc HEX -blocks N -out FILE [-in FILE] [-params FILE] [-split N]\n");
        return 2;
    }
    const TWord init = std::strtoul(a["-init"].c_str(), nullptr, 16), proc = std::strtoul(a["-proc"].c_str(), nullptr, 16);
    const int blocks = std::atoi(a["-blocks"].c_str()), split = a.count("-split") ? std::atoi(a["-split"].c_str()) : 0;
    const bool clobber = a.count("-clobber") && a["-clobber"] == "1";
    uint32_t noise = 0x1234567;
    if (blocks < 1 || split < 0 || split > 15) { std::fprintf(stderr, "blocks >= 1, split 0-15\n"); return 2; }

    // On the heap: the core is large (its JIT and caches) and overflows the stack.
    static DefaultMemoryValidator validator;
    auto memory = std::make_unique<Memory>(validator, 0x080000, 0x800000, 0x200000);
    auto px = std::make_unique<Peripherals56362>();
    auto py = std::make_unique<Peripherals56367>();
    auto core = std::make_unique<DSP>(*memory, px.get(), py.get());
    Memory& mem = *memory;
    DSP& dsp = *core;

    const auto code = slurp(a["-code"].c_str());
    for (size_t i = 0; i + 2 < code.size(); i += 3)
        dsp.memWriteP(CODE + TWord(i / 3), code[i] | code[i + 1] << 8 | code[i + 2] << 16); // through the core: it caches decoded P
    mem.set(MemArea_X, 0x213, CELL);
    mem.set(MemArea_X, CELL, BUFFER);

    std::vector<int32_t> in(size_t(blocks) * 32, 0), out(size_t(blocks) * 32, 0);
    if (a.count("-in")) {
        const auto raw = slurp(a["-in"].c_str());
        std::memcpy(in.data(), raw.data(), std::min(raw.size(), in.size() * 4));
    }
    std::vector<std::vector<int>> knobs(blocks, std::vector<int>(6, 0));
    if (a.count("-params")) {
        std::ifstream f(a["-params"]);
        std::string line;
        std::vector<int> now(6, 0);
        int at = 0;
        std::vector<std::pair<int, std::vector<int>>> rows;
        while (std::getline(f, line)) {
            std::vector<int> v;
            for (char* t = std::strtok(line.data(), ","); t; t = std::strtok(nullptr, ",")) v.push_back(std::atoi(t));
            if (v.size() >= 7) rows.push_back({v[0], std::vector<int>(v.begin() + 1, v.begin() + 7)});
        }
        size_t r = 0;
        for (at = 0; at < blocks; ++at) {
            while (r < rows.size() && rows[r].first <= at) now = rows[r++].second;
            knobs[at] = now;
        }
    }
    const auto entry = [&](int block) {
        for (int k = 0; k < 6; ++k) mem.set(MemArea_X, KNOBS + k, TWord(knobs[block][k] & 0x7f) << 16);
        auto& r = dsp.regs();
        for (int i = 0; i < 8; ++i) r.m[i].var = 0xffffff;
        r.r[6].var = KNOBS;
        r.r[7].var = STATE;
    };

    entry(0);
    if (!call(dsp, CODE + init)) { std::fprintf(stderr, "init did not return\n"); return 1; }
    uint64_t instr_sum = 0, instr_peak = 0;
    for (int b = 0; b < blocks; ++b) {
        for (int i = 0; i < 32; ++i) mem.set(MemArea_X, AUDIO + i, TWord(in[size_t(b) * 32 + i]) & 0xffffff);
        const uint64_t i0 = dsp.getInstructionCounter();
        const int parts[2] = {split ? split : 16, split ? 16 - split : 0};
        for (int p = 0, start = 0; p < 2; start += parts[p], ++p) {
            if (!parts[p]) continue;
            entry(b);
            for (TWord at = 0x20; clobber && at < 0x100; ++at) mem.set(MemArea_X, at, (noise = noise * 1664525u + 1013904223u) >> 8);
            dsp.regs().r[0].var = AUDIO + 2 * start;
            dsp.regs().n[7].var = parts[p];
            if (!call(dsp, CODE + proc)) { std::fprintf(stderr, "proc did not return in block %d\n", b); return 1; }
        }
        const uint64_t n = dsp.getInstructionCounter() - i0;
        instr_sum += n;
        if (n > instr_peak) instr_peak = n;
        for (int i = 0; i < 32; ++i) {
            const TWord w = mem.get(MemArea_X, AUDIO + i);
            out[size_t(b) * 32 + i] = int32_t(w << 8) >> 8; // sign-extend 24 bits
        }
    }
    std::ofstream(a["-out"], std::ios::binary).write(reinterpret_cast<const char*>(out.data()), std::streamsize(out.size() * 4));
    std::printf("instructions/block mean %.1f peak %llu\n", double(instr_sum) / blocks, static_cast<unsigned long long>(instr_peak));
    return 0;
}

"""Build a local source-audio probe against this worktree's port libraries.

The stock --dsp-pcwatch switch enables the instrumentation path. The local
copy additionally records X memory at that PC; no shipping port API changes.
"""
import pathlib
import re
import shlex
import subprocess




def build(root, builddir, out, core, pc, knobs, entry):
    out.mkdir(parents=True, exist_ok=True)
    source = (root / 'tools/emu/ot_emu/dsp.cpp').read_text()
    marker = 'void DspPair::instrumentBefore(Core& c, const int i, const uint32_t pc)\n\t{'
    assert source.count(marker) == 1
    probe = '''
        static unsigned savedControls[13] = {};
        // Controls 6/11 become DSP scratch. Sample them before the engine.
        if(i == CORE && pc == ENTRY && c.mem->get(dsp56k::MemArea_X, 0x418) == 0) {
            for(unsigned k = 0; k < 13; ++k) savedControls[k] = c.mem->get(dsp56k::MemArea_X, KNOBS+k);
        }
        if(i == CORE && pc == PC && c.mem->get(dsp56k::MemArea_X, 0x418) == 0) {
            static FILE* output = std::fopen(std::getenv("AB_SOURCE_TRACE"), "w");
            static unsigned lines = 0;
            if(!output) std::abort();
            if(lines++ < 20000) {
                std::fprintf(output, "%llu", static_cast<unsigned long long>(c.executed));
                const unsigned bases[] = {0x418, 0, KNOBS};
                const unsigned sizes[] = {1, 32, 13};
                for(unsigned span = 0; span < 3; ++span) {
                    std::fprintf(output, " |");
                    for(unsigned k = 0; k < sizes[span]; ++k)
                        std::fprintf(output, " %06x", (span == 2 ? savedControls[k] : c.mem->get(dsp56k::MemArea_X, bases[span]+k)) & 0xffffff);
                }
                std::fputc('\\n', output);
            }
        }
'''.replace('ENTRY',hex(entry)).replace('CORE', str(core)).replace('PC', hex(pc)).replace('KNOBS', hex(knobs))
    src = out / 'dsp.cpp'
    src.write_text('#include <cstdlib>\n' + source.replace(marker, marker + probe))
    flags = (builddir / 'CMakeFiles/ot_emu.dir/flags.make').read_text()
    args = []
    for name in ('CXX_DEFINES', 'CXX_INCLUDES', 'CXX_FLAGS'):
        args += shlex.split(re.search(r'^' + name + r' = (.*)$', flags, re.M)[1])
    link = shlex.split((builddir / 'CMakeFiles/ot_emu.dir/link.txt').read_text())
    tail = link[link.index('CMakeFiles/ot_emu.dir/main.cpp.o'):]
    exe = out / 'ot_emu'
    tail[tail.index('-o') + 1] = str(exe)
    subprocess.run([link[0], *args, str(src), *tail], cwd=builddir,
                   check=True, capture_output=True)
    return exe

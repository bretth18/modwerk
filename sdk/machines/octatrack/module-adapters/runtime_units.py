# SPDX-License-Identifier: GPL-3.0-or-later
"""Private linked-source preparation beside the guarded runtime table helper.

This proves source/reference identity, guarded stock sites and reconstruction.
It does not publish a package or qualify dynamic pointer retirement, shared
ownership, persistent settings, audio, transport or physical reboot behavior.
"""
import hashlib
from pathlib import Path
import struct
import subprocess

import runtime_tables


def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True)


def compile_linked(module, sdk_root, builder, work, cross, selected, guards, stock_at):
    """Compile the exact authored units and insertion tables at two origins.

    `builder` is the explicitly trusted loader builder; manifests and callbacks
    are trusted repository source, never MCP arguments. `guards` contains one
    reviewed runtime_tables.capture recipe per declared table. The caller keeps
    this newly created, private output outside Git. No module dependencies, DSP
    claims or runtime state contracts are inferred from a successful compile.
    """
    sdk_root, work = Path(sdk_root).resolve(), Path(work).resolve()
    if (not module.linked or module.key not in selected or module.requires or module.keeps
            or module.dram_regions or module.overrides or module.cf_patches or module.dsp
            or len(guards) != len(module.tables)):
        raise ValueError('Linked preparation needs an explicit complete module without unported resource claims.')
    ancestor = work
    while not ancestor.exists():
        ancestor = ancestor.parent
    if subprocess.run(['git', '-C', str(ancestor), 'rev-parse', '--show-toplevel'],
                      capture_output=True).returncode == 0:
        raise ValueError('Private compilation outputs must stay outside Git.')
    work.mkdir(mode=0o700)
    objects, references = [], []
    labels = {unit.label for unit in module.linked}
    for unit in module.linked:
        source = (sdk_root / unit.source).resolve()
        if not source.is_relative_to(sdk_root) or unit.defsyms or unit.stock_copies:
            raise ValueError('This linked preparation cannot infer external symbols or stock replay ownership.')
        include = work / ('include-' + str(len(objects)))
        include.mkdir(mode=0o700)
        generated = unit.include(selected) if unit.include else '| no generated include\n'
        if not isinstance(generated, str) or len(generated) > 4096:
            raise ValueError('A generated include exceeds its reviewed bounds.')
        (include / 'remix.inc').write_text(generated)
        obj = work / ('unit%d.o' % len(objects))
        run(cross + 'as', '-mcpu=54455', '-I', str(include), str(source), '-o', str(obj), cwd=sdk_root)
        reference = unit.reference_for(selected)
        if not reference:
            raise ValueError('Each linked unit needs its authored native reference identity.')
        address, digest = reference
        elf, raw = work / ('native%d.elf' % len(objects)), work / ('native%d.raw' % len(objects))
        run(cross + 'ld', '-Ttext=' + hex(address), '-o', str(elf), str(obj))
        run(cross + 'objcopy', '-O', 'binary', '-j', '.text', str(elf), str(raw))
        actual = hashlib.sha256(raw.read_bytes()).hexdigest()
        if actual != digest:
            raise ValueError('Authored native reference changed: ' + unit.label)
        references.append(dict(unit=unit.label, address=address, sha256=actual, bytes=raw.stat().st_size,
                               sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                               includeSha256=hashlib.sha256(generated.encode()).hexdigest()))
        objects.append(obj)
    plans = []
    for index, (table, guard) in enumerate(zip(module.tables, guards)):
        if any(unit not in labels for unit, _ in table.symbols):
            raise ValueError('A table names a unit outside the selected extent.')
        plan = runtime_tables.prepare(table, guard, '__runtime_table_%d' % index, stock_at)
        source, obj = work / ('table%d.s' % index), work / ('table%d.o' % index)
        source.write_text(plan['assembly'])
        run(cross + 'as', '-mcpu=54455', str(source), '-o', str(obj))
        objects.append(obj)
        plans.append(plan)
    image, symbols, bss, offsets = builder.link_units(objects, cross, 0, work)
    copies = [copy for plan in plans for copy in runtime_tables.bind(plan, symbols, image, offsets)]
    rebuilt, fresh_high = bytearray(image), bytearray((work / 'image').read_bytes())
    for at, address, length, digest in copies:
        data = stock_at(address, length)
        if hashlib.sha256(data).digest() != digest:
            raise ValueError('A stock table reconstruction guard changed.')
        rebuilt[at:at + length] = fresh_high[at:at + length] = data
    placed_high = bytearray(rebuilt)
    for at in offsets:
        struct.pack_into('>I', placed_high, at, (struct.unpack_from('>I', placed_high, at)[0] + builder.SHIFT) & 0xffffffff)
    if placed_high != fresh_high:
        raise ValueError('Table reconstruction differs from fresh high-origin native assembly.')
    for table, plan in zip(module.tables, plans):
        start = symbols[plan['symbol']]
        for data, placement in ((rebuilt, 0), (placed_high, builder.SHIFT)):
            moved = {name: value + placement for name, value in symbols.items()}
            words = runtime_tables.expected_words(table, stock_at, moved)
            expected = struct.pack('>%dI' % len(words), *words)
            if data[start:start + len(expected)] != expected:
                raise ValueError('A table differs from the independent native insertion oracle.')
    sites = []
    for detour in module.detours:
        n = detour.pad_to or 6
        if (detour.unit not in labels or detour.symbol not in symbols or detour.target is not None
                or detour.kind not in builder.OPCODES or n < 6 or n & 1):
            raise ValueError('A detour must target a selected unit through whole bounded instructions.')
        digest, checked = builder.stock_digest(detour.expect)
        code = builder.OPCODES[detour.kind] + struct.pack('>I', symbols[detour.symbol]) + b'\x4e\x71' * ((n - 6) // 2)
        sites.append((detour.site, digest, code, [2], 2 if detour.kind == 'lea' else 0, checked))
    for index, table in enumerate(module.tables):
        for address, expected in table.refs:
            sites.append((address, hashlib.sha256(struct.pack('>I', expected)).digest(),
                          struct.pack('>I', symbols[plans[index]['symbol']]), [0], 0, 4))
    for ref in module.symbol_refs:
        if ref.unit not in labels or ref.symbol not in symbols:
            raise ValueError('A pointer reference names an unowned symbol.')
        sites.append((ref.addr, hashlib.sha256(struct.pack('>I', ref.expect)).digest(),
                      struct.pack('>I', (symbols[ref.symbol] + ref.addend) & 0xffffffff), [0], 0, 4))
    for poke in module.pokes:
        digest, checked = builder.stock_digest(poke.expect)
        sites.append((poke.addr, digest, bytes(poke.write), [], 0, checked))
    for address, digest, _, _, _, checked in sites:
        if hashlib.sha256(stock_at(address, checked)).digest() != digest:
            raise ValueError('A guarded stock site changed.')
    return dict(image=image, bss=bss, offsets=offsets, sites=sites, copies=copies, symbols=symbols,
                referenceProofs=references, tableOracle=True, origins=[0, builder.SHIFT])

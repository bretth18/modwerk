# SPDX-License-Identifier: GPL-3.0-or-later
"""Private, guarded CavePatch ports. Imported manifests/sources remain exact.

No public package admission or device access. Every self-reference must remain
inside this module; fresh links at actual private-base pool addresses prove it.
"""
import hashlib
from pathlib import Path
import re
import struct
import subprocess

CC_ENTRY = (0x4000e79c, 8, '715d7b1903ad498a152a612ab010424dac3376a75a2bac2c2d898dd767190b42')
STOCK_ARENA = 0x40a955e0
PORTS = {
    'cc-map': ('CC Map', ('CAVE',)),
    'recorder-loop-fix': ('Recorder Loop', ('seekA', 'seekB', 'cave', 'stub', 'stub', 'stub', 'stub', 'stub')),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args, **kwargs):
    return subprocess.check_output([str(item) for item in args], text=True, **kwargs)


def link_objects(builder, objects, cross, origin, work, defsyms=()):
    """Fresh GNU link. Constants and explicitly exported own symbols only."""
    work.mkdir(parents=True, exist_ok=True)
    script, elf, raw = work / 'image.ld', work / 'image.elf', work / 'image.bin'
    script.write_text(builder.SCRIPT % origin)
    names = [name for name, _ in defsyms]
    if len(names) != len(set(names)) or any(not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name) for name in names):
        raise ValueError('Definition symbols must have unique assembler names.')
    definitions = []
    for name, value in defsyms:
        if type(value) is int and 0 <= value <= 0xffffffff:
            expression = hex(value)
        elif isinstance(value, str) and re.fullmatch(r'__cave_[A-Za-z0-9_]+', value):
            expression = value
        else:
            raise ValueError('Definition symbol is not a reviewed constant or own cave symbol.')
        definitions.append('--defsym=' + name + '=' + expression)
    run([cross + 'ld', '--orphan-handling=error', '--no-warn-rwx-segments', '-T', script, *definitions, '-o', elf, *objects])
    run([cross + 'objcopy', '-O', 'binary', '-j', '.image', elf, raw])
    symbols = {}
    for line in run([cross + 'nm', elf]).splitlines():
        parts = line.split()
        if len(parts) != 3:
            raise ValueError('Unresolved or malformed GNU symbol output.')
        symbols[parts[2]] = int(parts[0], 16)
    image = raw.read_bytes()
    if len(image) != symbols['__image_end'] - origin:
        raise ValueError('The linked module image is not contiguous.')
    return image, symbols, symbols['__bss_end'] - symbols['__image_end']


def validate_relocations(image, offsets, end, spans=()):
    if offsets != sorted(set(offsets)):
        raise ValueError('Relocation words must be unique and ordered.')
    previous = -4
    for at in offsets:
        if type(at) is not int or at < 0 or at & 1 or at + 4 > len(image) or at < previous + 4:
            raise ValueError('A relocation word is misaligned, overlapping or outside the image.')
        if struct.unpack_from('>I', image, at)[0] >= end:
            raise ValueError('A relocation target escapes the owned module image/bss.')
        if any(at < start + length and start < at + 4 for start, length in spans):
            raise ValueError('A relocation overlaps a stock-copy placeholder.')
        previous = at


def placed(image, offsets, origin):
    output = bytearray(image)
    for at in offsets:
        value = struct.unpack_from('>I', output, at)[0] + origin
        if value > 0xffffffff:
            raise ValueError('Relocation arithmetic wraps the address space.')
        struct.pack_into('>I', output, at, value)
    return bytes(output)


def source_files(sdk, source, seen=None):
    """Pin direct source includes; arbitrary/incbin/generated inputs refuse."""
    seen = set() if seen is None else seen
    path = (sdk / source).resolve()
    if not path.is_relative_to(sdk.resolve()) or not path.is_file():
        raise ValueError('Cave source/include is outside the SDK.')
    if path in seen:
        return seen
    seen.add(path)
    text = path.read_text()
    if re.search(r'^\s*\.incbin\b', text, re.M):
        raise ValueError('Binary includes cannot enter a stock-free cave port.')
    for include in re.findall(r'^\s*\.include\s+"([^"]+)"', text, re.M):
        source_files(sdk, include, seen)
    return seen


def validate_manifest(module):
    unsupported = [name for name in ('requires', 'pokes', 'tables', 'keeps', 'symbol_refs', 'dram_regions', 'overrides', 'linked', 'detours') if getattr(module, name, ())]
    if getattr(module, 'dsp', None):
        unsupported.append('DSP')
    if unsupported or module.name not in PORTS or len(module.cf_patches) != len(PORTS[module.name][1]):
        raise ValueError('Unported resource or cave declaration: ' + ', '.join(unsupported or [module.name]))
    for cave in module.cf_patches:
        if not cave.source or cave.cave_addr is not None or cave.registers_formatter or cave.reserve:
            raise ValueError('Only source-linked floating caves with no formatter/reserve are ported.')
        if cave.emit and module.name != 'cc-map':
            raise ValueError('An emit callback needs its own reviewed adapter.')


def prepare_caves(module, sdk_root, builder, work, cross, arena_base, entry_guard=CC_ENTRY, pool_origins=()):
    """(image,bss,relocations,sites,copies,sources,proofs), without stock bytes.

    CC Map replaces the code entry, never its MIDI table. Nonmapped CCs tail
    through a separately hash-checked eight-byte stock-copy replay, then rejoin
    after the patched entry. Recorder caves keep their authored replay paths.
    """
    validate_manifest(module)
    sdk_root = sdk_root.resolve(); work.mkdir(parents=True, exist_ok=True)
    title, entries = PORTS[module.name]
    objects, sources, definitions, oracle_proofs = [], {}, [], []
    for index, (cave, entry) in enumerate(zip(module.cf_patches, entries)):
        for path in source_files(sdk_root, cave.source):
            sources['sdk/octabam/' + path.relative_to(sdk_root).as_posix()] = sha(path.read_bytes())
        obj = work / ('cave%d.o' % index)
        run([cross + 'as', '-mcpu=' + cave.cpu, sdk_root / cave.source, '-o', obj], cwd=sdk_root)
        # First prove the untouched source against its own native oracle.
        original, _, bss = link_objects(builder, [obj], cross, 0, work / ('oracle%d' % index), cave.defsyms)
        reference = cave.reference(0) if cave.reference else cave.pinned
        if not reference or original[:len(reference)] != reference or len(original) - len(reference) not in range(4) or any(original[len(reference):]) or bss:
            raise ValueError(cave.label + ': untouched source differs from its native reference.')
        oracle_proofs.append({'source': cave.source, 'bytes': len(reference), 'sha256': sha(reference)})
        symbol = '__cave_entry_%d' % index
        run([cross + 'objcopy', '--redefine-sym=' + entry + '=' + symbol, '--globalize-symbol=' + symbol, obj])
        objects.append(obj)
        definitions += [(name, '__cave_cc_stock_replay' if module.name == 'cc-map' and name == 'CC_NEXT' else value) for name, value in cave.defsyms]
    copies = []
    if module.name == 'cc-map':
        address, n, digest = entry_guard
        if (address, n, digest) != CC_ENTRY:
            raise ValueError('CC Map requires the reviewed complete entry instruction guard.')
        wrapper = work / 'cc-replay.s'
        wrapper.write_text('.text\n.balign 4\n.global __cave_cc_stock_replay\n__cave_cc_stock_replay:\n.space %d\njmp 0x%x\n' % (n, address + n))
        obj = work / 'cc-replay.o'; run([cross + 'as', '-mcpu=' + module.cf_patches[0].cpu, wrapper, '-o', obj]); objects.append(obj)
        sources['generated/cc-replay.s'] = sha(wrapper.read_bytes())
    image, symbols, bss = link_objects(builder, objects, cross, 0, work / 'low', definitions)
    high, _, high_bss = link_objects(builder, objects, cross, builder.SHIFT, work / 'high', definitions)
    offsets = builder.relocations(image, high, len(image) + bss, anywhere=False)
    if bss != high_bss:
        raise ValueError('Bss changes between relocation origins.')
    if module.name == 'cc-map':
        copies.append((symbols['__cave_cc_stock_replay'], entry_guard[0], entry_guard[1], bytes.fromhex(entry_guard[2])))
    spans = [(offset, n) for offset, _, n, _ in copies]
    validate_relocations(image, offsets, len(image) + bss, spans)
    # Native recorder wrappers name stock's null block; the private base moves
    # that arena. Count every compiled literal before replacing it, at all links.
    expected_arena = sum(c.pool_base_literals for c in module.cf_patches)
    def arena_image(data):
        value = bytearray(data); matches = [at for at in range(0, len(value) - 3, 2) if value[at:at + 4] == struct.pack('>I', STOCK_ARENA)]
        if len(matches) != expected_arena or any(at < r + 4 and r < at + 4 for at in matches for r in offsets):
            raise ValueError('Recorder arena literal census differs or overlaps a relocation.')
        if expected_arena and (type(arena_base) is not int or not STOCK_ARENA < arena_base < 0x47f00000 or arena_base & 3):
            raise ValueError('Recorder caves need the exact moved base arena address.')
        for at in matches:
            struct.pack_into('>I', value, at, arena_base)
        return bytes(value)
    image = arena_image(image)
    proofs = []
    for origin in pool_origins:
        fresh, _, fresh_bss = link_objects(builder, objects, cross, origin, work / ('pool-%x' % origin), definitions)
        if bss != fresh_bss or placed(image, offsets, origin) != arena_image(fresh):
            raise ValueError('Relocation does not reproduce fresh assembly inside the private base pool.')
        proofs.append({'origin': origin, 'sha256': sha(arena_image(fresh))})
    sites = []
    if module.name == 'cc-map':
        sites.append((entry_guard[0], bytes.fromhex(entry_guard[2]), struct.pack('>HI', 0x4ef9, symbols['__cave_entry_0']) + b'\x4e\x71', [2], 0, entry_guard[1]))
    else:
        for index, cave in enumerate(module.cf_patches):
            n = cave.hook_stock.length if hasattr(cave.hook_stock, 'sha256') else len(cave.hook_stock)
            if not cave.hook_addr or n < 6 or n > 32 or (cave.hook_addr | n) & 1:
                raise ValueError('A cave hook needs a complete, bounded even instruction span.')
            digest, covered = builder.stock_digest(cave.hook_stock)
            sites.append((cave.hook_addr, digest, struct.pack('>HI', 0x4eb9, symbols['__cave_entry_%d' % index]) + b'\x4e\x71' * ((n - 6) // 2), [2], 0, covered))
    ordered = sorted(sites)
    if any(a[0] + len(a[2]) > b[0] for a, b in zip(ordered, ordered[1:])):
        raise ValueError('Cave code sites overlap.')
    for _, _, code, local, _, _ in sites:
        validate_relocations(code, local, len(image) + bss)
    return image, bss, offsets, sites, copies, sources, {'nativeOracles': oracle_proofs, 'poolLinks': proofs, 'arenaLiterals': expected_arena}

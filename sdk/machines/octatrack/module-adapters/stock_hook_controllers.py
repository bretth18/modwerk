# SPDX-License-Identifier: GPL-3.0-or-later
"""Private source-pinned resident-hook controllers; no package admission.

Imported originals stay exact. A native authored-source oracle precedes each
adaptation; scoped board write leases and exact encoded/source binding must be
independently supplied and qualified before any production integration.
"""
import hashlib
import importlib.util
from pathlib import Path
import subprocess

import cave_runtime
_ROOT = Path(__file__).resolve().parents[4]
_spec = importlib.util.spec_from_file_location('stock_hook_private_paths', _ROOT / 'scripts/runtime_private_paths.py')
_private = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_private)

SOURCE_PINS = {
    'modules/sidechain-compressor/manifest.py': '3bba6ac8ba315e10d6d7f2cb6342fb5ce6564e1ba6cd6ec362787d685c5e0cd7',
    'modules/sidechain-compressor/upstream/tools/patch_sidechain.s': 'e47f44a7685f0ea82d908897d222c04a6c3729c87dc6443d8d18d2af914b0d20',
    'modules/output-matrix/manifest.py': '1e9f844eff11dc2e262fd7efc733ae309c4285fd0a14e494da6b568d24af1216',
    'modules/output-matrix/matrix.s': '41bb06ce2e43d46d32a4b12a1c91df6dddf03f89281c4bcfe1129baa22a7cca1',
}
UNITS = {
    'sidechain-compressor': ('modules/sidechain-compressor/upstream/tools/patch_sidechain.s', 1, ('sc_norm',)),
    'output-matrix': ('modules/output-matrix/matrix.s', 2, ('page_levels', 'set_mode')),
}
SC_REFERENCE = (0x400d7000, 338, '76a4badcef6024b7de8bd6f05930146bdb6a47ffd577da340a6c252c316ff854')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sources(name, sdk):
    if name not in UNITS:
        raise ValueError('No reviewed controller source port: ' + str(name))
    sdk = Path(sdk).resolve()
    result = {}
    for relative in ('modules/' + name + '/manifest.py', UNITS[name][0]):
        path = (sdk / relative).resolve()
        if not path.is_relative_to(sdk) or not path.is_file() or sha(path.read_bytes()) != SOURCE_PINS[relative]:
            raise ValueError('Controller source changed; review its source/ownership contract: ' + relative)
        result[relative] = path.read_text()
    return result


def write_wrapper(entry, feature, body, denied='', before='', capture='', after=''):
    """Source-only strong board lease wrapper. No caller readiness inputs.

    The 104-byte caller frame has the opaque lease, complete register/CCR
    snapshots and two source-owned notification snapshots. Begin's retained
    interrupt mask must survive: only CCR is restored until End. Failed End
    returns immediately without a stock/custom replay or notification.
    """
    return f'''
        .balign 4
        .global {entry}
{entry}:
        lea -104(%sp),%sp
        movem.l %d0-%d7/%a0-%a6,32(%sp)
        move.w %sr,%d0
        move.w %d0,92(%sp)
        pea (%sp)
        pea {feature}.w
        pea {entry}:l
        jsr modwerk_controller_write_begin
        lea 12(%sp),%sp
        cmpi.l #1,%d0
        bne {entry}_denied
        move.w 92(%sp),%d0
        move.w %d0,%ccr
        movem.l 32(%sp),%d0-%d7/%a0-%a6
{before}
        bsr {body}
        movem.l %d0-%d7/%a0-%a6,32(%sp)
        move.w %sr,%d0
        move.w %d0,92(%sp)
{capture}
        pea (%sp)
        jsr modwerk_controller_write_end
        addq.l #4,%sp
        cmpi.l #1,%d0
        bne {entry}_end_failed
        move.w 92(%sp),%d0
        move.w %d0,%ccr
        movem.l 32(%sp),%d0-%d7/%a0-%a6
{after}
        lea 104(%sp),%sp
        rts
{entry}_end_failed:
        move.w 92(%sp),%d0
        move.w %d0,%ccr
        movem.l 32(%sp),%d0-%d7/%a0-%a6
        lea 104(%sp),%sp
        rts
{entry}_denied:
        move.w 92(%sp),%d0
        move.w %d0,%ccr
        movem.l 32(%sp),%d0-%d7/%a0-%a6
        lea 104(%sp),%sp
{denied}
        rts
'''


def adapted_source(name, sdk):
    """Emit an authored derivative while refusing any imported-source drift.

    Matrix set_mode is intentionally refused while this short-lease source
    port is prepared: its original all-bank conversion runs thousands of
    writes and cannot hold a level7 interrupt mask. No truncated conversion
    or caller-provided mode-off flag substitutes for a retirement fence.
    """
    source = sources(name, sdk)[UNITS[name][0]]
    if name == 'sidechain-compressor':
        source = source.replace('sc_norm:\n', 'mw_sc_norm_body:\n', 1)
        return source + write_wrapper('sc_norm', 1, 'mw_sc_norm_body',
                                     denied='        lea 0x80000a50,%a3')
    # Only page publication is a short bounded lease. The actual full-bank
    # conversion remains separate preparation until an interruptible board
    # transaction can retain ownership without masking IRQs across all banks.
    source = source.replace('page_levels:\n', 'mw_matrix_page_body:\n', 1)
    source = source.replace('set_mode:\n', 'set_mode:\n        rts\nmw_matrix_mode_unqualified:\n', 1)
    return source + write_wrapper('page_levels', 2, 'mw_matrix_page_body',
                                 denied='        move.b 0x80000032,%d3')


def compile_original(name, sdk, builder, work, cross='m68k-elf-', pool_origins=(), fixture_imports=None):
    """Fresh low/high and optional pool links of the untouched authored source.

    `builder` is explicitly trusted source, not an MCP/uploaded argument. This
    proves native relocation only. It does not create encoded identities,
    strip DSP declarations or broaden the builder's resource admission.
    Output must already be a new private directory outside all Git worktrees.
    """
    texts = sources(name, sdk)
    work = _private.private_directory(work)
    if any(work.iterdir()):
        raise ValueError('Use a new empty private controller compilation directory.')
    if subprocess.run(['git', '-C', str(work), 'rev-parse', '--show-toplevel'], capture_output=True).returncode == 0:
        raise ValueError('Controller images must stay outside Git.')
    source = Path(sdk).resolve() / UNITS[name][0]
    objects = []
    if fixture_imports is not None:
        if (set(fixture_imports) != {'modwerk_controller_write_begin', 'modwerk_controller_write_end'}
                or any(type(value) is not int or not 0x47400000 <= value < 0x47420000 or value & 3
                       for value in fixture_imports.values())):
            raise ValueError('Private native fixture imports require the exact bounded strong lease seam.')
        source = work / 'authored-adaptation.s'
        source.write_text(adapted_source(name, sdk))
        imports = work / 'fixture-imports.s'
        imports.write_text(''.join(f'.global {symbol}\n.set {symbol}, {value}\n'
                                  for symbol, value in sorted(fixture_imports.items())))
        import_obj = work / 'fixture-imports.o'
        cave_runtime.run([cross + 'as', '-mcpu=54455', imports, '-o', import_obj])
        objects.append(import_obj)
    obj = work / 'authored.o'
    cave_runtime.run([cross + 'as', '-mcpu=54455', source, '-o', obj])
    objects.insert(0, obj)
    low, symbols, bss = cave_runtime.link_objects(builder, objects, cross, 0, work / 'low')
    high, _, high_bss = cave_runtime.link_objects(builder, objects, cross, builder.SHIFT, work / 'high')
    if bss != high_bss:
        raise ValueError('Controller BSS changes between fresh native origins.')
    offsets = builder.relocations(low, high, len(low) + bss)
    cave_runtime.validate_relocations(low, offsets, len(low) + bss)
    if name == 'sidechain-compressor' and fixture_imports is None:
        reference, _, reference_bss = cave_runtime.link_objects(builder, [obj], cross, SC_REFERENCE[0], work / 'reference')
        # The authored .text is338 bytes; the trusted runtime image has its
        # normal two-byte alignment padding. No source byte may be trimmed.
        if (len(reference)!=340 or sha(reference[:SC_REFERENCE[1]])!=SC_REFERENCE[2]
                or any(reference[SC_REFERENCE[1]:]) or reference_bss):
            raise ValueError('Sidechain authored native reference changed.')
    placed = []
    for index, origin in enumerate(pool_origins):
        if type(origin) is not int or origin < 0x40000000 or origin & 15 or origin & 0x08000000 or origin + len(low) + bss > 0x48000000:
            raise ValueError('Private controller origin is not a bounded canonical ColdFire extent.')
        fresh, _, fresh_bss = cave_runtime.link_objects(builder, objects, cross, origin, work / ('pool%d' % index))
        if fresh_bss != bss or cave_runtime.placed(low, offsets, origin) != fresh:
            raise ValueError('Controller relocation differs from fresh native pool assembly.')
        placed.append(dict(origin=origin, bytes=len(fresh), sha256=sha(fresh)))
    preparation = ('sdk/runtime/loader/build.py',
                   'sdk/machines/octatrack/module-adapters/cave_runtime.py',
                   'sdk/machines/octatrack/module-adapters/stock_hook_controllers.py',
                   'sdk/machines/octatrack/module-adapters/stock_hook_write_lease.h')
    return dict(image=low, symbols=symbols, bss=bss, offsets=offsets, nativePools=placed,
                sourceHashes={relative: sha(text.encode()) for relative, text in texts.items()},
                preparationHashes={relative: sha((_ROOT / relative).read_bytes()) for relative in preparation},
                adaptedSourceSha256=sha(source.read_bytes()),
                feature=UNITS[name][1], entries=UNITS[name][2], encodedSha256=None,
                productionLeaseBound=False, admission=False,
                fixtureImports=fixture_imports, matrixModeEnabled=False)

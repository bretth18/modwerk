# SPDX-License-Identifier: GPL-3.0-or-later
"""Execute original compiled adapters/bus; substitute synthetic stock and mod callbacks."""
import json
import struct
import sys
from unicorn import Uc, UC_ARCH_M68K, UC_MODE_BIG_ENDIAN, UC_HOOK_CODE
from unicorn.m68k_const import (
    UC_CPU_M68K_CFV4E, UC_M68K_REG_D0, UC_M68K_REG_D1, UC_M68K_REG_D2,
    UC_M68K_REG_D3, UC_M68K_REG_D4, UC_M68K_REG_D5, UC_M68K_REG_D6,
    UC_M68K_REG_D7, UC_M68K_REG_A0, UC_M68K_REG_A1, UC_M68K_REG_A2,
    UC_M68K_REG_A3, UC_M68K_REG_A4, UC_M68K_REG_A5, UC_M68K_REG_A6,
    UC_M68K_REG_A7, UC_M68K_REG_SR, UC_M68K_REG_PC,
)
REGISTERS = [UC_M68K_REG_D0, UC_M68K_REG_D1, UC_M68K_REG_D2,
             UC_M68K_REG_D3, UC_M68K_REG_D4, UC_M68K_REG_D5,
             UC_M68K_REG_D6, UC_M68K_REG_D7, UC_M68K_REG_A0,
             UC_M68K_REG_A1, UC_M68K_REG_A2, UC_M68K_REG_A3,
             UC_M68K_REG_A4, UC_M68K_REG_A5, UC_M68K_REG_A6]
RETURN, SP, CTRL, BMP, BRAIN, EVENT = 0x40000010, 0x41008000, 0x41004000, 0x41004100, 0x41004200, 0x41004300

for case in json.load(open(sys.argv[1], encoding='utf8')):
    for status in [0x2000, 0x201f, 0x270a]:
        uc = Uc(UC_ARCH_M68K, UC_MODE_BIG_ENDIAN)
        uc.ctl_set_cpu_model(UC_CPU_M68K_CFV4E)
        uc.mem_map(0x40000000, 0x200000)
        uc.mem_map(0x47be0000, 0x20000)
        uc.mem_map(0x41000000, 0x10000)
        image = bytes.fromhex(case['image'])
        uc.mem_write(case['imageBase'], image)
        uc.mem_write(0x41000000, b'\x6b' * 0x10000)
        uc.mem_write(CTRL + 0x20, b'\x00')
        lo, hi = case['layout']['ddr']
        source = case['layout']['runLoad'] - case['imageBase']
        uc.mem_write(lo, image[source:source + hi - lo])
        a, b = case['layout']['bss']
        uc.mem_write(a, bytes(b - a))
        args = [CTRL] if case['event'] == 'tick' else [CTRL, BMP] if case['event'] == 'draw' else [BRAIN, EVENT]
        original_stack = struct.pack('>' + 'I' * (1 + len(args)), RETURN, *args)
        uc.mem_write(SP, original_stack)
        uc.reg_write(UC_M68K_REG_SR, status)
        uc.reg_write(UC_M68K_REG_A7, SP)
        values = [0x12345000 + 0x123 * i for i in range(15)]
        for reg, value in zip(REGISTERS, values):
            uc.reg_write(reg, value)
        hits = []
        callbacks = set(case['handlers']) | {case['stockCall']}
        def intercept(_uc, address, _size, _data):
            if address in callbacks:
                _uc.emu_stop()
        uc.hook_add(UC_HOOK_CODE, intercept)
        pc = case['entry']
        for _ in range(10):
            uc.emu_start(pc, RETURN, count=100_000)
            pc = uc.reg_read(UC_M68K_REG_PC)
            if pc == RETURN:
                break
            assert pc in callbacks, 'Unexpected stop'
            sp = uc.reg_read(UC_M68K_REG_A7)
            expected = args if pc == case['stockCall'] else [BMP, CTRL] if case['event'] == 'draw' else args
            got = list(struct.unpack('>' + 'I' * len(expected), uc.mem_read(sp + 4, len(expected) * 4)))
            assert got == expected, 'Callback arguments changed'
            if pc == case['stockCall']:
                hits.append('stock')
                if case['event'] == 'tick' and case['handlers']:
                    assert uc.mem_read(CTRL + 0x20, 1) == b'\x01', 'Tick must run before compose check'
                uc.reg_write(UC_M68K_REG_D0, 0x55)
                uc.reg_write(UC_M68K_REG_D1, 0x66)
                uc.reg_write(UC_M68K_REG_A0, 0x41005000)
                uc.reg_write(UC_M68K_REG_A1, 0x41005100)
                uc.reg_write(UC_M68K_REG_SR, 0x2609)
            else:
                index = case['handlers'].index(pc)
                hits.append('handler-' + str(index))
                if case['event'] == 'draw':
                    assert hits[0] == 'stock', 'Draw handler must follow stock drawing'
                if case['event'] == 'tick':
                    uc.mem_write(CTRL + 0x20, b'\x01')
                consumed = case['mode'] == 'consume-first' or case['mode'] == 'consume-second' and index == 1
                uc.reg_write(UC_M68K_REG_D0, 0x42 if consumed else 0)
                uc.reg_write(UC_M68K_REG_D1, 0xdeadbeef)
                uc.reg_write(UC_M68K_REG_A0, 0x41006000)
                uc.reg_write(UC_M68K_REG_A1, 0x41006100)
                uc.reg_write(UC_M68K_REG_SR, 0x240f)
            # Synthetic C callback return: only its caller-saved state changes.
            pc = struct.unpack('>I', uc.mem_read(sp, 4))[0]
            uc.reg_write(UC_M68K_REG_A7, sp + 4)
            uc.reg_write(UC_M68K_REG_PC, pc)
        assert pc == RETURN, 'Adapter did not return'
        consumed = case['mode'].startswith('consume')
        expected_hits = ['handler-' + str(i) for i in range(len(case['handlers']))]
        if not consumed:
            expected_hits = ['stock'] + expected_hits if case['event'] == 'draw' else expected_hits + ['stock']
        assert hits == expected_hits, 'Stock/event ordering or consumption changed'
        expected_values = list(values)
        if consumed:
            expected_values[0] = 0x42
        else:
            expected_values[0:2] = [0x55, 0x66]
            expected_values[8:10] = [0x41005000, 0x41005100]
        assert [uc.reg_read(reg) for reg in REGISTERS] == expected_values, 'Adapter leaked handler registers'
        assert uc.reg_read(UC_M68K_REG_SR) == (status if consumed else 0x2609), 'Adapter leaked handler flags'
        assert uc.reg_read(UC_M68K_REG_A7) == SP + 4, 'Stack pointer changed'
        assert bytes(uc.mem_read(SP, len(original_stack))) == original_stack, 'Caller arguments or return changed'
        assert bytes(uc.mem_read(SP - 512, 16)) == b'\x6b' * 16, 'Stack guard overwritten'
    print(case['machine'] + '/' + case['release'] + '/' + case['event'] + '/' + case['mode'] + ': arguments, ordering, consumption, registers, flags and stack passed')

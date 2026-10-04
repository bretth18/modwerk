# SPDX-License-Identifier: GPL-3.0-or-later
"""Compiled Modwerk copier on original synthetic memory, never firmware."""
import json
import struct
import sys
from unicorn import Uc, UC_ARCH_M68K, UC_MODE_BIG_ENDIAN
from unicorn.m68k_const import (
    UC_CPU_M68K_CFV4E, UC_M68K_REG_D0, UC_M68K_REG_D1, UC_M68K_REG_D2,
    UC_M68K_REG_D3, UC_M68K_REG_D4, UC_M68K_REG_D5, UC_M68K_REG_D6,
    UC_M68K_REG_D7, UC_M68K_REG_A0, UC_M68K_REG_A1, UC_M68K_REG_A2,
    UC_M68K_REG_A3, UC_M68K_REG_A4, UC_M68K_REG_A5, UC_M68K_REG_A6,
    UC_M68K_REG_A7, UC_M68K_REG_SR, UC_M68K_REG_PC,
)

registers = [UC_M68K_REG_D0, UC_M68K_REG_D1, UC_M68K_REG_D2,
             UC_M68K_REG_D3, UC_M68K_REG_D4, UC_M68K_REG_D5,
             UC_M68K_REG_D6, UC_M68K_REG_D7, UC_M68K_REG_A0,
             UC_M68K_REG_A1, UC_M68K_REG_A2, UC_M68K_REG_A3,
             UC_M68K_REG_A4, UC_M68K_REG_A5, UC_M68K_REG_A6]
for case in json.load(open(sys.argv[1], encoding='utf8')):
    for status in [0x2000, 0x201f, 0x270a]:
        uc = Uc(UC_ARCH_M68K, UC_MODE_BIG_ENDIAN)
        uc.ctl_set_cpu_model(UC_CPU_M68K_CFV4E)
        uc.mem_map(0x40000000, 0x10000)
        uc.mem_map(0x47be0000, 0x20000)
        uc.mem_map(0x41000000, 0x10000)
        image = bytes.fromhex(case['image'])
        uc.mem_write(case['imageBase'], image)
        uc.mem_write(0x47be0000, b'\xa5' * 0x20000)
        uc.mem_write(0x41000000, b'\x6b' * 0x10000)
        uc.reg_write(UC_M68K_REG_SR, status)
        sp = 0x41008000
        uc.reg_write(UC_M68K_REG_A7, sp)
        uc.mem_write(sp, struct.pack('>I', 0x40000010))
        values = [0x12345000 + 0x123 * i for i in range(15)]
        for reg, value in zip(registers, values):
            uc.reg_write(reg, value)
        uc.emu_start(case['boot'], case['stockCall'], count=100_000)
        assert uc.reg_read(UC_M68K_REG_PC) == case['stockCall'], 'Tail call failed'
        assert uc.reg_read(UC_M68K_REG_A7) == sp, 'Stack pointer changed'
        assert uc.reg_read(UC_M68K_REG_SR) == status, 'Status register changed'
        assert [uc.reg_read(reg) for reg in registers] == values, 'Registers changed'
        assert bytes(uc.mem_read(sp, 4)) == struct.pack('>I', 0x40000010), 'Return changed'
        lo, hi = case['layout']['ddr']
        source = case['layout']['runLoad']
        expected = image[source - case['imageBase']:source - case['imageBase'] + hi - lo]
        assert bytes(uc.mem_read(lo, hi - lo)) == expected, 'Copy mismatch'
        a, b = case['layout']['bss']
        assert bytes(uc.mem_read(a, b - a)) == bytes(b - a), 'BSS not zero'
        assert bytes(uc.mem_read(b, 16)) == b'\xa5' * 16, 'Copier crossed BSS end'
        assert bytes(uc.mem_read(sp - 80, 16)) == b'\x6b' * 16, 'Stack overwrite'
    print(case['machine'] + '/' + case['mode'] + ': copy, zero, registers, flags, stack and tail call passed')

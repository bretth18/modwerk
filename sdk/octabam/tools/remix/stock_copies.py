"""Guarded local-stock placeholders. No firmware is read during packaging."""
import struct
from pathlib import Path
from remix.stock_guard import LocalStockSpan


def object_copies(data, declarations):
    if len(data) < 52 or len(data) > 8*1024*1024 or data[:7] != b'\x7fELF\x01\x02\x01' or struct.unpack_from('>HHI', data, 16) != (1, 4, 1):
        raise ValueError('Stock placeholders require a big-endian ELF32 object')
    shoff = struct.unpack_from('>I', data, 32)[0]
    entsize, count = struct.unpack_from('>HH', data, 46)
    if entsize != 40 or not 0 < count <= 4096 or shoff < 52 or shoff + count * 40 > len(data):
        raise ValueError('Invalid stock placeholder section table')
    sections = [struct.unpack_from('>10I', data, shoff+i*40) for i in range(count)]
    symbols = {}
    relocations = []
    for h in sections:
        if h[1] != 8 and h[4] + h[5] > len(data): raise ValueError('ELF section exceeds its object')
        if h[1] == 2:
            if h[9] != 16 or h[5] % 16 or h[6] >= count or sections[h[6]][1] != 3:
                raise ValueError('Invalid ELF symbol table')
            strings = sections[h[6]]; names = data[strings[4]:strings[4]+strings[5]]
            for at in range(h[4], h[4]+h[5], 16):
                name, value, _, _, _, section = struct.unpack_from('>IIIBBH', data, at)
                if name < len(names):
                    end = names.find(b'\0', name)
                    if end < 0: raise ValueError('Unterminated ELF symbol')
                    symbols[bytes(names[name:end]).decode()] = (section, value)
        if h[1] == 9: raise ValueError('Implicit ELF relocations are unsupported')
        if h[1] == 4:
            if h[9] != 12 or h[5] % 12 or not 0 < h[7] < count:
                raise ValueError('Invalid ELF relocation table')
            for at in range(h[4],h[4]+h[5],12):
                offset, info = struct.unpack_from('>II', data, at)
                kind = info & 255
                if kind > 6: raise ValueError('Unsupported ELF relocation')
                relocations.append((h[7], offset, (0,4,2,1,4,2,1)[kind]))
    result = []
    for copy in declarations:
        if not isinstance(copy.span, LocalStockSpan) or copy.symbol not in symbols or not 1 <= len(copy.span) <= 256:
            raise ValueError('Invalid guarded stock placeholder declaration')
        section, offset = symbols[copy.symbol]
        if not 0 < section < count: raise ValueError('Invalid stock symbol section')
        h = sections[section]; size = len(copy.span)
        if h[1] != 1 or not h[2] & 2 or offset+size > h[5] or any(data[h[4]+offset:h[4]+offset+size]):
            raise ValueError('Stock copies require bounded, allocated zero placeholders')
        if any(s == section and width and at < offset+size and offset < at+width for s,at,width in relocations):
            raise ValueError('Stock placeholder overlaps an authored relocation')
        if any(r['section']==section and offset < r['offset']+r['bytes'] and r['offset'] < offset+size for r in result):
            raise ValueError('Overlapping stock placeholders')
        result.append(dict(section=section,offset=offset,source=copy.span.address,bytes=size,sha256=copy.span.sha256))
    return result


def fill_object(path, declarations):
    data = bytearray(Path(path).read_bytes())
    copies = object_copies(data, declarations)
    shoff = struct.unpack_from('>I', data, 32)[0]
    for recipe, declaration in zip(copies, declarations):
        at = struct.unpack_from('>I', data, shoff+recipe['section']*40+16)[0]+recipe['offset']
        data[at:at+recipe['bytes']] = declaration.span.read()
    Path(path).write_bytes(data)

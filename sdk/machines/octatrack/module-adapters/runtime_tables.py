# SPDX-License-Identifier: GPL-3.0-or-later
"""Private, insertion-aware TableGrow preparation; no public loader admission.

Stock words stay in <=32-byte guarded copy records. Only authored symbol words
are assembled into the runtime image. Capture guards from the developer's exact
private stock, review them, then reuse the pinned guards for reconstruction.
"""
import hashlib
import re
import struct

LIMIT = 32
SYMBOL = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


def shape(table):
    count, inserted = table.count, table.count if table.insert_at is None else table.insert_at
    if (type(count) is not int or not 0 < count <= 256 or type(inserted) is not int
            or not 0 <= inserted <= count or type(table.old) is not int or table.old & 3
            or not 0x40000000 <= table.old < 0x40100000
            or not 0 < len(table.symbols) <= 32 or not table.refs):
        raise ValueError('A runtime table needs bounded stock words, inserted symbols and references.')
    for unit, symbol in table.symbols:
        if not isinstance(unit, str) or not SYMBOL.fullmatch(symbol):
            raise ValueError('A runtime table has an invalid authored symbol.')
    if len({address for address, _ in table.refs}) != len(table.refs):
        raise ValueError('A runtime table repeats a stock reference.')
    for address, expected in table.refs:
        if (type(address) is not int or address & 1 or not 0x40000000 <= address < 0x40100000
                or expected != table.old):
            raise ValueError('A runtime table reference must name the original stock array.')
    return count, inserted


def segments(table):
    """(image-relative offset, stock address, length), splitting across insertion."""
    count, inserted = shape(table)
    result = []
    for begin, end, extra in ((0, inserted * 4, 0),
                              (inserted * 4, count * 4, len(table.symbols) * 4)):
        for at in range(begin, end, LIMIT):
            result.append((at + extra, table.old + at, min(LIMIT, end - at)))
    return result


def checked_read(stock_at, address, length):
    data = stock_at(address, length)
    if not isinstance(data, bytes) or len(data) != length:
        raise ValueError('A private stock read must return its exact bounded length.')
    return data


def capture(table, stock_at):
    """Hash-only recipe; does not return stock bytes or infer a package contract."""
    count, inserted = shape(table)
    for address, expected in table.refs:
        if checked_read(stock_at, address, 4) != struct.pack('>I', expected):
            raise ValueError('The original table reference changed.')
    return dict(schema=1, address=table.old, count=count, insertAt=inserted,
                symbols=[list(pair) for pair in table.symbols],
                references=[list(pair) for pair in table.refs],
                sha256=hashlib.sha256(checked_read(stock_at, table.old, count * 4)).hexdigest(),
                copies=[dict(offset=offset, address=address, length=length,
                             sha256=hashlib.sha256(checked_read(stock_at, address, length)).hexdigest())
                        for offset, address, length in segments(table)])


def prepare(table, guard, symbol, stock_at=None):
    """Return authored assembly and separately hashed prefix/suffix copy metadata."""
    count, inserted = shape(table)
    if not isinstance(symbol, str) or not SYMBOL.fullmatch(symbol):
        raise ValueError('Invalid runtime table symbol.')
    expected_keys = {'schema', 'address', 'count', 'insertAt', 'symbols', 'references', 'sha256', 'copies'}
    if not isinstance(guard, dict) or set(guard) != expected_keys:
        raise ValueError('A runtime table needs its exact reviewed guard recipe.')
    if (guard['schema'] != 1 or guard['address'] != table.old or guard['count'] != count
            or guard['insertAt'] != inserted or guard['symbols'] != [list(pair) for pair in table.symbols]
            or guard['references'] != [list(pair) for pair in table.refs]
            or not isinstance(guard['sha256'], str) or not re.fullmatch(r'[a-f0-9]{64}', guard['sha256'])):
        raise ValueError('The runtime table declaration differs from its reviewed guard.')
    copies = guard['copies']
    if not isinstance(copies, list) or len(copies) != len(segments(table)):
        raise ValueError('The runtime table copy count changed.')
    for entry, (offset, address, length) in zip(copies, segments(table)):
        if (not isinstance(entry, dict) or set(entry) != {'offset', 'address', 'length', 'sha256'}
                or (entry['offset'], entry['address'], entry['length']) != (offset, address, length)
                or not isinstance(entry['sha256'], str) or not re.fullmatch(r'[a-f0-9]{64}', entry['sha256'])):
            raise ValueError('A runtime table stock span differs from its reviewed guard.')
    if stock_at is not None and capture(table, stock_at) != guard:
        raise ValueError('The private stock table or its references changed.')
    assembly = '.text\n.balign 4\n.global ' + symbol + '\n' + symbol + ':\n'
    if inserted:
        assembly += '.space %d\n' % (inserted * 4)
    assembly += ''.join('.long ' + name + '\n' for _, name in table.symbols)
    if inserted < count:
        assembly += '.space %d\n' % ((count - inserted) * 4)
    return dict(symbol=symbol, assembly=assembly, bytes=(count + len(table.symbols)) * 4, copies=copies)


def bind(plan, symbols, image, relocations):
    """Bind zero placeholders after strict two-origin linking; refuse overlap."""
    if plan['symbol'] not in symbols:
        raise ValueError('The runtime table symbol was not linked.')
    start = symbols[plan['symbol']]
    if type(start) is not int or start < 0 or start + plan['bytes'] > len(image):
        raise ValueError('The runtime table lies outside its image.')
    result = []
    for copy in plan['copies']:
        at, length = start + copy['offset'], copy['length']
        if any(image[at:at + length]) or any(at < offset + 4 and offset < at + length for offset in relocations):
            raise ValueError('A runtime table copy would overwrite code or an authored relocation.')
        result.append((at, copy['address'], length, bytes.fromhex(copy['sha256'])))
    return result


def expected_words(table, stock_at, symbols):
    """Independent native TableGrow oracle: splice complete words at insert_at.

    Used only in private compile proofs. No result is a public package or file.
    """
    count, inserted = shape(table)
    words = list(struct.unpack('>%dI' % count, checked_read(stock_at, table.old, count * 4)))
    values = [symbols[name] for _, name in table.symbols]
    if any(type(value) is not int or not 0 <= value <= 0xffffffff for value in values):
        raise ValueError('An inserted table pointer is not an exact linked address.')
    return words[:inserted] + values + words[inserted:]

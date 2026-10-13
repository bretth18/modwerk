# SPDX-License-Identifier: MIT
"""Fixed private board trust storage; never sourced from an uploaded package.

Validate independently reviewed declaration hashes against exact package,
capture and source snapshots before producing any trusted record. Reserve the
empty storage before composing packages. Filling it must not relink or move
any symbol, image length, arena boundary or package stock guard.
"""
import hashlib
import struct
from machine_layout import validate

CAPACITY, HEADER, RECORD = 16, 16, 44
BYTES = HEADER + CAPACITY * RECORD
ENTRY_KEYS = frozenset(('package', 'declaration', 'recipe', 'reviewed_sha256', 'source_root'))


def empty():
    return b'MWMD' + bytes((1, 0, CAPACITY)) + bytes(BYTES - 7)


def generate(entries):
    """`entries` contain exact file bytes and an external reviewed SHA per file."""
    if not isinstance(entries, (tuple, list)) or len(entries) > CAPACITY:
        raise ValueError('Private machine declarations exceed the fixed capacity.')
    checked = []
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != ENTRY_KEYS:
            raise ValueError('Exact independently reviewed declaration inputs are required.')
        checked.append(validate(**entry))
    checked.sort(key=lambda item: item.package_sha256)
    if len({item.package_sha256 for item in checked}) != len(checked):
        raise ValueError('Duplicate trusted package identity.')
    if any(not item.module_id for item in checked):
        raise ValueError('A trusted machine needs a nonzero module identity.')
    table = bytearray(empty())
    table[5] = len(checked)
    for i, item in enumerate(checked):
        record = struct.pack('>32sIBBHHH', bytes.fromhex(item.package_sha256), item.module_id,
                             item.member_mask, 0, item.state_revision, item.parameter_revision, 0)
        table[HEADER + i * RECORD:HEADER + (i + 1) * RECORD] = record
    return bytes(table)


def fill_reserved(image, offset, table):
    """Replace only the exact reserved empty bytes in a private linked image.

    Identity integration is a separate operation and must include this table's
    SHA256. Do not claim stable package/base parity from this replacement alone.
    """
    if (not isinstance(image, bytes) or type(offset) is not int or offset < 0 or
            offset > len(image) - BYTES or not isinstance(table, bytes) or len(table) != BYTES or
            image[offset:offset + BYTES] != empty()):
        raise ValueError('Missing, moved, wrong-sized or already filled reserved trust storage.')
    return image[:offset] + table + image[offset + BYTES:]


def assert_stable_layout(before, after, before_symbols, after_symbols, offset, identity_ranges=()):
    """Exact source-side invariant for the final private candidate collector.

    All symbols must stay identical, including the table, package guards and
    arena bounds. Only this reserved storage and explicit identity bytes may
    differ. The caller must also retain exact package digests independently.
    """
    if (not isinstance(before, bytes) or not isinstance(after, bytes) or len(before) != len(after) or
            not isinstance(before_symbols, dict) or before_symbols != after_symbols or
            type(offset) is not int or offset < 0 or offset > len(before) - BYTES):
        raise ValueError('Filling declarations moved linked addresses or image bounds.')
    allowed = [(offset, offset + BYTES)]
    for span in identity_ranges:
        if (not isinstance(span, (tuple, list)) or len(span) != 2 or
                any(type(v) is not int for v in span) or not 0 <= span[0] < span[1] <= len(before) or
                any(span[0] < hi and lo < span[1] for lo, hi in allowed)):
            raise ValueError('Invalid or overlapping exact identity range.')
        allowed.append(tuple(span))
    for i, (a, b) in enumerate(zip(before, after)):
        if a != b and not any(lo <= i < hi for lo, hi in allowed):
            raise ValueError('Declaration fill changed bytes outside its reservation/base identity.')
    return dict(tableSha256=hashlib.sha256(after[offset:offset + BYTES]).hexdigest(),
                imageBytes=len(after), linkedSymbols=len(before_symbols), stable=True)

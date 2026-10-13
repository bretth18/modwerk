# SPDX-License-Identifier: GPL-3.0-or-later
"""Checked reconstruction of authored images without shipping stock spans.

Recipes name source/image hashes, explicit coincident stock copies and authored
constant initializers. They contain no stock bytes. Capture/review is separate
from package building; this never exempts or weakens the final stock-free scan.
"""
import hashlib


def digest(data):
    return hashlib.sha256(data).hexdigest()


def apply(image, relocations, recipe, sources):
    if recipe.get('schema') != 1 or recipe.get('imageSha256') != digest(image) or recipe.get('sources') != sources:
        raise ValueError('The reviewed runtime recipe does not match the exact source/image inputs.')
    output, copies, fills, spans = bytearray(image), [], [], []
    for kind in ('copies', 'fills'):
        for item in recipe.get(kind, []):
            at, n = item['offset'], item['length']
            if type(at) is not int or type(n) is not int or at < 0 or n < 1 or at + n > len(image) or not item.get('purpose'):
                raise ValueError('A reconstruction record needs a bounded span and reviewed source purpose.')
            if any(at < old + length and old < at + n for old, length in spans) or any(at < r + 4 and r < at + n for r in relocations):
                raise ValueError('A reconstruction span overlaps another span or relocation word.')
            if digest(image[at:at + n]) != item['sha256']:
                raise ValueError('The compiled span differs from the reviewed recipe.')
            if kind == 'copies':
                address = item['address']
                if type(address) is not int or address < 0 or address > 0xffffffff or n > 32:
                    raise ValueError('A stock copy exceeds the runtime bounds.')
                copies.append((at, address, n, bytes.fromhex(item['sha256'])))
            else:
                value = item['value']
                if type(value) is not int or not 0 < value < 256 or image[at:at + n] != bytes([value]) * n:
                    raise ValueError('A fill must reconstruct the exact authored constant initializer.')
                fills.append((at, n, value))
            output[at:at + n] = bytes(n)
            spans.append((at, n))
    return bytes(output), copies, fills

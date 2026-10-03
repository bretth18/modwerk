"""MIDISC2.0 stock-free recipe adapter; execution requires private local stock.

The author's sparse release was inspected and converted to original byte
changes plus fingerprinted local-stock references. Never serialize read()
results or use this draft in release automation.
"""
from hashlib import sha256
import json
from pathlib import Path

PIN = '4f9a89453fdcdd39a3cd57f010ffa489cac721cd'
RECIPE_SHA256 = '45a22136433a817c853ed44a53ba9d84c600024bb85b008d0dcbe507220902ef'


def recipe():
    raw = Path(__file__).with_name('recipe.json').read_bytes()
    if sha256(raw).hexdigest() != RECIPE_SHA256:
        raise ValueError('MIDISC2.0 source recipe fingerprint differs')
    value = json.loads(raw)
    if value['schemaVersion'] != 1 or value['id'] != 'midi-scenes' or value['upstream']['revision'] != PIN:
        raise ValueError('Unexpected MIDISC2.0 source identity')
    return value


def materialize(stock, row):
    if sha256(stock[row['offset']:row['offset'] + row['bytes']]).hexdigest() != row['guardSha256']:
        raise ValueError('MIDISC2.0 destination guard differs from stock')
    value = bytearray()
    for segment in row['segments']:
        if set(segment) == {'hex'}:
            value.extend(bytes.fromhex(segment['hex']))
        elif set(segment) == {'stockOffset', 'bytes', 'sha256'}:
            copied = stock[segment['stockOffset']:segment['stockOffset'] + segment['bytes']]
            if len(copied) != segment['bytes'] or sha256(copied).hexdigest() != segment['sha256']:
                raise ValueError('MIDISC2.0 inherited stock fingerprint differs')
            value.extend(copied)
        else:
            raise ValueError('Invalid MIDISC2.0 source segment')
    if len(value) != row['bytes']:
        raise ValueError('MIDISC2.0 region length differs')
    return bytes(value)


def apply(stock):
    spec = recipe()
    if len(stock) != spec['osBytes'] or sha256(stock).hexdigest() != spec['stockSha256']:
        raise ValueError('MIDISC2.0 requires original OS 1.40C')
    result = bytearray(stock)
    end = 0
    for row in spec['writes']:
        if row['offset'] < end or row['bytes'] < 1 or row['offset'] + row['bytes'] > len(stock):
            raise ValueError('Overlapping or out-of-bounds MIDISC2.0 region')
        data = materialize(stock, row)
        result[row['offset']:row['offset'] + len(data)] = data
        end = row['offset'] + len(data)
    if sha256(result).hexdigest() != spec['mainSha256']:
        raise ValueError('MIDISC2.0 output differs from the author image')
    return bytes(result)


class LocalPatchWrite:
    """A native Poke value that remains unresolved during declaration review."""
    def __init__(self, row):
        self.row = row

    def __len__(self):
        return self.row['bytes']

    def read(self):
        from remix.stock_guard import _verified_image
        return materialize(_verified_image(), self.row)

    def __iter__(self):
        return iter(self.read())

    def __bytes__(self):
        return self.read()

    def hex(self):
        return self.read().hex()


def native_pokes():
    from remix.schema import Poke
    from remix.stock_guard import BASE, stock_guard
    return tuple(Poke(BASE + row['offset'], stock_guard(BASE + row['offset'], row['bytes'], row['guardSha256']),
                      LocalPatchWrite(row), 'MIDISC2.0 guarded region ' + str(index))
                 for index, row in enumerate(recipe()['writes']))

#!/usr/bin/env python3
"""Convert the pinned author release into a stock-free source recipe.

Run only in the private firmware sandbox. Inputs are the inspected upstream
release20.json and original local 1.40C MAIN. The only output is a JSON recipe
containing author changes and hashed references; no firmware image is written.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path

PIN = '4f9a89453fdcdd39a3cd57f010ffa489cac721cd'
UPSTREAM_SHA256 = 'a2dbe20d82de8bd3a4f010c1e94c4b2ebf080ca3f7203521053f747b52dc24a1'
STOCK_SHA256 = '164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e'
MAIN_SHA256 = 'debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87'


def digest(data):
    return sha256(data).hexdigest()


def convert(upstream_bytes, stock):
    if digest(upstream_bytes) != UPSTREAM_SHA256:
        raise ValueError('Author recipe differs from the pinned MIDISC2.0 release')
    upstream = json.loads(upstream_bytes)
    if len(stock) != 1112560 or digest(stock) != STOCK_SHA256 or upstream['stock_sha256'] != STOCK_SHA256:
        raise ValueError('Original local OS 1.40C MAIN required')
    image = bytearray(stock)
    groups, last_end = [], 0
    for offset, encoded in upstream['writes']:
        data = bytes.fromhex(encoded)
        if offset < last_end or not data or offset + len(data) > len(stock):
            raise ValueError('Overlapping or out-of-bounds author write')
        image[offset:offset + len(data)] = data
        if groups and offset - groups[-1][1] < 32:
            groups[-1][1] = offset + len(data)
        else:
            groups.append([offset, offset + len(data)])
        last_end = offset + len(data)
    if digest(image) != MAIN_SHA256 or upstream['main_sha256'] != MAIN_SHA256:
        raise ValueError('Author writes do not produce the pinned full MAIN image')

    # The index stays local. Deterministic first-64 candidates bound its size.
    index = {}
    for offset in range(len(stock) - 7):
        candidates = index.setdefault(stock[offset:offset + 8], [])
        if len(candidates) < 64:
            candidates.append(offset)
    entries = []
    for start, end in groups:
        tokens, literal, position = [], bytearray(), start

        def flush():
            if literal:
                tokens.append({'hex': literal.hex()})
                literal.clear()

        while position < end:
            same = 0
            while position + same < end and image[position + same] == stock[position + same]:
                same += 1
            source, count = position, same
            if position + 8 <= end:
                for candidate in index.get(bytes(image[position:position + 8]), []):
                    length = 8
                    while position + length < end and candidate + length < len(stock) and image[position + length] == stock[candidate + length]:
                        length += 1
                    if length > count:
                        source, count = candidate, length
            if count:
                flush()
                tokens.append({'stockOffset': source, 'bytes': count, 'sha256': digest(stock[source:source + count])})
                position += count
            else:
                literal.append(image[position])
                position += 1
        flush()
        entries.append({'offset': start, 'bytes': end - start, 'guardSha256': digest(stock[start:end]), 'segments': tokens})
    recipe = {'schemaVersion': 1, 'id': 'midi-scenes', 'moduleVersion': '0.2.3-experimental',
              'upstream': {'repository': 'https://github.com/bkkbrls-del/midisc', 'revision': PIN,
                           'path': 'tools/midisc/release20.json', 'sha256': UPSTREAM_SHA256},
              'osBytes': len(stock), 'stockSha256': STOCK_SHA256, 'mainSha256': MAIN_SHA256, 'writes': entries}
    restored = bytearray(stock)
    for row in entries:
        value = b''.join(bytes.fromhex(token['hex']) if 'hex' in token else stock[token['stockOffset']:token['stockOffset'] + token['bytes']] for token in row['segments'])
        if len(value) != row['bytes']:
            raise ValueError('Converted region has an invalid length')
        restored[row['offset']:row['offset'] + len(value)] = value
    if restored != image:
        raise ValueError('Converted recipe differs from the native author output')
    return json.dumps(recipe, indent=2) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('author_recipe', type=Path)
    parser.add_argument('stock_main', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.suffix != '.json' or args.output.resolve() in {args.author_recipe.resolve(), args.stock_main.resolve()}:
        parser.error('Output must be a separate .json source recipe')
    result = convert(args.author_recipe.read_bytes(), args.stock_main.read_bytes())
    args.output.write_text(result)
    print(json.dumps({'status': 'passed', 'recipeSha256': digest(result.encode()), 'firmwareWritten': False}))


if __name__ == '__main__':
    main()

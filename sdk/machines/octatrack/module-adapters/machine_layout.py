# SPDX-License-Identifier: MIT
"""Private reviewed state/layout association for MWMG v1 preparation.

MWMG v1 carries membership and one parameter-layout number, not a stored-state
revision. The caller supplies an independently reviewed declaration digest;
an embedded digest or a matching mask is not evidence of compatibility.
This validator neither admits a package nor changes the public envelope.
Source snapshots, recipes and packages remain private. A declaration has exact
keys: schema, packageSha256, imageSha256, compiledImageSha256, recipeSha256, memberMask,
stateLayoutRevision, parameterLayoutRevision, sources (relative path -> SHA256).
"""
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import struct

SCHEMA = 'modwerk-machine-layout-v2'
KEYS = frozenset(('schema', 'packageSha256', 'imageSha256', 'compiledImageSha256', 'recipeSha256', 'memberMask',
                  'stateLayoutRevision', 'parameterLayoutRevision', 'sources'))
SHA = re.compile(r'[0-9a-f]{64}\Z')


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _fail(message):
    raise ValueError(message)


def _integer(value, low, high):
    return type(value) is int and low <= value <= high


def _json(data, limit):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                _fail('Duplicate declaration/recipe key.')
            result[key] = value
        return result
    if not isinstance(data, bytes) or len(data) > limit:
        _fail('Missing or oversized declaration/recipe.')
    try:
        return json.loads(data, object_pairs_hook=unique)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid declaration/recipe JSON.') from exc


def _envelope(package, *, group=True):
    """Check the whole current private group encoding, including every tail record.

    Bounds match loader.h; stock spans match the Octatrack runtime's immutable
    stock/bootloader boundary. Runtime stock hashes and consumer lifetime still
    need separate verification; this is not a replacement for base admission.
    """
    prefix = b'MWRM\x00\x08\x00' + bytes((4 if group else 0,))
    if not isinstance(package, bytes) or len(package) < 76 or package[:8] != prefix:
        _fail('Not an ABI8 MWMG v1 package.')
    image_size, bss, reloc_count, hooks, sites, module = struct.unpack_from('>6I', package, 8)
    copies, fills = struct.unpack_from('>2I', package, 68)
    minimum = 16 if group else 1
    if (not minimum <= image_size <= 131072 or bss or hooks or any(package[32:50]) or
            reloc_count > 2048 or sites > 128 or copies > 128 or fills > 64):
        _fail('Group header exceeds its no-DSP/no-BSS/no-hooks envelope.')
    name, layout = package[50:66], struct.unpack_from('>H', package, 66)[0]
    title = name.split(b'\0', 1)[0]
    if not layout or not title or len(title) > 15 or any(v < 32 or v > 126 for v in title) or any(name[len(title):]):
        _fail('Invalid group name/parameter layout.')
    at = 76
    def take(n):
        nonlocal at
        if n > len(package) - at:
            _fail('Truncated group record.')
        result = package[at:at + n]
        at += n
        return result
    image = take(image_size)
    if group and (image[:5] != b'MWMG\x01' or not 1 <= image[5] <= 7 or any(image[6:16])):
        _fail('Invalid group metadata or private entry padding.')
    relocations = list(struct.unpack('>%dI' % reloc_count, take(4 * reloc_count)))
    if any(r < (16 if group else 0) or r & 1 or r > image_size - 4 or
           struct.unpack_from('>I', image, r)[0] >= image_size or (i and r < relocations[i - 1] + 4)
           for i, r in enumerate(relocations)):
        _fail('Invalid group image relocation.')
    occupied_sites, reconstructed = [], []
    def stock(address, length):
        if not 0x40000400 <= address < 0x400de1e0 or length > 0x400de1e0 - address:
            _fail('Stock span crosses the protected boundary.')
    def overlap(span, spans):
        return any(span[0] < other[1] and other[0] < span[1] for other in spans)
    for _ in range(sites):
        address, n, keep, checked, count = struct.unpack('>IBBBB', take(8))
        if not 0 < n <= 32 or (address | n) & 1 or not 0 < checked <= 32 or keep > min(n, checked) or count > 8:
            _fail('Invalid group site header.')
        stock(address, max(n, checked))
        span = (address, address + n)
        if overlap(span, occupied_sites):
            _fail('Overlapping group sites.')
        occupied_sites.append(span)
        take(32)  # Hash, never stock bytes.
        code = take(n)
        local = struct.unpack('>%dH' % count, take(2 * count))
        if any(code[:keep]) or any(r & 1 or r < keep or r > n - 4 or
                                  struct.unpack_from('>I', code, r)[0] >= image_size or
                                  (i and r < local[i - 1] + 4) for i, r in enumerate(local)):
            _fail('Invalid group site relocation or kept bytes.')
    for _ in range(copies):
        record = take(44)
        offset, address, length, reserved = struct.unpack_from('>IIHH', record)
        stock(address, length)
        if not 0 < length <= 32 or reserved:
            _fail('Invalid group stock copy.')
        reconstructed.append((offset, offset + length))
    for _ in range(fills):
        offset, length, value, reserved = struct.unpack('>IIB3s', take(12))
        if not length or not value or any(reserved):
            _fail('Invalid group constant fill.')
        reconstructed.append((offset, offset + length))
    for i, span in enumerate(reconstructed):
        if (span[0] < (16 if group else 0) or span[1] > image_size or any(image[span[0]:span[1]]) or
                overlap(span, reconstructed[:i]) or overlap(span, [(r, r + 4) for r in relocations])):
            _fail('Group reconstruction overlaps metadata, code, another span or relocation.')
    if at != len(package):
        _fail('Trailing bytes in group package.')
    return image, image[5] if group else 0, layout, module


def recipe_records(package, *, group=True):
    """Decode only an already validated private ABI8 preparation envelope.

    This does not broaden the shipped loader or its canonical package tools.
    Callers still verify original stock guards and exact source associations.
    """
    image, _, _, _ = _envelope(package, group=group)
    count, sites = struct.unpack_from('>I', package, 16)[0], struct.unpack_from('>I', package, 24)[0]
    copies, fills = struct.unpack_from('>II', package, 68)
    at = 76 + len(image)
    relocations = list(struct.unpack_from('>%dI' % count, package, at));at += 4 * count
    patched, copied, filled = [], [], []
    for _ in range(sites):
        address, n, keep, checked, r = struct.unpack_from('>IBBBB', package, at)
        digest, code = package[at + 8:at + 40], package[at + 40:at + 40 + n]
        local = list(struct.unpack_from('>%dH' % r, package, at + 40 + n))
        patched.append((address, digest, code, local, keep, checked));at += 40 + n + 2 * r
    for _ in range(copies):
        offset, address, n = struct.unpack_from('>IIH', package, at)
        copied.append((offset, address, n, package[at + 12:at + 44]));at += 44
    for _ in range(fills):
        offset, n, value = struct.unpack_from('>IIB', package, at)
        filled.append((offset, n, value));at += 12
    return image, relocations, patched, copied, filled


@dataclass(frozen=True)
class ReviewedMachineLayout:
    member_mask: int
    state_revision: int
    parameter_revision: int
    module_id: int
    package_sha256: str
    declaration_sha256: str


def validate(package, declaration, recipe, *, reviewed_sha256, source_root):
    """Validate exact private files against the caller's reviewed declaration hash.

    Review must establish the meaning of both positive revision numbers. This
    function checks their exact association, not their semantic truth. Use a
    separate exact source snapshot for each old/new declaration when necessary.
    """
    if not isinstance(reviewed_sha256, str) or not SHA.fullmatch(reviewed_sha256):
        _fail('An independently reviewed declaration SHA256 is required.')
    if not isinstance(declaration, bytes) or _sha(declaration) != reviewed_sha256:
        _fail('Missing or changed reviewed layout declaration.')
    doc = _json(declaration, 65536)
    if not isinstance(doc, dict) or set(doc) != KEYS or doc['schema'] != SCHEMA:
        _fail('Unsupported machine layout declaration.')
    for key in ('packageSha256', 'imageSha256', 'compiledImageSha256', 'recipeSha256'):
        if not isinstance(doc[key], str) or not SHA.fullmatch(doc[key]):
            _fail('Invalid declared file SHA256.')
    if (not _integer(doc['memberMask'], 1, 7) or not _integer(doc['stateLayoutRevision'], 1, 65535) or
            not _integer(doc['parameterLayoutRevision'], 1, 65535)):
        _fail('Explicit positive member/state/parameter revisions are required.')
    image, members, parameters, module = _envelope(package)
    if (_sha(package) != doc['packageSha256'] or _sha(image) != doc['imageSha256'] or
            members != doc['memberMask'] or parameters != doc['parameterLayoutRevision']):
        _fail('Package identity or layout does not match its reviewed declaration.')
    captured = _json(recipe, 1048576)
    sources = doc['sources']
    if (not isinstance(sources, dict) or not sources or not isinstance(captured, dict) or
            not _integer(captured.get('schema'), 1, 1) or _sha(recipe) != doc['recipeSha256'] or
            captured.get('imageSha256') != doc['compiledImageSha256'] or captured.get('sources') != sources):
        _fail('Recipe/image/source association changed.')
    root = Path(source_root).resolve()
    for name, digest in sources.items():
        path = Path(name)
        if (not name or path.is_absolute() or '..' in path.parts or path.as_posix() != name or
                not isinstance(digest, str) or not SHA.fullmatch(digest)):
            _fail('Invalid declared source path/hash.')
        target = (root / path).resolve()
        if not target.is_relative_to(root) or not target.is_file() or _sha(target.read_bytes()) != digest:
            _fail('Reviewed source changed or escaped its source snapshot: ' + name)
    return ReviewedMachineLayout(members, doc['stateLayoutRevision'], parameters, module,
                                 doc['packageSha256'], reviewed_sha256)


def same_mask_replacement(previous, candidate):
    """Reject absent declarations, identity changes and incompatible same-mask state.

    Add/drop transitions require separate saved-Part and retained-root checks.
    A successful result here never substitutes for those checks or admission.
    """
    if not isinstance(previous, ReviewedMachineLayout) or not isinstance(candidate, ReviewedMachineLayout):
        _fail('Both replacement packages need reviewed layout declarations.')
    if previous.module_id != candidate.module_id or previous.member_mask != candidate.member_mask:
        _fail('This contract only covers the same module and member mask.')
    if (previous.state_revision != candidate.state_revision or
            previous.parameter_revision != candidate.parameter_revision):
        _fail('Replacement changes the declared stored-state or parameter layout.')
    return True

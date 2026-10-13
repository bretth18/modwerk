# SPDX-License-Identifier: GPL-3.0-or-later
"""Stock-free read-only saved-set ABI anchors. No device or file operations.

Original 1.40C supplies a one-argument descriptor-size call. Its two working
dispatchers only read the descriptor size; the second holds the stock RTOS
mutex. The inactive backend returns zero. Runtime refuses other targets.
Preparation requires the exact clean MAIN before applying any module.
"""
from hashlib import sha256

MAIN_LOAD = 0x40000400
MAIN_SHA256 = '164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e'
READ_ONLY_TARGETS = (0x4001b888, 0x40018a0c)
GUARDS = (
    ('size_initializer_unlocked', 0x400145fc, 12, '1f05a9e543a4c0d35b8437ef853ffe20289ea5a3a640919759c1760feb5b0b15'),
    ('size_initializer_locked', 0x4001470e, 12, 'f5e2804ba207e3f6797e611642254841a0b5cbbca89179c698425b53669a24e6'),
    ('size_initializer_stub', 0x40014824, 12, 'd118a0d6319221f26776920d697996f261b69532a791053cf3aa0a4a8ab16a3d'),
    ('size_unlocked', 0x4001b888, 58, 'cdbd36bfa52a9ebaa3c6436301466f794ccdf1476afb7711f8eb21b46159841e'),
    ('size_locked', 0x40018a0c, 118, 'e27e9c5144c66a196b10291da55b9a224728c378f4c13ad71d8149a094810eac'),
    ('size_stub', 0x400148c0, 4, '64da7dd5cf4b787fbe2305fb585022c03e7727f8b99379b4bf3aac87bc1c7383'),
    ('size_object_wrapper', 0x400148d4, 38, 'a68d5c4354afc231ee8dd59edb9767fc048efd8d730de24952b6529c0ae8da68'),
    ('size_project_caller', 0x40084940, 58, '4669f5004fb1bad1586c137ecc12e3e8001727737cbf74d95b321426d6c4ecd6'),
)

def verify_saved_set_source(image):
    """Return metadata only after all ABI anchors and the clean image match."""
    if not isinstance(image, (bytes, bytearray)) or sha256(image).hexdigest() != MAIN_SHA256:
        raise ValueError("Saved-set export requires the original Octatrack 1.40C MAIN image.")
    for name, address, length, digest in GUARDS:
        start = address - MAIN_LOAD
        if start < 0 or start + length > len(image) or sha256(image[start:start+length]).hexdigest() != digest:
            raise ValueError("Saved-set read-only ABI guard failed: " + name)
    return {"mainSha256": MAIN_SHA256, "readOnlyTargets": list(READ_ONLY_TARGETS),
            "guards": [{"name": name, "address": address, "length": length, "sha256": digest}
                       for name, address, length, digest in GUARDS], "deviceAccess": False}

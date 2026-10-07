"""Protect the entire detour write, including legacy short guard declarations.

The original OS is verified by stock_guard before extending a legacy guard.
No firmware is read during source packaging and no stock bytes are persisted.
"""
def expected(detour):
    written = detour.pad_to or 6
    if len(detour.expect) >= written:
        return detour.expect
    from remix.stock_guard import _verified_image, BASE
    original = _verified_image()
    offset = detour.site - BASE
    if offset < 0 or offset + written > len(original):
        raise ValueError("Detour guard lies outside original OS")
    full = original[offset:offset + written]
    if full[:len(detour.expect)] != detour.expect:
        raise ValueError("Detour guard prefix differs from original OS")
    return full

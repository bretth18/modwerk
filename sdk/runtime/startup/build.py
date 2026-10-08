#!/usr/bin/env python3
"""Apply original Modwerk artwork to a locally composed Octatrack MAIN image.

Only two guarded graphic tables change. Firmware input and output stay local.
This is also the independent native oracle for the browser implementation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

BASE = 0x40000400
ARTWORK = Path(__file__).with_name("artwork.json")


def delay(x, y):
    if x >= 26 and y >= 26:
        return 20
    if 6 <= x <= 27 and 6 <= y <= 27 and (x - 6) % 8 < 6 and (y - 6) % 8 < 6:
        order = ((1, 2, 3), (8, 0, 4), (7, 6, 5))[(y - 6) // 8][(x - 6) // 8]
        return 248 - order * 18
    dx, dy = x - 16, y - 16
    if dy < 0 and dx >= 0:
        phase = dx * 32 // (dx - dy)
    elif dx >= 0 and dy >= 0:
        phase = 32 + dy * 32 // (dx + dy)
    elif dy >= 0:
        phase = 64 + -dx * 32 // (dy - dx)
    else:
        phase = 96 + -dy * 32 // (-dx - dy)
    return 255 - phase // 2


def writes():
    art = json.loads(ARTWORK.read_text())
    if (art["schema"], art["width"], art["height"], art["durationMs"], art["particles"], art["wordmark"]["x"], art["wordmark"]["y"]) != (1, 128, 64, 2800, 843, 8, 39):
        raise ValueError("Invalid startup animation layout")
    for key, width, height in (("wordmark", 110, 15), ("mark", 34, 34)):
        layer = art[key]
        if (len(layer["rows"]) != height or any(len(row) != width or set(row) - {".", "#"} for row in layer["rows"])
                or layer["x"] < 0 or layer["y"] < 0 or layer["x"] + width > 128 or layer["y"] + height > 64):
            raise ValueError("Invalid startup animation artwork")
    wordmark = b"".join(struct.pack(">I", sum(1 << (17 + y) for y in range(15) if art["wordmark"]["rows"][y][x] == "#")) for x in range(110))
    layer = art["mark"]
    points = [(layer["x"] + x - 63, 21 - layer["y"] - y, delay(x, y), x >= 26 and y >= 26)
              for y, row in enumerate(layer["rows"]) for x, pixel in enumerate(row) if pixel == "#"]
    if not 0 < len(points) <= art["particles"]:
        raise ValueError("Startup animation exceeds the stock particle budget")
    records = []
    for i in range(art["particles"]):
        x, y, phase, mod = points[i if i < len(points) else (i - len(points)) * 137 % len(points)]
        records.append(struct.pack(">hhh", x, y, phase - 16 if mod and i >= len(points) else phase))
    particles = b"".join(records)
    result = []
    for key, data in (("particles", particles), ("wordmark", wordmark)):
        guard = art["guards"][key]
        if guard["bytes"] != len(data):
            raise ValueError("Invalid startup animation guard size")
        result.append((guard, data))
    return result


def apply(image):
    plan = writes()
    # Validate both guards before making a copy or applying either write.
    for guard, data in plan:
        at = guard["address"] - BASE
        if at < 0 or at + len(data) > len(image) or hashlib.sha256(image[at:at + len(data)]).hexdigest() != guard["sha256"]:
            raise ValueError("Original startup graphics differ: " + hex(guard["address"]))
    result = bytearray(image)
    for guard, data in plan:
        at = guard["address"] - BASE
        result[at:at + len(data)] = data
    return bytes(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("Use a separate output; preserve the original image.")
    result = apply(args.input.read_bytes())
    args.output.write_bytes(result)
    print(f"Modwerk startup: {len(result)} bytes, SHA-256 {hashlib.sha256(result).hexdigest()}")

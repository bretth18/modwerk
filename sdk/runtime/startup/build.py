#!/usr/bin/env python3
"""Apply the VAC startup artwork to a locally composed Octatrack MAIN image.

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


def delay(x, y, cell):
    return 250 - (x // cell) * 10 - (y // cell) * 2


def writes():
    art = json.loads(ARTWORK.read_text())
    if (art["schema"], art["width"], art["height"], art["durationMs"], art["particles"], art["wordmark"]["x"], art["wordmark"]["y"]) != (1, 128, 64, 2800, 843, 8, 39):
        raise ValueError("Invalid startup animation layout")
    mark_rows = art["mark"]["rows"]
    for key, width, height in (("wordmark", 110, 15), ("mark", len(mark_rows[0]) if mark_rows else 0, len(mark_rows))):
        layer = art[key]
        if (not width or not height or len(layer["rows"]) != height or any(len(row) != width or set(row) - {".", "#"} for row in layer["rows"])
                or layer["x"] < 0 or layer["y"] < 0 or layer["x"] + width > 128 or layer["y"] + height > 64):
            raise ValueError("Invalid startup animation artwork")
    wordmark = b"".join(struct.pack(">I", sum(1 << (17 + y) for y in range(15) if art["wordmark"]["rows"][y][x] == "#")) for x in range(110))
    layer = art["mark"]
    points = [(layer["x"] + x - 63, 21 - layer["y"] - y, delay(x, y, layer["cell"]))
              for y, row in enumerate(layer["rows"]) for x, pixel in enumerate(row) if pixel == "#"]
    if not 0 < len(points) <= art["particles"]:
        raise ValueError("Startup animation exceeds the stock particle budget")
    records = []
    for i in range(art["particles"]):
        records.append(struct.pack(">hhh", *points[i if i < len(points) else (i - len(points)) * 137 % len(points)]))
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
    print(f"VAC startup: {len(result)} bytes, SHA-256 {hashlib.sha256(result).hexdigest()}")

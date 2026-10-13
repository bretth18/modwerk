# SPDX-License-Identifier: GPL-3.0-or-later
"""Private base-owned USB composition, using the existing authored functions.

The vendor function keeps interface 1. MIDI moves to 2/3 and optional audio
to 4/5, with endpoint numbers, class entities and speed-specific packets
unchanged. This is preparation, not hot module or public base admission.
"""
import hashlib
import struct

AUDIO_LAYOUTS = {
    'USB AUDIO OUT TRACKS MAIN CUE': 0,
    'USB AUDIO OUT TRACKS': 1,
    'USB AUDIO OUT MASTER': 2,
    'USB AUDIO OUT MAIN CUE': 3,
    'USB AUDIO OUT MAIN': 4,
}
MIDI_IAD = bytes([8, 11, 1, 2, 1, 0, 0, 0])
# These are the existing USB MIDI manifest's guarded, non-shared sites. The
# base owns ISR, configuration pointers/clamps, reset and the EP0 responder.
MIDI_DETOURS = (
    (0x4001d9ca, 6, '65ff3635f24fa02328d135abf8590188c4ae5f1a399f6747c196a9f1c8b4f2db', 'usbmidi_rx_setcfg_shim'),
    (0x40010bc8, 8, 'ba7573adceae0b4d98e7fca043628b41525f9bf3ec50663e051c89a57a79cb35', 'usbmidi_send_shim'),
    (0x400108b0, 6, '48904c9ab44972c2a8aad8d9544735e58fe9a7e98b8ad8ddbff57f5abc16274b', 'usbmidi_prio_shim'),
    (0x4001daec, 6, 'effa769bdedb0e393f0b05f3920eb7cc91977b77c87f424480b99748334893aa', 'usbmidi_clrfeat_shim'),
)


def records(data):
    """Parse complete authored descriptor records; never repair invalid input."""
    if not isinstance(data, bytes) or len(data) > 4095:
        raise ValueError('USB descriptors must be bounded authored bytes.')
    offset = 0
    while offset < len(data):
        if len(data) - offset < 2 or data[offset] < 2 or data[offset] > len(data) - offset:
            raise ValueError('An authored USB descriptor is incomplete.')
        yield data[offset:offset + data[offset]]
        offset += data[offset]


def configuration(base, descriptors, high_speed, other_speed=False, audio=None):
    """Join MSC/vendor/MIDI and an explicitly chosen, output-only audio layout.

    `base` and `descriptors` are trusted modules from the same pinned repository
    snapshot. The caller records source identities and keeps generated output
    private. USB MIDI is always the declared dependency of an audio function.
    """
    if type(high_speed) is not bool or type(other_speed) is not bool or audio is not None and audio not in AUDIO_LAYOUTS:
        raise ValueError('Choose an explicit supported USB output layout and speed.')
    original = descriptors.audio_config(high_speed, other_speed, audio, with_in=None) if audio else descriptors.midi_config(high_speed, other_speed)
    source = list(records(original))
    native_base = list(records(base.configuration(high_speed, other_speed, False)))
    if (not source or source[0][:2] != bytes([9, 7 if other_speed else 2])
            or struct.unpack_from('<H', source[0], 2)[0] != len(original)
            or source[0][4] != (5 if audio else 3)
            or len(native_base) != 5 or native_base[-1] != bytes([9, 4, 1, 0, 0, 255, 77, 1, 0])
            or source[1:4] != native_base[1:4]):
        raise ValueError('The shared MSC or vendor descriptor contract changed.')
    body = list(source[1:4]) + [native_base[-1]]
    tail = source[4:]
    if audio:
        if tail[0] != MIDI_IAD:
            raise ValueError('The authored MIDI function association changed.')
    else:
        tail.insert(0, MIDI_IAD)
    current = None
    interfaces = set()
    associations = []
    for record in tail:
        value = bytearray(record)
        if value[1] == 11:
            if len(value) != 8 or value[2] not in (1, 3) or value[3] != 2:
                raise ValueError('An unreviewed USB association was added.')
            value[2] += 1
            associations.append(value[2])
        elif value[1] == 4:
            if len(value) != 9 or value[2] not in range(1, 5 if audio else 3):
                raise ValueError('An unreviewed USB interface was added.')
            current = value[2]
            interfaces.add(current)
            value[2] += 1
        elif value[1] == 0x24 and current == 1:
            if record != bytes([9, 0x24, 1, 0, 1, 9, 0, 1, 2]):
                raise ValueError('The authored MIDI collection reference changed.')
            value[8] = 3
        body.append(bytes(value))
    if interfaces != set(range(1, 5 if audio else 3)) or associations != ([2, 4] if audio else [2]):
        raise ValueError('The composed USB functions are incomplete.')
    body = b''.join(body)
    header = bytearray(source[0])
    struct.pack_into('<H', header, 2, 9 + len(body))
    header[4] += 1
    return bytes(header) + body


def audio_source(text):
    """Only interface constants change; the authored audio implementation stays."""
    for name, original, updated in [('UAC2_AC_IFACE', 3, 4), ('UAC2_AS_IFACE', 4, 5)]:
        before = '.set %s,  %d ' % (name, original)
        if text.count(before) != 1:
            raise ValueError('The authored audio interface declaration changed.')
        text = text.replace(before, '.set %s,  %d ' % (name, updated))
    return text


def midi_source(text):
    """The MIDI ISR delegates its stock tail to the base's vendor poll owner."""
    before = '    jmp     0x4001e60c'
    if text.count(before) != 1:
        raise ValueError('The authored MIDI ISR continuation changed.')
    return text.replace(before, '    jmp     modwerk_ep0_poll_shim')


def audio_include(key):
    if key not in AUDIO_LAYOUTS:
        raise ValueError('Choose an explicit supported USB output layout.')
    return '| base-owned USB output, without an input function\n.set USB_LAYOUT, %d\n.set USB_IN, 0\n' % AUDIO_LAYOUTS[key]


def audio_storage_source(text):
    """Move only authored zero rings to base-cleared BSS for bounded RAM boot.

    The exact zero-only source block is guarded. Initial state and DMA queue
    records remain in data; no buffer size, layout or initialization changes.
    A fresh native link resolves every ring reference at its new address.
    """
    before, after = '.if SLOT8_LAYOUT\naud_ring:', 'usbaudio_alt:'
    if text.count(before) != 1 or text.count(after) != 1:
        raise ValueError('The authored audio ring allocation changed.')
    start, end = text.index(before), text.index(after)
    if end <= start or hashlib.sha256(text[start:end].encode()).hexdigest() != 'c49848cdec9742ad5f730deb34bf70e609e3578b33bc6dc32f5f7318a4882c73':
        raise ValueError('The authored zero-only audio ring block changed.')
    return text[:start] + '    .bss\n    .balign 4\n' + text[start:end] + '    .data\n' + text[end:]


def assembly(base, descriptors, audio=None):
    """One ISR chain and page-contained tables, including a 259-byte config.

    Audio -> bounded MIDI receive -> MIDI transmit -> vendor EP0 poll -> stock.
    Without audio the same chain starts at MIDI receive. Each configuration
    fits wholly in a page; alignment grows with its length rather than using
    the old development base's 256-byte limit.
    """
    blobs = {name: configuration(base, descriptors, high, other, audio)
             for name, high, other in [('modwerk_cfg_fs', False, False),
                                      ('modwerk_cfg_hs', True, False),
                                      ('modwerk_cfg_os_fs', False, True),
                                      ('modwerk_cfg_os_hs', True, True)]}
    lengths = {len(blob) for blob in blobs.values()}
    if len(lengths) != 1:
        raise ValueError('USB configurations must share a single guarded clamp length.')
    text = base.ASSEMBLY.format(length=lengths.pop(), **(base.AUDIO_TAILS if audio else base.STOCK_TAILS))
    blobs.update(modwerk_device=base.device(True), modwerk_bos=base.bos(), modwerk_msos20=base.msos20())
    for name, blob in blobs.items():
        alignment = max(64, 1 << (len(blob) - 1).bit_length())
        if alignment > 4096:
            raise ValueError('A USB table would cross its transfer descriptor page.')
        text += '    .balign %d\n    .global %s\n%s:\n    .byte %s\n' % (
            alignment, name, name, ', '.join('0x%02x' % byte for byte in blob))
    return text


def sites(base, image_at, audio=None):
    """Guard the original sites once and reject overlapping ownership.

    Returned stock spans are private build inputs, never publication data.
    The receive SET_CONFIGURATION shim selects the bounded high-speed receive
    path; its tail runs the unchanged authored endpoint initialization.
    """
    if audio is not None and audio not in AUDIO_LAYOUTS:
        raise ValueError('Choose an explicit supported USB output layout.')
    out = base.sites(image_at, bool(audio))
    isr = [site for site in out if int(site['addr'], 16) == 0x4001e606]
    if len(isr) != 1 or isr[0]['target'] != ('audio_isr_shim' if audio else 'modwerk_ep0_poll_shim'):
        raise ValueError('The base USB ISR ownership contract changed.')
    if not audio:
        isr[0]['target'] = 'usbmidi_rx_isr_shim'
    for address, length, digest, target in MIDI_DETOURS:
        stock = image_at(address, length)
        if len(stock) != length or hashlib.sha256(stock).hexdigest() != digest:
            raise ValueError('USB MIDI site at %#x is not the guarded native source.' % address)
        out.append(dict(addr=hex(address), stock=stock.hex(), op='jmp', target=target))
    spans = sorted((int(site['addr'], 16), len(bytes.fromhex(site['stock']))) for site in out)
    if any(address + size > following for (address, size), (following, _) in zip(spans, spans[1:])):
        raise ValueError('USB functions claim overlapping base sites.')
    return out

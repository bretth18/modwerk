| SPDX-License-Identifier: GPL-2.0-or-later
| Digitone mk1 MAIN OS 1.43: stock routines and data SYSTEM INFO calls or reads.
| Each is the Digitakt mk1 1.53 one (os153.inc) found again in 1.43: the
| routines by their code, which is the same instruction for instruction but
| for the addresses in it; the data through the code that reads it.
        | ---- stock routines and data (MAIN OS 1.43) ----------------------
        .equ OP_NEW,      0x400e944c    | operator new(size) -> d0
        .equ ITEM_CTOR,   0x400dfb28    | MenuItem(this, label, select, draw, change, id, step)
        .equ MENU_ADD,    0x400df35e    | Menu::addItem(menu, item)
        .equ FN_MGR,      0x4016593c    | std::function manager, a 4-byte function pointer
        .equ STR_CTOR,    0x4018ac7c    | std::string(this, const char*, alloc&)
        .equ INVALIDATE,  0x400e512a    | View::invalidate(view)
        .equ BLIT,        0x400de24c    | blit(dst, src, x, y, centre)
        .equ CHECKBOXES,  0x419ed988    | -> Bitmap[2], 0x1c each: empty, ticked
        .equ DRAWALL,     0x400e5c9a    | ViewController::drawAll(ctrl, Bitmap&)
        .equ FILLRECT,    0x400dd292    | (bmp, x0, y0, x1, y1, colour)
        .equ FRAMERECT,   0x400dd076    | (bmp, x0, y0, x1, y1, colour), outline
        .equ TEXTF,       0x400dde68    | (bmp, rawfont, x, y, maxlen, fmt, ...)
        .equ FONT5,       0x402315c8    | the stock 5-px font
        .equ LOCK,        0x40001a4c    | mutex lock(m)
        .equ UNLOCK,      0x40001b6e    | mutex unlock(m)
        .equ HEAPMTX,     0x41992de8    | the heap's mutex
        .equ HEAPCB,      0x4023fc58    | buddy allocator control block
        .equ SYSEX_SEND,  0x400ee354    | bool (buf, len, abort*, port); 2 = USB
        .equ DTMR0,       0xFC070000    | DMA timer 0 mode
        .equ DTCN0,       0xFC07000C    | DMA timer 0 counter, bus clock
        .equ PPMSR0,      0xFC04002D    | peripheral clock set register
        .equ CUR_TCB,     0x429F1188    | the running task's TCB
        .equ IDLE_TCB,    0x4137365C    | the idle task (the init task, parked)
        .equ IDLE_PC,     0x4008D3CC    | where it spins: bra.b *
        .equ VBR_FN,      0x40001df4    | the call 0x40000538 made
        .equ SYSEX_A3,    0x401cde1a    | the SysEx router's table (the lea hook_sysex replaces)
        | No sample engine, so no SMPFREE: SYSTEM INFO shows RAM alone.

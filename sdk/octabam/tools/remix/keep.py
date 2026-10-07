"""Assert schema.Keep before and after all native fixed and floating writes."""
def violations(image, base, modules):
    problems = []
    for module in modules:
        for keep in module.keeps:
            offset = keep.addr - base
            if offset < 0 or not len(keep.expect) or offset + len(keep.expect) > len(image):
                problems.append(f"{module.key}: kept span lies outside the OS")
            elif bytes(image[offset:offset + len(keep.expect)]) != keep.expect:
                problems.append(f"{module.key}: kept span differs at {keep.addr:#x} ({keep.note})")
    return problems

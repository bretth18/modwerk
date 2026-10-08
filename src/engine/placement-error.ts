/** Placement facts only. No firmware bytes or addresses cross the worker boundary. */
export class MenuSpaceError extends Error {
  readonly moduleIds: string[]
  readonly label: string
  readonly requiredBytes: number
  readonly availableBytes: number
  constructor(label: string, requiredBytes: number, availableBytes: number, moduleIds: string[] = []) {
    super(label + ' does not fit in the available menu and patch space (' + requiredBytes + ' bytes needed, ' + availableBytes + ' bytes available).')
    this.name = 'MenuSpaceError'
    this.label = label
    this.requiredBytes = requiredBytes
    this.availableBytes = availableBytes
    this.moduleIds = moduleIds
  }
}

/** Public names can change without changing native module or saved configuration IDs. */
export function moduleSlug(id: string) { return id === 'synth' ? 'fm-synth' : id }
export function moduleIdFromSlug(slug: string) { return slug === 'fm-synth' ? 'synth' : slug }
export function modulePath(id: string) { return 'module/' + moduleSlug(id) + '/' }

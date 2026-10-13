/** Local browser selections only. Paths are labels, never filesystem destinations. */
export type LocalSample = { id: string; path: string; file: File }
export type SampleFolder = { name: string; folders: SampleFolder[]; samples: LocalSample[] }
const AUDIO = /\.(wav|wave|aif|aiff|mp3|ogg|flac|m4a|aac|opus)$/i

export function localSamples(files: Iterable<File>): LocalSample[] {
  const samples = new Map<string, LocalSample>()
  for (const file of files) {
    if (!file.type.startsWith('audio/') && !AUDIO.test(file.name)) continue
    const path = (file.webkitRelativePath || file.name).replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
    const id = JSON.stringify([path, file.size, file.lastModified])
    samples.set(id, { id, path, file })
  }
  return [...samples.values()].sort((a, b) => a.path.localeCompare(b.path))
}

export function sampleTree(samples: LocalSample[]): SampleFolder {
  const root: SampleFolder = { name: '', folders: [], samples: [] }
  for (const sample of samples) {
    const parts = sample.path.split('/'); parts.pop()
    let folder = root
    for (const name of parts) {
      let next = folder.folders.find(item => item.name === name)
      if (!next) { next = { name, folders: [], samples: [] }; folder.folders.push(next) }
      folder = next
    }
    folder.samples.push(sample)
  }
  return root
}

export function sampleSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

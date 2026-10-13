import { describe, expect, it } from 'vitest'
import { localSamples, sampleTree } from './sample-preview'
const file = (name: string, path = '', type = '', size = 1024) => ({ name, webkitRelativePath: path, type, size, lastModified: 1 }) as File
describe('local sample labels', () => {
  it('accepts audio selections, skips other files and deduplicates unchanged local selections', () => {
    expect(localSamples([file('kick.wav'), file('kick.wav'), file('notes.txt'), file('recording', '', 'audio/ogg')]).map(sample => sample.file.name)).toEqual(['kick.wav', 'recording'])
  })
  it('keeps same-name samples in different folders and builds a nested display tree', () => {
    const samples = localSamples([file('kick.wav', 'Set/Drums/kick.wav'), file('kick.wav', 'Set/Backup/kick.wav')])
    const tree = sampleTree(samples)
    expect(samples).toHaveLength(2)
    expect(tree.folders[0].name).toBe('Set')
    expect(tree.folders[0].folders.map(folder => [folder.name, folder.samples[0].file.name])).toEqual([['Backup', 'kick.wav'], ['Drums', 'kick.wav']])
  })
  it('treats folder paths only as normalized relative labels', () => {
    expect(localSamples([file('kick.wav', '../Set\\./Drums/kick.wav')])[0].path).toBe('Set/Drums/kick.wav')
  })
})

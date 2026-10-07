import { afterEach, describe, expect, it, vi } from 'vitest'
import { followDownloadedModules } from './download-follows'
import { post } from './api'

vi.mock('./api',()=>({post:vi.fn()}))
afterEach(()=>vi.resetAllMocks())
describe('download update subscriptions',()=>{
  it('follows each downloaded module once using machine-specific IDs, independent of usage consent',async()=>{
    vi.mocked(post).mockResolvedValue({enabled:true})
    expect(await followDownloadedModules(['miniverb','miniverb','digitakt-digihealth','digitone-digihealth','unknown','spectrum'])).toEqual({followed:3,failed:false})
    expect(vi.mocked(post).mock.calls).toEqual([
      ['/modules/miniverb/download',{}],['/modules/digitakt-digihealth/download',{}],['/modules/digitone-digihealth/download',{}],
    ])
  })
  it('preserves an opt-out response and handles partial service failure without rejecting the download',async()=>{
    vi.mocked(post).mockResolvedValueOnce({enabled:false}).mockRejectedValueOnce(new Error('Offline'))
    expect(await followDownloadedModules(['miniverb','tapeecho'])).toEqual({followed:0,failed:true})
  })
})

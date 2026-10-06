import { afterEach, expect, it, vi } from 'vitest'
import { runHourly } from '../../worker'
import { reportFailure } from '../../server/api'
afterEach(()=>{vi.restoreAllMocks()})
it('runs every hourly task when one fails and names the failed task',async()=>{
  const error=vi.spyOn(console,'error').mockImplementation(()=>{}),ran:string[]=[]
  const failed=await runHourly({
    first:async()=>{ran.push('first')},
    broken:async()=>{throw new Error('table is missing')},
    last:async()=>{ran.push('last')},
  })
  expect(ran).toEqual(['first','last'])
  expect(failed).toEqual(['broken'])
  expect(error).toHaveBeenCalledTimes(1)
  expect(error.mock.calls[0][0]).toContain('Hourly task "broken" failed: Error: table is missing')
})
it('reports an unexpected request failure with its method and path only',()=>{
  const error=vi.spyOn(console,'error').mockImplementation(()=>{})
  reportFailure(new Request('https://api.example.test/api/forum/threads?token=secret',{method:'POST'}),new Error('no such column'))
  expect(error).toHaveBeenCalledTimes(1)
  const line=String(error.mock.calls[0][0])
  expect(line).toContain('POST /api/forum/threads')
  expect(line).toContain('no such column')
  expect(line).not.toContain('secret')
})

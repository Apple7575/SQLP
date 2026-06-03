import { describe, it, expect } from 'vitest'
import { computeToken } from './auth'

describe('computeToken', () => {
  it('is deterministic for the same secret', async () => {
    const a = await computeToken('secret-123')
    const b = await computeToken('secret-123')
    expect(a).toBe(b)
  })

  it('differs for different secrets', async () => {
    expect(await computeToken('a')).not.toBe(await computeToken('b'))
  })
})

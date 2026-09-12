import { describe, it, expect } from 'vitest'
import { chargeCard } from '../src/paymentService.js'

describe('chargeCard', () => {
  it('returns true for a positive amount', async () => {
    const result = await chargeCard(1000)
    expect(result).toBe(true)
  })
})

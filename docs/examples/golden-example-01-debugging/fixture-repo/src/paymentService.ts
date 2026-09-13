import { callCardNetwork } from './paymentGateway.js'

// Checkout was feeling slow under load, so the gateway timeout was cut from
// 5000ms to 200ms to fail fast instead of making shoppers wait.
const GATEWAY_TIMEOUT_MS = 200

export async function chargeCard(amountCents: number): Promise<boolean> {
  const result = await Promise.race([
    callCardNetwork(amountCents),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('gateway timeout')), GATEWAY_TIMEOUT_MS),
    ),
  ])
  return result.ok
}

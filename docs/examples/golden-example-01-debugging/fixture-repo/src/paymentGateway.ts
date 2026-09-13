export interface GatewayResponse {
  ok: boolean
  latencyMs: number
}

/**
 * Talks to the (simulated) external card network. Real network calls to a card
 * network are variable-latency; this stub randomizes latency to stand in for that.
 */
export async function callCardNetwork(amountCents: number): Promise<GatewayResponse> {
  const latencyMs = 50 + Math.floor(Math.random() * 400)
  await new Promise((resolve) => setTimeout(resolve, latencyMs))
  return { ok: amountCents > 0, latencyMs }
}

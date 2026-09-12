import { chargeCard } from './paymentService.js'

export async function placeOrder(orderId: string, amountCents: number): Promise<boolean> {
  const charged = await chargeCard(amountCents)
  if (!charged) {
    console.error(`Order ${orderId} failed: payment not charged`)
  }
  return charged
}

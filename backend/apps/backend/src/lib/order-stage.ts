/** CJPacific order progress, stored on order.metadata.cj_stage (0-4) with a cj_events log. */
export type CjEvent = { at: string; stage: number; label: string; by?: string }

export function isPickup(order: { metadata?: Record<string, unknown> | null; shipping_methods?: { name?: string | null }[] | null }) {
  const m = order.metadata?.cj_fulfillment
  if (m === "pickup") return true
  if (m === "delivery") return false
  return (order.shipping_methods ?? []).some((s) => /pick/i.test(s?.name ?? ""))
}

export function stageLabels(pickup: boolean) {
  return ["Received", "Confirmed", "Preparing", pickup ? "Ready for pickup" : "Out for delivery", pickup ? "Picked up" : "Delivered"]
}

export const LAST_STAGE = 4
/** Customers may cancel until the order is ready for pickup / out for delivery. */
export const CUSTOMER_CANCEL_BEFORE = 3

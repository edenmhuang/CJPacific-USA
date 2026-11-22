import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { customerConfirmation, ownerNewOrder } from "../lib/emails"
import { loadOrder, sendEmails } from "../lib/send"

const CJ_KEYS = ["cj_fulfillment", "cj_requested_date", "cj_notes"]

export default async function orderPlaced({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  // Medusa does not carry cart metadata onto the order, so copy the checkout details
  // (pickup/delivery, requested date, notes) and start progress at "Received".
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [linked] } = await query.graph({ entity: "order", fields: ["id", "metadata", "cart.metadata"], filters: { id: data.id } })
  const fromCart = Object.fromEntries(Object.entries((linked as any)?.cart?.metadata ?? {}).filter(([k]) => CJ_KEYS.includes(k)))
  if (linked && (linked as any).metadata?.cj_stage === undefined) {
    await container.resolve(Modules.ORDER).updateOrders(data.id, {
      metadata: { ...((linked as any).metadata ?? {}), ...fromCart, cj_stage: 0, cj_events: [{ at: new Date().toISOString(), stage: 0, label: "Received" }] },
    })
  }

  const order = await loadOrder(container, data.id)
  if (!order) return
  await sendEmails(container, [
    { to: order.email, template: "order-placed-customer", data: customerConfirmation(order) },
    { to: process.env.OWNER_ORDER_EMAIL, template: "order-placed-owner", data: ownerNewOrder(order) },
  ])
}

export const config: SubscriberConfig = { event: "order.placed" }

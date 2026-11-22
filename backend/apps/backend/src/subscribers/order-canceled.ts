import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { canceled } from "../lib/emails"
import { loadOrder, sendEmails } from "../lib/send"

export default async function orderCanceled({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const order = await loadOrder(container, data.id)
  if (!order) return
  await sendEmails(container, [
    { to: order.email, template: "order-canceled-customer", data: canceled(order, false) },
    { to: process.env.OWNER_ORDER_EMAIL, template: "order-canceled-owner", data: canceled(order, true) },
  ])
}

export const config: SubscriberConfig = { event: "order.canceled" }

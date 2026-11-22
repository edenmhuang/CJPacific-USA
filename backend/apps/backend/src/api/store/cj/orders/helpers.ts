import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CUSTOMER_CANCEL_BEFORE, isPickup, stageLabels } from "../../../../lib/order-stage"

export const FIELDS = [
  "id", "display_id", "email", "status", "created_at", "total", "item_total", "currency_code", "metadata", "customer_id",
  "items.id", "items.title", "items.product_title", "items.product_handle", "items.variant_id", "items.variant_title", "items.variant_sku",
  "items.thumbnail", "items.quantity", "items.unit_price", "shipping_address.*", "shipping_methods.name",
]

/** Shapes an order for the storefront, including CJPacific progress from metadata. */
export function present(o: Record<string, any>) {
  const m = o.metadata ?? {}
  const pickup = isPickup(o)
  const stage = Number(m.cj_stage ?? 0)
  const canceled = o.status === "canceled"
  return {
    id: o.id, ref: `CJ-${o.display_id}`, display_id: o.display_id, created_at: o.created_at, email: o.email,
    total: o.item_total ?? o.total, currency_code: o.currency_code, items: o.items ?? [], shipping_address: o.shipping_address,
    fulfillment: pickup ? "pickup" : "delivery", requested_date: m.cj_requested_date ?? "", notes: m.cj_notes ?? "",
    stage, steps: stageLabels(pickup), canceled, status: canceled ? "Cancelled" : stageLabels(pickup)[stage],
    events: Array.isArray(m.cj_events) ? m.cj_events.map(({ by, ...e }: any) => e) : [],
    can_cancel: !canceled && stage < CUSTOMER_CANCEL_BEFORE,
  }
}

export async function customerOrders(container: MedusaContainer, customerId: string, id?: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order", fields: FIELDS,
    filters: id ? { id, customer_id: customerId } : { customer_id: customerId },
    pagination: { order: { created_at: "DESC" }, take: 100 },
  })
  return data.map(present)
}

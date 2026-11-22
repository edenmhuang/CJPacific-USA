import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { CUSTOMER_CANCEL_BEFORE } from "../../../../../../lib/order-stage"
import { loadOrder } from "../../../../../../lib/send"

/** Lets a signed-in business cancel its own order until it is ready / out for delivery. */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context.actor_id
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.customer_id !== customerId) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  if (order.status === "canceled") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Order is already cancelled")
  if (Number(order.metadata?.cj_stage ?? 0) >= CUSTOMER_CANCEL_BEFORE) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This order is already on its way. Contact us to change it.")
  }
  await cancelOrderWorkflow(req.scope).run({ input: { order_id: order.id, canceled_by: customerId } })
  res.json({ id: order.id, status: "canceled" })
}

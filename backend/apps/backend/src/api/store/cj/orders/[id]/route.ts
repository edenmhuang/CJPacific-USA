import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { customerOrders } from "../helpers"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const [order] = await customerOrders(req.scope, req.auth_context.actor_id, req.params.id)
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  res.json({ order })
}

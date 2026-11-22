import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { customerOrders } from "./helpers"

/** The signed-in business's orders, newest first, with progress. */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  res.json({ orders: await customerOrders(req.scope, req.auth_context.actor_id) })
}

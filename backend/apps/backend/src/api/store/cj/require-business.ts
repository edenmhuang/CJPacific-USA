import { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Orders require a business account: the cart must belong to the signed-in customer,
 * and that customer must have a business name and phone on file.
 */
export async function requireBusinessCart(request: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const req = request as AuthenticatedMedusaRequest
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerId = req.auth_context?.actor_id
  const { data: [cart] } = await query.graph({ entity: "cart", fields: ["id", "customer_id"], filters: { id: req.params.id } })
  const { data: [customer] } = await query.graph({ entity: "customer", fields: ["id", "company_name", "phone", "has_account"], filters: { id: customerId } })
  if (!cart || !customer || cart.customer_id !== customer.id) {
    return res.status(401).json({ type: "unauthorized", message: "Sign in to your business account to place an order." })
  }
  if (!customer.company_name?.trim() || !customer.phone?.trim()) {
    return res.status(400).json({ type: "invalid_data", message: "Add your business name and phone number to your account before ordering." })
  }
  next()
}

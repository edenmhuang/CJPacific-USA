import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isOutOfStock } from "../../../lib/stock"

const outMessage = (title?: string) => `${title || "This product"} is out of stock.`

/** Blocks adding (or increasing) a product that staff marked out of stock. Lowering a quantity stays allowed. */
export async function requireInStockLine(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const body = (req.body ?? {}) as { variant_id?: string; quantity?: number }
  const { id, line_id } = req.params as { id: string; line_id?: string }
  let variantId = body.variant_id
  if (line_id) {
    const { data: [cart] } = await query.graph({ entity: "cart", fields: ["id", "items.id", "items.variant_id", "items.quantity"], filters: { id } })
    const line = (cart?.items ?? []).find((i: any) => i?.id === line_id) as any
    if (!line || Number(body.quantity ?? 0) <= Number(line.quantity)) return next()
    variantId = line.variant_id
  }
  if (!variantId) return next()
  const { data: [variant] } = await query.graph({
    entity: "product_variant", fields: ["id", "manage_inventory", "allow_backorder", "product.title", "product.metadata"], filters: { id: variantId },
  })
  if (variant && isOutOfStock((variant as any).product, null)) {
    return res.status(400).json({ type: "out_of_stock", message: outMessage((variant as any).product?.title) })
  }
  next()
}

/** Refuses to place an order that still contains an out-of-stock product. */
export async function requireInStockCart(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [cart] } = await query.graph({ entity: "cart", fields: ["id", "items.product_id", "items.product_title"], filters: { id: req.params.id } })
  const ids = [...new Set((cart?.items ?? []).map((i: any) => i?.product_id).filter(Boolean))] as string[]
  if (!ids.length) return next()
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "metadata"], filters: { id: ids } })
  const out = products.filter((p: any) => isOutOfStock(p, null))
  if (out.length) {
    return res.status(400).json({ type: "out_of_stock", message: `${out.map((p: any) => p.title).join(", ")} ${out.length === 1 ? "is" : "are"} out of stock. Remove ${out.length === 1 ? "it" : "them"} to place your order.` })
  }
  next()
}

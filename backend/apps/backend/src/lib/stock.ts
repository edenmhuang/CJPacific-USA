/**
 * CJPacific availability. Staff switch a product In stock / Out of stock in Medusa Admin
 * (product.metadata.cj_stock = "out"). If a variant uses Medusa's own stock counts,
 * zero available without backorders also counts as out of stock.
 */
export type StockVariant = { manage_inventory?: boolean | null; allow_backorder?: boolean | null; inventory_quantity?: number | null }

export function isOutOfStock(product?: { metadata?: Record<string, unknown> | null } | null, variant?: StockVariant | null) {
  if (product?.metadata?.cj_stock === "out") return true
  return !!variant?.manage_inventory && !variant.allow_backorder && typeof variant.inventory_quantity === "number" && variant.inventory_quantity <= 0
}

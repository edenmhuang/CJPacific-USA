export type Address = {
  id?: string; company?: string; first_name?: string; last_name?: string; address_1?: string; address_2?: string
  city?: string; province?: string; postal_code?: string; country_code?: string; phone?: string
}
export type Customer = {
  id: string; email: string; company_name: string | null; phone: string | null
  first_name: string | null; last_name: string | null; addresses?: Address[]
}
export type Variant = { id: string; title: string; sku: string | null; calculated_price?: { calculated_amount: number } }
export type Product = {
  id: string; title: string; handle: string; thumbnail: string | null; description?: string | null
  metadata?: { pack?: string; unit?: string } | null; categories?: { id: string; name: string }[]; variants: Variant[]
}
export type Category = { id: string; name: string; rank: number }
export type LineItem = {
  id: string; variant_id: string; product_title: string; variant_title: string; thumbnail: string | null
  quantity: number; unit_price: number; total?: number; product_handle?: string
}
export type Cart = { id: string; customer_id: string | null; items: LineItem[]; item_total: number; total: number }
export type OrderEvent = { at: string; stage: number; label: string }
export type Order = {
  id: string; ref: string; created_at: string; email: string; total: number; items: (LineItem & { variant_sku?: string })[]
  shipping_address?: Address; fulfillment: "pickup" | "delivery"; requested_date: string; notes: string
  stage: number; steps: string[]; canceled: boolean; status: string; events: OrderEvent[]; can_cancel: boolean
}

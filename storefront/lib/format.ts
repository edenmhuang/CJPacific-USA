export const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0))
export const day = (t: string | number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
export const dayTime = (t: string) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
/** Pack size shown under a product name: the product subtitle in Medusa Admin, else a non-default variant title. */
export const packOf = (subtitle?: string | null, variantTitle?: string | null) =>
  subtitle?.trim() || (variantTitle && !/^default/i.test(variantTitle) ? variantTitle : "")
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@cjpusa.com"
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "(510) 698-9328"
export const STORE_ADDRESS = "14600 Doolittle Dr, San Leandro, CA 94577"
export const COPYRIGHT = "© 2023 - 2026 CJ Pacific USA - Frozen Seafood Distribution"

/** Company introduction shown on About Us and Contact. */
export const ABOUT = "富泉贸易公司成立于1983年，主要提供各类型高质量的食品，包括干货、冷冻海鲜、肉类和餐馆用品。三十多年来，我们重视客户满意度，通过提供优质的产品和出色的客户服务来维护长期的客户关系。我们与供应商紧密合作，确保所有产品符合美国的食品安全标准和客户的要求。"

/** Out of stock when staff switched it off in Admin, or Medusa stock counts reached zero without backorders. */
export function outOfStock(p: { metadata?: Record<string, unknown> | null; variants?: { manage_inventory?: boolean | null; allow_backorder?: boolean | null; inventory_quantity?: number | null }[] }) {
  if (p.metadata?.cj_stock === "out") return true
  const v = p.variants?.[0]
  return !!v?.manage_inventory && !v.allow_backorder && typeof v.inventory_quantity === "number" && v.inventory_quantity <= 0
}

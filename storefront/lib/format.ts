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

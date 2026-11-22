export const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0))
export const day = (t: string | number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
export const dayTime = (t: string) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
export const plural = (n: number, unit: string) => (unit === "item" ? `${n} ${n === 1 ? "item" : "items"}` : `${n} ${unit}`)
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ""
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || ""

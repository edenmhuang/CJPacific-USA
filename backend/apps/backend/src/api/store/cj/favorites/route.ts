import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/** Favorite products for a signed-in business account, kept on customer.metadata.cj_favorites (newest first). */
const KEY = "cj_favorites"
const MAX = 500
const PRODUCT_ID = /^prod_[A-Za-z0-9]{1,64}$/

const favoritesOf = (metadata?: Record<string, unknown> | null) =>
  Array.isArray(metadata?.[KEY]) ? (metadata![KEY] as unknown[]).filter((x): x is string => typeof x === "string") : []

async function account(req: AuthenticatedMedusaRequest) {
  const { data: [c] } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "customer", fields: ["id", "metadata", "has_account"], filters: { id: req.auth_context.actor_id },
  })
  return c?.has_account ? c : null
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const c = await account(req)
  if (!c) return res.status(404).json({ message: "Business account not found." })
  return res.json({ favorites: favoritesOf(c.metadata) })
}

export async function POST(req: AuthenticatedMedusaRequest<{ product_id?: unknown; favorite?: unknown }>, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const c = await account(req)
  if (!c) return res.status(404).json({ message: "Business account not found." })
  const id = req.body?.product_id, favorite = req.body?.favorite
  if (typeof id !== "string" || !PRODUCT_ID.test(id) || typeof favorite !== "boolean") {
    return res.status(400).json({ message: "Send a product_id and favorite: true or false." })
  }
  const current = favoritesOf(c.metadata)
  if (favorite) {
    const { data: [product] } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "product", fields: ["id", "status"], filters: { id } })
    if (!product || product.status !== "published") return res.status(404).json({ message: "Product not found." })
  }
  const next = (favorite ? [id, ...current.filter((x) => x !== id)] : current.filter((x) => x !== id)).slice(0, MAX)
  await req.scope.resolve(Modules.CUSTOMER).updateCustomers(c.id, { metadata: { ...(c.metadata ?? {}), [KEY]: next } })
  return res.json({ favorites: next })
}

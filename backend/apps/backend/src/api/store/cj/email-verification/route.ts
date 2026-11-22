import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { emailVerified, LINK_TTL, normalizeEmail, PROOF_KEY, sendKey, SEND_WINDOW, validLink, verificationConfigured, verificationCustomer, verificationLink, verificationProof } from "../../../../lib/email-verification"
import { verifyBusinessEmail } from "../../../../lib/emails"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const c = await verificationCustomer(req, req.auth_context.actor_id)
  if (!c) return res.status(404).json({ message: "Business account not found." })
  return res.json({ verified: emailVerified(c) })
}

export async function POST(req: AuthenticatedMedusaRequest<{ token?: unknown }>, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const c = await verificationCustomer(req, req.auth_context.actor_id)
  if (!c) return res.status(404).json({ message: "Business account not found." })
  if (emailVerified(c)) return res.json({ verified: true })
  if (!verificationConfigured()) return res.status(503).json({ message: "Email verification is temporarily unavailable. Please contact us for help." })
  if (req.body?.token !== undefined) {
    if (!validLink(c, req.body.token)) return res.status(400).json({ message: "This link is expired or belongs to a different account. Sign in with the right account or request a new link." })
    await req.scope.resolve(Modules.CUSTOMER).updateCustomers(c.id, { metadata: { ...c.metadata, [PROOF_KEY]: verificationProof(c) } })
    return res.json({ verified: true })
  }
  const preview = process.env.NODE_ENV !== "production" && !!process.env.EMAIL_PREVIEW_DIR
  let url: URL
  try {
    url = new URL("/verify-email", process.env.STOREFRONT_URL)
  } catch {
    return res.status(503).json({ message: "Email verification is temporarily unavailable. Please contact us for help." })
  }
  if (url.protocol !== "https:" && !(preview && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    return res.status(503).json({ message: "Email verification is temporarily unavailable. Please contact us for help." })
  }
  if (!process.env.RESEND_API_KEY && !preview) return res.status(503).json({ message: "Email verification is temporarily unavailable. Please contact us for help." })
  const start = Math.floor(Date.now() / SEND_WINDOW) * SEND_WINDOW
  url.hash = new URLSearchParams({ token: verificationLink(c, start + LINK_TTL) }).toString()
  try {
    const sent = await req.scope.resolve(Modules.NOTIFICATION).createNotifications({
      to: normalizeEmail(c.email), channel: "email", template: "verify-business-email", idempotency_key: `verify-${sendKey(c, start)}`,
      data: verifyBusinessEmail(url.toString()),
    })
    if (!preview && sent?.external_id === "not-sent") return res.status(503).json({ message: "We couldn't send a verification email. Please try again shortly." })
  } catch {
    return res.status(503).json({ message: "We couldn't send a verification email. Please try again shortly." })
  }
  return res.json({ verified: false, sent: !!process.env.RESEND_API_KEY })
}

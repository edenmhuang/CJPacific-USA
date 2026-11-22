import { createHmac, timingSafeEqual } from "node:crypto"
import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const normalizeEmail = (email?: string | null) => (email ?? "").trim().toLowerCase()
const secret = () => process.env.EMAIL_VERIFICATION_SECRET ?? ""
export const verificationConfigured = () => Buffer.byteLength(secret()) >= 32
export const SEND_WINDOW = 5 * 60 * 1000
export const LINK_TTL = 24 * 60 * 60 * 1000
export const PROOF_KEY = "cj_email_verification"

type Identity = { id: string; email?: string | null }
const sign = (kind: "link" | "verified" | "send", { id, email }: Identity, until = 0) =>
  createHmac("sha256", secret()).update(JSON.stringify(["cjpacific-email-v1", kind, id, normalizeEmail(email), until])).digest("base64url")
const match = (given: unknown, expected: string) => typeof given === "string" && Buffer.byteLength(given) === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
export const emailVerified = (c: Identity & { metadata?: Record<string, unknown> | null }) =>
  verificationConfigured() && !!normalizeEmail(c.email) && match(c.metadata?.[PROOF_KEY], sign("verified", c))
export const verificationProof = (c: Identity) => sign("verified", c)
export const sendKey = (c: Identity, start: number) => sign("send", c, start)
export const verificationLink = (c: Identity, until: number) => `${until}.${sign("link", c, until)}`
export function validLink(c: Identity, value: unknown, now = Date.now()) {
  if (!verificationConfigured() || !normalizeEmail(c.email) || typeof value !== "string" || !/^\d{13}\.[A-Za-z0-9_-]{43}$/.test(value)) return false
  const [stamp, signature] = value.split(".")
  const until = Number(stamp)
  return now < until && until <= now + LINK_TTL && match(signature, sign("link", c, until))
}
export async function verificationCustomer(req: MedusaRequest, id: string) {
  const { data: [c] } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "customer", fields: ["id", "email", "metadata", "has_account"], filters: { id },
  })
  return c?.has_account && normalizeEmail(c.email) ? c : null
}

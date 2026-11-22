import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendEmails } from "../lib/send"

/** Emails a business its password reset link (storefront /reset-password page). */
export default async function passwordReset({ event: { data }, container }: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  if (data.actor_type !== "customer") return
  const site = (process.env.STOREFRONT_URL || "").replace(/\/$/, "")
  const url = `${site}/reset-password?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.entity_id)}`
  const store = process.env.STORE_NAME || "CJPacific USA"
  await sendEmails(container, [{
    to: data.entity_id, template: "password-reset",
    data: {
      subject: `Reset your ${store} password`,
      text: `Reset your password: ${url}\n\nIf you didn't ask for this, ignore this email.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 18px;color:#1c1d19"><p style="font-weight:700">${store}</p><p>Reset your password with the button below. The link expires in 15 minutes.</p><p><a href="${url}" style="background:#1c1d19;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block">Reset password</a></p><p style="color:#8a8a84;font-size:12px">If you didn't ask for this, ignore this email.</p></div>`,
    },
  }])
}

export const config: SubscriberConfig = { event: "auth.password_reset" }

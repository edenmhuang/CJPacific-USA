import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ORDER_EMAIL_FIELDS } from "./emails"

export async function loadOrder(container: MedusaContainer, id: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_EMAIL_FIELDS, filters: { id } })
  return data[0] as Record<string, any> | undefined
}

/** Sends each email on its own so one bad address never blocks the other. */
export async function sendEmails(container: MedusaContainer, emails: { to?: string | null; template: string; data: Record<string, unknown> }[]) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notifications = container.resolve(Modules.NOTIFICATION)
  for (const e of emails) {
    if (!e.to) { logger.warn(`Skipped ${e.template}: no recipient (set OWNER_ORDER_EMAIL for owner copies)`); continue }
    try {
      await notifications.createNotifications({ to: e.to, channel: "email", template: e.template, data: e.data })
    } catch (err) {
      logger.error(`Email ${e.template} to ${e.to} failed: ${(err as Error).message}`)
    }
  }
}

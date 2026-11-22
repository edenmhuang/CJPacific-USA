import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import fs from "fs"
import path from "path"

type Options = { api_key?: string; from: string; preview_dir?: string }
type EmailData = { subject: string; html: string; text: string; reply_to?: string }

/** Sends prepared emails (subject/html/text in notification.data) through the Resend HTTP API. */
export default class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  protected options_: Options
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }, options: Options) {
    super()
    this.options_ = options
    this.logger_ = logger
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const data = notification.data as unknown as EmailData
    if (!notification.to || !data?.subject) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Email needs a recipient and a subject")
    }
    if (this.options_.preview_dir) {
      fs.mkdirSync(this.options_.preview_dir, { recursive: true })
      const file = path.join(this.options_.preview_dir, `${Date.now()}-${notification.template}.html`)
      fs.writeFileSync(file, `<!-- to: ${notification.to} | subject: ${data.subject} -->\n${data.html}`)
    }
    if (!this.options_.api_key) {
      this.logger_.info(`[email not sent: RESEND_API_KEY missing] to=${notification.to} subject="${data.subject}"`)
      return { id: "not-sent" }
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options_.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.options_.from, to: [notification.to], subject: data.subject,
        html: data.html, text: data.text, reply_to: data.reply_to,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Resend error ${res.status}: ${JSON.stringify(body)}`)
    }
    return { id: body.id }
  }
}

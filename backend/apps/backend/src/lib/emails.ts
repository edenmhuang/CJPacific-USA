import { isPickup, stageLabels } from "./order-stage"

type Order = Record<string, any>
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))
const usd = (n: unknown) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0))
const ref = (o: Order) => `CJ-${o.display_id}`
const store = () => process.env.STORE_NAME || "CJPacific USA"
const site = () => (process.env.STOREFRONT_URL || "").replace(/\/$/, "")

function business(o: Order) {
  const c = o.customer ?? {}
  return {
    name: c.company_name || o.shipping_address?.company || "",
    contact: [c.first_name, c.last_name].filter(Boolean).join(" "),
    phone: c.phone || o.shipping_address?.phone || "",
    email: o.email,
  }
}

function lines(o: Order) {
  return (o.items ?? []).map((i: any) => ({
    qty: i.quantity, title: i.product_title || i.title, pack: i.product_subtitle || (/^default/i.test(i.variant_title || "") ? "" : i.variant_title || ""), sku: i.variant_sku || "",
    unit: i.unit_price, total: Number(i.unit_price) * Number(i.quantity),
  }))
}

function fulfillmentText(o: Order) {
  const pickup = isPickup(o)
  const a = o.shipping_address ?? {}
  const addr = [a.address_1, a.address_2, a.city, a.province, a.postal_code].filter(Boolean).join(", ")
  return { pickup, mode: pickup ? "Pickup" : "Local delivery", address: pickup ? "" : addr }
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1d19">
<div style="max-width:600px;margin:0 auto;padding:28px 18px"><div style="font-weight:700;font-size:15px;letter-spacing:.2px;margin-bottom:16px">${esc(store())}</div>
<div style="background:#fff;border:1px solid #e6e5e0;border-radius:14px;padding:26px"><h1 style="font-size:21px;margin:0 0 14px">${esc(title)}</h1>${body}</div>
<p style="font-size:12px;color:#8a8a84;margin-top:16px">No payment was collected online. ${esc(store())} emails invoices separately.</p></div></body></html>`
}

function table(o: Order) {
  const rows = lines(o).map((l: any) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${l.qty} × ${esc(l.title)}<div style="color:#8a8a84;font-size:12px">${esc(l.pack)}${l.sku ? " · " + esc(l.sku) : ""} · ${usd(l.unit)} each</div></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${usd(l.total)}</td></tr>`).join("")
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:10px 0;font-weight:600">Estimated total</td><td style="padding:10px 0;text-align:right;font-weight:600">${usd(o.item_total ?? o.total)}</td></tr></table>`
}

function facts(o: Order) {
  const f = fulfillmentText(o), b = business(o), m = o.metadata ?? {}
  const row = (k: string, v: unknown) => (v ? `<tr><td style="color:#8a8a84;padding:3px 14px 3px 0;vertical-align:top">${k}</td><td style="padding:3px 0">${esc(v)}</td></tr>` : "")
  return `<table style="font-size:14px;margin:0 0 18px">${row("Order", ref(o))}${row("Business", b.name)}${row("Contact", b.contact)}${row("Phone", b.phone)}${row("Email", b.email)}${row("Fulfillment", f.mode)}${row("Deliver to", f.address)}${row("Requested date", m.cj_requested_date)}${row("Notes", m.cj_notes)}</table>`
}

function plain(o: Order, intro: string) {
  const f = fulfillmentText(o), b = business(o), m = o.metadata ?? {}
  return [intro, "", `Order: ${ref(o)}`, `Business: ${b.name}`, `Phone: ${b.phone}`, `Email: ${b.email}`, `Fulfillment: ${f.mode}${f.address ? " · " + f.address : ""}`,
    m.cj_requested_date ? `Requested date: ${m.cj_requested_date}` : "", m.cj_notes ? `Notes: ${m.cj_notes}` : "", "",
    ...lines(o).map((l: any) => `${l.qty} × ${l.title} (${l.pack}${l.sku ? ", " + l.sku : ""}) @ ${usd(l.unit)} = ${usd(l.total)}`),
    `Estimated total: ${usd(o.item_total ?? o.total)}`].filter((x) => x !== "").join("\n")
}

export function customerConfirmation(o: Order) {
  const link = site() ? `<p style="margin:18px 0 0"><a href="${site()}/orders/${o.id}" style="background:#1c1d19;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px">Track your order</a></p>` : ""
  return {
    subject: `Order received · ${ref(o)}`,
    reply_to: process.env.OWNER_ORDER_EMAIL,
    html: shell("Thanks, we got your order", `<p style="font-size:14px;line-height:1.5;margin:0 0 16px">We'll review it and email your invoice separately.</p>${facts(o)}${table(o)}${link}`),
    text: plain(o, `Thanks, we got your order. We'll review it and email your invoice separately.`),
  }
}

export function ownerNewOrder(o: Order) {
  const b = business(o)
  return {
    subject: `New order ${ref(o)} · ${b.name || b.email}`,
    reply_to: o.email,
    html: shell(`New order ${ref(o)}`, `<p style="font-size:14px;margin:0 0 16px">Enter it in your invoice tool, then update progress in Medusa Admin.</p>${facts(o)}${table(o)}`),
    text: plain(o, `New order ${ref(o)}. Enter it in your invoice tool, then update progress in Medusa Admin.`),
  }
}

export function canceled(o: Order, forOwner: boolean) {
  const b = business(o)
  return {
    subject: `Order cancelled · ${ref(o)}${forOwner ? " · " + (b.name || b.email) : ""}`,
    reply_to: forOwner ? o.email : process.env.OWNER_ORDER_EMAIL,
    html: shell(`Order ${ref(o)} was cancelled`, `<p style="font-size:14px;margin:0 0 16px">${forOwner ? "Void this order in your invoice tool if it was entered." : "No invoice will be sent for this order."}</p>${facts(o)}${table(o)}`),
    text: plain(o, `Order ${ref(o)} was cancelled.`),
  }
}

export function stageUpdate(o: Order, stage: number) {
  const label = stageLabels(isPickup(o))[stage]
  const line = stage === 1 ? "Your order is confirmed." : stage === 3 && isPickup(o) ? "Your order is ready for pickup." : stage === 3 ? "Your order is out for delivery." : `Status: ${label}.`
  return {
    subject: `${label} · ${ref(o)}`,
    reply_to: process.env.OWNER_ORDER_EMAIL,
    html: shell(label, `<p style="font-size:14px;margin:0 0 16px">${esc(line)}</p>${facts(o)}`),
    text: plain(o, line),
  }
}

export const ORDER_EMAIL_FIELDS = [
  "id", "display_id", "email", "status", "created_at", "currency_code", "total", "item_total", "metadata", "customer_id",
  "items.title", "items.product_title", "items.variant_title", "items.product_subtitle", "items.variant_sku", "items.quantity", "items.unit_price",
  "shipping_address.*", "shipping_methods.name", "customer.first_name", "customer.last_name", "customer.company_name", "customer.phone",
]

export function verifyBusinessEmail(url: string) {
  return {
    subject: `Verify your email for ${store()}`,
    html: `<div style="max-width:520px;margin:24px auto;padding:24px;font-family:Arial,sans-serif;color:#172925"><h1 style="font-size:22px">Verify your email</h1><p>Confirm this email before placing a pickup or delivery order.</p><p><a href="${esc(url)}" style="display:inline-block;background:#244b3f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px">Verify email</a></p><p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p></div>`,
    text: `Verify your email before placing an order: ${url}\nThis link expires in 24 hours. If you didn't create an account, ignore this email.`,
  }
}

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Checkbox, Container, Heading, Label, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

const labels = (pickup: boolean) => ["Received", "Confirmed", "Preparing", pickup ? "Ready for pickup" : "Out for delivery", pickup ? "Picked up" : "Delivered"]
const emailed = new Set([1, 3])

const OrderProgressWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const meta = (order.metadata ?? {}) as Record<string, any>
  const pickup = meta.cj_fulfillment ? meta.cj_fulfillment === "pickup" : (order.shipping_methods ?? []).some((s) => /pick/i.test(s.name ?? ""))
  const steps = labels(pickup)
  const [stage, setStage] = useState<number>(Number(meta.cj_stage ?? 0))
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [biz, setBiz] = useState<{ company_name?: string; phone?: string } | null>(null)
  const canceled = order.status === "canceled"

  useEffect(() => {
    if (!order.customer_id) return
    fetch(`/admin/customers/${order.customer_id}?fields=company_name,phone`, { credentials: "include" })
      .then((r) => r.json()).then((d) => setBiz(d.customer ?? null)).catch(() => {})
  }, [order.customer_id])

  const move = async (to: number) => {
    setBusy(true)
    try {
      const r = await fetch(`/admin/orders/${order.id}/cj-stage`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: to, notify }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || "Could not update")
      setStage(d.stage)
      toast.success(`Marked ${d.label.toLowerCase()}`, { description: notify && to > stage && emailed.has(to) ? "Customer emailed" : undefined })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Order progress</Heading>
        <Badge size="2xsmall" color={canceled ? "red" : stage >= 4 ? "green" : "blue"}>{canceled ? "Cancelled" : steps[stage]}</Badge>
      </div>
      <div className="px-6 py-4">
        <Text size="small" weight="plus">{biz?.company_name || "Business"}</Text>
        <Text size="small" className="text-ui-fg-subtle">{[biz?.phone, order.email].filter(Boolean).join(" · ")}</Text>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {pickup ? "Pickup" : "Local delivery"}{meta.cj_requested_date ? ` · wants ${meta.cj_requested_date}` : ""}
        </Text>
        {meta.cj_notes && <Text size="small" className="text-ui-fg-subtle mt-1">“{meta.cj_notes}”</Text>}
      </div>
      <ol className="px-6 py-4 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`h-5 w-5 shrink-0 rounded-full text-[11px] flex items-center justify-center ${i <= stage && !canceled ? "bg-ui-fg-base text-ui-bg-base" : "bg-ui-bg-subtle text-ui-fg-muted border"}`}>{i < stage ? "✓" : i + 1}</span>
            <Text size="small" className={i === stage ? "font-medium" : "text-ui-fg-subtle"}>{s}</Text>
          </li>
        ))}
      </ol>
      {!canceled && (
        <div className="px-6 py-4 flex flex-col gap-3">
          {stage < 4 && (
            <Button size="small" isLoading={busy} onClick={() => move(stage + 1)}>Mark {steps[stage + 1].toLowerCase()}</Button>
          )}
          {stage < 4 && emailed.has(stage + 1) && (
            <div className="flex items-center gap-2">
              <Checkbox id="cj-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
              <Label htmlFor="cj-notify" size="small">Email the customer</Label>
            </div>
          )}
          {stage > 0 && (
            <Button size="small" variant="transparent" disabled={busy} onClick={() => move(stage - 1)}>Undo: back to {steps[stage - 1].toLowerCase()}</Button>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.side" })
export default OrderProgressWidget

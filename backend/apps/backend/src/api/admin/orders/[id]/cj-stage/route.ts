import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { stageUpdate } from "../../../../../lib/emails"
import { CjEvent, LAST_STAGE, isPickup, stageLabels } from "../../../../../lib/order-stage"
import { loadOrder, sendEmails } from "../../../../../lib/send"

export const StageBody = z.object({ stage: z.number().int().min(0).max(LAST_STAGE), notify: z.boolean().optional() })

/** Moves an order one step along Received → … → Picked up/Delivered. Staff only. */
export const POST = async (req: AuthenticatedMedusaRequest<z.infer<typeof StageBody>>, res: MedusaResponse) => {
  const { stage, notify = true } = req.validatedBody
  const order = await loadOrder(req.scope, req.params.id)
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  if (order.status === "canceled") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This order is cancelled")
  const current = Number(order.metadata?.cj_stage ?? 0)
  if (Math.abs(stage - current) !== 1) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Order is at step ${current}; move one step at a time`)

  const label = stageLabels(isPickup(order))[stage]
  const events: CjEvent[] = Array.isArray(order.metadata?.cj_events) ? order.metadata!.cj_events : []
  const metadata = {
    ...(order.metadata ?? {}), cj_stage: stage,
    cj_events: [...events, { at: new Date().toISOString(), stage, label: stage < current ? `Moved back to ${label}` : label, by: req.auth_context?.actor_id }],
  }
  await req.scope.resolve(Modules.ORDER).updateOrders(order.id, { metadata })

  if (notify && stage > current && (stage === 1 || stage === 3)) {
    await sendEmails(req.scope, [{ to: order.email, template: `order-stage-${stage}`, data: stageUpdate({ ...order, metadata }, stage) }])
  }
  res.json({ stage, label, events: metadata.cj_events })
}

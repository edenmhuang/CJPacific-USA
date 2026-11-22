import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text, toast } from "@medusajs/ui"
import { useState } from "react"

/**
 * Featured switch on every product page. Featured products fill the scrolling top row of their
 * category in the storefront (and of All products), ordered by Position (1 shows first).
 */
const ProductFeaturedWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [on, setOn] = useState(product.metadata?.cj_featured === true)
  const [position, setPosition] = useState(String(product.metadata?.cj_featured_rank ?? ""))
  const [saved, setSaved] = useState({ on, position })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const rank = position.trim() === "" ? null : Math.round(Number(position))
    if (on && rank !== null && (!Number.isFinite(rank) || rank < 1 || rank > 999)) return toast.error("Position must be a number from 1 to 999.")
    setBusy(true)
    try {
      const r = await fetch(`/admin/products/${product.id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...(product.metadata ?? {}), cj_featured: on, cj_featured_rank: on ? rank : null } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || "Could not update")
      const next = { on: d.product?.metadata?.cj_featured === true, position: String(d.product?.metadata?.cj_featured_rank ?? "") }
      setOn(next.on); setPosition(next.position); setSaved(next)
      toast.success(next.on ? "Featured in the top row" : "Removed from the top row")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const changed = on !== saved.on || (on && position !== saved.position)
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Featured</Heading>
        <Badge size="2xsmall" color={saved.on ? "green" : "grey"}>{saved.on ? "Top row" : "Not featured"}</Badge>
      </div>
      <div className="px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="cj-featured" size="small">Show in the top row</Label>
          <Switch id="cj-featured" checked={on} onCheckedChange={setOn} />
        </div>
        {on && (
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="cj-featured-rank" size="small">Position</Label>
            <Input id="cj-featured-rank" className="w-24" size="small" type="number" min={1} max={999} placeholder="Last" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        )}
        <Text size="small" className="text-ui-fg-subtle">Featured products scroll in the top row of their category and of All products. 1 shows first.</Text>
        <Button size="small" variant="secondary" isLoading={busy} disabled={!changed} onClick={save}>Save</Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.side.before" })
export default ProductFeaturedWidget

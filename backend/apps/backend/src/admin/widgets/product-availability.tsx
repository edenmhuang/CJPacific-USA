import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

/** In stock / Out of stock switch shown on every product page. Customers see the label in the catalog. */
const ProductAvailabilityWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [out, setOut] = useState(product.metadata?.cj_stock === "out")
  const [busy, setBusy] = useState(false)
  const set = async (next: boolean) => {
    setBusy(true)
    try {
      const r = await fetch(`/admin/products/${product.id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...(product.metadata ?? {}), cj_stock: next ? "out" : "in" } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || "Could not update")
      setOut(d.product?.metadata?.cj_stock === "out")
      toast.success(next ? "Marked out of stock" : "Marked in stock")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Availability</Heading>
        <Badge size="2xsmall" color={out ? "red" : "green"}>{out ? "Out of stock" : "In stock"}</Badge>
      </div>
      <div className="px-6 py-4 flex flex-col gap-3">
        <Text size="small" className="text-ui-fg-subtle">{out ? "Customers can see this product but can’t add it to an order." : "Customers can add this product to an order."}</Text>
        <Button size="small" variant={out ? "primary" : "secondary"} isLoading={busy} onClick={() => set(!out)}>{out ? "Mark in stock" : "Mark out of stock"}</Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.side" })
export default ProductAvailabilityWidget

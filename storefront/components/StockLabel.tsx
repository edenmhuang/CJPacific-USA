export function StockLabel({ out }: { out: boolean }) {
  return <span className={`stock-label${out ? " is-out" : ""}`}>{out ? "Out of stock" : "In stock"}</span>
}

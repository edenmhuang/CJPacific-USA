/** Standard page body. The shared footer is rendered once by the root layout. */
export function Page({ children }: { children: React.ReactNode }) {
  return <main className="cj-main">{children}</main>
}

export function Title({ eyebrow, name, sub }: { eyebrow: string; name: string; sub?: React.ReactNode }) {
  return <div className="cj-title"><div className="eyebrow">{eyebrow}</div><h1>{name}</h1>{sub && <p>{sub}</p>}</div>
}

/** Red asterisk for required form fields. */
export function Req() {
  return <span className="req" aria-hidden="true">*</span>
}

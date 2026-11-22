import { COPYRIGHT } from "@/lib/format"

export function Footer() {
  return <footer className="cj-footer"><span>{COPYRIGHT}</span></footer>
}

/** Standard page body: centered content with the site footer below it. */
export function Page({ children }: { children: React.ReactNode }) {
  return <><main className="cj-main">{children}</main><Footer /></>
}

export function Title({ eyebrow, name, sub }: { eyebrow: string; name: string; sub?: React.ReactNode }) {
  return <div className="cj-title"><div className="eyebrow">{eyebrow}</div><h1>{name}</h1>{sub && <p>{sub}</p>}</div>
}

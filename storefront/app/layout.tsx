import type { Metadata } from "next"
import "./globals.css"
import { StoreProvider } from "./store"
import { Header } from "@/components/Header"
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/format"

export const metadata: Metadata = {
  title: "CJPacific USA · Wholesale ordering",
  description: "Order seafood, meat, produce, pantry goods and supplies for pickup or local delivery.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Header />
          <main className="page">{children}</main>
          <footer className="foot">
            <span>© CJPacific USA</span>
            <span>Invoices are emailed. No payment online.</span>
            {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
            {CONTACT_PHONE && <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>}
          </footer>
        </StoreProvider>
      </body>
    </html>
  )
}

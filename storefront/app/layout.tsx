import type { Metadata } from "next"
import "./globals.css"
import { StoreProvider } from "./store"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "CJPacific USA · Wholesale ordering",
  description: "Order seafood, meat, produce, pantry goods and supplies for pickup or local delivery.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="cj">
            <Header />
            {children}
            <Footer />
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}

"use client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useStore } from "../store"
import { Page, Title } from "@/components/Page"

type Form = { company_name: string; email: string; phone: string; contact: string; password: string; address_1: string; city: string; province: string; postal_code: string }
const blank: Form = { company_name: "", email: "", phone: "", contact: "", password: "", address_1: "", city: "", province: "", postal_code: "" }
const digits = (s: string) => s.replace(/\D/g, "")

export default function AccountPage() {
  return <Suspense><Account /></Suspense>
}

function Account() {
  const { customer, ready, signIn, signOut, refreshCustomer } = useStore()
  const router = useRouter()
  const next = useSearchParams().get("next") || ""
  const [tab, setTab] = useState<"signin" | "create">("signin")
  const [form, setForm] = useState<Form>(blank)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const addr = customer?.addresses?.[0]

  useEffect(() => {
    if (customer) setForm({ ...blank, company_name: customer.company_name || "", email: customer.email, phone: customer.phone || "",
      contact: [customer.first_name, customer.last_name].filter(Boolean).join(" "),
      address_1: addr?.address_1 || "", city: addr?.city || "", province: addr?.province || "", postal_code: addr?.postal_code || "" })
  }, [customer?.id])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg({})
    try { await fn() } catch (e) { setMsg({ err: (e as Error).message }) } finally { setBusy(false) }
  }
  const names = () => { const [first, ...rest] = form.contact.trim().split(/\s+/); return { first_name: first || "", last_name: rest.join(" ") } }

  const saveAddress = async () => {
    if (!form.address_1.trim()) return
    const body = { company: form.company_name, ...names(), phone: form.phone, address_1: form.address_1, city: form.city, province: form.province, postal_code: form.postal_code, country_code: "us", is_default_shipping: true, is_default_billing: true }
    await api(addr?.id ? `/store/customers/me/addresses/${addr.id}` : "/store/customers/me/addresses", { method: "POST", body })
  }

  const create = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (digits(form.phone).length < 10) throw new Error("Enter a business phone number with area code.")
    const email = form.email.trim().toLowerCase()
    const { token: registration } = await api<{ token: string }>("/auth/customer/emailpass/register", { method: "POST", body: { email, password: form.password }, auth: null })
    await api("/store/customers", { method: "POST", auth: registration, body: { email, company_name: form.company_name.trim(), phone: form.phone.trim(), ...names() } })
    await signIn(email, form.password)
    await saveAddress()
    await refreshCustomer()
    router.push(next || "/")
  }) }

  const login = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    await signIn(form.email.trim().toLowerCase(), form.password)
    router.push(next || "/")
  }) }

  const save = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (digits(form.phone).length < 10) throw new Error("Enter a business phone number with area code.")
    await api("/store/customers/me", { method: "POST", body: { company_name: form.company_name.trim(), phone: form.phone.trim(), ...names() } })
    await saveAddress()
    await refreshCustomer()
    setMsg({ ok: "Saved." })
  }) }

  const forgot = () => run(async () => {
    const email = form.email.trim().toLowerCase()
    if (!email) throw new Error("Enter your business email first.")
    await api("/auth/customer/emailpass/reset-password", { method: "POST", body: { identifier: email }, auth: null })
    setMsg({ ok: "If that email has an account, a reset link is on its way." })
  })

  const business = (
    <>
      <label>Business name<input type="text" required value={form.company_name} onChange={set("company_name")} autoComplete="organization" /></label>
      <div className="twocol">
        <label>Contact name<input type="text" required value={form.contact} onChange={set("contact")} autoComplete="name" /></label>
        <label>Business phone<input type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" /></label>
      </div>
      <label>Delivery address<small> (optional)</small><input type="text" value={form.address_1} onChange={set("address_1")} autoComplete="address-line1" placeholder="Street" /></label>
      <div className="row3">
        <label>City<input value={form.city} onChange={set("city")} autoComplete="address-level2" /></label>
        <label>State<input value={form.province} onChange={set("province")} maxLength={2} autoComplete="address-level1" placeholder="CA" /></label>
        <label>ZIP<input value={form.postal_code} onChange={set("postal_code")} inputMode="numeric" autoComplete="postal-code" /></label>
      </div>
    </>
  )

  if (!ready) return <Page><div /></Page>

  if (customer) return (
    <Page>
      <Title eyebrow="YOUR BUSINESS" name="Account" />
      <div className="orderlayout">
        <form className="surface" onSubmit={save}>
          <h2>Business profile</h2>
          {business}
          <label>Email<input type="email" value={customer.email} readOnly disabled /></label>
          {msg.err && <p className="notice" role="alert">{msg.err}</p>}
          {msg.ok && <p className="okmsg" role="status">{msg.ok}</p>}
          <div className="actions"><button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
        </form>
        <section className="surface">
          <h2>{customer.company_name}</h2>
          <p className="dim">{customer.email}</p>
          <div className="actions">
            <Link className="secondary" href="/orders">View orders</Link>
            <button type="button" className="secondary" onClick={() => { signOut(); router.push("/") }}>Sign out</button>
          </div>
        </section>
      </div>
    </Page>
  )

  return (
    <Page>
      <div className="authwrap">
        <form className="surface auth" onSubmit={tab === "signin" ? login : create}>
          <div className="seg" role="group" aria-label="Account">
            <button type="button" className={tab === "signin" ? "on" : ""} aria-pressed={tab === "signin"} onClick={() => { setTab("signin"); setMsg({}) }}>Sign in</button>
            <button type="button" className={tab === "create" ? "on" : ""} aria-pressed={tab === "create"} onClick={() => { setTab("create"); setMsg({}) }}>Create account</button>
          </div>
          <h2>{tab === "signin" ? "Welcome back" : "Create a business account"}</h2>
          <p className="dim">{tab === "signin" ? "Sign in to order and track deliveries." : "Order for your business."}</p>
          {tab === "create" && business}
          <label>Business email<input type="email" required value={form.email} onChange={set("email")} autoComplete="email" /></label>
          <label>Password<input type="password" required minLength={tab === "create" ? 8 : undefined} value={form.password} onChange={set("password")} autoComplete={tab === "signin" ? "current-password" : "new-password"} /></label>
          {msg.err && <p className="autherr" role="alert">{msg.err}</p>}
          {msg.ok && <p className="okmsg" role="status">{msg.ok}</p>}
          <button className="primary wide" type="submit" disabled={busy}>{busy ? (tab === "signin" ? "Signing in…" : "Creating…") : tab === "signin" ? "Sign in" : "Create account"}</button>
          {tab === "signin" && <button type="button" className="textbtn block" onClick={forgot} disabled={busy}>Forgot password?</button>}
        </form>
      </div>
    </Page>
  )
}

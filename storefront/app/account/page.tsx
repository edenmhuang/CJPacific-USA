"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useStore } from "../store"

type Form = { company_name: string; email: string; phone: string; first_name: string; last_name: string; password: string; address_1: string; city: string; province: string; postal_code: string }
const blank: Form = { company_name: "", email: "", phone: "", first_name: "", last_name: "", password: "", address_1: "", city: "", province: "", postal_code: "" }
const digits = (s: string) => s.replace(/\D/g, "")

export default function AccountPage() {
  return <Suspense><Account /></Suspense>
}

function Account() {
  const { customer, ready, signIn, setSession, signOut, refreshCustomer } = useStore()
  const router = useRouter()
  const next = useSearchParams().get("next") || ""
  const [tab, setTab] = useState<"signin" | "create">("create")
  const [form, setForm] = useState<Form>(blank)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const addr = customer?.addresses?.[0]

  useEffect(() => {
    if (customer) setForm({ ...blank, company_name: customer.company_name || "", email: customer.email, phone: customer.phone || "", first_name: customer.first_name || "", last_name: customer.last_name || "",
      address_1: addr?.address_1 || "", city: addr?.city || "", province: addr?.province || "", postal_code: addr?.postal_code || "" })
  }, [customer?.id])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg({})
    try { await fn() } catch (e) { setMsg({ err: (e as Error).message }) } finally { setBusy(false) }
  }

  const saveAddress = async () => {
    if (!form.address_1.trim()) return
    const body = { company: form.company_name, first_name: form.first_name, last_name: form.last_name, phone: form.phone, address_1: form.address_1, city: form.city, province: form.province, postal_code: form.postal_code, country_code: "us", is_default_shipping: true, is_default_billing: true }
    await api(addr?.id ? `/store/customers/me/addresses/${addr.id}` : "/store/customers/me/addresses", { method: "POST", body })
  }

  const create = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (digits(form.phone).length < 10) throw new Error("Enter a business phone number with area code.")
    const email = form.email.trim().toLowerCase()
    const { token: registration } = await api<{ token: string }>("/auth/customer/emailpass/register", { method: "POST", body: { email, password: form.password }, auth: null })
    await api("/store/customers", { method: "POST", auth: registration, body: { email, company_name: form.company_name.trim(), phone: form.phone.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim() } })
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
    await api("/store/customers/me", { method: "POST", body: { company_name: form.company_name.trim(), phone: form.phone.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim() } })
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

  if (!ready) return <div className="narrow"><div className="card skeleton tall" /></div>

  const business = (
    <>
      <label>Business name<input required value={form.company_name} onChange={set("company_name")} autoComplete="organization" /></label>
      <div className="row2">
        <label>Business phone<input required type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="(510) 555-0100" /></label>
        <label>Contact name <span className="dim">(optional)</span><input value={form.first_name} onChange={set("first_name")} autoComplete="given-name" /></label>
      </div>
      <label>Business address <span className="dim">(for delivery)</span><input value={form.address_1} onChange={set("address_1")} autoComplete="address-line1" placeholder="Street" /></label>
      <div className="row3">
        <input aria-label="City" value={form.city} onChange={set("city")} placeholder="City" autoComplete="address-level2" />
        <input aria-label="State" value={form.province} onChange={set("province")} placeholder="State" maxLength={2} autoComplete="address-level1" />
        <input aria-label="ZIP" value={form.postal_code} onChange={set("postal_code")} placeholder="ZIP" inputMode="numeric" autoComplete="postal-code" />
      </div>
    </>
  )

  if (customer) return (
    <form className="narrow panel fields" onSubmit={save}>
      <h1>Business account</h1>
      <label>Business email<input value={customer.email} disabled /></label>
      {business}
      {msg.err && <p className="notice">{msg.err}</p>}
      {msg.ok && <p className="ok">{msg.ok}</p>}
      <button className="primary block" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" className="ghost block" onClick={() => { signOut(); router.push("/") }}>Sign out</button>
    </form>
  )

  return (
    <div className="narrow panel">
      <div className="seg">
        <button type="button" className={tab === "create" ? "on" : ""} onClick={() => { setTab("create"); setMsg({}) }}>Create account</button>
        <button type="button" className={tab === "signin" ? "on" : ""} onClick={() => { setTab("signin"); setMsg({}) }}>Sign in</button>
      </div>
      {tab === "create" ? (
        <form className="fields" onSubmit={create}>
          <p className="dim">A business account is required to order.</p>
          <label>Business email<input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
          {business}
          <label>Password<input required type="password" minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" /></label>
          {msg.err && <p className="notice">{msg.err}</p>}
          <button className="primary block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
      ) : (
        <form className="fields" onSubmit={login}>
          <label>Business email<input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
          <label>Password<input required type="password" value={form.password} onChange={set("password")} autoComplete="current-password" /></label>
          {msg.err && <p className="notice">{msg.err}</p>}
          {msg.ok && <p className="ok">{msg.ok}</p>}
          <button className="primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <button type="button" className="link" onClick={forgot} disabled={busy}>Forgot password?</button>
        </form>
      )}
    </div>
  )
}

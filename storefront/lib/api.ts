export const BACKEND = (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const TOKEN = "cj_token"

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export const token = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN)),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN)),
}

/** Calls the Medusa Store API. Sends the signed-in business's token unless `auth` is a string override. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: string | null } = {}): Promise<T> {
  const bearer = opts.auth !== undefined ? opts.auth : token.get()
  const res = await fetch(BACKEND + path, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": KEY,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(friendly(data?.message, res.status), res.status)
  return data as T
}

function friendly(message: string | undefined, status: number) {
  if (message && /identity with email already exists/i.test(message)) return "An account with this email already exists. Sign in instead."
  if (status === 401 && (!message || /invalid email or password|unauthorized/i.test(message))) return message === "Unauthorized" ? "Please sign in again." : "Email or password is incorrect."
  return message || "Something went wrong. Please try again."
}

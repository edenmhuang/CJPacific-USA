# CJPacific USA: wholesale ordering

Two apps:

| Folder | What | Where it runs |
|---|---|---|
| `storefront/` | Next.js website customers use: catalog, cart, business accounts, order tracking | **Vercel** |
| `backend/` | Medusa 2.23 server + **Medusa Admin** (staff dashboard), Postgres, order emails | Railway, Render, Medusa Cloud or any Node host |

Vercel can't host the Medusa server itself (it needs a long-running process, Postgres and Redis).

## How ordering works

1. A business **creates an account** (business email, business name, business phone; address optional, used for delivery). Checkout is blocked on the server for guests and for accounts without a name and phone.
2. They add products, choose **Pickup** or **Local delivery**, an optional requested date and notes, and place the order. No card is collected (Medusa's manual payment provider).
3. Emails go out right away:
   - **Customer:** "Order received" confirmation with the items, estimated total and a Track order link.
   - **Owner (`OWNER_ORDER_EMAIL`):** "New order CJ-12 · Business name" with business, phone, email, fulfillment, address, date, notes, SKUs, quantities, prices. Reply-to is the customer. Copy it into your invoice tool.
4. Staff open the order in **Medusa Admin → Orders**. The **Order progress** card on the right moves it one step at a time:
   Received → Confirmed → Preparing → Ready for pickup / Out for delivery → Picked up / Delivered.
   Confirmed and Ready/Out for delivery email the customer (checkbox). Undo steps back one.
5. The customer sees the status bar update on their order page (it refreshes every 30 s).
6. Customers can cancel until the order is Ready / Out for delivery. Staff can cancel any time from Admin (the order's ••• menu → Cancel). Both send cancellation emails to the customer and the owner.
7. Reorder copies a past order into the cart at current prices.

Payments: Medusa shows the order's payment as "Authorized". When the invoice is paid you can click **Capture payment** to mark it paid, or ignore it.

## Run locally

```bash
# backend (needs Postgres)
cd backend && npm install
cd apps/backend && cp .env.template .env   # set DATABASE_URL etc.
npx medusa db:migrate                      # creates tables + CJPacific starter data, prints the publishable key
npx medusa user -e you@example.com -p 'a-password'   # Admin login
npm run dev                                # http://localhost:9000/app

# storefront
cd storefront && npm install
cp .env.example .env.local                 # backend URL + publishable key
npm run dev                                # http://localhost:3000
```

## Deploy

### 1. Backend (example: Railway)
1. New project → add **PostgreSQL** and **Redis**.
2. Add a service from this repo with root directory `backend`.
   - Build: `npm ci && npm run build`
   - Start: `cd apps/backend/.medusa/server && npm install --omit=dev && npm run predeploy && npm run start`
3. Set the variables from `backend/apps/backend/.env.template` (Railway gives you `DATABASE_URL` and `REDIS_URL`).
4. First deploy runs the migrations and seeds the store. Copy the **publishable key** from the deploy log, or from Admin → Settings → Publishable API Keys.
5. Create your Admin login from the Railway shell: `npx medusa user -e you@... -p ...`.

### 2. Storefront (Vercel)
1. Import the repo in Vercel, set **Root Directory = `storefront`** (Next.js is auto-detected).
2. Environment variables:
   - `NEXT_PUBLIC_MEDUSA_BACKEND_URL`: your backend URL
   - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`: the `pk_...` key
   - `NEXT_PUBLIC_CONTACT_EMAIL`: shown to customers, used for Contact us
3. Deploy, then add the Vercel URL to the backend's `STORE_CORS`, `AUTH_CORS` and `STOREFRONT_URL`, and redeploy the backend.

### 3. Email (Resend)
1. Create a Resend account, add and verify your domain (DNS records), create an API key.
2. Set `RESEND_API_KEY`, `EMAIL_FROM=CJPacific USA <orders@yourdomain.com>`, `OWNER_ORDER_EMAIL`.
3. Until a domain is verified, Resend's test sender only delivers to your own Resend account email, so customer emails won't arrive yet.

## Before launch
- Replace the 10 sample products, prices and photos in Admin → Products (they are marked `sample: true`). Categories are in Admin → Products → Categories.
- Use `metadata.unit` (lb / kg / item) and `metadata.pack` on products. The storefront shows "$12.80 /lb" and the pack size.
- Set the cancellation cutoff, delivery area and minimums. The cancel rule lives in `backend/apps/backend/src/lib/order-stage.ts`.

## Where the custom code is
- `backend/apps/backend/src/subscribers/`: order placed / cancelled / password reset emails
- `backend/apps/backend/src/lib/emails.ts`: email templates
- `backend/apps/backend/src/modules/resend/`: Resend email provider
- `backend/apps/backend/src/admin/widgets/order-progress.tsx`: Admin Order progress card
- `backend/apps/backend/src/api/admin/orders/[id]/cj-stage/`: staff status updates
- `backend/apps/backend/src/api/store/cj/`: customer orders, cancel, business-account checkout guard
- `backend/apps/backend/src/migration-scripts/initial-data-seed.ts`: starter store (US, USD, Pickup, Local delivery, categories, sample products)

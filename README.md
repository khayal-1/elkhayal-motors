# El Khayal Motors

The existing HTML/CSS layout remains the starting point. This repository is being evolved in small, testable phases into the El Khayal Motors site. Current foundation: Vite serves the original `index.html`, browser JavaScript uses Supabase Auth and the public publishable key, and the initial database migration enables row-level security.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and fill in the new project's URL and publishable key from its Supabase API settings.
3. Run `npm install` and `npm run dev`.
4. Apply `supabase/migrations/202611210001_initial_foundation.sql` only to Supabase project `ztkiavqmbswyxkmddtno` before testing signup, requests, or catalog reads.

`.env.local`, other `.env*` files, `node_modules`, and build output are ignored by Git. The browser key is public by design and is safe only with RLS; do not put a Supabase secret/service-role key, database password, or Telegram bot token in client code or Git.

## Foundation architecture

- `index.html` is the HTML entry point and the original layout/design basis; `style.css` preserves its visual system.
- `app.js` renders the current interface and uses Supabase Auth for sign-up/sign-in; no demo users or passwords are seeded. Only the language choice is stored locally; obsolete demo user/session keys are removed.
- `src/supabase.js` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at build time and creates the browser client.
- `supabase/migrations/202611210001_initial_foundation.sql` creates profiles, clients, roles, motorcycle catalog, customer requests, favorites, contact messages, photo references and audit-log structure, with foreign keys, checks, indexes and RLS policies.
- `supabase/functions/telegram-photo-upload` is a server-side image-upload endpoint. It requires an authenticated employee/manager/owner/admin and keeps the bot token server-side. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as Supabase Edge Function secrets only after the bot and destination are chosen.

New accounts receive the `customer` role from an Auth trigger. Elevated roles are never selectable during signup and must be assigned by an authorized administrator. The admin interface includes a transactional showroom POS (up to 20 distinct motorcycles per invoice, walk-in customer, full/partial payment and later balance collection). The Supabase migrations `20261121145258_sales_pos_foundation.sql`, `20261121145315_guest_purchase_requests_and_contact_inbox.sql`, `20261121145443_tighten_public_inquiry_insert_policies.sql`, and `20261121145600_use_invoker_for_sales_permission_helper.sql` were applied to the `El Khayal Motors Website` project (`ztkiavqmbswyxkmddtno`). Guest and signed-in visitors can submit purchase requests and contact messages with name, phone/email and preferred channel. Staff with request permissions can view the inbox, contact customers by phone, WhatsApp, SMS or email, and record reply history after sending manually. Automated outbound email/SMS/WhatsApp is not configured; it requires verified provider accounts and secrets. Supplier management and purchase-order receiving are now available to admins: create suppliers, issue purchase orders, record partial or full receipts, and update motorcycle stock atomically with a receipt-linked stock movement. The current UI creates one motorcycle line per purchase order; the database RPC accepts up to 20 lines, so multi-line supplier orders are a remaining UI enhancement. Supplier invoice payments/account balances, website checkout conversion, returns, and customer invoice history are not implemented yet.

## Deploy

Vercel imports the repository and builds with `npm run build`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Development, Preview, and Production. Supabase Auth's Site URL and allowed redirect URLs must include the deployed Vercel domain before password recovery/email confirmations are used.

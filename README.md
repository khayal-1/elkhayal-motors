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

New accounts receive the `customer` role from an Auth trigger. Elevated roles are never selectable during signup and must be assigned by an authorized administrator. The admin interface includes a transactional showroom POS (up to 20 distinct motorcycles per invoice, walk-in customer, full/partial payment and later balance collection). The Supabase migrations `20261121145258_sales_pos_foundation.sql`, `20261121145315_guest_purchase_requests_and_contact_inbox.sql`, `20261121145443_tighten_public_inquiry_insert_policies.sql`, and `20261121145600_use_invoker_for_sales_permission_helper.sql` were applied to the `El Khayal Motors Website` project (`ztkiavqmbswyxkmddtno`). The public catalogue is readable without an account: visitors can browse available motorcycles, search, filter, and open details. Customer actions such as favorites, purchase requests, and contact-message submission require a signed-in customer account; the interface redirects guests to sign-in and resumes a selected favorite/purchase action after successful sign-in. Supabase RLS and grants enforce these boundaries independently of the interface. Staff with request permissions can view the inbox, contact customers by phone, WhatsApp, SMS or email, and record reply history after sending manually. Automated outbound email/SMS/WhatsApp is not configured; it requires verified provider accounts and secrets. Supplier management and purchase-order receiving are now available to admins: create suppliers, issue purchase orders, record partial or full receipts, and update motorcycle stock atomically with a receipt-linked stock movement. The supplier-order UI supports up to 20 distinct motorcycle lines per order and partial/full receipt across multiple lines in one receipt transaction. Supplier accounting now supports manually recording supplier invoices, optional linkage to a purchase order, partial/full payments (cash, bank transfer, InstaPay, cheque or other), payment references, and per-supplier outstanding balances. Invoice entry does not change stock; stock is updated only by purchase receipts. Supplier purchase returns are now supported for received order lines: the return is linked to the original receipt line and a supplier bill, prevents returning more than the unreturned received quantity or current available stock, creates a negative stock movement, and records a bill credit without rewriting historical payments. Customer sales returns are supported from the original showroom invoice: quantities are capped at the unreturned sold quantity, returned items are classified as resalable or damaged, and only resalable items increase stock. Returns first reduce the invoice receivable; only the amount actually overpaid by the customer becomes refundable credit. Customer credit is tracked in a dedicated ledger; the admin can record partial or full cash/bank/card refunds against available credit, with method/reference and an audit trail. The app does not transfer money automatically: staff must execute the actual refund first, then record it. Customer credit can also be applied partially to a later showroom invoice for the same customer; the ledger and invoice balance are updated atomically. Customer invoice history is now available for registered customers when a showroom POS invoice is explicitly linked to their account; the customer can see invoice lines, totals, paid amount, applied credit and remaining balance. Existing walk-in invoices and invoices issued before account linking remain unlinked unless staff deliberately associate the sale with the correct customer. Supplier advances not linked to a bill and website checkout conversion are not implemented yet.

## Deploy

Vercel imports the repository and builds with `npm run build`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Development, Preview, and Production. Supabase Auth's Site URL and allowed redirect URLs must include the deployed Vercel domain before password recovery/email confirmations are used.


## الأدوات المالية المتقدمة

تتضمن واجهة الإدارة صفحة «الأدوات المالية المتقدمة» لإدارة الفترات المحاسبية وإقفالها، الأرصدة الافتتاحية المتوازنة، مراكز التكلفة، سلف الموردين وتسويتها على فواتيرهم، الأصول الثابتة والإهلاك الشهري، تسويات البنوك، الشيكات، القيود المتكررة، وإعداد نسب الضرائب ومعرفات التسجيل الضريبي. صلاحية finance_manage تتيح إدارة هذه الأدوات، بينما accounting_view تتيح القراءة وفق سياسات RLS.

**ملاحظة محاسبية:** إعداد نسب الضرائب لا يفعّل احتسابها آليًا على فواتير البيع والشراء ولا يرسل مستندات إلى ETA. كما أن اكتمال التقارير المالية يتطلب ربط كل المبيعات والمشتريات والدفعات والمرتجعات بقيودها واختبارها على بيانات المعرض المعتمدة.


## Additional finance, HR and inventory operations

The finance workspace now includes fiscal periods, opening balances, fixed assets and depreciation, bank reconciliations, cheques, recurring journals, tax-rate setup, cash sessions and handovers, petty cash, journal reversals, budgets versus actuals, accrual schedules, aging reports, cash book, and allocation of sale receipts/customer refunds that were initially posted to the unallocated-cash clearing account. New operational journal posting covers sales invoices, sale-item COGS where a reliable unit cost exists, sale payments, purchase receipts, supplier bills, supplier returns, sale returns, returned-stock COGS, and customer-credit transactions. Historical source records were backfilled idempotently; no test sales, receipts, employees, or other fake business records were created.

The HR workspace includes employee files, optional links to existing staff login accounts, attendance, leave requests and review, custody assignment/return, employee advances, sales commissions, payroll drafts, payroll posting, partial payroll payments, employee payslips, and draft cancellation. Statutory tax/insurance amounts are entered by an authorized accountant; no legal rates are assumed.

Inventory tools include actual unit-cost capture from recorded purchase receipts, reorder thresholds and alerts, VIN/barcode unit registration, stocktakes with inventory-adjustment journals, warranty records, and service orders. CRM tools include customer credit limits, credit-limit enforcement on new sales, customer statements, interaction history, complaints, customer classification/lead source/marketing consent, and internal notifications.

These additions are implemented against the existing Supabase project and main branch. A successful frontend build/deploy and live UI smoke test are required before treating the release as complete.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TABLES = ["profiles","clients","user_roles","motorcycles","customer_requests","favorites","contact_messages","photo_assets","audit_logs","employee_permissions","sales","sale_items","payments","stock_movements","customer_request_replies","contact_message_replies","suppliers","purchase_orders","purchase_order_items","purchase_receipts","purchase_receipt_items","supplier_bills","supplier_payments","supplier_returns","supplier_return_items","sale_returns","sale_return_items","customer_credit_transactions","accounting_accounts","cash_accounts","journal_entries","journal_entry_lines","expenses","expense_payments","fiscal_periods","cost_centers","opening_balance_batches","supplier_advances","supplier_advance_allocations","fixed_assets","fixed_asset_depreciations","bank_reconciliations","bank_reconciliation_lines","cheques","recurring_journal_templates","recurring_journal_template_lines","recurring_journal_runs","tax_rates","cash_sessions","cash_handovers","finance_settings","petty_cash_transactions","journal_entry_reversals","finance_budgets","finance_budget_lines","accrual_schedules","accrual_runs","employees","attendance_records","employee_leave_requests","employee_custody","employee_advances","sales_commissions","payroll_runs","payroll_items","employee_advance_repayments","payroll_payments","motorcycle_inventory_costs","motorcycle_units","stocktake_batches","stocktake_lines","warranties","service_orders","customer_interactions","customer_complaints","internal_notifications","sales_quotations","sales_quotation_items","sale_installments","sale_deliveries","purchase_receipt_units","sale_item_units","supplier_return_units","supplier_bill_items","supplier_bill_item_units","sale_return_item_units"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) return json({ error: "Authentication required" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user?.id || !authData.user.email) return json({ error: "Invalid session" }, 401);
    const ownerId = authData.user.id;

    const { data: ownerRole, error: roleError } = await admin.from("user_roles")
      .select("role").eq("user_id", ownerId).eq("role", "owner").maybeSingle();
    if (roleError || !ownerRole) return json({ error: "Owner access only" }, 403);

    const body = await req.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 1024) return json({ error: "Password is required" }, 400);
    const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({
      email: authData.user.email, password
    });
    if (passwordError || verified.user?.id !== ownerId) return json({ error: "Password verification failed" }, 403);

    if (body.action === "backup") {
      const data: Record<string, unknown[]> = {};
      for (const table of TABLES) {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data: page, error } = await admin.from(table).select("*").range(offset, offset + 999);
          if (error) throw new Error("Backup failed for " + table + ": " + error.message);
          rows.push(...(page || []));
          if (!page || page.length < 1000) break;
        }
        data[table] = rows;
      }
      const backup = {
        format: "khayal-backup",
        version: 1,
        createdAt: new Date().toISOString(),
        project: "ztkiavqmbswyxkmddtno",
        tableCount: TABLES.length,
        rowCount: Object.values(data).reduce((sum, rows) => sum + rows.length, 0),
        tables: data
      };
      const contentHash = await sha256(JSON.stringify(backup.tables));
      return json({ ...backup, contentHash });
    }

    if (body.action === "reset") {
      if (body.confirmation !== "DELETE ALL DATA") return json({ error: "Typed confirmation does not match" }, 400);
      const { data, error } = await admin.rpc("owner_reset_operational_data", { p_owner_id: ownerId });
      if (error) throw error;
      return json({ ok: true, result: data });
    }

    if (body.action === "restore") {
      if (body.confirmation !== "RESTORE BACKUP") return json({ error: "Typed confirmation does not match" }, 400);
      const backup = body.backup;
      if (!backup || backup.format !== "khayal-backup" || backup.version !== 1 ||
          backup.project !== "ztkiavqmbswyxkmddtno" || !backup.tables || typeof backup.tables !== "object") {
        return json({ error: "Unsupported backup file" }, 400);
      }
      if (JSON.stringify(backup).length > 25 * 1024 * 1024) return json({ error: "Backup exceeds 25 MB limit" }, 413);
      const suppliedHash = backup.contentHash;
      const actualHash = await sha256(JSON.stringify(backup.tables));
      if (typeof suppliedHash !== "string" || suppliedHash !== actualHash) return json({ error: "Backup integrity check failed" }, 400);
      const { data, error } = await admin.rpc("owner_restore_operational_data", {
        p_owner_id: ownerId, p_backup: backup
      });
      if (error) throw error;
      return json({ ok: true, result: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("owner-data-management error", error instanceof Error ? error.message : "unknown");
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});

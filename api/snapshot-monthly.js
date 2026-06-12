import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    if (tomorrow.getMonth() !== today.getMonth()) {
    // hari terakhir bulan
    // insert snapshot
    }
    const { data: accounts, error } = await supabase
      .from("account_monitor")
      .select("*");

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const rows = (accounts || []).map((acc) => ({
      snapshot_month: month,
      snapshot_date: today,
      license_key: acc.license_key,
      account_number: acc.account_number,
      broker: acc.broker,
      account_name: acc.account_name || acc.name || null,
      currency: acc.currency,
      balance: acc.balance,
      equity: acc.equity,
      floating_pl: acc.floating_pl,
      current_dd_amount: acc.current_dd_amount || acc.drawdown || null,
      current_dd_percent: acc.current_dd_percent || acc.drawdown_percent || null,
      max_dd_amount: acc.max_dd_amount || null,
      max_dd_percent: acc.max_dd_percent || null,
      open_trades: acc.open_trades,
      status: acc.status,
      source_updated_at: acc.updated_at,
    }));

    if (!rows.length) {
      return res.json({ ok: true, inserted: 0, message: "No accounts found" });
    }

    const { error: insertError } = await supabase
    .from("monthly_account_snapshots")
    .upsert(
        rows,
        {
            onConflict: "snapshot_month,license_key,account_number",
            ignoreDuplicates: true
        }
    );

    if (insertError) {
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    return res.json({ ok: true, inserted: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

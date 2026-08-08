import React, { useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { Database, Download, Gear } from "@phosphor-icons/react";
import { useLang } from "../../contexts/LangContext";

export default function AdminBackup() {
  const { pick } = useLang();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [migBusy, setMigBusy] = useState(false);
  const [migMsg, setMigMsg] = useState("");
  const [migErr, setMigErr] = useState("");

  const exportNow = async () => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const { data } = await api.get("/backup/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bii-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      const total = Object.values(data.collections).reduce((s, c) => s + c.length, 0);
      setMsg(`সফল! ${total} টি রেকর্ড এক্সপোর্ট হয়েছে।`);
    } catch (e) { setErr(formatApiError(e)); } finally { setBusy(false); }
  };

  const runMigrations = async () => {
    if (!window.confirm(pick(
      "ডাটাবেস মাইগ্রেশন চালাতে চান? এটি নতুন টেবিল/কলাম যোগ করবে।",
        "Run database migrations? This will add new tables/columns."
    ))) return;
    setMigBusy(true); setMigErr(""); setMigMsg("");
    try {
      const { data } = await api.post("/admin/migrate");
      const applied = data?.applied ?? data?.migrated ?? [];
      if (applied.length > 0) {
        setMigMsg(`সফল! ${applied.length}টি মাইগ্রেশন চালু হয়েছে: ${applied.join(", ")}`);
      } else {
        setMigMsg(data?.message || pick("সব মাইগ্রেশন ইতিমধ্যে চালু আছে।", "All migrations already applied."));
      }
    } catch (e) { setMigErr(formatApiError(e)); } finally { setMigBusy(false); }
  };

  return (
    <div data-testid="admin-backup-page" className="max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("ডাটাবেস ব্যাকআপ","Database Backup")}</h1>
      <div className="bii-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Database size={36} weight="duotone" className="text-[var(--bii-emerald)]" />
          <div>
            <div className="font-heading text-lg">{pick("ব্যাকআপ তৈরি করুন","Create Backup")}</div>
            <p className="text-sm text-[var(--bii-text-soft)]">পুরো ডাটাবেস JSON ফরম্যাটে ডাউনলোড করুন (পাসওয়ার্ড বাদ দিয়ে)।</p>
          </div>
        </div>
        {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{msg}</div>}
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        <button data-testid="backup-export-btn" disabled={busy} onClick={exportNow} className="bii-btn-primary w-full">
          <Download size={18} weight="bold" className="inline mr-2" />
          {busy ? pick("নতুন ব্যাকআপ তৈরি হচ্ছে...","Creating backup...") : pick("ডাউনলোড","Download")}
        </button>
        <div className="text-xs text-[var(--bii-text-soft)] italic mt-2">⚠ রিস্টোর ফিচার পরবর্তী আপডেটে যোগ হবে। আপাতত MongoDB direct দিয়ে রিস্টোর করুন।</div>
      </div>

      {/* ── Database Migrations ─────────────────────────────── */}
      <div className="bii-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Gear size={36} weight="duotone" className="text-[var(--bii-emerald)]" />
          <div>
            <div className="font-heading text-lg">{pick("ডাটাবেস মাইগ্রেশন","Database Migrations")}</div>
            <p className="text-sm text-[var(--bii-text-soft)]">
              {pick(
                "নতুন টেবিল/কলাম যোগ করতে মাইগ্রেশন চালান। আপডেট ডেপ্লয়ের পর এটি চালান।",
                "Run migrations to add new tables/columns. Run after deploying updates."
              )}
            </p>
          </div>
        </div>
        {migMsg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{migMsg}</div>}
        {migErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{migErr}</div>}
        <button data-testid="migrate-run-btn" disabled={migBusy} onClick={runMigrations} className="bii-btn-primary w-full">
          <Gear size={18} weight="bold" className="inline mr-2" />
          {migBusy
            ? pick("মাইগ্রেশন চলছে...","Running migrations...")
            : pick("মাইগ্রেশন চালান","Run Migrations")}
        </button>
        <div className="text-xs text-[var(--bii-text-soft)] italic mt-2">
          ⚠ {pick("শুধুমাত্র ডেপ্লয়ের পর চালান।","Only run after deploying updates.")}
        </div>
      </div>
    </div>
  );
}

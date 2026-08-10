import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminActivityLogs() {
  const { pick } = useLang();
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/activity-logs?limit=300").then((r) => setLogs(r.data || [])).catch(() => setLogs([])); }, []);
  return (
    <div data-testid="admin-activity-logs-page" className="space-y-4">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("অ্যাক্টিভিটি লগ","Activity Log")}</h1>
      <div className="bii-card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-[var(--bii-cream)] text-left">
            <tr><th className="p-3">{pick("সময়","Time")}</th><th className="p-3">{pick("কে","Who")}</th><th className="p-3">{pick("কাজ","Action")}</th><th className="p-3">{pick("টার্গেট","Target")}</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-[var(--bii-text-soft)] italic">{pick("কোন লগ নেই","No logs found")}</td></tr>}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-[var(--bii-border)]">
                <td className="p-3 font-mono text-xs">{l.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="p-3 font-mono text-xs">{l.user_id?.slice(0, 8)}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3 font-mono text-xs">{l.target?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { SignIn } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminLoginLogs() {
  const { pick } = useLang();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all"); // all | success | failed

  useEffect(() => { api.get("/login-logs?limit=300").then((r) => setLogs(r.data)); }, []);

  const filtered = logs.filter((l) =>
    filter === "all" ? true : filter === "success" ? l.success : !l.success
  );

  return (
    <div data-testid="admin-login-logs-page" className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)] flex items-center gap-2">
          <SignIn size={24} weight="duotone" /> {pick("লগইন হিস্ট্রি","Login History")}
        </h2>
        <div className="flex gap-2">
          {[
            { k: "all", l: "সব" },
            { k: "success", l: "সফল" },
            { k: "failed", l: "ব্যর্থ" },
          ].map((f) => (
            <button
              key={f.k}
              data-testid={`log-filter-${f.k}`}
              onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                filter === f.k ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]" : "bg-white border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="bii-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-[var(--bii-cream)] text-left">
            <tr>
              <th className="p-3">{pick("সময়","Time")}</th>
              <th className="p-3">{pick("ইউজার","User")}</th>
              <th className="p-3">{pick("ইমেইল","Email")}</th>
              <th className="p-3">{pick("রোল","Role")}</th>
              <th className="p-3">{pick("আইপি অ্যাড্রেস","IP Address")}</th>
              <th className="p-3">{pick("স্ট্যাটাস","Status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-[var(--bii-border)]" data-testid={`log-row-${l.id}`}>
                <td className="p-3 font-mono text-xs">{l.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{l.name || "—"} <span className="text-xs text-[var(--bii-text-soft)] font-mono">{l.student_id || ""}</span></td>
                <td className="p-3">{l.email}</td>
                <td className="p-3">
                  {l.role ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.role === "admin" ? "bg-[var(--bii-emerald)] text-white" : "bg-[var(--bii-cream)]"}`}>
                      {l.role}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3 font-mono text-xs">{l.ip || "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${l.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {l.success ? "সফল" : "ব্যর্থ"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-[var(--bii-text-soft)] italic">{pick("কোন লগইন রেকর্ড নেই","No login records")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

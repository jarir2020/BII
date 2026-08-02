import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminAnalytics() {
  const { pick } = useLang();
  const [a, setA] = useState({});
  useEffect(() => { api.get("/analytics").then((r) => setA(r.data)); }, []);
  const entries = Object.entries(a).filter(([k]) => k !== "date");
  return (
    <div data-testid="admin-analytics-page" className="space-y-5">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("এনালিটিক্স ও রিপোর্ট","Analytics & Reports")}</h1>
      <div className="text-xs text-[var(--bii-text-soft)]">{pick("তারিখ:","Date:")} {a.date}</div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="bii-card p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{k.replace(/_/g, " ")}</div>
            <div className="font-heading text-2xl text-[var(--bii-emerald)] mt-1">{typeof v === "number" ? v.toLocaleString() : v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

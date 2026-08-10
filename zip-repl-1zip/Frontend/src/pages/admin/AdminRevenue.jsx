import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

const BDT = (n) => `৳ ${(n || 0).toLocaleString("bn-BD")}`;

const MONTHS_BN = {
  Jan: "জানু", Feb: "ফেব", Mar: "মার্চ", Apr: "এপ্রি",
  May: "মে",   Jun: "জুন", Jul: "জুল",  Aug: "আগ",
  Sep: "সেপ",  Oct: "অক্টো", Nov: "নভে", Dec: "ডিসে",
};
const labelBn = (label) => {
  const [mon, yr] = label.split(" ");
  return `${MONTHS_BN[mon] || mon} ${yr}`;
};

function Stat({ label, value, sub, color = "emerald" }) {
  return (
    <div className={`bii-card p-5 border-l-4 border-[var(--bii-${color})]`}>
      <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
      <div className="font-heading text-3xl text-[var(--bii-emerald)]">{value}</div>
      {sub && <div className="text-xs text-[var(--bii-text-soft)] mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminRevenue() {
  const { pick } = useLang();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/admin/revenue-stats")
      .then((r) => setStats(r.data || {}))
      .catch(() => setErr("রেভিনিউ ডেটা লোড করা যায়নি।"));
  }, []);

  if (err) return <div className="text-red-600 p-4">{err}</div>;
  if (!stats) return <div className="text-center py-10 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>;

  const monthly = stats.monthly || [];
  const maxVal = Math.max(...monthly.map((m) => m.courses + m.shop + m.gateway), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("রাজস্ব রিপোর্ট", "Revenue Report")}</h2>
        <p className="text-sm text-[var(--bii-text-soft)] mt-1">সমস্ত পেমেন্ট উৎস থেকে আয়ের সারসংক্ষেপ</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Stat label={pick("মোট আয়", "Total Revenue")}          value={BDT(stats.total_revenue)} />
        <Stat label={pick("ম্যানুয়াল পেমেন্ট", "Manual Payment")} value={BDT(stats.manual_payment_revenue)}
              sub={`${stats.manual_payment_count} ${pick("টি পেমেন্ট", "payments")}`} />
        <Stat label={pick("অনলাইন গেটওয়ে", "Online Gateway")}   value={BDT(stats.gateway_revenue)}
              sub={`${stats.gateway_transactions} ${pick("টি লেনদেন", "transactions")}`} />
        <Stat label={pick("শপ আয়", "Shop Revenue")}            value={BDT(stats.shop_revenue)}
              sub={`${stats.shop_orders} ${pick("টি অর্ডার", "orders")}`} />
        <Stat label={pick("সাবস্ক্রিপশন", "Subscription")}     value={BDT(stats.subscription_revenue)}
              sub={`${stats.subscription_count} ${pick("জন সদস্য", "members")}`} />
        <Stat label={pick("সক্রিয় সাবস্ক্রিপশন", "Active Subscriptions")} value={stats.active_subscriptions} />
        <Stat label={pick("পেন্ডিং পেমেন্ট", "Pending Payments")}  value={stats.pending_payments}
              color="gold" />
        <Stat label={pick("মোট এনরোলমেন্ট", "Total Enrollments")}  value={stats.total_enrollments} />
      </div>

      {/* Monthly bar chart */}
      <div className="bii-card p-6">
        <h3 className="font-heading text-lg text-[var(--bii-emerald)] mb-4">{pick("মাসিক আয় (গত ৬ মাস)", "Monthly Revenue (Last 6 Months)")}</h3>
        <div className="flex items-end gap-3 h-48">
          {monthly.map((m) => {
            const total = m.courses + m.shop + m.gateway;
            const pct   = Math.round((total / maxVal) * 100);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-[var(--bii-text-soft)] font-medium">{BDT(total)}</div>
                <div className="w-full flex flex-col justify-end" style={{ height: "140px" }}>
                  <div
                    className="w-full rounded-t-lg bg-[var(--bii-emerald)] transition-all"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={`কোর্স: ${BDT(m.courses)} | শপ: ${BDT(m.shop)} | গেটওয়ে: ${BDT(m.gateway)}`}
                  />
                </div>
                <div className="text-[10px] text-[var(--bii-text-soft)] text-center leading-tight">
                  {labelBn(m.month)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--bii-text-soft)]">
          {monthly.map((m) => (
            <div key={m.month} className="space-y-0.5">
              <div className="font-semibold text-[var(--bii-text)]">{labelBn(m.month)}</div>
              <div>{pick("কোর্স", "Course")}: {BDT(m.courses)}</div>
              <div>{pick("শপ", "Shop")}: {BDT(m.shop)}</div>
              <div>{pick("গেটওয়ে", "Gateway")}: {BDT(m.gateway)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

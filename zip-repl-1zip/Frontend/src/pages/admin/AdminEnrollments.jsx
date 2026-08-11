import React, { useEffect, useState, useMemo } from "react";
import { GraduationCap, Phone, EnvelopeSimple } from "@phosphor-icons/react";
import { api, imgUrl } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminEnrollments() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all"); // all | paid | free
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("flat"); // flat | byCourse

  useEffect(() => {
    api.get("/enrollments").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((e) => {
    if (filter === "paid") return (e.amount || 0) > 0;
    if (filter === "free") return (e.amount || 0) === 0;
    return true;
  });

  const totalRevenue = items.reduce((s, e) => s + (e.payment_status === "success" ? (e.amount || 0) : 0), 0);
  const paidCount = items.filter((e) => (e.amount || 0) > 0).length;
  const freeCount = items.filter((e) => (e.amount || 0) === 0).length;

  // group filtered enrollments by course, so each course shows its own student list
  const byCourse = useMemo(() => {
    const groups = new Map();
    for (const e of filtered) {
      const cid = e.course?.id || e.course_id || "unknown";
      if (!groups.has(cid)) {
        groups.set(cid, { course: e.course, enrollments: [] });
      }
      groups.get(cid).enrollments.push(e);
    }
    return Array.from(groups.values()).sort((a, b) => b.enrollments.length - a.enrollments.length);
  }, [filtered]);

  return (
    <div data-testid="admin-enrollments-page" className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card label="মোট এনরোলমেন্ট" val={items.length} />
        <Card label="মোট আয়" val={`৳ ${totalRevenue}`} />
        <Card label="পেইড / ফ্রি" val={`${paidCount} / ${freeCount}`} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { k: "all", l: pick("সব","All") },
            { k: "paid", l: pick("পেইড","Paid") },
            { k: "free", l: pick("ফ্রি","Free") },
          ].map((f) => (
            <button
              key={f.k}
              data-testid={`enrl-filter-${f.k}`}
              onClick={() => setFilter(f.k)}
              className={`px-4 py-1.5 rounded-xl text-sm border transition ${
                filter === f.k
                  ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]"
                  : "bg-white border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex gap-2 bg-[var(--bii-cream)] p-1 rounded-xl">
          <button
            data-testid="enrl-view-flat"
            onClick={() => setView("flat")}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${view === "flat" ? "bg-white shadow text-[var(--bii-emerald)] font-medium" : "text-[var(--bii-text-soft)]"}`}
          >
            সব এনরোলমেন্ট
          </button>
          <button
            data-testid="enrl-view-bycourse"
            onClick={() => setView("byCourse")}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${view === "byCourse" ? "bg-white shadow text-[var(--bii-emerald)] font-medium" : "text-[var(--bii-text-soft)]"}`}
          >
            কোর্স অনুযায়ী স্টুডেন্ট
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-6 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>}

      {!loading && view === "flat" && (
        <div className="bii-card overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-[var(--bii-cream)] text-left">
              <tr>
                <th className="p-3">{pick("তারিখ","Date")}</th>
                <th className="p-3">{pick("ইউজার","User")}</th>
                <th className="p-3">{pick("কোর্স","Course")}</th>
                <th className="p-3">{pick("পেমেন্ট","Payment")}</th>
                <th className="p-3 text-right">{pick("পরিমাণ","Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-[var(--bii-border)]" data-testid={`enrl-row-${e.id}`}>
                  <td className="p-3 font-mono text-xs">{e.enrolled_at?.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">
                    <div className="font-medium">{e.user?.name || "—"}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {e.course?.cover_image && <img src={imgUrl(e.course.cover_image)} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div>
                        <div className="font-medium">{e.course?.title_bn || "—"}</div>
                        <div className="text-xs text-[var(--bii-text-soft)]">{e.course?.instructor}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      e.payment_status === "success" ? "bg-green-100 text-green-800" :
                      e.payment_status === "free" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                    }`}>
                      {e.payment_status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-heading text-[var(--bii-emerald)]">
                    {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি","Free")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-[var(--bii-text-soft)] italic">{pick("কোন এনরোলমেন্ট নেই","No enrollments found")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && view === "byCourse" && (
        <div className="space-y-5">
          {byCourse.length === 0 && (
            <div className="bii-card p-6 text-center text-[var(--bii-text-soft)] italic">{pick("কোন এনরোলমেন্ট নেই","No enrollments found")}</div>
          )}
          {byCourse.map((grp) => (
            <div key={grp.course?.id || Math.random()} className="bii-card overflow-hidden" data-testid={`enrl-course-group-${grp.course?.id}`}>
              <div className="p-4 bg-[var(--bii-emerald)] text-white flex items-center gap-3">
                {grp.course?.cover_image && (
                  <img src={imgUrl(grp.course.cover_image)} alt="" className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/30" />
                )}
                <div className="flex-1">
                  <div className="font-heading text-lg">{grp.course?.title_bn || pick("অজানা কোর্স","Unknown Course")}</div>
                  <div className="text-xs opacity-80">{grp.course?.instructor}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--bii-gold)]">{pick("স্টুডেন্ট সংখ্যা","Students")}</div>
                  <div className="font-heading text-2xl">{grp.enrollments.length}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-[var(--bii-cream)] text-left">
                    <tr>
                      <th className="p-3">{pick("নাম","Name")}</th>
                      <th className="p-3">{pick("ফোন","Phone")}</th>
                      <th className="p-3">{pick("ইমেইল","Email")}</th>
                      <th className="p-3">{pick("এনরোলের তারিখ","Enrolled")}</th>
                      <th className="p-3">{pick("পেমেন্ট","Payment")}</th>
                      <th className="p-3 text-right">{pick("পরিমাণ","Amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grp.enrollments.map((e) => (
                      <tr key={e.id} className="border-t border-[var(--bii-border)]" data-testid={`enrl-course-student-${e.id}`}>
                        <td className="p-3 font-medium">{e.user?.name || "—"}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-xs"><Phone size={12} />{e.user?.phone || "—"}</span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-xs"><EnvelopeSimple size={12} />{e.user?.email || "—"}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{e.enrolled_at?.slice(0, 16).replace("T", " ")}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            e.payment_status === "success" ? "bg-green-100 text-green-800" :
                            e.payment_status === "free" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                          }`}>
                            {e.payment_status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-heading text-[var(--bii-emerald)]">
                          {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি","Free")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ label, val }) {
  return (
    <div className="bii-card p-4 flex items-center gap-3">
      <div className="text-[var(--bii-emerald)]"><GraduationCap size={32} weight="duotone" /></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{label}</div>
        <div className="font-heading text-xl text-[var(--bii-emerald)]">{val}</div>
      </div>
    </div>
  );
}

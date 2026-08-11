import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  CheckCircle, XCircle, Clock, MagnifyingGlass, ArrowsClockwise, X,
  Phone, EnvelopeSimple, User, Money, Receipt, CreditCard,
  CalendarBlank, CaretDown, CaretUp, Eye, DownloadSimple,
  CheckSquare, Warning, SealCheck
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";
import { toast } from "sonner";

const STATUS_MAP = {
  pending:  { label: "অপেক্ষমাণ",  cls: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  approved: { label: "অনুমোদিত",   cls: "bg-green-100 text-green-800 border-green-300",  icon: SealCheck },
  rejected: { label: "বাতিল",       cls: "bg-red-100 text-red-800 border-red-300",        icon: XCircle },
};

const METHOD_LABEL = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", bank: "ব্যাংক" };

const POLL_INTERVAL = 30_000;

export default function AdminPaymentRequests() {
  const { pick } = useLang();
  const [items,       setItems]       = useState([]);
  const [filter,      setFilter]      = useState("pending");
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [working,     setWorking]     = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { id, reason }
  const [detailItem,  setDetailItem]  = useState(null); // full detail modal
  const [expanded,    setExpanded]    = useState({});   // card expand state
  const pollRef = useRef(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return api.get("/payments/requests")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [load]);

  /* ── derived stats ── */
  const pendingCount    = items.filter((i) => i.status === "pending").length;
  const approvedCount   = items.filter((i) => i.status === "approved").length;
  const rejectedCount   = items.filter((i) => i.status === "rejected").length;
  const totalAmount     = items.filter((i) => i.status === "approved").reduce((s, i) => s + (i.amount || 0), 0);
  const pendingAmount   = items.filter((i) => i.status === "pending").reduce((s, i) => s + (i.amount || 0), 0);

  /* ── filter + search ── */
  const filtered = items.filter((it) => {
    const matchStatus = filter === "all" || it.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || [
      it.user_name, it.user_email, it.user_phone,
      it.transaction_id, it.course_title, it.user_id
    ].some((v) => (v || "").toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  /* ── actions ── */
  const approve = async (id) => {
    setWorking(id);
    try {
      await api.put(`/payments/requests/${id}/approve`);
      toast.success("✅ অনুমোদন করা হয়েছে — শিক্ষার্থী কোর্সে যুক্ত হয়েছে");
      load(true);
      if (detailItem?.id === id) setDetailItem(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "সমস্যা হয়েছে");
    } finally { setWorking(null); }
  };

  const openReject = (id) => setRejectModal({ id, reason: "" });

  const confirmReject = async () => {
    const { id, reason } = rejectModal;
    setRejectModal(null);
    setWorking(id);
    try {
      await api.put(`/payments/requests/${id}/reject`, { reason });
      toast.success("বাতিল করা হয়েছে");
      load(true);
      if (detailItem?.id === id) setDetailItem(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "সমস্যা হয়েছে");
    } finally { setWorking(null); }
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  /* ── export CSV ── */
  const exportCSV = () => {
    const rows = [
      ["তারিখ","নাম","ইমেইল","মোবাইল","কোর্স","পরিমাণ","মাধ্যম","ট্রানজেকশন আইডি","স্ট্যাটাস","প্রসেস করেছেন"],
      ...filtered.map((i) => [
        new Date(i.submitted_at).toLocaleString("bn-BD"),
        i.user_name, i.user_email, i.user_phone || "—",
        i.course_title, i.amount,
        (METHOD_LABEL[i.payment_method] || i.payment_method),
        i.transaction_id, STATUS_MAP[i.status]?.label || i.status,
        i.processed_by || "—"
      ])
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">

      {/* ══ DETAIL MODAL ══ */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* header */}
            <div className={`px-5 py-4 rounded-t-2xl flex items-center justify-between ${
              detailItem.status === "pending"  ? "bg-yellow-50 border-b border-yellow-200" :
              detailItem.status === "approved" ? "bg-green-50 border-b border-green-200" :
                                                 "bg-red-50 border-b border-red-200"
            }`}>
              <div>
                <div className="font-heading text-base text-[var(--bii-emerald)]">পেমেন্ট বিবরণ</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_MAP[detailItem.status]?.cls}`}>
                  {STATUS_MAP[detailItem.status]?.label}
                </span>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-[var(--bii-text-soft)] hover:text-red-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* body */}
            <div className="p-5 space-y-4">
              {/* Course */}
              <Section title="কোর্স তথ্য">
                <Row label="কোর্স" val={detailItem.course_title} highlight />
                <Row label="পরিমাণ" val={`৳ ${detailItem.amount}`} />
                <Row label="মাধ্যম" val={METHOD_LABEL[detailItem.payment_method] || detailItem.payment_method} />
              </Section>

              {/* Payment */}
              <Section title="পেমেন্ট তথ্য">
                <div className="bg-[var(--bii-cream)] rounded-lg p-3 space-y-1">
                  <div className="text-xs text-[var(--bii-text-soft)]">ট্রানজেকশন আইডি</div>
                  <div className="font-mono text-base font-bold text-[var(--bii-emerald)] select-all tracking-wider break-all">
                    {detailItem.transaction_id}
                  </div>
                </div>
                <Row label="জমা দেওয়ার সময়" val={new Date(detailItem.submitted_at).toLocaleString("bn-BD")} />
              </Section>

              {/* Student */}
              <Section title="শিক্ষার্থীর তথ্য">
                <Row icon={<User size={13} />}          label="নাম"      val={detailItem.user_name} />
                <Row icon={<EnvelopeSimple size={13} />} label="ইমেইল"   val={detailItem.user_email} />
                <Row icon={<Phone size={13} />}          label="মোবাইল"  val={detailItem.user_phone || "দেওয়া হয়নি"} />
                <Row label="ইউজার আইডি" val={<span className="font-mono text-xs break-all">{detailItem.user_id}</span>} />
              </Section>

              {/* Status history */}
              {detailItem.status !== "pending" && (
                <Section title="প্রসেসিং তথ্য">
                  <Row label="প্রসেস করেছেন" val={detailItem.processed_by || "—"} />
                  <Row label="প্রসেসের সময়"  val={detailItem.processed_at ? new Date(detailItem.processed_at).toLocaleString("bn-BD") : "—"} />
                  {detailItem.status === "rejected" && detailItem.reject_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                      <span className="font-medium">বাতিলের কারণ:</span> {detailItem.reject_reason}
                    </div>
                  )}
                </Section>
              )}
            </div>

            {/* footer actions */}
            {detailItem.status === "pending" && (
              <div className="px-5 pb-5 flex gap-2">
                <button
                  disabled={working === detailItem.id}
                  onClick={() => approve(detailItem.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-60 shadow"
                >
                  <CheckCircle size={18} weight="fill" />
                  {working === detailItem.id ? pick("প্রসেস হচ্ছে…", "Processing…") : pick("পেমেন্ট কনফার্ম করবেন?", "Confirm payment?")}
                </button>
                <button
                  disabled={working === detailItem.id}
                  onClick={() => { setDetailItem(null); openReject(detailItem.id); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition disabled:opacity-60"
                >
                  <XCircle size={18} weight="fill" />
                  বাতিল করুন
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ REJECT MODAL ══ */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base text-red-600">পেমেন্ট বাতিল করুন</h3>
              <button onClick={() => setRejectModal(null)} className="text-[var(--bii-text-soft)] hover:text-red-600"><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs text-[var(--bii-text-soft)] uppercase tracking-widest mb-1 block">বাতিলের কারণ (ঐচ্ছিক)</label>
              <textarea
                autoFocus rows={3}
                className="bii-input resize-none"
                placeholder="যেমন: ট্রানজেকশন আইডি মিলেনি"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-[var(--bii-border)] text-sm hover:bg-[var(--bii-cream)] transition">বাতিল করুন</button>
              <button onClick={confirmReject} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition font-medium">
                <XCircle size={14} weight="fill" className="inline mr-1" />
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE HEADER ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl text-[var(--bii-emerald)]">{pick("পেমেন্ট ব্যবস্থাপনা", "Payment Requests")}</h1>
          <p className="text-xs text-[var(--bii-text-soft)] mt-0.5">{pick("কোর্স ক্রয়ের সকল তথ্য ও অনুমোদন", "All course purchase details and approvals")}</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--bii-border)] bg-white text-sm hover:bg-[var(--bii-cream)] transition"
        >
          <DownloadSimple size={16} />
          CSV ডাউনলোড
        </button>
      </div>

      {/* ══ STATS ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="মোট আবেদন"    val={items.length}    icon={<Receipt size={20} />} />
        <StatCard label="অপেক্ষমাণ"    val={pendingCount}    icon={<Clock size={20} />}   highlight={pendingCount > 0} color="yellow"
                  sub={pendingCount > 0 ? `৳ ${pendingAmount.toLocaleString("bn-BD")} বাকি` : null} />
        <StatCard label="অনুমোদিত"     val={approvedCount}   icon={<SealCheck size={20} />} color="green" />
        <StatCard label="বাতিল"        val={rejectedCount}   icon={<Warning size={20} />}   color="red" />
        <StatCard label="সংগৃহীত টাকা" val={`৳ ${totalAmount.toLocaleString("bn-BD")}`}
                  icon={<Money size={20} />} color="emerald" wide />
      </div>

      {/* ══ FILTERS + SEARCH ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { k: "pending",  l: `অপেক্ষমাণ${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { k: "approved", l: `অনুমোদিত (${approvedCount})` },
            { k: "rejected", l: `বাতিল (${rejectedCount})` },
            { k: "all",      l: `সব (${items.length})` },
          ].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-4 py-1.5 rounded-xl text-sm border transition ${
                filter === f.k
                  ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]"
                  : "bg-white border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"
              }`}
            >{f.l}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]" />
            <input
              className="bii-input pl-8 py-1.5 text-sm w-56"
              placeholder="নাম / মোবাইল / ট্রানজেকশন…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => load()}
            title="রিফ্রেশ"
            className="p-2 rounded-lg border border-[var(--bii-border)] bg-white hover:bg-[var(--bii-cream)] transition"
          >
            <ArrowsClockwise size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--bii-text-soft)]">প্রতি ৩০ সেকেন্ডে স্বয়ংক্রিয়ভাবে আপডেট হয় · {filtered.length}টি দেখাচ্ছে</p>

      {/* ══ LIST ══ */}
      {loading ? (
        <div className="text-center py-14 text-[var(--bii-text-soft)]">
          <ArrowsClockwise size={28} className="mx-auto mb-2 animate-spin opacity-40" />
          লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bii-card p-12 text-center text-[var(--bii-text-soft)]">
          <Clock size={40} className="mx-auto mb-2 opacity-20" />
          <div className="font-medium">{pick("কোনো রেকর্ড নেই", "No pending payments")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => {
            const isExpanded = expanded[it.id];
            const StatusIcon = STATUS_MAP[it.status]?.icon || Clock;
            return (
              <div key={it.id} className={`bii-card overflow-hidden transition-all ${
                it.status === "pending"  ? "border-yellow-200 bg-yellow-50/20" :
                it.status === "approved" ? "border-green-100" : "border-red-100"
              }`}>
                {/* ── main row ── */}
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">

                    {/* Left: core info */}
                    <div className="space-y-2 flex-1 min-w-0">

                      {/* row 1: status + date + course */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${STATUS_MAP[it.status]?.cls}`}>
                          <StatusIcon size={11} weight="fill" />
                          {STATUS_MAP[it.status]?.label || it.status}
                        </span>
                        <span className="text-xs text-[var(--bii-text-soft)] flex items-center gap-1">
                          <CalendarBlank size={11} />
                          {pick("তারিখ:", "Date:")} {new Date(it.submitted_at).toLocaleString("bn-BD")}
                        </span>
                      </div>

                      {/* Course title */}
                      <div className="font-heading text-sm text-[var(--bii-emerald)] truncate">
                        📚 {it.course_title}
                      </div>

                      {/* Student info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                        <InfoCell icon={<User size={11} />}          label="নাম"    val={it.user_name} />
                        <InfoCell icon={<Phone size={11} />}         label="মোবাইল" val={it.user_phone || "—"} />
                        <InfoCell icon={<EnvelopeSimple size={11} />} label="ইমেইল" val={it.user_email} />
                        <InfoCell icon={<CreditCard size={11} />}    label={pick("মাধ্যম", "Method:")} val={METHOD_LABEL[it.payment_method] || it.payment_method} bold />
                        <InfoCell icon={<Money size={11} />}         label={pick("পরিমাণ", "Amount")} val={`৳ ${it.amount}`} bold />
                      </div>

                      {/* Transaction ID — always visible, prominent */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[var(--bii-text-soft)]">ট্রানজেকশন আইডি:</span>
                        <code className="font-mono text-sm bg-[var(--bii-cream)] px-2.5 py-0.5 rounded-lg text-[var(--bii-emerald)] font-bold tracking-wider select-all border border-[var(--bii-border)]">
                          {it.transaction_id}
                        </code>
                      </div>

                      {/* Reject reason if any */}
                      {it.status === "rejected" && it.reject_reason && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                          ⚠️ বাতিলের কারণ: {it.reject_reason}
                        </div>
                      )}

                      {/* Processed by */}
                      {it.status !== "pending" && (
                        <div className="text-xs text-[var(--bii-text-soft)]">
                          প্রসেস করেছেন: <span className="text-[var(--bii-text)]">{it.processed_by}</span>
                          {it.processed_at && ` — ${new Date(it.processed_at).toLocaleString("bn-BD")}`}
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      {it.status === "pending" && (
                        <>
                          <button
                            disabled={working === it.id}
                            onClick={() => approve(it.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60 font-medium shadow-sm w-full justify-center"
                          >
                            <CheckCircle size={15} weight="fill" />
                            {working === it.id ? pick("প্রসেস…", "Processing…") : pick("অনুমোদন", "Confirm")}
                          </button>
                          <button
                            disabled={working === it.id}
                            onClick={() => openReject(it.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition disabled:opacity-60 w-full justify-center"
                          >
                            <XCircle size={15} weight="fill" />
                            {pick("বাতিল", "Delete")}
                          </button>
                        </>
                      )}
                      {it.status === "approved" && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                          <CheckSquare size={13} weight="fill" />
                          কোর্সে যুক্ত হয়েছে
                        </span>
                      )}

                      {/* Detail + expand buttons */}
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => setDetailItem(it)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--bii-border)] bg-white hover:bg-[var(--bii-cream)] transition"
                        >
                          <Eye size={13} />
                          বিস্তারিত
                        </button>
                        <button
                          onClick={() => toggleExpand(it.id)}
                          className="p-1.5 rounded-lg border border-[var(--bii-border)] bg-white hover:bg-[var(--bii-cream)] transition"
                          title={isExpanded ? "সংক্ষিপ্ত করুন" : "ইউজার আইডি দেখুন"}
                        >
                          {isExpanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── expanded: user ID row ── */}
                {isExpanded && (
                  <div className="border-t border-[var(--bii-border)] bg-[var(--bii-cream)]/50 px-4 py-3">
                    <div className="flex flex-wrap gap-6 text-xs">
                      <div>
                        <span className="text-[var(--bii-text-soft)] block mb-0.5">ইউজার আইডি (User ID)</span>
                        <code className="font-mono text-[var(--bii-emerald)] select-all">{it.user_id}</code>
                      </div>
                      <div>
                        <span className="text-[var(--bii-text-soft)] block mb-0.5">পেমেন্ট রেকর্ড আইডি</span>
                        <code className="font-mono text-[var(--bii-emerald)] select-all">{it.id}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── helpers ── */
function StatCard({ label, val, icon, highlight, color, sub, wide }) {
  const colorCls = {
    yellow:  "text-yellow-700 bg-yellow-50 border-yellow-200",
    green:   "text-green-700 bg-green-50 border-green-200",
    red:     "text-red-600 bg-red-50 border-red-200",
    emerald: "text-[var(--bii-emerald)] bg-[var(--bii-cream)] border-[var(--bii-border)]",
  };
  return (
    <div className={`bii-card p-4 ${wide ? "col-span-2 sm:col-span-1" : ""} ${colorCls[color] || ""} ${highlight ? "border-yellow-300" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-current opacity-60">{label}</div>
        <div className="opacity-40">{icon}</div>
      </div>
      <div className="font-heading text-xl font-bold">{val}</div>
      {sub && <div className="text-[11px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function InfoCell({ icon, label, val, bold }) {
  return (
    <span className="flex items-center gap-1 text-[var(--bii-text)]">
      <span className="text-[var(--bii-text-soft)]">{icon}</span>
      <span className="text-[var(--bii-text-soft)]">{label}:</span>
      <span className={bold ? "font-semibold" : ""}>{val}</span>
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-2 font-medium">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, val, icon, highlight }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="flex items-center gap-1 text-[var(--bii-text-soft)] whitespace-nowrap text-xs shrink-0">
        {icon}{label}
      </span>
      <span className={`text-right text-xs ${highlight ? "font-heading text-[var(--bii-emerald)] font-semibold text-sm" : "text-[var(--bii-text)]"}`}>
        {val}
      </span>
    </div>
  );
}

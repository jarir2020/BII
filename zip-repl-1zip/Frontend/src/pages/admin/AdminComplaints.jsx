import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatCircleText, CheckCircle, Clock, X } from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminComplaints() {
  const { pick } = useLang();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(null); // complaint object
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | pending | resolved

  const load = async () => {
    try {
      const { data } = await api.get("/complaints");
      setComplaints(data);
    } catch (e) {
      toast.error(formatApiError(e) || "অভিযোগ লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openResolve = (c) => {
    setResolveModal(c);
    setNote("");
  };

  const submitResolve = async () => {
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/complaints/${resolveModal.id}/resolve`, { note });
      toast.success("অভিযোগটি সমাধান হিসেবে চিহ্নিত করা হয়েছে");
      setResolveModal(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e) || "সমাধান করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (filter === "pending") return !c.resolved;
    if (filter === "resolved") return c.resolved;
    return true;
  });

  const pending = complaints.filter((c) => !c.resolved).length;
  const resolved = complaints.filter((c) => c.resolved).length;

  return (
    <div data-testid="admin-complaints-page">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-4">{pick("অভিযোগ ও মতামত","Complaints & Feedback")}</h1>
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label={pick("মোট অভিযোগ","Total Complaints")} val={complaints.length} color="text-[var(--bii-emerald)]" />
        <StatCard label={pick("অপেক্ষমাণ","Pending")} val={pending} color="text-yellow-600" />
        <StatCard label={pick("সমাধান হয়েছে","Resolved")} val={resolved} color="text-green-600" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: pick("সব","All") },
          { key: "pending", label: pick("অপেক্ষমাণ","Pending") },
          { key: "resolved", label: pick("সমাধান হয়েছে","Resolved") },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === t.key
                ? "bg-[var(--bii-emerald)] text-white"
                : "bg-[var(--bii-cream)] text-[var(--bii-text)] hover:bg-[var(--bii-emerald)]/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="p-8 text-center text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">
          <ChatCircleText size={40} className="mx-auto mb-2 opacity-40" weight="duotone" />
          {pick("এখনো কোনো অভিযোগ জমা পড়েনি","No complaints yet")}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`bii-card p-4 border-l-4 ${
              c.resolved ? "border-green-400" : "border-yellow-400"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    c.resolved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {c.resolved
                      ? <><CheckCircle size={12} weight="fill" /> সমাধান হয়েছে</>
                      : <><Clock size={12} weight="fill" /> অপেক্ষমাণ</>
                    }
                  </span>
                  <span className="text-xs text-[var(--bii-text-soft)]">
                    {c.student_id && <span className="font-mono">{c.student_id} • </span>}
                    {c.user_name}
                  </span>
                  <span className="text-xs text-[var(--bii-text-soft)]">
                    {c.created_at?.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <div className="font-medium text-[var(--bii-text)]">{c.subject}</div>
                <div className="text-sm text-[var(--bii-text-soft)] mt-1">{c.message}</div>

                {c.resolved && c.resolution_note && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm text-green-800 border border-green-200">
                    <span className="font-medium">সমাধানের নোট: </span>{c.resolution_note}
                  </div>
                )}
                {c.resolved && (
                  <div className="text-xs text-[var(--bii-text-soft)] mt-1">
                    সমাধান: {c.resolved_at?.slice(0, 16).replace("T", " ")}
                    {c.resolved_by_name && ` — ${c.resolved_by_name}`}
                  </div>
                )}
              </div>

              {!c.resolved && (
                <button
                  onClick={() => openResolve(c)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bii-emerald)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition"
                >
                  <CheckCircle size={14} weight="bold" />
                  সমাধান করুন
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setResolveModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[var(--bii-emerald)] text-white p-4 flex justify-between items-center">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[var(--bii-gold)]">অভিযোগ সমাধান</div>
                <div className="font-medium mt-0.5">{resolveModal.subject}</div>
              </div>
              <button onClick={() => setResolveModal(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-[var(--bii-cream)] rounded-lg text-sm text-[var(--bii-text-soft)]">
                {resolveModal.message}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--bii-text)] mb-1.5">
                  সমাধানের নোট (ঐচ্ছিক)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="শিক্ষার্থীকে কী জানাতে চান? (ঐচ্ছিক)"
                  className="w-full rounded-lg border border-[var(--bii-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bii-emerald)] resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setResolveModal(null)}
                  className="px-4 py-2 rounded-lg text-sm border border-[var(--bii-border)] hover:bg-[var(--bii-cream)] transition"
                >
                  বাতিল
                </button>
                <button
                  onClick={submitResolve}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm bg-[var(--bii-emerald)] text-white font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "✓ সমাধান চিহ্নিত করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, color }) {
  return (
    <div className="bii-card p-4 text-center">
      <div className={`font-heading text-2xl ${color}`}>{val}</div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mt-0.5">{label}</div>
    </div>
  );
}

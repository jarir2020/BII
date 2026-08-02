import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ArrowRight } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";

const PAYMENT_STATUS_CFG = {
  pending:  { key: "pendingApproval", cls: "bg-yellow-100 text-yellow-800 border-yellow-300", Icon: Clock },
  approved: { key: "approved",        cls: "bg-green-100  text-green-800  border-green-300",  Icon: CheckCircle },
  rejected: { key: "rejected",        cls: "bg-red-100    text-red-800    border-red-300",    Icon: XCircle },
};

export default function MyCourses() {
  const { t, pick } = useLang();
  const [courses,  setCourses]  = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/my-courses").then((r) => setCourses(r.data)),
      api.get("/my-payment-requests").then((r) => setRequests(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  // Pending/rejected requests whose course isn't already enrolled
  const enrolledIds = new Set(courses.map((c) => c.id));
  const pendingReqs = requests.filter(
    (r) => r.status === "pending" && !enrolledIds.has(r.course_id)
  );
  const rejectedReqs = requests.filter(
    (r) => r.status === "rejected" && !enrolledIds.has(r.course_id)
  );

  return (
    <div data-testid="my-courses-page" className="space-y-8">
      <h1 className="font-heading text-3xl text-[var(--bii-emerald)]">{t("menuMyCourses")}</h1>

      {loading && <div className="text-center text-[var(--bii-text-soft)] py-8">{t("loading")}</div>}

      {/* ── Pending payments ── */}
      {!loading && pendingReqs.length > 0 && (
        <section>
          <h2 className="font-heading text-lg text-[var(--bii-emerald)] mb-3 flex items-center gap-2">
            <Clock size={20} weight="duotone" className="text-yellow-600" />
            {t("pendingApproval")}
          </h2>
          <div className="space-y-3">
            {pendingReqs.map((r) => (
              <PaymentCard key={r.id} req={r} />
            ))}
          </div>
        </section>
      )}

      {/* ── Rejected payments ── */}
      {!loading && rejectedReqs.length > 0 && (
        <section>
          <h2 className="font-heading text-lg text-red-700 mb-3 flex items-center gap-2">
            <XCircle size={20} weight="duotone" />
            {pick("বাতিল হয়েছে", "Rejected")}
          </h2>
          <div className="space-y-3">
            {rejectedReqs.map((r) => (
              <PaymentCard key={r.id} req={r} />
            ))}
          </div>
        </section>
      )}

      {/* ── Enrolled courses ── */}
      {!loading && (
        <section>
          {courses.length > 0 && (
            <h2 className="font-heading text-lg text-[var(--bii-emerald)] mb-3 flex items-center gap-2">
              <CheckCircle size={20} weight="duotone" className="text-green-600" />
              {pick("আমার কোর্সসমূহ", "My Courses")}
            </h2>
          )}
          {courses.length === 0 && pendingReqs.length === 0 && rejectedReqs.length === 0 && (
            <div className="bii-card p-8 text-center">
              <p className="text-[var(--bii-text-soft)] mb-3">
                {pick("এখনো কোন কোর্সে ভর্তি হননি", "You haven't enrolled in any course yet")}
              </p>
              <Link to="/courses" className="bii-btn-primary inline-block">{t("menuOurCourses")}</Link>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Link key={c.id} to={`/my-courses/${c.id}`} className="bii-card overflow-hidden group">
                {c.cover_image && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={imgUrl(c.cover_image)}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-lg text-[var(--bii-emerald)] leading-snug">
                      {pick(c.title_bn, c.title_en)}
                    </h3>
                    <ArrowRight size={16} className="flex-shrink-0 text-[var(--bii-text-soft)] group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-xs text-[var(--bii-text-soft)] mt-1">{c.instructor}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} weight="fill" />
                    {t("active")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PaymentCard({ req }) {
  const { t, pick } = useLang();
  const cfg = PAYMENT_STATUS_CFG[req.status] || PAYMENT_STATUS_CFG.pending;
  const { Icon } = cfg;
  return (
    <div className="bii-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-heading text-sm text-[var(--bii-emerald)] truncate">{req.course_title}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[var(--bii-text-soft)]">
          <span>{pick("মাধ্যম", "Method")}: <span className="uppercase font-medium text-[var(--bii-text)]">{req.payment_method}</span></span>
          <span>{pick("পরিমাণ", "Amount")}: <span className="font-medium text-[var(--bii-text)]">৳{req.amount}</span></span>
          <span>{pick("ট্রানজেকশন আইডি", "Transaction ID")}: <code className="font-mono bg-[var(--bii-cream)] px-1.5 py-0.5 rounded text-[var(--bii-emerald)]">{req.transaction_id}</code></span>
        </div>
        {req.reject_reason && (
          <div className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {pick("কারণ", "Reason")}: {req.reject_reason}
          </div>
        )}
        <div className="text-xs text-[var(--bii-text-soft)] mt-1">
          {new Date(req.submitted_at).toLocaleString("bn-BD")}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.cls}`}>
        <Icon size={14} weight="fill" />
        {t(cfg.key)}
      </div>
    </div>
  );
}

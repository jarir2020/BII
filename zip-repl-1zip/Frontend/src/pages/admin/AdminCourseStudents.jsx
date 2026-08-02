import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLang } from "../../contexts/LangContext";
import {
  GraduationCap, Phone, EnvelopeSimple, MagnifyingGlass,
  ArrowLeft, Export, Student, CurrencyCircleDollar, CalendarBlank,
  IdentificationCard, WhatsappLogo,
} from "@phosphor-icons/react";
import { api, imgUrl } from "../../lib/api";

export default function AdminCourseStudents() {
  const { pick } = useLang();
  const { courseId } = useParams();
  const [enrollments, setEnrollments] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api.get("/enrollments"), api.get("/courses")])
      .then(([enrRes, crsRes]) => {
        const allEnr = enrRes.data;
        const allCrs = crsRes.data;
        const found = allCrs.find((c) => c.id === courseId);
        setCourse(found || null);
        setEnrollments(allEnr.filter((e) => (e.course_id || e.course?.id) === courseId));
      })
      .catch(() => setError("তথ্য লোড করা যায়নি।"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return enrollments;
    const needle = q.toLowerCase();
    return enrollments.filter(
      (e) =>
        (e.user?.name || "").toLowerCase().includes(needle) ||
        (e.user?.phone || "").includes(needle) ||
        (e.user?.email || "").toLowerCase().includes(needle) ||
        (e.user?.email || "").toLowerCase().includes(needle)
    );
  }, [enrollments, q]);

  // CSV export
  const exportCSV = () => {
    const rows = [
      [pick("নাম","Name"), pick("ফোন","Phone"), pick("ইমেইল","Email"), pick("এনরোলের তারিখ","Enrolled"), pick("পেমেন্ট","Payment"), pick("পরিমাণ","Amount"), "Transaction ID", "Payment Method"],
      ...filtered.map((e) => [
        e.user?.name || "",
        e.user?.phone || "",
        e.user?.email || "",
        (e.enrolled_at || "").slice(0, 16).replace("T", " "),
        e.payment_status || "",
        e.amount || 0,
        e.transaction_id || "",
        e.payment_method || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `students_${course?.title_bn || courseId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const courseName = course?.title_bn || course?.title_en || pick("অজানা কোর্স","Unknown Course");

  return (
    <div className="space-y-5" data-testid="admin-course-students-page">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Link
            to="/admin/students-by-course"
            className="mt-1 p-1.5 rounded-lg hover:bg-[var(--bii-cream)] text-[var(--bii-text-soft)] transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">{courseName}</h1>
            <p className="text-sm text-[var(--bii-text-soft)] mt-0.5">
              {course?.instructor && <span>{course.instructor} • </span>}
              {course?.price > 0 ? `৳${course.price}` : pick("ফ্রি","Free")} •{" "}
              মোট শিক্ষার্থী: <strong>{enrollments.length}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="নাম / ফোন / ইমেইল / ID..."
              className="pl-8 pr-3 py-2 text-sm rounded-xl border border-[var(--bii-border)] w-56 focus:outline-none focus:border-[var(--bii-emerald)]"
            />
          </div>
          {/* Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bii-emerald)] text-white text-sm hover:opacity-90 transition"
          >
            <Export size={16} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Course cover card */}
      {course && (
        <div className="bii-card p-4 flex gap-4 items-center bg-gradient-to-r from-[var(--bii-emerald)] to-emerald-700 text-white">
          {course.cover_image && (
            <img
              src={imgUrl(course.cover_image)}
              alt={courseName}
              className="w-20 h-20 rounded-xl object-cover ring-2 ring-white/30 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-heading text-xl">{courseName}</div>
            {course.title_en && <div className="text-sm opacity-80">{course.title_en}</div>}
            <div className="text-xs opacity-70 mt-0.5">{course.description_bn}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <Stat icon={Student} label={pick("স্টুডেন্ট সংখ্যা","Students")} value={enrollments.length} />
            <Stat icon={CurrencyCircleDollar} label={pick("কোর্স মূল্য","Fee")} value={course.price > 0 ? `৳${course.price}` : pick("ফ্রি","Free")} />
            <Stat icon={CurrencyCircleDollar} label="মোট আয়" value={`৳${enrollments.reduce((s, e) => s + (e.amount || 0), 0)}`} />
            <Stat icon={CalendarBlank} label="সময়কাল" value={course.duration || "—"} />
          </div>
        </div>
      )}

      {loading && <div className="text-center py-10 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>}
      {error && <div className="bii-card p-4 text-red-700 bg-red-50 border border-red-200 text-sm">{error}</div>}

      {/* Student cards — mobile-friendly */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="bii-card p-8 text-center text-[var(--bii-text-soft)] italic">
              {enrollments.length === 0
                ? pick("এখনো কেউ এই কোর্স কিনেনি","No students yet")
                : pick("কোনো শিক্ষার্থী পাওয়া যায়নি।","No students yet")}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bii-card overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-[var(--bii-cream)] text-[var(--bii-text-soft)] text-xs uppercase tracking-wide">
                      <tr>
                        <th className="p-3 text-left">{pick("নাম","Name")}</th>
                        <th className="p-3 text-left">{pick("ফোন","Phone")}</th>
                        <th className="p-3 text-left">{pick("ইমেইল","Email")}</th>
                        <th className="p-3 text-left">{pick("এনরোলের তারিখ","Enrolled")}</th>
                        <th className="p-3 text-left">{pick("পেমেন্ট","Payment")}</th>
                        <th className="p-3 text-left">Transaction ID</th>
                        <th className="p-3 text-right">{pick("পরিমাণ","Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, idx) => (
                        <tr
                          key={e.id}
                          className={`border-t border-[var(--bii-border)] ${idx % 2 === 0 ? "" : "bg-[var(--bii-cream)]/30"}`}
                        >
                          <td className="p-3 font-medium">{e.user?.name || "—"}</td>
                          <td className="p-3">
                            <a
                              href={`tel:${e.user?.phone}`}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Phone size={12} />
                              {e.user?.phone || "—"}
                            </a>
                          </td>
                          <td className="p-3">
                            <a
                              href={`mailto:${e.user?.email}`}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <EnvelopeSimple size={12} />
                              {e.user?.email || "—"}
                            </a>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {(e.enrolled_at || "").slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="p-3">
                            <PayBadge status={e.payment_status} method={e.payment_method} />
                          </td>
                          <td className="p-3 font-mono text-xs text-[var(--bii-text-soft)]">
                            {e.transaction_id || "—"}
                          </td>
                          <td className="p-3 text-right font-heading text-[var(--bii-emerald)]">
                            {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি","Free")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--bii-cream)] border-t-2 border-[var(--bii-border)]">
                      <tr>
                        <td colSpan={7} className="p-3 text-sm font-medium text-[var(--bii-text-soft)]">
                          মোট ({filtered.length} জন শিক্ষার্থী)
                        </td>
                        <td className="p-3 text-right font-heading text-[var(--bii-emerald)] text-base">
                          ৳ {filtered.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((e) => (
                  <div key={e.id} className="bii-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.user?.name || "—"}</div>
                      <PayBadge status={e.payment_status} method={e.payment_method} />
                    </div>
                    <a href={`tel:${e.user?.phone}`} className="flex items-center gap-1.5 text-sm text-blue-600">
                      <Phone size={14} />{e.user?.phone || "—"}
                    </a>
                    <a href={`mailto:${e.user?.email}`} className="flex items-center gap-1.5 text-sm text-blue-600">
                      <EnvelopeSimple size={14} />{e.user?.email || "—"}
                    </a>
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--bii-border)]">
                      <span className="text-xs text-[var(--bii-text-soft)]">
                        {(e.enrolled_at || "").slice(0, 10)}
                      </span>
                      <span className="font-heading text-[var(--bii-emerald)]">
                        {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি","Free")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="text-center bg-white/10 rounded-xl px-3 py-2">
      <Icon size={18} className="mx-auto mb-0.5 opacity-80" />
      <div className="text-[10px] opacity-70 leading-tight">{label}</div>
      <div className="font-heading text-sm">{value}</div>
    </div>
  );
}

function PayBadge({ status, method }) {
  const { pick } = useLang();
  const label = status === "success" ? pick("পেইড","Paid") : status === "free" ? pick("ফ্রি","Free") : status || "—";
  const cls =
    status === "success"
      ? "bg-green-100 text-green-800"
      : status === "free"
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
      {method && <span className="opacity-60">({method})</span>}
    </span>
  );
}

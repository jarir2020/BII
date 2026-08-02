import React, { useEffect, useState, useMemo } from "react";
import { useLang } from "../../contexts/LangContext";
import { GraduationCap, Phone, EnvelopeSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { api, imgUrl } from "../../lib/api";

// Dedicated section: every course gets its own box/option, and inside each
// box are all the students who bought that specific course, with full details.
export default function AdminStudentsByCourse() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api.get("/enrollments"), api.get("/courses")])
      .then(([enrl, crs]) => {
        setItems(enrl.data);
        setCourses(crs.data);
      })
      .catch(() => setError("তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।"))
      .finally(() => setLoading(false));
  }, []);

  // Every course gets its own option/box the moment it's created — even
  // before anyone enrolls (it just shows 0 students until someone buys it).
  const byCourse = useMemo(() => {
    const groups = new Map();
    for (const c of courses) {
      groups.set(c.id, { course: c, enrollments: [] });
    }
    for (const e of items) {
      const cid = e.course?.id || e.course_id || "unknown";
      if (!groups.has(cid)) groups.set(cid, { course: e.course, enrollments: [] });
      groups.get(cid).enrollments.push(e);
    }
    let list = Array.from(groups.values()).sort((a, b) => b.enrollments.length - a.enrollments.length);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((g) => (g.course?.title_bn || "").toLowerCase().includes(needle));
    }
    return list;
  }, [items, courses, q]);

  return (
    <div data-testid="admin-students-by-course-page" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">কোর্স অনুযায়ী স্টুডেন্ট</h1>
          <p className="text-sm text-[var(--bii-text-soft)] mt-0.5">
            প্রতিটা কোর্সের জন্য আলাদা অপশন — যে কোর্সে ক্লিক করবেন, ওই কোর্স কারা কিনেছে তাদের সব তথ্য দেখাবে।
          </p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]" />
          <input
            data-testid="students-by-course-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="কোর্সের নাম দিয়ে খুঁজুন..."
            className="pl-9 pr-3 py-2 rounded-xl border border-[var(--bii-border)] text-sm w-56"
          />
        </div>
      </div>

      {loading && <div className="text-center py-6 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>}
      {error && (
        <div className="bii-card p-4 text-sm text-red-700 bg-red-50 border border-red-200" data-testid="students-by-course-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {byCourse.length === 0 && (
            <div className="bii-card p-6 text-center text-[var(--bii-text-soft)] italic">কোন কোর্সে এখনো কোন স্টুডেন্ট এনরোল হয়নি</div>
          )}
          {byCourse.map((grp) => (
            <CourseOption key={grp.course?.id || Math.random()} grp={grp} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseOption({ grp }) {
  const { pick } = useLang();
  const [open, setOpen] = useState(true);
  return (
    <div className="bii-card overflow-hidden" data-testid={`course-option-${grp.course?.id}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 bg-[var(--bii-emerald)] text-white flex items-center gap-3 text-left"
        data-testid={`course-option-toggle-${grp.course?.id}`}
      >
        {grp.course?.cover_image && (
          <img src={imgUrl(grp.course.cover_image)} alt="" className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/30" />
        )}
        <div className="flex-1">
          <div className="font-heading text-lg">{grp.course?.title_bn || pick("অজানা কোর্স", "Unknown Course")}</div>
          <div className="text-xs opacity-80">{grp.course?.instructor}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--bii-gold)]">{pick("স্টুডেন্ট সংখ্যা", "Students")}</div>
          <div className="font-heading text-2xl">{grp.enrollments.length}</div>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[var(--bii-cream)] text-left">
              <tr>
                <th className="p-3">{pick("নাম", "Name")}</th>
                <th className="p-3">{pick("ফোন", "Phone")}</th>
                <th className="p-3">{pick("ইমেইল", "Email")}</th>
                <th className="p-3">{pick("এনরোলের তারিখ", "Enrolled")}</th>
                <th className="p-3">{pick("পেমেন্ট", "Payment")}</th>
                <th className="p-3 text-right">{pick("পরিমাণ", "Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {grp.enrollments.map((e) => (
                <tr key={e.id} className="border-t border-[var(--bii-border)]" data-testid={`course-option-student-${e.id}`}>
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
                    {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি", "Free")}
                  </td>
                </tr>
              ))}
              {grp.enrollments.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-[var(--bii-text-soft)] italic">{pick("এখনো কেউ এই কোর্স কিনেনি", "No students yet")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

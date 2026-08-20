import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../contexts/LangContext";
import {
  Users, GraduationCap, BookOpen, VideoCamera, Bell,
  ShoppingBag, Storefront, ChalkboardTeacher, Mosque,
  Newspaper, Student, CurrencyCircleDollar, ArrowRight,
  Trophy,
} from "@phosphor-icons/react";
import { api, imgUrl } from "../../lib/api";

const tiles = [
  { k: "students",     to: "/admin/students",     label: "স্টুডেন্ট",    icon: Users,              color: "text-blue-700 bg-blue-50" },
  { k: "teachers",     to: "/admin/teachers",     label: "শিক্ষক",       icon: ChalkboardTeacher,  color: "text-emerald-700 bg-emerald-50" },
  { k: "courses",      to: "/admin/courses",      label: "কোর্স",        icon: BookOpen,           color: "text-purple-700 bg-purple-50" },
  { k: "lessons",      to: "/admin/lessons",      label: "লেসন",         icon: BookOpen,           color: "text-indigo-700 bg-indigo-50" },
  { k: "videos",       to: "/admin/videos",       label: "ভিডিও",        icon: VideoCamera,        color: "text-pink-700 bg-pink-50" },
  { k: "pdfs",         to: "/admin/pdfs",         label: "PDF",          icon: BookOpen,           color: "text-orange-700 bg-orange-50" },
  { k: "live_classes",    to: "/admin/live-classes", label: "লাইভ ক্লাস",   icon: VideoCamera, color: "text-red-700 bg-red-50" },
  { k: "monthly_quizzes", to: "/admin/quizzes",     label: "মাসিক কুইজ",  icon: Trophy,      color: "text-amber-700 bg-amber-50" },
  { k: "enrollments",    to: "/admin/enrollments",  label: "এনরোলমেন্ট",  icon: GraduationCap, color: "text-yellow-800 bg-yellow-50" },
  { k: "products",     to: "/admin/products",     label: "প্রোডাক্ট",   icon: Storefront,         color: "text-cyan-700 bg-cyan-50" },
  { k: "orders",       to: "/admin/orders",       label: "অর্ডার",       icon: ShoppingBag,        color: "text-teal-700 bg-teal-50" },
  { k: "hadiths",      to: "/admin/hadiths",      label: "দৈনন্দিন দোয়া ও যিকির", icon: Mosque, color: "text-green-700 bg-green-50" },
  { k: "blogs",        to: "/admin/blogs",        label: "ব্লগ",         icon: Newspaper,          color: "text-gray-700 bg-gray-100" },
  { k: "notifications",to: "/admin/notifications",label: "নোটিফিকেশন", icon: Bell,               color: "text-amber-700 bg-amber-50" },
];

export default function AdminDashboard() {
  const { pick: selectText } = useLang();
  const [a, setA]           = useState({});
  const [courses, setCourses]       = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    api.get("/analytics").then((r) => setA(r.data)).catch(() => {});
    Promise.all([api.get("/courses"), api.get("/enrollments")])
      .then(([crs, enr]) => {
        setCourses(crs.data || []);
        setEnrollments(enr.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, []);

  // Count enrollments per course
  const countByCourse = (courseId) =>
    enrollments.filter(
      (e) => (e.course_id || e.course?.id) === courseId
    ).length;

  // Total revenue per course
  const revenueByCourse = (courseId) =>
    enrollments
      .filter((e) => (e.course_id || e.course?.id) === courseId)
      .reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-[var(--bii-emerald)]">{selectText("অ্যাডমিন ড্যাশবোর্ড","Admin Dashboard")}</h1>
        <p className="text-sm text-[var(--bii-text-soft)]">{selectText("সারসংক্ষেপ","Overview")}</p>
      </div>

      {/* ── Top stat tiles ── */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Link
          to="/admin/enrollments"
          data-testid="dash-tile-revenue"
          className="bii-card p-5 col-span-full sm:col-span-2 bg-[var(--bii-emerald)] text-white hover:opacity-90 transition cursor-pointer block"
        >
          <div className="text-[11px] uppercase tracking-widest text-[var(--bii-gold)]">মোট আয়</div>
          <div className="font-heading text-4xl mt-1">৳ {a.revenue || 0}</div>
          <div className="text-xs opacity-80 mt-1">সফল এনরোলমেন্ট থেকে — বিস্তারিত দেখতে ক্লিক করুন</div>
        </Link>
        <Link to="/admin/login-logs" data-testid="dash-tile-logins" className="bii-card p-5 hover:bg-[var(--bii-cream)] transition cursor-pointer block">
          <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)]">৭ দিনের লগইন</div>
          <div className="font-heading text-3xl text-[var(--bii-emerald)] mt-1">{a.logins_recent || 0}</div>
        </Link>
        <Link to="/admin/admins" data-testid="dash-tile-admins" className="bii-card p-5 hover:bg-[var(--bii-cream)] transition cursor-pointer block">
          <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)]">এডমিন</div>
          <div className="font-heading text-3xl text-[var(--bii-emerald)] mt-1">{a.admins || 0}</div>
        </Link>
      </div>

      {/* ── General stat tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.k}
              to={t.to}
              data-testid={`dash-tile-${t.k}`}
              className="bii-card p-4 flex items-center gap-3 hover:bg-[var(--bii-cream)] hover:shadow-md transition cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${t.color}`}><Icon size={24} weight="duotone" /></div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t.label}</div>
                <div className="font-heading text-2xl text-[var(--bii-emerald)]">{a[t.k] ?? 0}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Per-course cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-heading text-xl text-[var(--bii-emerald)]">কোর্সভিত্তিক শিক্ষার্থী</h2>
            <p className="text-xs text-[var(--bii-text-soft)] mt-0.5">
              প্রতিটি কোর্সের কার্ডে ক্লিক করলে সেই কোর্সের সব শিক্ষার্থীর তথ্য দেখাবে।
              নতুন কোর্স যোগ করলে এখানে স্বয়ংক্রিয়ভাবে নতুন কার্ড তৈরি হবে।
            </p>
          </div>
          <Link
            to="/admin/students-by-course"
            className="flex items-center gap-1 text-sm text-[var(--bii-emerald)] hover:underline shrink-0"
          >
            সব দেখুন <ArrowRight size={15} />
          </Link>
        </div>

        {loadingCourses ? (
          <div className="text-sm text-[var(--bii-text-soft)] py-4">লোড হচ্ছে...</div>
        ) : courses.length === 0 ? (
          <div className="bii-card p-6 text-center text-[var(--bii-text-soft)] italic text-sm">
            এখনো কোনো কোর্স যোগ করা হয়নি।
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => {
              const studentCount = countByCourse(c.id);
              const revenue      = revenueByCourse(c.id);
              return (
                <Link
                  key={c.id}
                  to={`/admin/course-students/${c.id}`}
                  data-testid={`dash-course-card-${c.id}`}
                  className="bii-card overflow-hidden hover:shadow-lg transition group cursor-pointer"
                >
                  {/* Cover image strip */}
                  <div className="relative h-28 bg-[var(--bii-emerald)]/10 overflow-hidden">
                    {c.cover_image ? (
                      <img
                        src={imgUrl(c.cover_image)}
                        alt={c.title_bn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={48} className="text-[var(--bii-emerald)]/30" />
                      </div>
                    )}
                    {/* Price badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        c.is_free || c.price === 0
                          ? "bg-blue-500 text-white"
                          : "bg-[var(--bii-gold)] text-yellow-900"
                      }`}>
                        {c.is_free || c.price === 0 ? selectText("ফ্রি","Free") : `৳${c.price}`}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="font-heading text-base text-[var(--bii-text)] leading-snug line-clamp-2">
                      {c.title_bn || c.title_en || selectText("অজানা কোর্স","Unknown Course")}
                    </div>
                    {c.instructor && (
                      <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">{c.instructor}</div>
                    )}

                    {/* Stats row */}
                    <div className="mt-3 flex items-center gap-4 border-t border-[var(--bii-border)] pt-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Student size={16} className="text-[var(--bii-emerald)]" weight="duotone" />
                        <span className="font-heading text-[var(--bii-emerald)]">{studentCount}</span>
                        <span className="text-[var(--bii-text-soft)] text-xs">জন শিক্ষার্থী</span>
                      </div>
                      {revenue > 0 && (
                        <div className="flex items-center gap-1.5 text-sm ml-auto">
                          <CurrencyCircleDollar size={16} className="text-green-600" weight="duotone" />
                          <span className="font-heading text-green-700">৳{revenue.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--bii-text-soft)]">
                        {studentCount === 0 ? "এখনো কেউ ভর্তি হয়নি" : "বিস্তারিত দেখতে ক্লিক করুন"}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-[var(--bii-emerald)] opacity-0 group-hover:opacity-100 transition"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

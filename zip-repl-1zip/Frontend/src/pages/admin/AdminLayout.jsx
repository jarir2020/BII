import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, NavLink } from "react-router-dom";
import {
  House, Users, GraduationCap, ChalkboardTeacher, ShieldCheck, BookOpen, Folders,
  ListChecks, FileText, Question, Trophy, Certificate, VideoCamera, FilmStrip,
  Mosque, BookOpenText, Article, ChartBar, Storefront, ShoppingBag, Wallet,
  CreditCard, House as HomeIcon, ImageSquare, Sliders, Palette, Phone,
  WhatsappLogo, EnvelopeSimple, MapPin, ShareNetwork, Image as ImageIcon,
  Folder, Download, Gear, MagnifyingGlass, Database, Lock, Wrench,
  ArrowUpRight, ClockCounterClockwise, SignIn, Bell, Newspaper, FilePdf,
  Books, CaretDown, CaretRight, List as ListIcon, ChatCircleText,
  SealPercent, Gift,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminLayout() {
  const { user } = useAuth();
  const { pick } = useLang();

  const sections = [
    { title: pick("ড্যাশবোর্ড","Dashboard"), items: [
      { to: "/admin", end: true, icon: ChartBar, label: pick("ড্যাশবোর্ড","Dashboard") },
      { to: "/admin/analytics", icon: ChartBar, label: pick("এনালিটিক্স ও রিপোর্ট","Analytics & Reports") },
    ]},
    { title: pick("ব্যবহারকারী","Users"), items: [
      { to: "/admin/students", icon: Users, label: pick("স্টুডেন্ট","Students") },
      { to: "/admin/teachers", icon: ChalkboardTeacher, label: pick("শিক্ষক","Teachers") },
      { to: "/admin/admins", icon: ShieldCheck, label: pick("এডমিন","Admins") },
      { to: "/admin/enrollments", icon: GraduationCap, label: pick("এনরোলমেন্ট","Enrollments") },
      { to: "/admin/students-by-course", icon: Books, label: pick("কোর্স অনুযায়ী স্টুডেন্ট","Students by Course") },
    ]},
    { title: pick("কোর্স ব্যবস্থাপনা","Course Management"), items: [
      { to: "/admin/categories", icon: Folders, label: pick("ক্যাটাগরি","Categories") },
      { to: "/admin/courses", icon: BookOpen, label: pick("কোর্সসমূহ","Courses") },
      { to: "/admin/chapters", icon: Books, label: pick("চ্যাপ্টার","Chapters") },
      { to: "/admin/lessons", icon: ListChecks, label: pick("লেসন","Lessons") },
      { to: "/admin/videos", icon: VideoCamera, label: pick("ভিডিও","Videos") },
      { to: "/admin/pdfs", icon: FilePdf, label: pick("PDF ফাইল","PDF Files") },
      { to: "/admin/assignments", icon: FileText, label: pick("অ্যাসাইনমেন্ট","Assignments") },
      { to: "/admin/quizzes", icon: Question, label: pick("কুইজ","Quiz") },
      { to: "/admin/exams", icon: Trophy, label: pick("পরীক্ষা","Exams") },
      { to: "/admin/results", icon: ChartBar, label: pick("রিপোর্ট","Reports") },
      { to: "/admin/certificates", icon: Certificate, label: pick("সার্টিফিকেট","Certificates") },
    ]},
    { title: pick("ক্লাস ও কুইজ","Classes & Quiz"), items: [
      { to: "/admin/live-classes", icon: VideoCamera, label: pick("লাইভ","Live") },
      { to: "/admin/recorded-classes", icon: FilmStrip, label: pick("রেকর্ডেড ক্লাস","Recorded Classes") },
      { to: "/admin/quizzes", icon: Trophy, label: pick("কুইজ","Quiz") },
    ]},
    { title: pick("ইসলামিক কন্টেন্ট","Islamic Content"), items: [
      { to: "/admin/hadiths", icon: Mosque, label: pick("দোয়া","Dua") },
      { to: "/admin/islamic-content", icon: BookOpenText, label: pick("কুরআন ও ইসলামিক","Quran & Islamic") },
    ]},
    { title: pick("কন্টেন্ট","Content"), items: [
      { to: "/admin/posts", icon: Article, label: pick("পোস্ট","Posts") },
      { to: "/admin/blogs", icon: Newspaper, label: pick("ব্লগ","Blog") },
      { to: "/admin/notifications", icon: Bell, label: pick("নোটিফিকেশন","Notifications") },
      { to: "/admin/winner-reviews", icon: Trophy, label: pick("বিজয়ীদের রিভিউ","Winner Reviews") },
    ]},
    { title: pick("শপ ও পেমেন্ট","Shop & Payment"), items: [
      { to: "/admin/products", icon: Storefront, label: pick("প্রোডাক্ট","Products") },
      { to: "/admin/orders", icon: ShoppingBag, label: pick("অর্ডার","Orders") },
      { to: "/admin/payments", icon: Wallet, label: pick("পেমেন্ট","Payments") },
      { to: "/admin/payment-gateways", icon: CreditCard, label: pick("পেমেন্ট গেটওয়ে","Payment Gateways") },
      { to: "/admin/promo-codes", icon: SealPercent, label: pick("প্রমো কোড","Promo Codes") },
      { to: "/admin/revenue", icon: ChartBar, label: pick("রেভিনিউ এনালিটিক্স","Revenue Analytics") },
      { to: "/admin/ads", icon: ImageSquare, label: pick("বিজ্ঞাপন (AdSense/AdMob)","Ads (AdSense/AdMob)") },
    ]},
    { title: pick("রিওয়ার্ড ও ইনকাম","Rewards & Earnings"), items: [
      { to: "/admin/video-earnings", icon: Gift, label: pick("ভিডিও দেখে ইনকাম করুন","Watch Videos & Earnings") },
    ]},
    { title: pick("ডিজাইন ও সাইট","Design & Site"), items: [
      { to: "/admin/homepage", icon: HomeIcon, label: pick("হোমপেজ","Homepage") },
      { to: "/admin/welcome", icon: HomeIcon, label: pick("ওয়েলকাম পেজ","Welcome Page") },
      { to: "/admin/banners", icon: ImageSquare, label: pick("ব্যানার","Banners") },
      { to: "/admin/sliders", icon: Sliders, label: pick("স্লাইডার","Sliders") },
      { to: "/admin/theme", icon: Palette, label: pick("থিম ও রঙ","Theme & Colors") },
    ]},
    { title: pick("যোগাযোগ ও সোশ্যাল","Contact & Social"), items: [
      { to: "/admin/contact-info", icon: Phone, label: pick("যোগাযোগ তথ্য","Contact Info") },
      { to: "/admin/social", icon: ShareNetwork, label: pick("সোশ্যাল লিংক","Social Links") },
      { to: "/admin/complaints", icon: ChatCircleText, label: pick("অভিযোগ / প্রশ্ন","Complaints / Questions") },
    ]},
    { title: pick("মিডিয়া","Media"), items: [
      { to: "/admin/library", icon: Books, label: pick("লাইব্রেরি","Library") },
      { to: "/admin/gallery", icon: ImageIcon, label: pick("গ্যালারি","Gallery") },
      { to: "/admin/media", icon: Folder, label: pick("মেডিয়া","Media") },
      { to: "/admin/downloads", icon: Download, label: pick("ডাউনলোড","Downloads") },
    ]},
    { title: pick("সিস্টেম সেটিংস","System Settings"), items: [
      { to: "/admin/settings", icon: Gear, label: pick("সেটিংস","Settings") },
      { to: "/admin/seo", icon: MagnifyingGlass, label: "SEO" },
      { to: "/admin/firebase", icon: Database, label: "Firebase" },
      { to: "/admin/security", icon: Lock, label: pick("সিকিউরিটি","Security") },
      { to: "/admin/maintenance", icon: Wrench, label: pick("মেইন্টেন্যান্স","Maintenance") },
      { to: "/admin/legal", icon: FileText, label: pick("আইনি নথি","Legal Docs") },
      { to: "/admin/backup", icon: Database, label: pick("ব্যাকআপ","Backup") },
      { to: "/admin/activity-logs", icon: ClockCounterClockwise, label: pick("অ্যাক্টিভিটি লগ","Activity Logs") },
      { to: "/admin/login-logs", icon: SignIn, label: pick("লগ","Logs") },
    ]},
  ];
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState({});
  const [openMobile, setOpenMobile] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [courses, setCourses] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => {
    const fetchPending = () =>
      api.get("/payments/requests")
        .then((r) => setPendingPayments(r.data.filter((x) => x.status === "pending").length))
        .catch(() => {});
    fetchPending();
    pollRef.current = setInterval(fetchPending, 30_000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Load courses for dynamic sidebar items
  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data || [])).catch(() => {});
  }, []);

  return (
    <div data-testid="admin-layout" className="-mx-4 -my-5 min-h-[calc(100vh-7rem)]">
      <div className="flex">
        {/* MOBILE BACKDROP — tap outside the menu to close it */}
        {openMobile && (
          <div
            className="lg:hidden fixed inset-0 z-20 bg-black/40"
            onClick={() => setOpenMobile(false)}
            data-testid="admin-mobile-nav-backdrop"
          />
        )}

        {/* SIDEBAR */}
        <aside className={`fixed lg:static z-30 inset-y-0 left-0 w-72 bg-white border-r border-[var(--bii-border)] overflow-y-auto transition-transform ${openMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="p-4 border-b border-[var(--bii-border)] bg-[var(--bii-emerald)] text-white">
            <div className="text-[11px] tracking-widest uppercase text-[var(--bii-gold)]">{pick("অ্যাডমিন প্যানেল","Admin Panel")}</div>
            <div className="font-heading text-lg mt-0.5">{user?.name}</div>
            <div className="text-xs opacity-80 mt-0.5">{user?.role}</div>
          </div>
          <nav className="p-2 space-y-3">
            {sections.map((sec) => {
              const isCollapsed = collapsed[sec.title];
              return (
                <div key={sec.title}>
                  <button
                    onClick={() => setCollapsed({ ...collapsed, [sec.title]: !isCollapsed })}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)]"
                  >
                    {sec.title}
                    {isCollapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {sec.items.map((it) => {
                        const Icon = it.icon;
                        return (
                          <NavLink
                            key={it.to}
                            to={it.to}
                            end={it.end}
                            onClick={() => setOpenMobile(false)}
                            data-testid={`adm-nav-${it.to.split("/").pop() || "dash"}`}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
                                isActive
                                  ? "bg-[var(--bii-emerald)] text-white"
                                  : "text-[var(--bii-text)] hover:bg-[var(--bii-cream)]"
                              }`
                            }
                          >
                            <Icon size={18} weight="duotone" />
                            <span className="truncate flex-1">{it.label}</span>
                            {it.to === "/admin/payments" && pendingPayments > 0 && (
                              <span className="ml-auto min-w-[20px] text-center text-[11px] font-bold bg-yellow-400 text-yellow-900 rounded-full px-1.5 py-0.5 leading-none">
                                {pendingPayments}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Dynamic: one nav item per course ── */}
            {courses.length > 0 && (() => {
              const secKey = "কোর্সভিত্তিক শিক্ষার্থী";
              const isCollapsed = collapsed[secKey];
              return (
                <div>
                  <button
                    onClick={() => setCollapsed({ ...collapsed, [secKey]: !isCollapsed })}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)]"
                  >
                    {secKey}
                    {isCollapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {courses.map((c) => {
                        const to = `/admin/course-students/${c.id}`;
                        return (
                          <NavLink
                            key={c.id}
                            to={to}
                            onClick={() => setOpenMobile(false)}
                            data-testid={`adm-nav-course-${c.id}`}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
                                isActive
                                  ? "bg-[var(--bii-emerald)] text-white"
                                  : "text-[var(--bii-text)] hover:bg-[var(--bii-cream)]"
                              }`
                            }
                          >
                            <GraduationCap size={18} weight="duotone" />
                            <span className="truncate flex-1 leading-tight">
                              {c.title_bn || c.title_en || "কোর্স"}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </nav>
        </aside>

        {/* MOBILE TOGGLE — hidden while the menu is open so it never sits on top of nav links */}
        {!openMobile && (
          <button
            onClick={() => setOpenMobile(true)}
            className="lg:hidden fixed bottom-5 right-5 z-40 bg-[var(--bii-emerald)] text-white p-3 rounded-full shadow-2xl"
            data-testid="admin-mobile-nav-toggle"
            aria-label="toggle admin nav"
          >
            <ListIcon size={22} weight="bold" />
          </button>
        )}

        {/* MAIN */}
        <main className="flex-1 p-4 lg:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

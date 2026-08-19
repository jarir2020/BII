import React, { lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LangProvider, useLang } from "@/contexts/LangContext";
import { AdsProvider } from "@/contexts/AdsContext";
import Layout from "@/components/Layout";
import { ProtectedRoute, AdminRoute } from "@/components/Routes";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotificationPrompt from "@/components/NotificationPrompt";
import { onForegroundMessage } from "@/lib/firebase";
import { registerNativePushListeners } from "@/lib/capacitor-push-listener";
import { setToken as __setQuickAccessToken } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import Seo from "@/components/Seo";

// ── Loading spinner for lazy-loaded route chunks ──
function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bii-cream)]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-4 border-[var(--bii-emerald)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--bii-text-soft)]">লোড হচ্ছে...</p>
      </div>
    </div>
  );
}

// ── Lazy page components ──
const Home              = lazy(() => import("@/pages/Home"));
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
const Profile           = lazy(() => import("@/pages/Profile"));
const Settings          = lazy(() => import("@/pages/Settings"));
const ChangePassword    = lazy(() => import("@/pages/ChangePassword"));
const Courses           = lazy(() => import("@/pages/Courses"));
const CourseDetails     = lazy(() => import("@/pages/CourseDetails"));
const MyCourses         = lazy(() => import("@/pages/MyCourses"));
const MyCourseDetail    = lazy(() => import("@/pages/MyCourseDetail"));
const LiveClasses       = lazy(() => import("@/pages/LiveClasses"));
const Videos            = lazy(() => import("@/pages/Videos"));
const Quiz              = lazy(() => import("@/pages/Quiz"));
const Shop              = lazy(() => import("@/pages/Shop"));
const ShopOrder         = lazy(() => import("@/pages/ShopOrder"));
const Notifications     = lazy(() => import("@/pages/Notifications"));
const Contact           = lazy(() => import("@/pages/Contact"));
const Complaint         = lazy(() => import("@/pages/Complaint"));
const PostDetails       = lazy(() => import("@/pages/PostDetails"));
const Payment           = lazy(() => import("@/pages/Payment").then(m => ({ default: m.Payment })));
const PaymentSuccess    = lazy(() => import("@/pages/Payment").then(m => ({ default: m.PaymentSuccess })));
const RewardZone        = lazy(() => import("@/pages/RewardZone"));
const CompletionCertificate = lazy(() => import("@/pages/CompletionCertificate"));
const Library           = lazy(() => import("@/pages/Library"));
const LibraryBook       = lazy(() => import("@/pages/LibraryBook"));
const LibraryReader     = lazy(() => import("@/pages/LibraryReader"));
const Dua               = lazy(() => import("@/pages/Dua"));
const NotFound          = lazy(() => import("@/pages/NotFound"));
const Legal             = lazy(() => import("@/pages/Legal"));

// Admin — lazy-loaded so admin routes never slow down the public shell
const AdminLayout          = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminDashboard       = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminAnalytics       = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminStudents        = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminTeachers        = lazy(() => import("@/pages/admin/AdminTeachers"));
const AdminAdmins          = lazy(() => import("@/pages/admin/AdminAdmins"));
const AdminEnrollments     = lazy(() => import("@/pages/admin/AdminEnrollments"));
const AdminStudentsByCourse = lazy(() => import("@/pages/admin/AdminStudentsByCourse"));
const AdminCourseStudents  = lazy(() => import("@/pages/admin/AdminCourseStudents"));
const AdminCourses         = lazy(() => import("@/pages/admin/AdminCourses"));
const AdminVideos          = lazy(() => import("@/pages/admin/AdminVideos"));
const AdminPosts           = lazy(() => import("@/pages/admin/AdminPosts"));
const AdminLive            = lazy(() => import("@/pages/admin/AdminLive"));
const AdminNotifications   = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSettings        = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminLoginLogs       = lazy(() => import("@/pages/admin/AdminLoginLogs"));
const AdminActivityLogs    = lazy(() => import("@/pages/admin/AdminActivityLogs"));
const AdminMedia           = lazy(() => import("@/pages/admin/AdminMedia"));
const AdminBackup          = lazy(() => import("@/pages/admin/AdminBackup"));
const AdminPaymentRequests = lazy(() => import("@/pages/admin/AdminPaymentRequests"));
const AdminRevenue         = lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminPromoCodes      = lazy(() => import("@/pages/admin/AdminPromoCodes"));
const AdminRewardZone      = lazy(() => import("@/pages/admin/AdminRewardZone"));
const AdminMonthlyQuiz     = lazy(() => import("@/pages/admin/AdminMonthlyQuiz"));
const AdminLibrary         = lazy(() => import("@/pages/admin/AdminLibrary"));
const AdminComplaints      = lazy(() => import("@/pages/admin/AdminComplaints"));
const AdminDua             = lazy(() => import("@/pages/admin/AdminDua"));

// ── Reusable admin sub-pages grouped from lazy-loaded module files ──
const AdminCategories      = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminCategories })));
const AdminChapters        = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminChapters })));
const AdminLessons         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminLessons })));
const AdminPdfs            = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminPdfs })));
const AdminAssignments     = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminAssignments })));
const AdminExams           = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminExams })));
const AdminResults         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminResults })));
const AdminCertificates    = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminCertificates })));
const AdminRecorded        = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminRecorded })));
const AdminHadiths         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminHadiths })));
const AdminIslamicContent  = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminIslamicContent })));
const AdminBlogs           = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminBlogs })));
const AdminProducts        = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminProducts })));
const AdminOrders          = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminOrders })));
const AdminBanners         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminBanners })));
const AdminSliders         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminSliders })));
const AdminGallery         = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminGallery })));
const AdminDownloads       = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminDownloads })));
const AdminWinnerReviews   = lazy(() => import("@/pages/admin/CrudPages").then(m => ({ default: m.AdminWinnerReviews })));

const AdminHomepage        = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminHomepage })));
const AdminWelcomePage     = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminWelcomePage })));
const AdminTheme           = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminTheme })));
const AdminSeo             = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminSeo })));
const AdminFirebase        = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminFirebase })));
const AdminSecurity        = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminSecurity })));
const AdminMaintenance     = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminMaintenance })));
const AdminPaymentGateways = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminPaymentGateways })));
const AdminSocial          = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminSocial })));
const AdminContactInfo     = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminContactInfo })));
const AdminAds             = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminAds })));
const AdminLegal           = lazy(() => import("@/pages/admin/ConfigPages").then(m => ({ default: m.AdminLegal })));

/**
 * On native platforms (Capacitor), the WebView may restore the last visited
 * URL when the app is reopened. If the user was on /home and then logged out
 * or the session expired, the app would reload at /home instead of /.
 * This component forces a redirect to / on initial mount when the URL is not
 * the root path, ensuring unauthenticated users see the Welcome page.
 */
function NativeBackButtonBridge() {
  const navigate = useNavigate();
  const location = window.location;

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    const listener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!active) return;
      if (window.history.length > 1 && canGoBack) navigate(-1);
      else if (window.location.pathname !== "/") navigate("/");
      // At the root route, leave the event unhandled so Android exits normally.
    });
    return () => {
      active = false;
      listener.then((handle) => handle.remove());
    };
  }, [navigate, location.pathname]);

  return null;
}

function CapacitorAuthGate() {
  const { user, loading } = useAuth();
  const navigated = React.useRef(false);

  React.useEffect(() => {
    if (loading || navigated.current) return;
    if (!Capacitor.isNativePlatform()) return;
    if (user) return; // logged in — let the app route normally

    // Not logged in on a non-root path → force to / (Welcome page)
    if (window.location.pathname !== "/") {
      navigated.current = true;
      window.location.replace("/");
    }
  }, [loading, user]);

  return null;
}

/** Shows an FCM notification immediately when the app is in the foreground. */
function ForegroundPushBridge() {
  const { user } = useAuth();
  const userId = user?.id;

  React.useEffect(() => {
    if (!userId || !("Notification" in window) || Notification.permission !== "granted") {
      return undefined;
    }

    let active = true;
    let unsubscribe = () => {};

    onForegroundMessage((payload) => {
        if (!active || Notification.permission !== "granted") return;
        const title = payload?.notification?.title || payload?.data?.title_en || "BII";
        const body = payload?.notification?.body || payload?.data?.body_en || "";
        const image = payload?.notification?.image || payload?.data?.image || undefined;
        try {
          const notification = new Notification(title, {
            body,
            icon: "/logo192.png",
            image,
            tag: "bii-foreground-push",
          });
          notification.onclick = () => {
            const destination = payload?.data?.click_action || "/home";
            window.focus();
            window.location.assign(destination);
          };
        } catch {
          // Some mobile browsers only support background service-worker alerts.
        }
      })
      .then((cleanup) => {
        if (typeof cleanup === "function") unsubscribe = cleanup;
      })
      .catch(() => {});

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);

  return null;
}

/** Renders the notification permission prompt for logged-in users */
function NotifPromptBridge() {
  const { user } = useAuth();
  if (!user) return null;
  return <NotificationPrompt user={user} />;
}

// Permanent one-click admin entry: opening this link with a valid token
// logs the browser in directly and sends the admin to the panel, so a
// password does not need to be typed each time.
function QuickAdminAccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    const t = params.get("t");
    if (t) __setQuickAccessToken(t);
    navigate("/admin", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="p-8 text-center text-[var(--bii-text-soft)]">প্রবেশ করা হচ্ছে...</div>;
}

function RouteMetaBridge() {
  const location = useLocation();
  const { lang, pick } = useLang();

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.bengaliislamicinstitute.com";
  const canonical = `${origin}${location.pathname}`;

  const route = (() => {
    const path = location.pathname;
    const publicRoutes = {
      "/": {
        title: pick("বাঙালি ইসলামিক ইনস্টিটিউট — ইলম, ঈমান ও আদব", "Bengali Islamic Institute — Knowledge, Faith & Manners"),
        description: pick(
          "বাংলাভাষী মুসলিমদের জন্য অনলাইন ইসলামিক শিক্ষার প্ল্যাটফর্ম — কুরআন, হাদিস, ফিকহ, আকিদা, লাইভ ক্লাস, লাইব্রেরি ও আরও অনেক কিছু।",
          "An online Islamic learning platform for Bengali-speaking Muslims with Quran, Hadith, Fiqh, Aqidah, live classes, a library and more."
        ),
      },
      "/courses": {
        title: pick("কোর্সসমূহ | বাঙালি ইসলামিক ইনস্টিটিউট", "Courses | Bengali Islamic Institute"),
        description: pick(
          "কুরআন, তাজবীদ, আরবি, ফিকহ, মাসাঈল এবং অন্যান্য ইসলামিক কোর্স ব্রাউজ করুন।",
          "Browse Islamic courses in Quran, Tajweed, Arabic, Fiqh, practical rulings and more."
        ),
      },
      "/library": {
        title: pick("লাইব্রেরি | বাঙালি ইসলামিক ইনস্টিটিউট", "Library | Bengali Islamic Institute"),
        description: pick(
          "ইসলামিক বই, পিডিএফ ও রিডিং রিসোর্স অনলাইনে পড়ুন।",
          "Read Islamic books, PDFs and learning resources online."
        ),
      },
      "/videos": {
        title: pick("ক্লাসের ভিডিও | বাঙালি ইসলামিক ইনস্টিটিউট", "Class Videos | Bengali Islamic Institute"),
        description: pick(
          "রেকর্ডেড ক্লাস ও ইসলামিক শিক্ষামূলক ভিডিও দেখুন।",
          "Watch recorded classes and Islamic educational videos."
        ),
      },
      "/shop": {
        title: pick("অনলাইন শপ | বাঙালি ইসলামিক ইনস্টিটিউট", "Online Shop | Bengali Islamic Institute"),
        description: pick(
          "বই, প্রোডাক্ট ও ইসলামী উপহার সামগ্রী দেখুন ও অর্ডার করুন।",
          "Browse and order books, products and Islamic gift items."
        ),
      },
      "/contact": {
        title: pick("যোগাযোগ | বাঙালি ইসলামিক ইনস্টিটিউট", "Contact | Bengali Islamic Institute"),
        description: pick(
          "ফোন, ইমেইল, WhatsApp এবং সোশ্যাল চ্যানেলের মাধ্যমে আমাদের সাথে যোগাযোগ করুন।",
          "Contact us by phone, email, WhatsApp or social channels."
        ),
      },
    };

    if (publicRoutes[path]) return { ...publicRoutes[path], noindex: false };
    if (path.startsWith("/courses/")) {
      return {
        title: pick("কোর্সের বিস্তারিত | বাঙালি ইসলামিক ইনস্টিটিউট", "Course Details | Bengali Islamic Institute"),
        description: pick(
          "নির্বাচিত কোর্সের বিস্তারিত, সিলেবাস, ভর্তি এবং পাঠ্যক্রম দেখুন।",
          "See course details, syllabus, enrollment information and curriculum."
        ),
        noindex: false,
      };
    }
    if (path.startsWith("/library/")) {
      return {
        title: pick("বইয়ের বিস্তারিত | বাঙালি ইসলামিক ইনস্টিটিউট", "Book Details | Bengali Islamic Institute"),
        description: pick(
          "লাইব্রেরির নির্বাচিত বইয়ের বিস্তারিত ও পড়ার পাতা দেখুন।",
          "View details for a selected library book and reading page."
        ),
        noindex: false,
      };
    }
    if (path.startsWith("/legal/")) {
      return {
        title: pick("আইনি নথি | বাঙালি ইসলামিক ইনস্টিটিউট", "Legal | Bengali Islamic Institute"),
        description: pick(
          "শর্তাবলী, গোপনীয়তা নীতি এবং রিফান্ড নীতি পড়ুন।",
          "Read the terms, privacy policy and refund policy."
        ),
        noindex: false,
      };
    }

    const noindexPaths = [
      "/home",
      "/login",
      "/register",
      "/forgot-password",
      "/profile",
      "/settings",
      "/change-password",
      "/my-courses",
      "/quiz",
      "/live-classes",
      "/reward-zone",
      "/notifications",
      "/payment",
      "/complaint",
      "/quick-access",
      "/admin",
    ];

    const noindex = noindexPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

    return {
      title: pick("বাঙালি ইসলামিক ইনস্টিটিউট", "Bengali Islamic Institute"),
      description: pick(
        "বাংলাভাষী মুসলিমদের জন্য অনলাইন ইসলামিক শিক্ষার প্ল্যাটফর্ম।",
        "An online Islamic learning platform for Bengali-speaking Muslims."
      ),
      noindex,
    };
  })();

  return (
    <Seo
      lang={lang}
      title={route.title}
      description={route.description}
      canonical={canonical}
      noindex={route.noindex}
      image={`${origin}/logo512.png`}
      keywords={pick(
        "ইসলামিক শিক্ষা, অনলাইন কোর্স, কুরআন, হাদিস, ফিকহ, বাংলা ইসলাম, বাঙালি ইসলামিক ইনস্টিটিউট",
        "Islamic education, online courses, Quran, Hadith, Fiqh, Bengali Islam, Bengali Islamic Institute"
      )}
    />
  );
}

export default function App() {
  // Register native push listeners once on app mount
  React.useEffect(() => {
    registerNativePushListeners();
  }, []);

  return (
    <div className="App">
        <ErrorBoundary>
      <LangProvider>
        <AdsProvider>
        <AuthProvider>
          <BrowserRouter>
            <RouteMetaBridge />
            <CapacitorAuthGate />
            <NativeBackButtonBridge />
            <ForegroundPushBridge />
            <NotifPromptBridge />
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Welcome />} />
                  <Route path="home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="login" element={<Login />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                  <Route path="quick-access" element={<QuickAdminAccess />} />
                  <Route path="register" element={<Register />} />

                  <Route path="courses" element={<Courses />} />
                  <Route path="completed-all-work" element={<CompletionCertificate />} />
                  <Route path="courses/:id" element={<CourseDetails />} />
                  <Route path="posts/:id" element={<PostDetails />} />
                  <Route path="live-classes" element={<ProtectedRoute><LiveClasses /></ProtectedRoute>} />
                  <Route path="videos" element={<Videos />} />
                  <Route path="quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
                  <Route path="library" element={<Library />} />
                    <Route path="library/:id/read" element={<LibraryReader />} />
                  <Route path="library/:id" element={<LibraryBook />} />
                  <Route path="dua" element={<ProtectedRoute><Dua /></ProtectedRoute>} />
                  <Route path="reward-zone" element={<ProtectedRoute><RewardZone /></ProtectedRoute>} />
                  <Route path="shop" element={<Shop />} />
                  <Route path="shop/order" element={<ShopOrder />} />
                  <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="legal/:doc" element={<Legal />} />
                  <Route path="legal" element={<Legal />} />

                  <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                  <Route path="my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
                  <Route path="my-courses/:id" element={<ProtectedRoute><MyCourseDetail /></ProtectedRoute>} />
                  <Route path="complaint" element={<ProtectedRoute><Complaint /></ProtectedRoute>} />
                  <Route path="payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                  <Route path="payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

                  <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="analytics" element={<AdminAnalytics />} />

                    <Route path="students" element={<AdminStudents />} />
                    <Route path="teachers" element={<AdminTeachers />} />
                    <Route path="admins" element={<AdminAdmins />} />
                    <Route path="enrollments" element={<AdminEnrollments />} />
                    <Route path="students-by-course" element={<AdminStudentsByCourse />} />
                    <Route path="course-students/:courseId" element={<AdminCourseStudents />} />

                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="courses" element={<AdminCourses />} />
                    <Route path="chapters" element={<AdminChapters />} />
                    <Route path="lessons" element={<AdminLessons />} />
                    <Route path="videos" element={<AdminVideos />} />
                    <Route path="pdfs" element={<AdminPdfs />} />
                    <Route path="assignments" element={<AdminAssignments />} />
                    <Route path="quizzes" element={<AdminMonthlyQuiz />} />
                    <Route path="exams" element={<AdminExams />} />
                    <Route path="results" element={<AdminResults />} />
                    <Route path="certificates" element={<AdminCertificates />} />

                    <Route path="live-classes" element={<AdminLive />} />
                    <Route path="recorded-classes" element={<AdminRecorded />} />

                    <Route path="hadiths" element={<AdminDua />} />
                    <Route path="islamic-content" element={<AdminIslamicContent />} />

                    <Route path="posts" element={<AdminPosts />} />
                    <Route path="blogs" element={<AdminBlogs />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="winner-reviews" element={<AdminWinnerReviews />} />

                    <Route path="product" element={<Navigate to="/admin/products" replace />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="payments" element={<AdminPaymentRequests />} />
                    <Route path="payment-gateways" element={<AdminPaymentGateways />} />
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="promo-codes" element={<AdminPromoCodes />} />
                    <Route path="video-earnings" element={<AdminRewardZone />} />
                    {/* Keep old bookmarks working after the admin menu rename. */}
                    <Route path="reward-zone" element={<Navigate to="/admin/video-earnings" replace />} />
                    <Route path="ads" element={<AdminAds />} />

                    <Route path="homepage" element={<AdminHomepage />} />
                    <Route path="welcome" element={<AdminWelcomePage />} />
                    <Route path="banners" element={<AdminBanners />} />
                    <Route path="sliders" element={<AdminSliders />} />
                    <Route path="theme" element={<AdminTheme />} />

                    <Route path="contact-info" element={<AdminContactInfo />} />
                    <Route path="social" element={<AdminSocial />} />

                    <Route path="gallery" element={<AdminGallery />} />
                    <Route path="media" element={<AdminMedia />} />
                    <Route path="downloads" element={<AdminDownloads />} />

                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="seo" element={<AdminSeo />} />
                    <Route path="firebase" element={<AdminFirebase />} />
                    <Route path="security" element={<AdminSecurity />} />
                    <Route path="maintenance" element={<AdminMaintenance />} />
                    <Route path="legal" element={<AdminLegal />} />
                    <Route path="backup" element={<AdminBackup />} />
                    <Route path="library" element={<AdminLibrary />} />
                    <Route path="complaints" element={<AdminComplaints />} />
                    <Route path="activity-logs" element={<AdminActivityLogs />} />
                    <Route path="login-logs" element={<AdminLoginLogs />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-center" />
        </AuthProvider>
        </AdsProvider>
      </LangProvider>
      </ErrorBoundary>
    </div>
  );
}

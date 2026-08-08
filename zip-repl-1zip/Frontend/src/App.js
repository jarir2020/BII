import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import { AdsProvider } from "@/contexts/AdsContext";
import Layout from "@/components/Layout";
import { ProtectedRoute, AdminRoute } from "@/components/Routes";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotificationPrompt from "@/components/NotificationPrompt";
import { onForegroundMessage } from "@/lib/firebase";
import { registerNativePushListeners } from "@/lib/capacitor-push-listener";
import { setToken as __setQuickAccessToken } from "@/lib/api";
import { Capacitor } from "@capacitor/core";

/**
 * On native platforms (Capacitor), the WebView may restore the last visited
 * URL when the app is reopened. If the user was on /home and then logged out
 * or the session expired, the app would reload at /home instead of /.
 * This component forces a redirect to / on initial mount when the URL is not
 * the root path, ensuring unauthenticated users see the Welcome page.
 */
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
        try {
          const notification = new Notification(title, {
            body,
            icon: "/logo192.png",
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

import Home from "@/pages/Home";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import ChangePassword from "@/pages/ChangePassword";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import MyCourses from "@/pages/MyCourses";
import MyCourseDetail from "@/pages/MyCourseDetail";
import LiveClasses from "@/pages/LiveClasses";
import Videos from "@/pages/Videos";
import Quiz from "@/pages/Quiz";
import Shop from "@/pages/Shop";
import ShopOrder from "@/pages/ShopOrder";
import Notifications from "@/pages/Notifications";
import Contact from "@/pages/Contact";
import Complaint from "@/pages/Complaint";
import PostDetails from "@/pages/PostDetails";
import { Payment, PaymentSuccess } from "@/pages/Payment";
import RewardZone from "@/pages/RewardZone";
import CompletionCertificate from "@/pages/CompletionCertificate";

// Admin shell
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";

// User mgmt
import AdminStudents from "@/pages/admin/AdminUsers";
import AdminTeachers from "@/pages/admin/AdminTeachers";
import AdminAdmins from "@/pages/admin/AdminAdmins";
import AdminEnrollments from "@/pages/admin/AdminEnrollments";
import AdminStudentsByCourse from "@/pages/admin/AdminStudentsByCourse";
import AdminCourseStudents from "@/pages/admin/AdminCourseStudents";

// Course mgmt
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminVideos from "@/pages/admin/AdminVideos";
import AdminPosts from "@/pages/admin/AdminPosts";
import AdminLive from "@/pages/admin/AdminLive";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminLoginLogs from "@/pages/admin/AdminLoginLogs";
import AdminActivityLogs from "@/pages/admin/AdminActivityLogs";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminBackup from "@/pages/admin/AdminBackup";

import {
  AdminCategories, AdminChapters, AdminLessons, AdminPdfs, AdminAssignments,
  AdminExams, AdminResults, AdminCertificates, AdminRecorded, AdminHadiths,
  AdminIslamicContent, AdminBlogs, AdminProducts, AdminOrders,
  AdminBanners, AdminSliders, AdminGallery, AdminDownloads, AdminWinnerReviews,
} from "@/pages/admin/CrudPages";
import AdminPaymentRequests from "@/pages/admin/AdminPaymentRequests";

import {
  AdminHomepage, AdminWelcomePage, AdminTheme, AdminSeo, AdminFirebase,
  AdminSecurity, AdminMaintenance, AdminPaymentGateways, AdminSocial, AdminContactInfo,
  AdminAds, AdminLegal,
} from "@/pages/admin/ConfigPages";
import AdminRevenue from "@/pages/admin/AdminRevenue";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminRewardZone from "@/pages/admin/AdminRewardZone";

import AdminMonthlyQuiz from "@/pages/admin/AdminMonthlyQuiz";
import AdminLibrary from "@/pages/admin/AdminLibrary";
import AdminComplaints from "@/pages/admin/AdminComplaints";
import AdminDua from "@/pages/admin/AdminDua";
import Library from "@/pages/Library";
import LibraryBook from "@/pages/LibraryBook";
import LibraryReader from "@/pages/LibraryReader";
import Dua from "@/pages/Dua";
import NotFound from "@/pages/NotFound";
import Legal from "@/pages/Legal";

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
            <CapacitorAuthGate />
            <ForegroundPushBridge />
            <NotifPromptBridge />
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

                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="payments" element={<AdminPaymentRequests />} />
                  <Route path="payment-gateways" element={<AdminPaymentGateways />} />
                  <Route path="revenue" element={<AdminRevenue />} />
                  <Route path="promo-codes" element={<AdminPromoCodes />} />
                  <Route path="reward-zone" element={<AdminRewardZone />} />
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
          </BrowserRouter>
          <Toaster richColors position="top-center" />
        </AuthProvider>
        </AdsProvider>
      </LangProvider>
      </ErrorBoundary>
    </div>
  );
}

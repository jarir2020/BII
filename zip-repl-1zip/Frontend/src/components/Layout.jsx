import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import AdBanner from "./AdBanner";
import {
  List, Bell, Translate, SignOut, House, User, Gear, Lock,
  UserPlus, SignIn, HandsPraying, Books, Download,
  FacebookLogo, YoutubeLogo, InstagramLogo, TwitterLogo,
  LinkedinLogo, TelegramLogo, TiktokLogo, WhatsappLogo, ArrowLeft
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api } from "../lib/api";
import { toast } from "sonner";
import BrandLogo from "./BrandLogo";
import { Capacitor } from "@capacitor/core";
const isNative = Capacitor.isNativePlatform();

const SOCIAL_ICONS = {
  facebook:         { Icon: FacebookLogo,  color: "#1877F2" },
  youtube:          { Icon: YoutubeLogo,   color: "#FF0000" },
  tiktok:           { Icon: TiktokLogo,    color: "#010101" },
  instagram:        { Icon: InstagramLogo, color: "#E1306C" },
  twitter:          { Icon: TwitterLogo,   color: "#1DA1F2" },
  telegram:         { Icon: TelegramLogo,  color: "#229ED9" },
  linkedin:         { Icon: LinkedinLogo,  color: "#0A66C2" },
  whatsapp_channel: { Icon: WhatsappLogo,  color: "#25D366" },
};

export default function Layout() {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [social, setSocial]           = useState({});
  const [settings, setSettings]       = useState({});
  const { user, logout }              = useAuth();
  const { lang, setLang, t }          = useLang();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  const closeSidebar = () => setOpenSidebar(false);

  useEffect(() => {
    api.get("/configs/social_links").then((r) => setSocial(r.data || {})).catch(() => {});
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => {});
  }, []);

  // Merge settings facebook/youtube into social
  const mergedSocial = {
    facebook: settings.facebook || "",
    youtube:  settings.youtube  || "",
    ...social,
  };

  const activeSocials = Object.entries(SOCIAL_ICONS).filter(
    ([key]) => mergedSocial[key]?.trim()
  );

  const handleLogout = async () => {
    await logout();
    toast.success(lang === "bn" ? "লগআউট সফল" : "Logged out");
    closeSidebar();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[var(--bii-cream)] text-[var(--bii-text)]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[var(--bii-emerald)] text-white shadow-md">
        <div className="islamic-pattern absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            data-testid="open-sidebar-btn"
            onClick={() => setOpenSidebar(true)}
            className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition"
            aria-label="open menu"
          >
            <List size={26} weight="bold" />
          </button>

          <Link to={user ? "/home" : "/"} className="flex items-center gap-2 flex-1 min-w-0" data-testid="brand-home-link">
            <BrandLogo size={36} />
            <div className="min-w-0">
              <div className="font-heading text-base sm:text-lg leading-tight truncate">
                {lang === "bn" ? "বাঙালি ইসলামিক ইনস্টিটিউট" : "Bengali Islamic Institute"}
              </div>
              <div className="text-[10px] tracking-widest text-[var(--bii-gold)] uppercase">
                {t("tagline")}
              </div>
            </div>
          </Link>

          <button
            data-testid="lang-toggle-btn"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5 text-sm"
            title="Language"
          >
            <Translate size={18} weight="bold" />
            <span className="hidden sm:inline">{lang === "bn" ? "EN" : "বাং"}</span>
          </button>

          {!user && (
            <div className="sm:hidden flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
              >
                <SignIn size={16} weight="bold" />
                <span>{t("login")}</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bii-gold)] text-[var(--bii-emerald)] hover:opacity-95 transition text-sm font-semibold"
              >
                <UserPlus size={16} weight="bold" />
                <span>{t("register")}</span>
              </Link>
            </div>
          )}

          {!isNative && (
            <a
              href="/api/download/app"
              className="hidden sm:flex px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition items-center gap-1.5 text-sm"
              title={lang === "bn" ? "অ্যাপ ডাউনলোড" : "Download APP"}
            >
              <Download size={18} weight="bold" />
              <span className="hidden sm:inline">{lang === "bn" ? "অ্যাপ" : "APP"}</span>
            </a>
          )}

          {user && (
            <Link
              to="/notifications"
              data-testid="header-notif-link"
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Bell size={22} weight="duotone" />
            </Link>
          )}
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--bii-gold)] to-transparent" />
      </header>

      {/* Header ad banner */}
      <AdBanner slot="header-banner" format="horizontal" className="max-w-5xl mx-auto" />

      {/* SIDEBAR */}
      {openSidebar && (
        <>
          <div
            data-testid="sidebar-backdrop"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          />
          <aside
            data-testid="sidebar-drawer"
            className="fixed top-0 left-0 z-50 h-full w-[300px] bg-white shadow-2xl border-r border-[var(--bii-border)] flex flex-col transition-transform duration-300 ease-in-out"
          >
              <div className="bg-[var(--bii-emerald)] text-white p-5 relative">
                <div className="islamic-pattern absolute inset-0 opacity-25" />
                <div className="relative flex items-center gap-3">
                  <BrandLogo size={48} />
                  <div>
                    <div className="font-heading text-lg leading-tight">{t("appName")}</div>
                    <div className="text-[10px] tracking-widest text-[var(--bii-gold)] uppercase mt-0.5">
                      {t("tagline")}
                    </div>
                  </div>
                </div>
                {user && (
                  <div className="relative mt-4 text-sm">
                    <div className="opacity-80">{user.name}</div>
                  </div>
                )}
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                <SbLink to={user ? "/home" : "/"} icon={<House size={20} weight="duotone" />} label={t("home")} onClick={closeSidebar} testid="sb-home" current={location.pathname === "/" || location.pathname === "/home"} />
                {user && (
                  <>
                    <SbLink to="/library" icon={<Books size={20} weight="duotone" />} label={lang === "bn" ? "লাইব্রেরি" : "Library"} onClick={closeSidebar} testid="sb-library" />
                <SbLink to="/dua" icon={<HandsPraying size={20} weight="duotone" />} label={lang === "bn" ? "দৈনন্দিন দোয়া ও যিকির" : "Daily Duas & Dhikr"} onClick={closeSidebar} testid="sb-dua" />
                    <SbLink to="/profile" icon={<User size={20} weight="duotone" />} label={t("profile")} onClick={closeSidebar} testid="sb-profile" />
                    <SbLink to="/settings" icon={<Gear size={20} weight="duotone" />} label={t("settings")} onClick={closeSidebar} testid="sb-settings" />
                    <SbLink to="/change-password" icon={<Lock size={20} weight="duotone" />} label={t("changePassword")} onClick={closeSidebar} testid="sb-change-password" />
                    {(user.role === "admin" || user.role === "super_admin") && (
                      <SbLink to="/admin" icon={<Gear size={20} weight="duotone" />} label={t("admin")} onClick={closeSidebar} testid="sb-admin" />
                    )}
                  </>
                )}
                <div className="gold-divider my-3" />
                {!user && (
                  <>
                    <SbLink to="/register" icon={<UserPlus size={20} weight="duotone" />} label={t("register")} onClick={closeSidebar} testid="sb-register" />
                    <SbLink to="/login" icon={<SignIn size={20} weight="duotone" />} label={t("login")} onClick={closeSidebar} testid="sb-login" />
                    {!isNative && (
                      <a href="/api/download/app" onClick={closeSidebar} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--bii-text)] hover:bg-[var(--bii-cream)] transition">
                        <Download size={20} weight="duotone" />
                        <span>{lang === "bn" ? "অ্যাপ ডাউনলোড" : "Download APP"}</span>
                      </a>
                    )}
                  </>
                )}
                {user && (
                  <>
                    <button
                      onClick={handleLogout}
                      data-testid="sb-logout-btn"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--bii-text)] hover:bg-[var(--bii-cream)] transition"
                    >
                      <SignOut size={20} weight="duotone" />
                      <span>{t("logout")}</span>
                    </button>
                    {!isNative && (
                      <a href="/api/download/app" onClick={closeSidebar} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--bii-text)] hover:bg-[var(--bii-cream)] transition">
                        <Download size={20} weight="duotone" />
                        <span>{lang === "bn" ? "অ্যাপ ডাউনলোড" : "Download APP"}</span>
                      </a>
                    )}
                  </>
                )}
              </nav>

              {/* Social links in sidebar */}
              {activeSocials.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="gold-divider mb-3" />
                  <div className="flex flex-wrap gap-2 justify-center">
                    {activeSocials.map(([key, { Icon, color }]) => (
                      <a
                        key={key}
                        href={mergedSocial[key]}
                        target="_blank"
                        rel="noreferrer"
                        onClick={closeSidebar}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition"
                        style={{ backgroundColor: color }}
                        aria-label={key}
                      >
                        <Icon size={18} weight="fill" className="text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 text-[11px] text-[var(--bii-text-soft)] text-center">
                © {new Date().getFullYear()} {t("appName")}
              </div>
          </aside>
        </>
      )}

      {/* MAIN */}
      <main className="max-w-5xl mx-auto px-4 py-3">
        {location.pathname !== "/" && location.pathname !== "/home" && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/10 transition"
            aria-label={lang === "bn" ? "আগের পৃষ্ঠায় ফিরে যান" : "Go back"}
          >
            <ArrowLeft size={18} weight="bold" />
            {lang === "bn" ? "ফিরে যান" : "Back"}
          </button>
        )}
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="max-w-5xl mx-auto px-4 py-4 text-center">
        <div className="gold-divider mb-3" />

        {/* Social icons in footer */}
        {activeSocials.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            {activeSocials.map(([key, { Icon, color }]) => (
              <a
                key={key}
                href={mergedSocial[key]}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: color }}
                aria-label={key}
              >
                <Icon size={20} weight="fill" className="text-white" />
              </a>
            ))}
          </div>
        )}

        {/* Legal links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-3">
          {[
            { to: "/legal/terms",   bn: "শর্তাবলী",        en: "Terms" },
            { to: "/legal/privacy", bn: "গোপনীয়তা নীতি",  en: "Privacy Policy" },
            { to: "/legal/refund",  bn: "রিফান্ড নীতি",    en: "Refund Policy" },
          ].map(({ to, bn, en }) => (
            <Link
              key={to}
              to={to}
              className="text-xs text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] underline underline-offset-2 transition-colors"
            >
              {lang === "bn" ? bn : en}
            </Link>
          ))}
          {!isNative && (
            <a
              href="/api/download/app"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--bii-gold)] bg-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/90 px-3 py-1 rounded-full transition-colors"
            >
              <Download size={14} weight="bold" />
              {lang === "bn" ? "অ্যাপ ডাউনলোড" : "Download APP"}
            </a>
          )}
        </div>

        {/* 2026-08-07: Copyright left, developer credit right */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[var(--bii-text-soft)]">
          <span>© {new Date().getFullYear()} {t("appName")}</span>
          <span>
            {lang === "bn" ? "তৈরি করেছে" : "Developed by"}{" "}
            <a
              href="https://nextstagesoftware.com/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-[var(--bii-emerald)] transition-colors"
            >
              NextStageSoftware
            </a>
          </span>
        </div>

        {/* Footer ad banner */}
        <AdBanner slot="footer-banner" format="horizontal" className="mt-4" />
      </footer>
    </div>
  );
}

function SbLink({ to, icon, label, onClick, testid, current }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      data-testid={testid}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
        current ? "bg-[var(--bii-cream)] text-[var(--bii-emerald)]" : "hover:bg-[var(--bii-cream)]"
      }`}
    >
      <span className="text-[var(--bii-emerald)]">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

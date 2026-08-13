import React, { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BookOpen, GraduationCap, VideoCamera, HandHeart, Mosque, Star,
  SignIn, UserPlus, ArrowRight
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api } from "../lib/api";
import BrandLogo from "../components/BrandLogo";

const HERO_IMG = "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=600&q=80&fm=webp";

export default function Welcome() {
  const { user, loading } = useAuth();
  const { lang, pick, t } = useLang();
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.get("/settings").then((r) => setSettings(r.data)).catch(() => {}); }, []);

  // IntersectionObserver for feature-card scroll animations (replaces framer-motion whileInView)
  const cardRefs = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("bii-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    cardRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  // logged-in users should never see welcome
  if (loading) return <div className="p-8 text-center text-[var(--bii-text-soft)]">{t("loading")}</div>;
  if (user) return <Navigate to="/home" replace />;

  const features = [
    {
      icon: <BookOpen size={30} weight="duotone" />,
      title: pick("কুরআন ও তাজবীদ", "Quran & Tajweed"),
      desc: pick("সঠিক উচ্চারণ ও মাখরাজে কুরআন তেলাওয়াত শিখুন।", "Learn proper Quranic recitation with Tajweed."),
    },
    {
      icon: <GraduationCap size={30} weight="duotone" />,
      title: pick("আরবি ভাষা", "Arabic Language"),
      desc: pick("হরফ থেকে কথোপকথন — পূর্ণ আরবি ভাষা কোর্স।", "From alphabet to fluent conversation."),
    },
    {
      icon: <Mosque size={30} weight="duotone" />,
      title: pick("ফিকহ ও মাসাঈল", "Fiqh & Rulings"),
      desc: pick("নামায, রোযা, পবিত্রতা — দৈনন্দিন জরুরী মাসাঈল।", "Daily essential Islamic rulings."),
    },
    {
      icon: <VideoCamera size={30} weight="duotone" />,
      title: pick("লাইভ ক্লাস", "Live Classes"),
      desc: pick("Zoom-এ সরাসরি ক্লাসে অংশগ্রহণ করুন।", "Join live Zoom classes with our teachers."),
    },
    {
      icon: <Star size={30} weight="duotone" />,
      title: pick("মাসিক কুইজ", "Monthly Quiz"),
      desc: pick("প্রতি মাসে কুইজে অংশ নিয়ে নিজের জ্ঞান যাচাই করুন।", "Test your knowledge with monthly quizzes."),
    },
    {
      icon: <HandHeart size={30} weight="duotone" />,
      title: pick("আদব ও আখলাক", "Manners & Akhlaq"),
      desc: pick("ইসলামী চরিত্র ও আদবের শিক্ষা।", "Islamic character and ethical training."),
    },
  ];

  return (
    <div className="-mt-5" data-testid="welcome-page">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl aspect-[16/9] sm:aspect-[21/9] md:aspect-[16/9]">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--bii-emerald)]/92" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bii-emerald)]/40 via-transparent to-[var(--bii-emerald)]/70" />
          <div className="islamic-pattern absolute inset-0 opacity-30" />
        </div>
        <div className="relative px-6 sm:px-12 py-16 sm:py-24 text-white text-center">
          <div className="hero-fade-in">
            <div className="inline-block mb-5">
              <BrandLogo size={80} />
            </div>
            <div className="text-[11px] tracking-[0.3em] text-[var(--bii-gold)] uppercase mb-3">
              {pick("আসসালামু আলাইকুম — স্বাগতম", "As-Salamu Alaykum — Welcome")}
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl leading-tight">
              {pick(settings?.name_bn || "বাঙালি ইসলামিক ইনস্টিটিউট", settings?.name_en || "Bengali Islamic Institute")}
            </h1>
            <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto opacity-90">
              {pick(
                "বাংলা ভাষায় বিশুদ্ধ ইসলামী ইলম, আখলাক ও আদবের শিক্ষাকেন্দ্র। অনলাইনে বাড়িতে বসেই শিখুন।",
                "An online center for authentic Islamic knowledge, ethics and manners — in Bengali, from your home."
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/login" data-testid="welcome-login-btn" className="bii-btn-gold inline-flex items-center gap-2">
                <SignIn size={18} weight="bold" /> {t("login")}
              </Link>
              <Link to="/register" data-testid="welcome-register-btn" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur px-5 py-3 rounded-xl border border-white/30 transition">
                <UserPlus size={18} weight="bold" /> {t("register")}
              </Link>
            </div>
            <div className="mt-3">
              <Link to="/forgot-password" className="text-sm font-semibold text-yellow-400 hover:text-yellow-200 underline underline-offset-4 drop-shadow transition">
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="text-xs mt-3 opacity-75">
              {pick("ভর্তি হয়ে কোর্স, লাইভ ক্লাস, ভিডিও ও কুইজে অংশ নিন", "Register to access courses, live classes, videos and quizzes")}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="mt-12">
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-[0.3em] text-[var(--bii-gold)] uppercase">
            {pick("আমাদের সম্পর্কে", "About us")}
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)] mt-2">
            {pick("আমরা কী নিয়ে কাজ করি", "What we teach")}
          </h2>
          <div className="gold-divider w-32 mx-auto mt-4" />
          <p className="mt-5 max-w-2xl mx-auto text-[var(--bii-text-soft)] leading-relaxed">
            {pick(
              "বাঙালি ইসলামিক ইনস্টিটিউট একটি অনলাইন ইসলামী শিক্ষাপ্রতিষ্ঠান। আমরা বাংলা ভাষায় কুরআন, হাদীস, ফিকহ, আরবি ভাষা ও ইসলামী আদব শেখাই — দক্ষ আলেমদের তত্ত্বাবধানে, বাড়িতে বসেই।",
              "Bengali Islamic Institute is an online Islamic learning center. We teach Quran, Hadith, Fiqh, Arabic language and Islamic manners — all in Bengali, under qualified scholars, from the comfort of your home."
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="bii-card p-6 opacity-0 translate-y-3 transition-all duration-400 ease-out"
            >
              <div className="text-[var(--bii-emerald)] mb-3">{f.icon}</div>
              <h3 className="font-heading text-lg text-[var(--bii-emerald)]">{f.title}</h3>
              <p className="text-sm text-[var(--bii-text-soft)] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-14 bii-card p-8 sm:p-10 relative overflow-hidden">
        <div className="islamic-pattern absolute inset-0 opacity-10" />
        <div className="relative">
          <h2 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)] text-center">
            {pick("কীভাবে শুরু করবেন", "How to begin")}
          </h2>
          <div className="gold-divider w-24 mx-auto mt-3 mb-8" />
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: "১", e: "1", b: "রেজিস্ট্রেশন করুন", en: "Register", d: "নাম, ইমেইল, ফোন দিয়ে অ্যাকাউন্ট তৈরি করুন। অটো Student ID পাবেন।", de: "Create your account with name, email, phone. Get auto Student ID." },
              { n: "২", e: "2", b: "কোর্সে ভর্তি হোন", en: "Enroll in courses", d: "ফ্রি বা পেইড কোর্স বেছে নিন। পেমেন্ট সম্পন্ন হলেই কোর্স আনলক।", de: "Pick free or paid courses. Course unlocks after payment." },
              { n: "৩", e: "3", b: "শিখতে শুরু করুন", en: "Start learning", d: "লাইভ ক্লাস, ভিডিও, কুইজ — সব এক জায়গায়।", de: "Live classes, videos, quizzes — all in one place." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--bii-emerald)] text-[var(--bii-gold)] font-heading text-2xl flex items-center justify-center mx-auto shadow-lg">
                  {lang === "bn" ? s.n : s.e}
                </div>
                <div className="font-heading text-lg mt-3 text-[var(--bii-emerald)]">{pick(s.b, s.en)}</div>
                <p className="text-sm text-[var(--bii-text-soft)] mt-1.5">{pick(s.d, s.de)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="mt-12 bg-[var(--bii-emerald)] text-white rounded-3xl px-6 sm:px-12 py-10 sm:py-14 text-center relative overflow-hidden">
        <div className="islamic-pattern absolute inset-0 opacity-20" />
        <div className="relative">
          <h2 className="font-heading text-2xl sm:text-3xl">
            {pick("আজই যাত্রা শুরু করুন", "Begin your journey today")}
          </h2>
          <p className="mt-2 opacity-85 text-sm sm:text-base max-w-xl mx-auto">
            {pick("সম্পূর্ণ ফ্রি অ্যাকাউন্ট। মাত্র এক মিনিটে রেজিস্ট্রেশন।", "Free account. Register in under a minute.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/register" data-testid="welcome-cta-register" className="bii-btn-gold inline-flex items-center gap-2">
              {t("register")} <ArrowRight size={18} weight="bold" />
            </Link>
            <Link to="/login" data-testid="welcome-cta-login" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur px-5 py-3 rounded-xl border border-white/30 transition">
              {t("login")}
            </Link>
          </div>
          <div className="mt-3">
            <Link to="/forgot-password" className="text-sm font-semibold text-yellow-400 hover:text-yellow-200 underline underline-offset-4 drop-shadow transition">
              {t("forgotPassword")}
            </Link>
          </div>
        </div>
      </section>

      {/* contact preview */}
      {settings && (settings.contact_mobile || settings.whatsapp || settings.contact_phone || settings.contact_email || settings.address) && (
        <section className="mt-10">
          <h3 className="font-heading text-xl text-[var(--bii-emerald)] text-center mb-4">
            {pick("যোগাযোগ", "Get in touch")}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {settings.contact_mobile && (
              <a href={`tel:${settings.contact_mobile}`} className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{pick("মোবাইল", "Mobile")}</div>
                <div className="mt-1 font-medium">{settings.contact_mobile}</div>
              </a>
            )}
            {settings.whatsapp && (
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-green-700">WhatsApp</div>
                <div className="mt-1 font-medium">{settings.whatsapp}</div>
              </a>
            )}
            {settings.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t("email")}</div>
                <div className="mt-1 font-medium break-all">{settings.contact_email}</div>
              </a>
            )}
            {settings.address && (
              <div className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t("address")}</div>
                <div className="mt-1 font-medium">{settings.address}</div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

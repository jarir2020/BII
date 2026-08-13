import React, { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BookOpen, GraduationCap, VideoCamera, HandHeart, Mosque, Star,
  ArrowRight
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import Seo from "../components/Seo";

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
  if (loading) {
    return (
      <div className="-mt-5" aria-busy="true" aria-live="polite">
        <div className="relative overflow-hidden rounded-3xl aspect-[16/9] bg-[var(--bii-emerald)]/10 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bii-emerald)]/20 via-transparent to-[var(--bii-gold)]/10" />
        </div>
        <div className="mt-12 space-y-6">
          <div className="text-center space-y-3">
            <div className="h-3 w-40 mx-auto bg-[var(--bii-border)] rounded-full animate-pulse" />
            <div className="h-10 sm:h-14 w-4/5 sm:w-2/3 mx-auto bg-[var(--bii-border)] rounded-2xl animate-pulse" />
            <div className="h-5 w-full max-w-2xl mx-auto bg-[var(--bii-border)] rounded-full animate-pulse" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bii-card p-6 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-[var(--bii-border)] mb-4" />
                <div className="h-5 w-3/5 bg-[var(--bii-border)] rounded-full" />
                <div className="h-4 w-full bg-[var(--bii-border)] rounded-full mt-3" />
                <div className="h-4 w-5/6 bg-[var(--bii-border)] rounded-full mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (user) return <Navigate to="/home" replace />;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Bengali Islamic Institute",
    alternateName: "বাঙালি ইসলামিক ইনস্টিটিউট",
    url: typeof window !== "undefined" ? window.location.origin : "https://www.bengaliislamicinstitute.com",
    logo: typeof window !== "undefined" ? `${window.location.origin}/logo512.png` : "https://www.bengaliislamicinstitute.com/logo512.png",
    description: pick(
      "বাংলাভাষী মুসলিমদের জন্য অনলাইন ইসলামিক শিক্ষার প্ল্যাটফর্ম।",
      "An online Islamic learning platform for Bengali-speaking Muslims."
    ),
  };

  const contactWhatsapp = settings?.whatsapp || "+8801792784920";
  const contactEmail = settings?.contact_email || "bengaliislamicinstitute@gmail.com";

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
      <Seo
        title={pick("বাঙালি ইসলামিক ইনস্টিটিউট — স্বাগতম", "Bengali Islamic Institute — Welcome")}
        description={pick(
          "বাংলাভাষী মুসলিমদের জন্য অনলাইন ইসলামিক শিক্ষার প্ল্যাটফর্ম — কুরআন, হাদিস, ফিকহ, লাইভ ক্লাস, লাইব্রেরি এবং আরও অনেক কিছু।",
          "An online Islamic learning platform for Bengali-speaking Muslims with Quran, Hadith, Fiqh, live classes, a library and more."
        )}
        canonical={typeof window !== "undefined" ? `${window.location.origin}/` : "https://www.bengaliislamicinstitute.com/"}
        image={typeof window !== "undefined" ? `${window.location.origin}/logo512.png` : "https://www.bengaliislamicinstitute.com/logo512.png"}
        structuredData={organizationSchema}
      />
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl min-h-[22rem] sm:min-h-[28rem] bg-[var(--bii-emerald)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,rgba(10,66,43,0.96),rgba(13,87,57,0.94))]" />
        <div className="islamic-pattern absolute inset-0 opacity-25" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[var(--bii-gold)]/15 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="hidden sm:block absolute right-6 sm:right-12 bottom-6 sm:bottom-10 opacity-40 scale-90 sm:scale-100">
            <BrandLogo size={176} />
          </div>
        </div>
        <div className="relative px-6 sm:px-12 py-12 sm:py-24 text-white text-center">
          <div className="hero-fade-in">
            <div className="inline-block mb-5">
              <BrandLogo size={56} />
            </div>
            <div className="text-[11px] tracking-[0.3em] text-[var(--bii-gold)] uppercase mb-3">
              {pick("আসসালামু আলাইকুম — স্বাগতম", "As-Salamu Alaykum — Welcome")}
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl leading-tight">
              {pick(settings?.name_bn || "বাঙালি ইসলামিক ইনস্টিটিউট", settings?.name_en || "Bengali Islamic Institute")}
            </h1>
            <p className="mt-4 sm:mt-4 max-w-2xl mx-auto rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm sm:text-lg text-center leading-relaxed whitespace-pre-line shadow-lg backdrop-blur-sm sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
              {pick(
                "🌿 রাসূলুল্লাহ ﷺ বলেছেন:\n“তোমাদের মধ্যে সর্বোত্তম সে-ই, যে কুরআন শেখে এবং অন্যকে শিক্ষা দেয়।”\n— সহিহ বুখারি",
                "Prophet Muhammad ﷺ said:\n“The best among you are those who learn the Quran and teach it.”\n— Sahih al-Bukhari"
              )}
            </p>
            <div className="hidden sm:block text-xs mt-3 opacity-75">
              {pick("ভর্তি হয়ে কোর্স, লাইভ ক্লাস, ভিডিও ও কুইজে অংশ নিন", "Register to access courses, live classes, videos and quizzes")}
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE QUICK LINKS */}
      <section className="mt-6 sm:hidden space-y-3">
        <details className="bii-card p-4">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="font-heading text-lg text-[var(--bii-emerald)]">
              {pick("আমাদের সম্পর্কে", "About us")}
            </span>
            <ArrowRight size={18} weight="bold" className="rotate-90 text-[var(--bii-gold)]" />
          </summary>
          <p className="mt-3 text-sm text-[var(--bii-text-soft)] leading-relaxed">
            {pick(
              "বাঙালি ইসলামিক ইনস্টিটিউট একটি অনলাইন ইসলামী শিক্ষাপ্রতিষ্ঠান। আমরা বাংলা ভাষায় কুরআন, হাদীস, ফিকহ, আরবি ভাষা ও ইসলামী আদব শেখাই — দক্ষ আলেমদের তত্ত্বাবধানে, বাড়িতে বসেই।",
              "Bengali Islamic Institute is an online Islamic learning center. We teach Quran, Hadith, Fiqh, Arabic language and Islamic manners — all in Bengali, under qualified scholars, from the comfort of your home."
            )}
          </p>
        </details>

        <details className="bii-card p-4">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="font-heading text-lg text-[var(--bii-emerald)]">
              {pick("কীভাবে শুরু করবেন", "How to begin")}
            </span>
            <ArrowRight size={18} weight="bold" className="rotate-90 text-[var(--bii-gold)]" />
          </summary>
          <div className="mt-4 space-y-4">
            {[
              { n: "১", e: "1", b: "রেজিস্ট্রেশন করুন", en: "Register", d: "নাম, ইমেইল, ফোন দিয়ে অ্যাকাউন্ট তৈরি করুন।", de: "Create your account with name, email and phone." },
              { n: "২", e: "2", b: "কোর্সে ভর্তি হোন", en: "Enroll in courses", d: "ফ্রি বা পেইড কোর্স বেছে নিন।", de: "Pick free or paid courses." },
              { n: "৩", e: "3", b: "শিখতে শুরু করুন", en: "Start learning", d: "লাইভ ক্লাস, ভিডিও, কুইজ — সব এক জায়গায়।", de: "Live classes, videos, quizzes — all in one place." },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--bii-emerald)] text-[var(--bii-gold)] font-heading text-xl flex items-center justify-center shrink-0">
                  {lang === "bn" ? s.n : s.e}
                </div>
                <div>
                  <div className="font-heading text-base text-[var(--bii-emerald)]">{pick(s.b, s.en)}</div>
                  <p className="text-sm text-[var(--bii-text-soft)] mt-1 leading-relaxed">{pick(s.d, s.de)}</p>
                </div>
              </div>
            ))}
          </div>
        </details>

        <details className="bii-card p-4">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="font-heading text-lg text-[var(--bii-emerald)]">
              {pick("যোগাযোগ", "Get in touch")}
            </span>
            <ArrowRight size={18} weight="bold" className="rotate-90 text-[var(--bii-gold)]" />
          </summary>
          <div className="mt-4 grid gap-3 text-sm">
            {settings?.contact_mobile && (
              <a href={`tel:${settings.contact_mobile}`} className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{pick("মোবাইল", "Mobile")}</div>
                <div className="mt-1 font-medium">{settings.contact_mobile}</div>
              </a>
            )}
            {settings?.whatsapp && (
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-green-700">WhatsApp</div>
                <div className="mt-1 font-medium">{settings.whatsapp}</div>
              </a>
            )}
            {settings?.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="bii-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t("email")}</div>
                <div className="mt-1 font-medium break-all">{settings.contact_email}</div>
              </a>
            )}
            {!settings?.contact_mobile && !settings?.whatsapp && !settings?.contact_email && (
              <div className="bii-card p-4 text-center">
                <div className="font-heading text-base text-[var(--bii-emerald)]">
                  {pick("বাঙালি ইসলামিক ইনস্টিটিউট", "Bengali Islamic Institute")}
                </div>
                <p className="mt-2 text-[var(--bii-text-soft)] leading-relaxed">
                  {pick(
                    "যোগাযোগের তথ্য এখনও যোগ করা হয়নি। উপরের লগইন বা রেজিস্ট্রেশন বোতাম ব্যবহার করুন, অথবা পরে আবার দেখুন।",
                    "Contact details are not available yet. Please use the top-bar login or register buttons, or check back later."
                  )}
                </p>
              </div>
            )}
          </div>
        </details>
      </section>

      <div className="hidden sm:block">
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
              className="bii-card p-6 transition-all duration-400 ease-out"
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
        </div>
      </section>

      {/* contact preview — fixed-height placeholder reserves space before settings load */}
      <section className="mt-10">
        <h3 className="font-heading text-xl text-[var(--bii-emerald)] text-center mb-4">
          {pick("যোগাযোগ", "Get in touch")}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {settings?.contact_mobile && (
            <a href={`tel:${settings.contact_mobile}`} className="bii-card p-4 text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{pick("মোবাইল", "Mobile")}</div>
              <div className="mt-1 font-medium">{settings.contact_mobile}</div>
            </a>
          )}
          <a href={`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="bii-card p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-green-700">WhatsApp</div>
            <div className="mt-1 font-medium">{contactWhatsapp}</div>
          </a>
          <a href={`mailto:${contactEmail}`} className="bii-card p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t("email")}</div>
            <div className="mt-1 font-medium break-all">{contactEmail}</div>
          </a>
          {settings?.address && (
            <div className="bii-card p-4 text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)]">{t("address")}</div>
              <div className="mt-1 font-medium">{settings.address}</div>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

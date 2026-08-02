import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { House, ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { t, pick } = useLang();

  return (
    <div
      className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12"
      data-testid="not-found-page"
    >
      {/* Islamic geometric decoration */}
      <div className="text-[var(--bii-emerald)] opacity-10 text-[8rem] font-heading leading-none select-none mb-0">
        ٤٠٤
      </div>

      <div className="bii-card max-w-md w-full p-8 -mt-10 relative z-10">
        <div className="w-16 h-16 rounded-full bg-[var(--bii-emerald)]/10 flex items-center justify-center mx-auto mb-4">
          <MagnifyingGlass size={32} weight="duotone" className="text-[var(--bii-emerald)]" />
        </div>

        <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-2">
          {t("pageNotFound")}
        </h1>
        <p className="text-[var(--bii-gold)] text-sm font-arabic mb-3">
          الصفحة غير موجودة
        </p>
        <p className="text-[var(--bii-text-soft)] text-sm mb-6 leading-relaxed">
          {pick(
            "আপনি যে পেজটি খুঁজছেন সেটি সরানো হয়েছে, নামকরণ করা হয়েছে বা কখনো ছিল না।",
            "The page you are looking for has been moved, renamed, or never existed."
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream)] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} weight="bold" />
            {t("goBack")}
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white hover:bg-[var(--bii-emerald)]/90 transition-colors text-sm font-semibold"
          >
            <House size={16} weight="fill" />
            {t("goHome")}
          </Link>
        </div>
      </div>

      <p className="text-xs text-[var(--bii-text-soft)] mt-6 opacity-60">
        Error 404 — Bengali Islamic Institute
      </p>
    </div>
  );
}

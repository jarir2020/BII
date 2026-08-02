import React from "react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { t, lang, setLang, pick } = useLang();
  const { user } = useAuth();
  return (
    <div className="max-w-md mx-auto py-4" data-testid="settings-page">
      <div className="bii-card p-6">
        <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-5">{t("settings")}</h1>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-medium mb-2">{t("languageLabel")}</div>
            <div className="flex gap-2">
              <button data-testid="settings-lang-bn" onClick={() => setLang("bn")} className={`px-4 py-2 rounded-xl border transition ${lang === "bn" ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]" : "border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"}`}>
                {t("bengali")}
              </button>
              <button data-testid="settings-lang-en" onClick={() => setLang("en")} className={`px-4 py-2 rounded-xl border transition ${lang === "en" ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]" : "border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"}`}>
                {t("english")}
              </button>
            </div>
          </div>
          {user && (
            <div>
              <div className="text-sm font-medium mb-1">{pick("লগইন তথ্য", "Account")}</div>
              <div className="text-sm text-[var(--bii-text-soft)]">
                {user.email} • {user.role}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

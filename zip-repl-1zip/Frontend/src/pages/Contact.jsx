import React, { useEffect, useState } from "react";
import {
  PhoneCall, WhatsappLogo, EnvelopeSimple, PaperPlaneTilt,
  FacebookLogo, YoutubeLogo, InstagramLogo, TwitterLogo,
  LinkedinLogo, TelegramLogo, TiktokLogo, MapPin, Clock
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api, formatApiError } from "../lib/api";

const SOCIAL_CONFIG = [
  { key: "facebook",         label: "Facebook",          Icon: FacebookLogo,   color: "bg-blue-600",    href: (v) => v },
  { key: "youtube",          label: "YouTube",           Icon: YoutubeLogo,    color: "bg-red-600",     href: (v) => v },
  { key: "tiktok",           label: "TikTok",            Icon: TiktokLogo,     color: "bg-black",       href: (v) => v },
  { key: "instagram",        label: "Instagram",         Icon: InstagramLogo,  color: "bg-pink-600",    href: (v) => v },
  { key: "twitter",          label: "Twitter / X",       Icon: TwitterLogo,    color: "bg-sky-500",     href: (v) => v },
  { key: "telegram",         label: "Telegram",          Icon: TelegramLogo,   color: "bg-blue-500",    href: (v) => v },
  { key: "linkedin",         label: "LinkedIn",          Icon: LinkedinLogo,   color: "bg-blue-700",    href: (v) => v },
  { key: "whatsapp_channel", label: "WhatsApp Channel",  Icon: WhatsappLogo,   color: "bg-green-600",   href: (v) => v },
];

export default function Contact() {
  const { user } = useAuth();
  const { t, pick } = useLang();
  const [settings, setSettings]     = useState(null);
  const [social, setSocial]         = useState({});
  const [contactExtra, setExtra]    = useState({});
  const [msg, setMsg]               = useState("");
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState("");
  const [err, setErr]               = useState("");

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/configs/social_links").then((r) => setSocial(r.data || {})).catch(() => {});
    api.get("/configs/contact_extra").then((r) => setExtra(r.data || {})).catch(() => {});
  }, []);

  if (!settings) return <div className="text-center py-10 text-[var(--bii-text-soft)]">{t("loading")}</div>;

  const waNumber      = settings.whatsapp || settings.whatsapp_notify || "";
  const phone         = settings.contact_mobile || settings.contact_phone || "";
  const email         = settings.contact_email || "";
  const address       = settings.address || "";
  const officeHours   = contactExtra.office_hours || "";
  const mapEmbed      = contactExtra.google_map_embed || "";

  // merge facebook/youtube from settings into social (social_links config takes priority)
  const mergedSocial = {
    facebook: settings.facebook || "",
    youtube:  settings.youtube  || "",
    ...social,
  };
  const activeSocials = SOCIAL_CONFIG.filter((s) => mergedSocial[s.key]?.trim());

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true); setSent(""); setErr("");
    try {
      await api.post("/contact", {
        name: user?.name || "", email: user?.email || "",
        phone: user?.phone || "", message: msg,
      });
      setSent("আপনার বার্তা পাঠানো হয়েছে ✅");
      setMsg("");
    } catch (e2) { setErr(formatApiError(e2)); }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-4" data-testid="contact-page">

      {/* Header */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bii-emerald)", color: "#fff" }}>
        <h1 className="font-heading text-2xl mb-1">{t("contactUs")}</h1>
        <p className="text-sm opacity-80">{pick("আমাদের সাথে সরাসরি যোগাযোগ করুন", "Contact us directly")}</p>
      </div>

      {/* WhatsApp */}
      {waNumber && (
        <a href={`https://wa.me/${waNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
          data-testid="contact-whatsapp-link"
          className="flex items-center gap-4 p-5 bii-card hover:shadow-md transition group">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition">
            <WhatsappLogo size={28} weight="fill" className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-0.5">WhatsApp</div>
            <div className="font-heading text-lg tracking-wider">{waNumber}</div>
            <div className="text-xs text-green-600 mt-0.5">ক্লিক করলে WhatsApp-এ নিয়ে যাবে →</div>
          </div>
        </a>
      )}

      {/* Phone */}
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, "")}`} data-testid="contact-mobile-link"
          className="flex items-center gap-4 p-5 bii-card hover:shadow-md transition group">
          <div className="w-12 h-12 rounded-full bg-[var(--bii-emerald)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--bii-emerald)]/20 transition">
            <PhoneCall size={28} weight="duotone" className="text-[var(--bii-emerald)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-0.5">{pick("যোগাযোগ নম্বর", "Phone")}</div>
            <div className="font-heading text-lg tracking-wider">{phone}</div>
            <div className="text-xs text-[var(--bii-emerald)] mt-0.5">ক্লিক করলে কল করবে →</div>
          </div>
        </a>
      )}

      {/* Email + send form */}
      {email && (
        <div className="bii-card overflow-hidden">
          <a href={`mailto:${email}`} data-testid="contact-email-link"
            className="flex items-center gap-4 p-5 hover:bg-[var(--bii-cream)] transition group">
            <div className="w-12 h-12 rounded-full bg-[var(--bii-gold)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--bii-gold)]/20 transition">
              <EnvelopeSimple size={28} weight="duotone" className="text-[var(--bii-gold)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-0.5">{t("email")}</div>
              <div className="font-heading text-base break-all">{email}</div>
              <div className="text-xs text-[var(--bii-gold)] mt-0.5">ক্লিক করলে ইমেইল খুলবে →</div>
            </div>
          </a>
          <form onSubmit={sendEmail} className="border-t border-[var(--bii-border)] p-4 space-y-3">
            <p className="text-sm font-medium">✉️ {pick("সরাসরি বার্তা পাঠান", "Send a direct message")}</p>
            <textarea className="bii-input min-h-[100px] resize-none" placeholder="আপনার বার্তা লিখুন..."
              value={msg} onChange={(e) => setMsg(e.target.value)} required />
            {sent && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{sent}</div>}
            {err  && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
            <button type="submit" disabled={sending} className="bii-btn-primary w-full flex items-center justify-center gap-2">
              <PaperPlaneTilt size={18} weight="bold" />
              {sending ? t("sending") : t("sendMessage")}
            </button>
          </form>
        </div>
      )}

      {/* Address & Hours */}
      {(address || officeHours) && (
        <div className="bii-card p-5 space-y-3">
          {address && (
            <div className="flex items-start gap-3">
              <MapPin size={22} weight="duotone" className="text-[var(--bii-emerald)] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-0.5">{t("address")}</div>
                <div className="text-sm">{address}</div>
              </div>
            </div>
          )}
          {officeHours && (
            <div className="flex items-start gap-3">
              <Clock size={22} weight="duotone" className="text-[var(--bii-emerald)] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)] mb-0.5">{pick("অফিস সময়", "Office Hours")}</div>
                <div className="text-sm">{officeHours}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Social Media Links */}
      {activeSocials.length > 0 && (
        <div className="bii-card p-5">
          <h2 className="font-heading text-base text-[var(--bii-emerald)] mb-3">📱 {t("socialMedia")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {activeSocials.map(({ key, label, Icon, color }) => (
              <a
                key={key}
                href={mergedSocial[key]}
                target="_blank"
                rel="noreferrer"
                data-testid={`contact-social-${key}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--bii-border)] hover:shadow-md transition group"
              >
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} weight="fill" className="text-white" />
                </div>
                <span className="text-sm font-medium truncate">{label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Google Map */}
      {mapEmbed && (
        <div className="bii-card overflow-hidden">
          <iframe
            src={mapEmbed}
            title="Google Map"
            className="w-full h-56 border-0"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {!waNumber && !phone && !email && activeSocials.length === 0 && (
        <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">
          <p className="text-sm">এডমিন প্যানেল → সেটিংস ও সোশ্যাল মিডিয়া লিংক থেকে তথ্য যোগ করুন।</p>
        </div>
      )}
    </div>
  );
}

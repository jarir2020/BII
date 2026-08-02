import React, { useEffect, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { api, formatApiError } from "../../lib/api";

export default function AdminSettings() {
  const { pick } = useLang();
  const [s, setS] = useState(null);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { api.get("/settings").then((r) => setS(r.data)); }, []);
  if (!s) return <div>লোড হচ্ছে...</div>;

  const save = async () => {
    setOk(""); setErr("");
    try {
      await api.put("/settings", s);
      setOk("সেভ হয়েছে ✓");
      setTimeout(() => setOk(""), 2500);
    } catch (e) { setErr(formatApiError(e)); }
  };

  const upd = (k) => (e) => setS({ ...s, [k]: e.target.value });

  return (
    <div data-testid="admin-settings-page" className="max-w-2xl space-y-5">

      {/* প্রতিষ্ঠান সেটিংস */}
      <Section title={pick("সাধারণ তথ্য", "General Info")}>
        <Field label={pick("সাইটের নাম", "Site Name")}         value={s.name_bn}        onChange={upd("name_bn")}        testid="set-name-bn" />
        <Field label={pick("সাইট টাইটেল", "Site Title")}      value={s.name_en}        onChange={upd("name_en")}        testid="set-name-en" />
        <Field label="বাংলা ট্যাগলাইন"  value={s.tagline_bn}     onChange={upd("tagline_bn")}     testid="set-tag-bn" />
        <Field label="English Tagline"   value={s.tagline_en}     onChange={upd("tagline_en")}     testid="set-tag-en" />
        <Field label={pick("যোগাযোগের ফোন", "Contact Phone")}  value={s.contact_phone}  onChange={upd("contact_phone")}  testid="set-phone" />
        <Field label="মোবাইল নম্বর"      value={s.contact_mobile} onChange={upd("contact_mobile")} testid="set-mobile" />
        <Field label={pick("সাপোর্ট ইমেইল", "Support Email")} value={s.contact_email}  onChange={upd("contact_email")}  testid="set-email" />
        <Field label={pick("ঠিকানা", "Address")}               value={s.address}        onChange={upd("address")}        testid="set-addr" />
        <Field label={pick("ফেসবুক পেজ", "Facebook Page")}     value={s.facebook}       onChange={upd("facebook")}       testid="set-fb" />
        <Field label={pick("ইউটিউব চ্যানেল", "YouTube Channel")} value={s.youtube}     onChange={upd("youtube")}        testid="set-yt" />
      </Section>

      {/* পেমেন্ট নম্বর */}
      <Section title={pick("পেমেন্ট নম্বর", "Payment Numbers")}>
        <p className="text-xs text-[var(--bii-text-soft)] -mt-1 mb-1">
          এই নম্বরগুলো পেমেন্ট পেজে শিক্ষার্থীদের দেখানো হবে।
        </p>
        <Field
          label={pick("বিকাশ (Personal)", "bKash (Personal)")}
          value={s.bkash_number || ""}
          onChange={upd("bkash_number")}
          testid="set-bkash"
          placeholder="01XXXXXXXXX"
        />
        <Field
          label={pick("নগদ (Personal)", "Nagad (Personal)")}
          value={s.nagad_number || ""}
          onChange={upd("nagad_number")}
          testid="set-nagad"
          placeholder="01XXXXXXXXX"
        />
      </Section>

      {/* WhatsApp নোটিফিকেশন */}
      <Section title={pick("হোয়াটসঅ্যাপ", "WhatsApp")}>
        <p className="text-xs text-[var(--bii-text-soft)] -mt-1 mb-2 leading-relaxed">
          নতুন পেমেন্ট রিকোয়েস্ট হলে এই WhatsApp নম্বরে মেসেজ যাবে।{" "}
          <strong>API Key পেতে:</strong> WhatsApp-এ{" "}
          <span className="font-mono bg-[var(--bii-cream)] px-1 rounded">+34 644 45 76 63</span>
          {" "}নম্বরে "I allow callmebot to send me messages" লিখে পাঠান — reply-এ API Key আসবে।
        </p>
        <Field
          label="WhatsApp নম্বর (নোটিফিকেশন পাবেন)"
          value={s.whatsapp_notify || ""}
          onChange={upd("whatsapp_notify")}
          testid="set-wa-notify"
          placeholder="01XXXXXXXXX"
        />
        <Field
          label="CallMeBot API Key"
          value={s.whatsapp_api_key || ""}
          onChange={upd("whatsapp_api_key")}
          testid="set-wa-key"
          placeholder="আপনার API Key এখানে দিন"
        />
      </Section>

      {/* ইমেইল (SMTP) সেটিংস */}
      <Section title="📧 ইমেইল সেটিংস (পাসওয়ার্ড রিসেট OTP পাঠাতে)">
        <p className="text-xs text-[var(--bii-text-soft)] -mt-1 mb-2 leading-relaxed">
          Gmail ব্যবহার করতে: smtp_host = <span className="font-mono bg-[var(--bii-cream)] px-1 rounded">smtp.gmail.com</span>, port = <span className="font-mono bg-[var(--bii-cream)] px-1 rounded">587</span>, ইউজার = আপনার Gmail, পাসওয়ার্ড = <strong>App Password</strong> (Google → Security → 2-Step → App Passwords)।
        </p>
        <Field label="SMTP Host"              value={s.smtp_host || ""}  onChange={upd("smtp_host")}  placeholder="smtp.gmail.com" />
        <Field label="SMTP Port"              value={s.smtp_port || ""}  onChange={upd("smtp_port")}  placeholder="587" />
        <Field label="SMTP Username (ইমেইল)" value={s.smtp_user || ""}  onChange={upd("smtp_user")}  placeholder="yourname@gmail.com" />
        <Field label="SMTP Password / App Password" value={s.smtp_pass || ""} onChange={upd("smtp_pass")} placeholder="••••••••••••" />
        <Field label="From Email (ঐচ্ছিক)"  value={s.smtp_from || ""}  onChange={upd("smtp_from")}  placeholder="Bengali Islamic Institute <noreply@...>" />
      </Section>

      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
      {ok  && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{ok}</div>}

      <button data-testid="set-save-btn" onClick={save} className="bii-btn-primary w-full">
        {pick("সেটিংস আপডেট করুন", "Update Settings")}
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bii-card p-5 space-y-3">
      <h2 className="font-heading text-base text-[var(--bii-emerald)] border-b border-[var(--bii-border)] pb-2 mb-1">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, testid, placeholder, ...rest }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
      <input data-testid={testid} className="bii-input" placeholder={placeholder || ""} {...rest} />
    </div>
  );
}

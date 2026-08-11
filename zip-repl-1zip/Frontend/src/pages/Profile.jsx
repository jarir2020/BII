import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PencilSimple, Lock, FloppyDisk, X } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl, formatApiError } from "../lib/api";
import ImageUpload from "../components/ImageUpload";

/* ─── Fullscreen Lightbox ─────────────────────────────────────────────────── */
function Lightbox({ url, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
         onClick={onClose}>
      <button className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2.5 hover:bg-white/30 transition"
              onClick={onClose}>
        <X size={22} weight="bold" />
      </button>
      <img src={url} alt="full"
           className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
           onClick={(e) => e.stopPropagation()} />
      <p className="absolute bottom-5 text-white/50 text-xs">ছবি বন্ধ করতে যেকোনো জায়গায় ট্যাপ করুন</p>
    </div>
  );
}

const PLACEHOLDER_AVATAR = "https://images.pexels.com/photos/5340338/pexels-photo-5340338.jpeg";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { t, pick } = useLang();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", profile_photo: "" });
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        profile_photo: user.profile_photo || "",
      });
      api.get("/my-courses").then((r) => setMyCourses(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setErr(""); setSavedMsg("");
    try {
      await updateProfile(form);
      setEdit(false);
      setSavedMsg(pick("সফলভাবে সেভ হয়েছে", "Saved successfully"));
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e) { setErr(formatApiError(e)); }
  };

  const photoSrc = imgUrl(form.profile_photo) || PLACEHOLDER_AVATAR;

  return (
    <div className="space-y-6" data-testid="profile-page">
      {/* Fullscreen lightbox */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl("")} />}

      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--bii-emerald)] text-white">
        <div className="islamic-pattern absolute inset-0 opacity-25" />
        <div className="relative px-6 py-10 flex flex-col items-center text-center">
          <div
            className="w-28 h-28 rounded-full bg-white p-1 ring-4 ring-[var(--bii-gold)]/80 shadow-xl cursor-zoom-in relative group"
            onClick={() => setLightboxUrl(photoSrc)}
            title="ছবি বড় করে দেখুন"
          >
            <img
              src={photoSrc}
              alt="profile"
              className="w-full h-full object-cover rounded-full"
            />
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center
                            opacity-0 group-hover:opacity-100 group-active:opacity-100 transition">
              <span className="text-white text-xs font-semibold">🔍</span>
            </div>
          </div>
          <h1 className="font-heading text-2xl mt-3">{user.name}</h1>
        </div>
      </section>

      {/* INFO CARD */}
      <section className="bii-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-[var(--bii-emerald)]">{t("accountInfo")}</h2>
          {!edit ? (
            <button data-testid="profile-edit-btn" onClick={() => setEdit(true)} className="text-sm flex items-center gap-1 text-[var(--bii-emerald)] hover:underline">
              <PencilSimple size={16} weight="bold" /> {t("edit")}
            </button>
          ) : (
            <div className="flex gap-2">
              <button data-testid="profile-cancel-btn" onClick={() => setEdit(false)} className="text-sm flex items-center gap-1 text-[var(--bii-text-soft)]">
                <X size={16} /> {t("cancel")}
              </button>
              <button data-testid="profile-save-btn" onClick={save} className="text-sm flex items-center gap-1 text-white bg-[var(--bii-emerald)] px-3 py-1.5 rounded-lg">
                <FloppyDisk size={16} weight="bold" /> {t("save")}
              </button>
            </div>
          )}
        </div>

        {savedMsg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 mb-3">{savedMsg}</div>}
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">{err}</div>}

        <div className="grid sm:grid-cols-2 gap-4">
          <Row label={t("name")} value={user.name} edit={edit} testid="profile-name" onChange={(v) => setForm({ ...form, name: v })} val={form.name} />
          <Row label={t("email")} value={user.email} edit={false} />
          <Row label={t("phone")} value={user.phone || "—"} edit={edit} testid="profile-phone" onChange={(v) => setForm({ ...form, phone: v })} val={form.phone} />
          <Row label={t("address")} value={user.address || "—"} edit={edit} testid="profile-address" onChange={(v) => setForm({ ...form, address: v })} val={form.address} />
          <Row label={pick("প্রোফাইল ফটো", "Profile photo")} value={user.profile_photo ? pick("আপলোড করা আছে", "uploaded") : "—"} edit={false} />
        </div>
        {edit && (
          <div className="mt-4">
            <ImageUpload value={form.profile_photo} onChange={(url) => setForm({ ...form, profile_photo: url })} label={pick("প্রোফাইল ছবি", "Profile photo")} testid="profile-photo-upload" />
          </div>
        )}
      </section>

      {/* QUICK ACTIONS */}
      <section className="bii-card p-5">
        <h3 className="font-heading text-lg text-[var(--bii-emerald)] mb-3">{t("quickActions")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/change-password" data-testid="profile-change-pw-link" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bii-cream)] hover:bg-white border border-[var(--bii-border)] transition">
            <Lock size={20} weight="duotone" className="text-[var(--bii-emerald)]" /> {t("changePassword")}
          </Link>
          <Link to="/my-courses" data-testid="profile-my-courses-link" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bii-cream)] hover:bg-white border border-[var(--bii-border)] transition">
            <PencilSimple size={20} weight="duotone" className="text-[var(--bii-emerald)]" /> {t("menuMyCourses")} ({myCourses.length})
          </Link>
        </div>
      </section>

      {/* MY COURSES */}
      {myCourses.length > 0 && (
        <section>
          <h3 className="font-heading text-lg mb-3 px-1">{t("menuMyCourses")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {myCourses.map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="bii-card p-4 flex gap-3 items-center">
                {c.cover_image && (
                  <img
                    src={imgUrl(c.cover_image)}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover cursor-zoom-in hover:opacity-80 transition flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    onClick={(e) => { e.preventDefault(); setLightboxUrl(imgUrl(c.cover_image)); }}
                  />
                )}
                <div>
                  <div className="font-heading text-base text-[var(--bii-emerald)]">{pick(c.title_bn, c.title_en)}</div>
                  <div className="text-xs text-[var(--bii-text-soft)]">{c.instructor}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, edit, val, onChange, testid }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--bii-text-soft)]">{label}</div>
      {edit && onChange ? (
        <input data-testid={testid} className="bii-input mt-1" value={val} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="text-base text-[var(--bii-text)] mt-0.5">{value}</div>
      )}
    </div>
  );
}

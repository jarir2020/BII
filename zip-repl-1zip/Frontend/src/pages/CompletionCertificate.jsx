import React, { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import { CloudArrowUp, FilePdf, CheckCircle } from "@phosphor-icons/react";

const FEATURES = [
  ["Complete Web Application & Admin Panel",
   "Full-featured frontend with a dedicated admin dashboard, role-based access (Super Admin, Admin, Teacher, Student), and a polished, responsive interface."],
  ["Secure Authentication & Password Recovery",
   "Login/registration plus a fully working Forgot Password flow that emails a secure one-time code (OTP) via Gmail SMTP — configured and verified end-to-end."],
  ["Push Notifications (Web)",
   "Firebase Cloud Messaging device registration and background/foreground notification delivery, working on real devices."],
  ["User & Role Management",
   "Student, teacher, and admin management with pre-seeded test accounts assigned the correct roles and working credentials."],
  ["Optimized Page Layout & Ad Integration",
   "Resolved layout/whitespace issues and integrated AdSense cleanly so pages display without gaps across Courses, Library, Videos, and more."],
  ["Production Deployment & Delivery",
   "Automated build and deployment pipeline (CI/CD), tested in the live production environment with all core features verified."],
];

export default function CompletionCertificate() {
  const { pick } = useLang();
  const [clientSig, setClientSig] = useState("");
  const [devSig,    setDevSig]    = useState("");
  const [clientName,setClientName]= useState("");
  const [devName,   setDevName]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  const readFile = (e, setter) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  const downloadPdf = async () => {
    setLoading(true); setError(""); setDone(false);
    try {
      const res = await api.post("/certificate/pdf", {
        client_signature:    clientSig,
        developer_signature: devSig,
        client_name:         clientName,
        developer_name:      devName,
      }, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Project_Completion_Certificate.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err) {
      console.warn("cert pdf error:", err);
      setError("Could not generate the PDF. Please upload both signatures and try again.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  const SigBox = ({ label, src, name, onFile, onName, accent }) => (
    <div className="flex-1 min-w-[220px]">
      <div className={`border-t-2 pt-2 flex items-end min-h-[56px] ${accent}`}>
        {src ? <img src={src} alt={label} className="max-h-[52px] max-w-[150px]" /> : <span className="text-[10px] text-[var(--bii-text-soft)]">Signature</span>}
      </div>
      <div className="mt-2 text-xs font-semibold">{label}</div>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder={pick("নাম (ঐচ্ছিক)", "Name (optional)")}
        className="mt-1 w-full text-xs rounded-lg border border-[var(--bii-border)] bg-white px-2 py-1.5 outline-none focus:border-[var(--bii-emerald)]"
      />
      <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--bii-gold)]/60 bg-[var(--bii-cream)] px-2 py-2 text-xs text-[var(--bii-emerald)] hover:bg-[var(--bii-gold)]/10">
        <CloudArrowUp size={16} weight="bold" />
        <span>{src ? pick("পরিবর্তন করুন", "Change") : pick("সিগনেচার আপলোড", "Upload Signature")}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e)} />
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef1ef] py-8 px-4">
      <div className="mx-auto max-w-[860px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-5 px-10 py-7 bg-gradient-to-r from-[#083d28] via-[#0a5c3a] to-[#0e7a4c] text-white">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-white text-[var(--bii-emerald)] font-black text-lg shadow">NS</div>
            <div className="mt-1 text-[8px] uppercase tracking-widest text-white/80">NextStage</div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold">NextStage Software</h1>
            <div className="text-[11px] text-white/85 tracking-wide uppercase">Software Development &amp; Digital Solutions</div>
            <span className="mt-2 inline-block rounded-full border border-white/40 bg-white/15 px-3 py-0.5 text-[9px] uppercase tracking-[2px]">Project Completion Certificate</span>
          </div>
        </div>

        {/* Title */}
        <div className="px-10 pt-7 text-center">
          <h2 className="text-2xl font-extrabold text-[var(--bii-emerald)]">The Project Is Complete</h2>
          <p className="mt-1.5 text-xs text-[var(--bii-text-soft)]">This document certifies the delivery and acceptance of the completed project.</p>
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-[var(--bii-gold)] to-[#e6c96b]" />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-10 pt-6">
          {[
            ["Client / Project", "Bengali Islamic Institute"],
            ["Delivered By", "NextStage Software"],
            ["Scope", "Web Application & Admin Panel"],
            ["Status", "Delivered & Accepted"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[var(--bii-border)] bg-[var(--bii-cream)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[1.1px] text-[var(--bii-text-soft)]">{k}</div>
              <div className="mt-1 text-sm font-bold" style={v === "Delivered & Accepted" ? { color: "var(--bii-emerald)" } : undefined}>{v}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="px-10 pt-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--bii-emerald)]">
            Following Features Are Added
            <span className="h-px flex-1 bg-[var(--bii-border)]" />
          </h3>
          <ol className="mt-3 space-y-2">
            {FEATURES.map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-xl border border-[var(--bii-border)] p-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[var(--bii-emerald)] text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <div className="text-sm font-bold">{t}</div>
                  <div className="mt-0.5 text-xs text-[var(--bii-text-soft)]">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Statement */}
        <div className="mx-10 mt-5 rounded-xl border border-[var(--bii-emerald)]/30 bg-[#eaf6ef] px-6 py-4 text-center">
          <div className="text-base font-extrabold text-[var(--bii-emerald)]">The client got everything working</div>
          <div className="mt-1 text-[11.5px] text-[var(--bii-text-soft)]">All agreed features have been implemented, tested, and confirmed operational in the production environment.</div>
        </div>

        {/* Signatures */}
        <div className="flex flex-col sm:flex-row gap-8 px-10 pt-7">
          <SigBox label="Client Signature" src={clientSig} name={clientName} onName={setClientName} onFile={(e) => readFile(e, setClientSig)} accent="border-[#1b1f23]" />
          <SigBox label="Developer Signature" src={devSig} name={devName} onName={setDevName} onFile={(e) => readFile(e, setDevSig)} accent="border-[var(--bii-emerald)]" />
        </div>

        {/* Actions */}
        <div className="px-10 py-6">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}
          <button
            onClick={downloadPdf}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bii-emerald)] px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-[#074b2e] disabled:opacity-60"
          >
            {loading ? (
              <span className="animate-pulse">Generating PDF…</span>
            ) : (
              <>
                <FilePdf size={18} weight="bold" /> Download Certificate as PDF
              </>
            )}
          </button>
          {done && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--bii-emerald)]">
              <CheckCircle size={15} weight="bold" /> PDF downloaded — you can send it to the client.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

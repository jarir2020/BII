import React, { useEffect, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { toast } from "sonner";
import { X, GraduationCap, SignIn, ChatCircleText, Phone, EnvelopeSimple, MapPin, Eye } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";

export default function AdminUsers() {
  const { pick } = useLang();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(null);   // selected user id
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    api.get("/users")
      .then((r) => setUsers(r.data))
      .catch((e) => setListError(formatApiError(e)));
  }, []);

  const openDetails = async (uid) => {
    setOpen(uid); setDetails(null); setLoading(true);
    try {
      const { data } = await api.get(`/users/${uid}/details`);
      setDetails(data);
    } catch (e) {
      toast.error(formatApiError(e) || "স্টুডেন্টের তথ্য লোড করা যায়নি");
      setOpen(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-users-page">
      {listError && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          স্টুডেন্ট লিস্ট লোড করতে সমস্যা হয়েছে: {listError}
        </div>
      )}
      {!listError && users.length === 0 && (
        <div className="mb-3 p-3 rounded-lg bg-[var(--bii-cream)] text-sm text-[var(--bii-text-soft)]">
          এখনো কোনো ব্যবহারকারী নেই।
        </div>
      )}
      <div className="bii-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-[var(--bii-cream)] text-left">
            <tr>
              <th className="p-3">{pick("নাম", "Name")}</th>
              <th className="p-3">{pick("ইমেইল", "Email")}</th>
              <th className="p-3">{pick("ফোন", "Phone")}</th>
              <th className="p-3 text-center">কোর্স</th>
              <th className="p-3">{pick("রোল", "Role")}</th>
              <th className="p-3 text-center">বিস্তারিত</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                data-testid={`admin-user-row-${u.id}`}
                onClick={() => openDetails(u.id)}
                className="border-t border-[var(--bii-border)] cursor-pointer hover:bg-[var(--bii-cream)] transition"
              >
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3 text-center">
                  <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-[var(--bii-cream)] text-[var(--bii-emerald)] font-mono text-xs">
                    {u.enrollment_count ?? 0}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-[var(--bii-emerald)] text-white" : "bg-[var(--bii-cream)]"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    data-testid={`admin-user-view-${u.id}`}
                    onClick={(e) => { e.stopPropagation(); openDetails(u.id); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bii-emerald)] text-white text-xs font-medium hover:opacity-90"
                  >
                    <Eye size={14} weight="bold" /> দেখুন
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-xs text-[var(--bii-text-soft)]">
          💡 যেকোনো রো-তে বা "দেখুন" বাটনে ক্লিক করে স্টুডেন্টের বিস্তারিত তথ্য দেখুন
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} data-testid="user-details-modal" className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden">
            <div className="bg-[var(--bii-emerald)] text-white p-5 flex justify-between items-start">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[var(--bii-gold)]">Student Details</div>
                {details && <div className="font-heading text-xl mt-0.5">{details.user.name}</div>}
              </div>
              <button data-testid="close-user-details" onClick={() => setOpen(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={22} weight="bold" />
              </button>
            </div>

            {loading && <div className="p-8 text-center text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>}

            {details && (
              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Profile */}
                <section className="flex gap-4">
                  {details.user.profile_photo ? (
                    <img src={imgUrl(details.user.profile_photo)} alt="" className="w-20 h-20 rounded-xl object-cover ring-2 ring-[var(--bii-gold)]" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[var(--bii-cream)] flex items-center justify-center text-[var(--bii-text-soft)] font-mono">
                      {details.user.name?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    <Info k={pick("রোল", "Role")} v={details.user.role} />
                    <Info k={pick("ইমেইল", "Email")} v={details.user.email} icon={<EnvelopeSimple size={14} />} />
                    <Info k={pick("ফোন", "Phone")} v={details.user.phone || "—"} icon={<Phone size={14} />} />
                    <Info k={pick("ঠিকানা", "Address")} v={details.user.address || "—"} icon={<MapPin size={14} />} full />
                    <Info k={pick("তারিখ", "Date")} v={details.user.created_at?.slice(0, 10)} />
                  </div>
                </section>

                {/* Stats strip */}
                <section className="grid grid-cols-3 gap-2">
                  <Stat label="কোর্স কিনেছে" val={details.enrollments.length} icon={<GraduationCap size={20} weight="duotone" />} />
                  <Stat label="মোট খরচ" val={`৳ ${details.total_spent}`} />
                  <Stat label="লগইন" val={details.login_history.length} icon={<SignIn size={20} weight="duotone" />} />
                </section>

                {/* Enrolled courses */}
                <section>
                  <div className="font-heading text-lg text-[var(--bii-emerald)] mb-2 flex items-center gap-2">
                    <GraduationCap size={20} weight="duotone" /> ক্রয়কৃত / এনরোলড কোর্স ({details.enrollments.length})
                  </div>
                  {details.enrollments.length === 0 ? (
                    <div className="text-sm text-[var(--bii-text-soft)] italic p-3 bg-[var(--bii-cream)] rounded-lg">এখনো কোন কোর্সে ভর্তি হয়নি</div>
                  ) : (
                    <div className="space-y-2">
                      {details.enrollments.map((e) => (
                        <div key={e.id} className="flex gap-3 p-3 bg-[var(--bii-cream)] rounded-lg items-center" data-testid={`enrolled-row-${e.id}`}>
                          {e.course?.cover_image && <img src={imgUrl(e.course.cover_image)} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{e.course?.title_bn || "—"}</div>
                            <div className="text-xs text-[var(--bii-text-soft)]">
                              {e.enrolled_at?.slice(0, 10)} • {e.payment_status}
                            </div>
                          </div>
                          <div className="font-heading text-[var(--bii-emerald)]">
                            {e.amount > 0 ? `৳ ${e.amount}` : pick("ফ্রি", "Free")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Login history */}
                <section>
                  <div className="font-heading text-lg text-[var(--bii-emerald)] mb-2 flex items-center gap-2">
                    <SignIn size={20} weight="duotone" /> লগইন হিস্টোরি (শেষ {details.login_history.length}টি)
                  </div>
                  {details.login_history.length === 0 ? (
                    <div className="text-sm text-[var(--bii-text-soft)] italic p-3 bg-[var(--bii-cream)] rounded-lg">কোন লগইন রেকর্ড নেই</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[var(--bii-border)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bii-cream)]">
                          <tr>
                            <th className="p-2 text-left">সময়</th>
                            <th className="p-2 text-left">IP</th>
                            <th className="p-2 text-left">ডিভাইস</th>
                            <th className="p-2 text-left">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.login_history.slice(0, 15).map((l) => (
                            <tr key={l.id} className="border-t border-[var(--bii-border)]">
                              <td className="p-2 font-mono">{l.created_at?.slice(0, 16).replace("T", " ")}</td>
                              <td className="p-2 font-mono">{l.ip || "—"}</td>
                              <td className="p-2 max-w-[180px] truncate" title={l.user_agent}>{l.user_agent || "—"}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${l.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {l.success ? "সফল" : "ব্যর্থ"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Complaints */}
                {details.complaints.length > 0 && (
                  <section>
                    <div className="font-heading text-lg text-[var(--bii-emerald)] mb-2 flex items-center gap-2">
                      <ChatCircleText size={20} weight="duotone" /> অভিযোগ / প্রশ্ন ({details.complaints.length})
                    </div>
                    <div className="space-y-2">
                      {details.complaints.map((c) => (
                        <div key={c.id} className="p-3 bg-[var(--bii-cream)] rounded-lg">
                          <div className="font-medium text-sm">{c.subject}</div>
                          <div className="text-xs text-[var(--bii-text-soft)] mt-1">{c.message}</div>
                          <div className="text-[10px] text-[var(--bii-text-soft)] mt-1.5">{c.created_at?.slice(0, 16).replace("T", " ")}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ k, v, mono, icon, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)] flex items-center gap-1">
        {icon}{k}
      </div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{v}</div>
    </div>
  );
}

function Stat({ label, val, icon }) {
  return (
    <div className="bii-card p-3 text-center">
      {icon && <div className="text-[var(--bii-emerald)] flex justify-center mb-1">{icon}</div>}
      <div className="font-heading text-xl text-[var(--bii-emerald)]">{val}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--bii-text-soft)] mt-0.5">{label}</div>
    </div>
  );
}

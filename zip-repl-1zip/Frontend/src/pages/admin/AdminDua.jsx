import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash, PencilSimple, X, Star, CheckCircle,
  HandsPraying, BookOpenText, ArrowLeft, SortAscending,
  ToggleLeft, ToggleRight, Warning,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useLang } from "../../contexts/LangContext";

const EMPTY_CAT = { name_bn: "", icon: "🤲", description: "", sort_order: 0, color: "#10b981" };
const EMPTY_DUA = {
  title_bn: "", category_id: "", arabic_text: "", transliteration: "",
  meaning_bn: "", when_to_read: "", fazilat: "", source: "",
  is_today_dua: false, is_featured: false, sort_order: 0,
};

export default function AdminDua() {
  const { pick } = useLang();
  const [tab, setTab] = useState("duas");
  // দোয়া state
  const [duas, setDuas]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [duaModal, setDuaModal] = useState(null); // null | "new" | dua-object
  const [duaForm, setDuaForm]   = useState(EMPTY_DUA);
  const [duaErr, setDuaErr]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [catFilter, setCatFilter] = useState("");
  // ক্যাটাগরি state
  const [catModal, setCatModal] = useState(null);
  const [catForm, setCatForm]   = useState(EMPTY_CAT);
  const [catErr, setCatErr]     = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/duas").then(r => setDuas(r.data || [])),
      api.get("/dua-categories").then(r => setCategories(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── দোয়া সেভ ──
  const saveDua = async () => {
    if (!duaForm.title_bn.trim()) return setDuaErr("শিরোনাম দিন।");
    if (!duaForm.category_id) return setDuaErr("ক্যাটাগরি বেছে নিন।");
    setSaving(true); setDuaErr("");
    try {
      if (duaModal === "new") {
        const r = await api.post("/duas", duaForm);
        setDuas(prev => [r.data, ...prev]);
        toast.success("দোয়া যোগ হয়েছে!");
      } else {
        const r = await api.put(`/duas/${duaModal.id}`, duaForm);
        setDuas(prev => prev.map(d => d.id === r.data.id ? r.data : d));
        if (duaForm.is_today_dua) {
          setDuas(prev => prev.map(d => d.id === r.data.id ? { ...d, is_today_dua: true } : { ...d, is_today_dua: false }));
        }
        toast.success("দোয়া আপডেট হয়েছে!");
      }
      setDuaModal(null);
    } catch (e) { setDuaErr(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const deleteDua = async (d) => {
    if (!window.confirm(`"${d.title_bn}" মুছে ফেলবেন?`)) return;
    try {
      await api.delete(`/duas/${d.id}`);
      setDuas(prev => prev.filter(x => x.id !== d.id));
      toast.success("মুছে ফেলা হয়েছে।");
    } catch { toast.error("মুছতে সমস্যা হয়েছে।"); }
  };

  const setTodayDua = async (d) => {
    try {
      await api.put(`/duas/${d.id}`, { ...d, is_today_dua: true });
      setDuas(prev => prev.map(x => ({ ...x, is_today_dua: x.id === d.id })));
      toast.success(`"${d.title_bn}" আজকের দোয়া হিসেবে নির্বাচিত!`);
    } catch { toast.error("সমস্যা হয়েছে।"); }
  };

  // ── ক্যাটাগরি সেভ ──
  const saveCat = async () => {
    if (!catForm.name_bn.trim()) return setCatErr("ক্যাটাগরির নাম দিন।");
    setCatSaving(true); setCatErr("");
    try {
      if (catModal === "new") {
        const r = await api.post("/dua-categories", catForm);
        setCategories(prev => [...prev, r.data]);
        toast.success("ক্যাটাগরি যোগ হয়েছে!");
      } else {
        const r = await api.put(`/dua-categories/${catModal.id}`, catForm);
        setCategories(prev => prev.map(c => c.id === r.data.id ? r.data : c));
        toast.success("ক্যাটাগরি আপডেট হয়েছে!");
      }
      setCatModal(null);
    } catch (e) { setCatErr(formatApiError(e)); }
    finally { setCatSaving(false); }
  };

  const deleteCat = async (c) => {
    if (!window.confirm(`"${c.name_bn}" ক্যাটাগরি মুছবেন?`)) return;
    try {
      await api.delete(`/dua-categories/${c.id}`);
      setCategories(prev => prev.filter(x => x.id !== c.id));
      toast.success("মুছে ফেলা হয়েছে।");
    } catch { toast.error("মুছতে সমস্যা হয়েছে।"); }
  };

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const filteredDuas = catFilter ? duas.filter(d => d.category_id === catFilter) : duas;
  const todayDua = duas.find(d => d.is_today_dua);

  return (
    <div>
      {/* হেডার */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--bii-text)]">{pick("দোয়া পরিচালনা","Dua Management")}</h1>
          <p className="text-sm text-[var(--bii-text-soft)]">{duas.length}টি দোয়া · {categories.length}টি ক্যাটাগরি</p>
        </div>
        <button
          onClick={() => { setDuaModal("new"); setDuaForm(EMPTY_DUA); setDuaErr(""); }}
          className="bii-btn-primary flex items-center gap-2"
        >
          <Plus size={18} weight="bold" /> নতুন দোয়া
        </button>
      </div>

      {/* আজকের দোয়া ব্যানার */}
      {todayDua && (
        <div className="mb-5 flex items-center gap-3 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
          <Star size={22} weight="fill" className="text-yellow-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-yellow-700 font-medium">আজকের দোয়া</div>
            <div className="font-semibold text-yellow-900 truncate">{todayDua.title_bn}</div>
          </div>
          <button onClick={() => { setDuaModal(todayDua); setDuaForm({ ...todayDua }); setDuaErr(""); }} className="text-xs text-yellow-700 hover:underline">পরিবর্তন করুন</button>
        </div>
      )}

      {/* ট্যাব */}
      <div className="flex gap-2 mb-5 border-b border-[var(--bii-border)]">
        {[{ k: "duas", l: pick("দোয়াসমূহ","Duas") }, { k: "categories", l: pick("ক্যাটাগরি","Category") }].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-[2px] ${tab === t.k ? "border-[var(--bii-emerald)] text-[var(--bii-emerald)]" : "border-transparent text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── দোয়া ট্যাব ── */}
      {tab === "duas" && (
        <div>
          {/* ক্যাটাগরি ফিল্টার */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setCatFilter("")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${!catFilter ? "bg-[var(--bii-emerald)] text-white" : "bg-white border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)]"}`}>
              সব ({duas.length})
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${catFilter === c.id ? "bg-[var(--bii-emerald)] text-white" : "bg-white border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)]"}`}>
                {c.icon} {c.name_bn} ({duas.filter(d => d.category_id === c.id).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-10 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>
          ) : (
            <div className="space-y-2">
              {filteredDuas.map(d => (
                <div key={d.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[var(--bii-border)] hover:border-[var(--bii-emerald)]/30 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-[var(--bii-text)]">{d.title_bn}</span>
                      {d.is_today_dua && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">⭐ আজকের দোয়া</span>}
                      {d.is_featured && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Featured</span>}
                    </div>
                    {d.arabic_text && <div className="text-sm text-[var(--bii-emerald)] font-arabic text-right truncate" dir="rtl">{d.arabic_text}</div>}
                    <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">
                      {catMap[d.category_id]?.icon} {catMap[d.category_id]?.name_bn || "—"}
                      {d.source && <span className="ml-2">· {d.source}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!d.is_today_dua && (
                      <button onClick={() => setTodayDua(d)} title="আজকের দোয়া হিসেবে সেট করুন" className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition">
                        <Star size={17} weight="duotone" />
                      </button>
                    )}
                    <button onClick={() => { setDuaModal(d); setDuaForm({ ...d }); setDuaErr(""); }} className="p-2 text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] hover:bg-[var(--bii-cream)] rounded-lg transition">
                      <PencilSimple size={17} />
                    </button>
                    <button onClick={() => deleteDua(d)} className="p-2 text-[var(--bii-text-soft)] hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash size={17} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredDuas.length === 0 && <p className="text-center py-10 text-[var(--bii-text-soft)]">{pick("কোন দোয়া নেই","No duas found")}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── ক্যাটাগরি ট্যাব ── */}
      {tab === "categories" && (
        <div>
          <button
            onClick={() => { setCatModal("new"); setCatForm(EMPTY_CAT); setCatErr(""); }}
            className="bii-btn-primary flex items-center gap-2 mb-4"
          >
            <Plus size={16} /> নতুন ক্যাটাগরি
          </button>
          <div className="grid sm:grid-cols-2 gap-3">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[var(--bii-border)]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background: `${c.color || "#10b981"}20`}}>
                  {c.icon || "🤲"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name_bn}</div>
                  {c.description && <div className="text-xs text-[var(--bii-text-soft)] truncate">{c.description}</div>}
                  <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">{duas.filter(d => d.category_id === c.id).length}টি দোয়া</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setCatModal(c); setCatForm({ ...c }); setCatErr(""); }} className="p-2 text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] hover:bg-[var(--bii-cream)] rounded-lg transition">
                    <PencilSimple size={17} />
                  </button>
                  <button onClick={() => deleteCat(c)} className="p-2 text-[var(--bii-text-soft)] hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash size={17} />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="col-span-2 text-center py-8 text-[var(--bii-text-soft)]">কোনো ক্যাটাগরি নেই।</p>}
          </div>
        </div>
      )}

      {/* ── দোয়া মোডাল ── */}
      {duaModal !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--bii-border)]">
              <h3 className="font-heading font-semibold text-lg">{duaModal === "new" ? pick("নতুন দোয়া যোগ","Add Dua") : pick("দোয়া/জিকির এডিট","Edit Dua")}</h3>
              <button onClick={() => setDuaModal(null)} className="p-2 rounded-lg hover:bg-[var(--bii-cream)] transition"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {duaErr && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg"><Warning size={16} /> {duaErr}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("শিরোনাম (বাংলা) *","Title (Bengali) *")}</label>
                  <input className="bii-input" placeholder="দোয়ার শিরোনাম বাংলায়" value={duaForm.title_bn} onChange={e => setDuaForm(f => ({...f, title_bn: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("ক্যাটাগরি","Category")} *</label>
                  <select className="bii-input" value={duaForm.category_id} onChange={e => setDuaForm(f => ({...f, category_id: e.target.value}))}>
                    <option value="">-- ক্যাটাগরি বেছে নিন --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_bn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("রেফারেন্স","Reference")}</label>
                  <input className="bii-input" placeholder="যেমন: সহীহ বুখারী ১/১২৩" value={duaForm.source} onChange={e => setDuaForm(f => ({...f, source: e.target.value}))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("আরবি টেক্সট *","Arabic Text *")}</label>
                  <textarea
                    className="bii-input text-right font-arabic text-xl leading-loose"
                    rows={3} dir="rtl"
                    placeholder="আরবি দোয়া এখানে লিখুন..."
                    value={duaForm.arabic_text}
                    onChange={e => setDuaForm(f => ({...f, arabic_text: e.target.value}))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("উচ্চারণ (বাংলা)","Transliteration (Bengali)")}</label>
                  <textarea className="bii-input" rows={2} placeholder="বাংলায় উচ্চারণ..." value={duaForm.transliteration} onChange={e => setDuaForm(f => ({...f, transliteration: e.target.value}))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("অনুবাদ (বাংলা)","Translation (Bengali)")}</label>
                  <textarea className="bii-input" rows={3} placeholder="দোয়ার অর্থ বাংলায়..." value={duaForm.meaning_bn} onChange={e => setDuaForm(f => ({...f, meaning_bn: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">কখন পড়তে হয়</label>
                  <input className="bii-input" placeholder="যেমন: ঘুমানোর আগে" value={duaForm.when_to_read} onChange={e => setDuaForm(f => ({...f, when_to_read: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">ক্রম (sort_order)</label>
                  <input type="number" className="bii-input" value={duaForm.sort_order} onChange={e => setDuaForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">ফজিলত</label>
                  <textarea className="bii-input" rows={2} placeholder="এই দোয়ার ফজিলত..." value={duaForm.fazilat} onChange={e => setDuaForm(f => ({...f, fazilat: e.target.value}))} />
                </div>
              </div>

              {/* টগল */}
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={duaForm.is_today_dua} onChange={e => setDuaForm(f => ({...f, is_today_dua: e.target.checked}))} className="sr-only" />
                  <div className={`w-11 h-6 rounded-full transition ${duaForm.is_today_dua ? "bg-yellow-400" : "bg-gray-300"} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${duaForm.is_today_dua ? "left-6" : "left-1"}`} />
                  </div>
                  <span className="text-sm">⭐ আজকের দোয়া</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={duaForm.is_featured} onChange={e => setDuaForm(f => ({...f, is_featured: e.target.checked}))} className="sr-only" />
                  <div className={`w-11 h-6 rounded-full transition ${duaForm.is_featured ? "bg-[var(--bii-emerald)]" : "bg-gray-300"} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${duaForm.is_featured ? "left-6" : "left-1"}`} />
                  </div>
                  <span className="text-sm">Featured</span>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--bii-border)] flex gap-3">
              <button onClick={() => setDuaModal(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--bii-border)] text-sm font-medium hover:bg-[var(--bii-cream)] transition">বাতিল</button>
              <button onClick={saveDua} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white text-sm font-medium hover:bg-[var(--bii-emerald)]/90 transition disabled:opacity-50">
                {saving ? "..." : duaModal === "new" ? pick("দোয়া যোগ করুন","Add Dua") : pick("আপডেট","Update")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ক্যাটাগরি মোডাল ── */}
      {catModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--bii-border)]">
              <h3 className="font-heading font-semibold text-lg">{catModal === "new" ? "নতুন ক্যাটাগরি" : "ক্যাটাগরি সম্পাদনা"}</h3>
              <button onClick={() => setCatModal(null)} className="p-2 rounded-lg hover:bg-[var(--bii-cream)]"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {catErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{catErr}</div>}
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">নাম *</label>
                <input className="bii-input" placeholder="ক্যাটাগরির নাম" value={catForm.name_bn} onChange={e => setCatForm(f => ({...f, name_bn: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">আইকন (ইমোজি)</label>
                  <input className="bii-input text-2xl" placeholder="🤲" value={catForm.icon} onChange={e => setCatForm(f => ({...f, icon: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">রঙ</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-14 rounded-lg border border-[var(--bii-border)] cursor-pointer" value={catForm.color || "#10b981"} onChange={e => setCatForm(f => ({...f, color: e.target.value}))} />
                    <input className="bii-input flex-1 font-mono text-sm" value={catForm.color || ""} onChange={e => setCatForm(f => ({...f, color: e.target.value}))} placeholder="#10b981" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">বিবরণ</label>
                <input className="bii-input" placeholder="ক্যাটাগরির বিবরণ" value={catForm.description} onChange={e => setCatForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">ক্রম</label>
                <input type="number" className="bii-input" value={catForm.sort_order} onChange={e => setCatForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--bii-border)] flex gap-3">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--bii-border)] text-sm font-medium hover:bg-[var(--bii-cream)] transition">বাতিল</button>
              <button onClick={saveCat} disabled={catSaving} className="flex-1 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                {catSaving ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

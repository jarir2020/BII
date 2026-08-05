import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, PencilSimple, Trash, Books, FilePdf, FileHtml, File, BookOpen,
  CaretLeft, CaretRight, MagnifyingGlass, Star, X,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";
import ImageUpload from "../../components/ImageUpload";
import FileUpload from "../../components/FileUpload";

const CATEGORIES = [
  "general", "islamic", "science", "history", "literature",
  "self_help", "philosophy", "business", "children", "biography",
  "health", "technology",
];

const FILE_ICONS = { pdf: FilePdf, epub: BookOpen, html: FileHtml, htm: FileHtml };

const EMPTY = {
  title_bn: "", title_en: "", author_bn: "", author_en: "",
  category: "general", description: "", cover_image: "",
  file_url: "", file_type: "", file_size: 0,
  is_published: true, is_featured: false, sort_order: 0,
};

export default function AdminLibrary() {
  const { pick } = useLang();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState(null); // book id or null
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const PER = 20;

  const load = useCallback((p, q) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PER, skip: p * PER });
    if (q) params.set("search", q);
    api.get(`/library/books?${params}`)
      .then(r => {
        const d = r.data;
        if (Array.isArray(d)) { setBooks(d); setTotal(d.length); }
        else { setBooks(d.books || []); setTotal(d.total || 0); }
      })
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = { ...form };
      if (editing) {
        await api.put(`/library/books/${editing}`, payload);
        setMsg(pick("সফলভাবে আপডেট হয়েছে!", "Updated successfully!"));
      } else {
        await api.post("/library/books", payload);
        setMsg(pick("সফলভাবে তৈরি হয়েছে!", "Created successfully!"));
      }
      setForm({ ...EMPTY });
      setEditing(null);
      load(page, search);
    } catch (e2) {
      setMsg(formatApiError(e2));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (book) => {
    setForm({
      title_bn: book.title_bn || "",
      title_en: book.title_en || "",
      author_bn: book.author_bn || "",
      author_en: book.author_en || "",
      category: book.category || "general",
      description: book.description || "",
      cover_image: book.cover_image || "",
      file_url: book.file_url || "",
      file_type: book.file_type || "",
      file_size: book.file_size || 0,
      is_published: book.is_published,
      is_featured: book.is_featured,
      sort_order: book.sort_order || 0,
    });
    setEditing(book.id);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/library/books/${id}`);
      setConfirmDel(null);
      load(page, search);
    } catch (e2) {
      setMsg(formatApiError(e2));
    }
  };

  const cancelEdit = () => { setEditing(null); setForm({ ...EMPTY }); setMsg(""); };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div data-testid="admin-library" className="space-y-6">
      <h1 className="font-heading text-xl text-[var(--bii-emerald)] flex items-center gap-2">
        <Books size={24} weight="duotone" />
        {pick("লাইব্রেরি — বইসমূহ", "Library — Books")}
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bii-card p-5 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-sm text-[var(--bii-emerald)]">
            {editing ? pick("বই এডিট করুন", "Edit Book") : pick("নতুন বই যোগ করুন", "Add New Book")}
          </h2>
          {editing && (
            <button type="button" onClick={cancelEdit}
              className="text-xs text-[var(--bii-text-soft)] hover:text-red-600 flex items-center gap-1">
              <X size={14} /> {pick("বাতিল", "Cancel")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">{pick("বাংলা শিরোনাম", "Bengali Title")} *</label>
            <input className="bii-input w-full mt-1" value={form.title_bn} onChange={e => set("title_bn", e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">{pick("ইংরেজি শিরোনাম", "English Title")}</label>
            <input className="bii-input w-full mt-1" value={form.title_en} onChange={e => set("title_en", e.target.value)} />
          </div>

          {/* Author */}
          <div>
            <label className="text-sm font-medium">{pick("লেখক (বাংলা)", "Author (Bengali)")}</label>
            <input className="bii-input w-full mt-1" value={form.author_bn} onChange={e => set("author_bn", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">{pick("লেখক (ইংরেজি)", "Author (English)")}</label>
            <input className="bii-input w-full mt-1" value={form.author_en} onChange={e => set("author_en", e.target.value)} />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium">{pick("ক্যাটাগরি", "Category")}</label>
            <select className="bii-input w-full mt-1" value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="text-sm font-medium">{pick("ক্রম", "Sort Order")}</label>
            <input type="number" className="bii-input w-full mt-1" value={form.sort_order} onChange={e => set("sort_order", parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium">{pick("বিবরণ", "Description")}</label>
          <textarea className="bii-input w-full mt-1" rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        {/* Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload
            label={pick("কভার ছবি", "Cover Image")}
            value={form.cover_image}
            onChange={v => set("cover_image", v)}
          />
          <FileUpload
            label={pick("ডকুমেন্ট ফাইল", "Document File")}
            value={form.file_url ? { url: form.file_url, file_type: form.file_type, file_size: form.file_size } : null}
            onChange={v => {
              if (v) { set("file_url", v.url); set("file_type", v.file_type); set("file_size", v.file_size); }
              else { set("file_url", ""); set("file_type", ""); set("file_size", 0); }
            }}
          />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--bii-border)] text-[var(--bii-emerald)] focus:ring-[var(--bii-emerald)]" />
            {pick("প্রকাশিত", "Published")}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => set("is_featured", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--bii-border)] text-[var(--bii-gold)] focus:ring-[var(--bii-gold)]" />
            <Star size={14} className="text-[var(--bii-gold)]" /> {pick("বিশেষ", "Featured")}
          </label>
        </div>

        {msg && <div className={`text-sm ${msg.includes("Error") || msg.includes("fail") ? "text-red-600" : "text-green-600"}`}>{msg}</div>}

        <button type="submit" disabled={saving} className="bii-btn-primary inline-flex items-center gap-2 text-sm">
          {saving ? pick("সেভ হচ্ছে...", "Saving...") : editing ? pick("আপডেট করুন", "Update") : pick("যোগ করুন", "Add Book")}
        </button>
      </form>

      {/* List */}
      <div className="bii-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-[var(--bii-cream)] rounded-xl px-3 py-2">
            <MagnifyingGlass size={16} className="text-[var(--bii-text-soft)]" />
            <input className="flex-1 bg-transparent text-sm outline-none" placeholder={pick("বই খুঁজুন...", "Search books...")}
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <span className="text-xs text-[var(--bii-text-soft)]">{total} {pick("টি বই", "books")}</span>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-[var(--bii-border)] rounded-xl animate-pulse" />)}</div>
        ) : books.length === 0 ? (
          <p className="text-center text-[var(--bii-text-soft)] py-8">{pick("কোনো বই পাওয়া যায়নি", "No books found")}</p>
        ) : (
          <div className="space-y-2">
            {books.map(b => {
              const Icon = FILE_ICONS[b.file_type] || File;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--bii-border)] hover:border-[var(--bii-emerald)]/30 transition">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bii-emerald)]/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} weight="duotone" className="text-[var(--bii-emerald)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--bii-text)] truncate">
                      {pick(b.title_bn, b.title_en) || b.title_en}
                    </p>
                    <p className="text-xs text-[var(--bii-text-soft)]">
                      {b.author_en || b.author_bn || "—"} · {b.category} · {b.file_type?.toUpperCase() || "—"}
                      {b.file_size > 0 && ` · ${formatSize(b.file_size)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!b.is_published && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{pick("ড্রাফট", "Draft")}</span>
                    )}
                    {b.is_featured && <Star size={12} weight="fill" className="text-[var(--bii-gold)]" />}
                    <button onClick={() => handleEdit(b)} className="p-2 rounded-lg hover:bg-[var(--bii-cream)] transition" title="Edit">
                      <PencilSimple size={15} className="text-[var(--bii-text-soft)]" />
                    </button>
                    <button onClick={() => setConfirmDel(b.id)} className="p-2 rounded-lg hover:bg-red-50 transition" title="Delete">
                      <Trash size={15} className="text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > PER && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-[var(--bii-border)] disabled:opacity-40">
              <CaretLeft size={16} />
            </button>
            <span className="text-xs text-[var(--bii-text-soft)]">{page + 1} / {Math.ceil(total / PER)}</span>
            <button disabled={(page + 1) * PER >= total} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-[var(--bii-border)] disabled:opacity-40">
              <CaretRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg mb-2">{pick("মুছে ফেলতে চান?", "Delete this book?")}</h3>
            <p className="text-sm text-[var(--bii-text-soft)] mb-4">{pick("এই কাজটি ফেরানো যাবে না।", "This action cannot be undone.")}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--bii-border)]">
                {pick("বাতিল", "Cancel")}
              </button>
              <button onClick={() => handleDelete(confirmDel)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
                {pick("মুছে ফেলুন", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

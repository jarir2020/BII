import React, { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { api, imgUrl } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export default function AdminMediaLibrary() {
  const { pick } = useLang();
  const [files, setFiles] = useState([]);
  const reload = () => api.get("/media").then((r) => setFiles(Array.isArray(r.data) ? r.data : []));
  useEffect(() => { reload(); }, []);
  const del = async (id) => { if (!window.confirm(pick("ডিলিট?","Delete?"))) return; await api.delete(`/media/${id}`); reload(); };

  return (
    <div data-testid="admin-media-page">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-4">{pick("মিডিয়া লাইব্রেরি","Media Library")}</h1>
      <div className="text-sm text-[var(--bii-text-soft)] mb-3">মোট ফাইল: {files.length} • আপলোড অন্য পেজ থেকে করুন (কোর্স, পোস্ট, ইত্যাদি)</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {files.map((f) => (
          <div key={f.id} className="bii-card overflow-hidden relative group" data-testid={`media-${f.id}`}>
            <div className="aspect-square bg-[var(--bii-cream)] overflow-hidden">
              {f.content_type?.startsWith("image/")
                ? <img src={imgUrl(f.url)} alt="" className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full text-xs text-[var(--bii-text-soft)]">{f.content_type}</div>}
            </div>
            <div className="p-2 text-[11px] truncate">{f.original_filename}</div>
            <button onClick={() => del(f.id)} className="absolute top-1 right-1 bg-red-700/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition" data-testid={`media-del-${f.id}`}>
              <Trash size={14} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

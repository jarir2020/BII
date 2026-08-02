import React, { useEffect, useState } from "react";
import { PencilSimple, Trash, Plus, X, Images } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import ImageUpload from "./ImageUpload";

/**
 * Generic CRUD admin page.
 *   resource: backend collection name (e.g. "hadiths")
 *   title:    section title
 *   fields:   [{ name, label, type, placeholder, required, options }]
 *     types: text, textarea, number, checkbox, image, select, url, date, datetime-local, color
 *   listColumns: keys to show in the list (defaults: title_bn|name_bn|title|name)
 */
export default function CrudResource({ resource, title, fields, listColumns, idField = "id", initial = {} }) {
  const { pick } = useLang();
  const empty = Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === "checkbox" ? false : f.type === "number" ? 0 : "")]));
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  const reload = () => api.get(`/${resource}`).then((r) => setItems(r.data));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [resource]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const body = { ...form };
      // coerce number fields
      fields.forEach((f) => { if (f.type === "number") body[f.name] = Number(body[f.name] || 0); });
      if (editing) await api.put(`/${resource}/${editing}`, body);
      else await api.post(`/${resource}`, body);
      setForm(empty); setEditing(null); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
  };

  const startEdit = (item) => {
    setEditing(item[idField]);
    setForm({ ...empty, ...item });
  };

  const del = async (id) => {
    if (!window.confirm(pick("ডিলিট করবেন?", "Delete this item?"))) return;
    await api.delete(`/${resource}/${id}`);
    reload();
  };

  const previewKey = listColumns?.[0] || (fields.find((f) => f.preview)?.name) || "title_bn";
  const subKey = listColumns?.[1];
  const imgKey = fields.find((f) => f.type === "image")?.name;

  return (
    <div data-testid={`admin-${resource}-page`} className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={submit} className="bii-card p-5 space-y-3 self-start sticky top-4">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">
          {editing ? pick(`${title} সম্পাদনা`, `Edit ${title}`) : pick(`নতুন ${title}`, `New ${title}`)}
        </h2>
        {fields.map((f) => (
          <FieldRender
            key={f.name}
            field={f}
            value={form[f.name]}
            onChange={(v) => setForm({ ...form, [f.name]: v })}
            testid={`${resource}-${f.name}`}
          />
        ))}
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        <div className="flex gap-2">
          <button data-testid={`${resource}-submit-btn`} className="bii-btn-primary flex-1">
            <Plus size={16} className="inline" /> {editing ? pick("আপডেট", "Update") : pick("যোগ করুন", "Add")}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="bii-btn-gold">
              <X size={16} className="inline" /> {pick("বাতিল", "Cancel")}
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <div className="text-sm text-[var(--bii-text-soft)]">{pick("মোট:", "Total:")} {items.length}</div>
        {items.length === 0 && <div className="bii-card p-5 text-center text-[var(--bii-text-soft)] italic">{pick("কোন এন্ট্রি নেই", "No entries")}</div>}
        {items.map((item) => (
          <div key={item[idField]} className="bii-card p-4 flex flex-col gap-3" data-testid={`${resource}-item-${item[idField]}`}>
            <div className="flex gap-3">
              {imgKey && item[imgKey] && (
                <img src={imgUrl(item[imgKey])} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-heading text-[var(--bii-emerald)] truncate">{item[previewKey] || item.title || item.name || item.id}</div>
                {subKey && <div className="text-xs text-[var(--bii-text-soft)] truncate">{item[subKey]}</div>}
                {listColumns?.[2] && item[listColumns[2]] && (
                  <div className="text-xs text-[var(--bii-text-soft)] truncate">{item[listColumns[2]]}</div>
                )}
                {item.price != null && <div className="text-sm mt-1 font-medium">৳ {item.price}</div>}
              </div>
            </div>
            {/* Edit / Delete buttons — always visible */}
            <div className="flex gap-2 border-t border-[var(--bii-border)] pt-2">
              <button
                data-testid={`${resource}-edit-${item[idField]}`}
                onClick={() => { startEdit(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-lg bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)] hover:text-white transition"
              >
                <PencilSimple size={16} weight="bold" /> {pick("এডিট করুন", "Edit")}
              </button>
              <button
                data-testid={`${resource}-del-${item[idField]}`}
                onClick={() => del(item[idField])}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
              >
                <Trash size={16} weight="bold" /> {pick("ডিলিট করুন", "Delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiImageUpload({ value, onChange, label, max = 4 }) {
  // value is an array of URLs (up to `max`)
  const imgs = Array.isArray(value) ? value : (value ? [value] : []);
  const slots = Array.from({ length: max }, (_, i) => imgs[i] || "");

  const handleSlot = (idx, url) => {
    const next = [...slots];
    next[idx] = url;
    onChange(next.filter((u) => u)); // store only non-empty
  };

  return (
    <div>
      {label && (
        <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
          <Images size={16} weight="duotone" className="text-[var(--bii-emerald)]" />
          {label} <span className="text-[var(--bii-text-soft)] text-xs">({pick(`সর্বোচ্চ ${max}টি`, `max ${max}`)})</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {slots.map((url, i) => (
          <ImageUpload
            key={i}
            value={url}
            onChange={(u) => handleSlot(i, u)}
            label={pick(`ছবি ${i + 1}`, `Image ${i + 1}`)}
            testid={`multi-img-${i}`}
          />
        ))}
      </div>
    </div>
  );
}

function FieldRender({ field, value, onChange, testid }) {
  const { name, label, type = "text", placeholder, required, options, rows, max } = field;
  if (type === "image") {
    return <ImageUpload value={value} onChange={onChange} label={label} testid={`${testid}-upload`} />;
  }
  if (type === "images") {
    return <MultiImageUpload value={value} onChange={onChange} label={label} max={max || 4} />;
  }
  if (type === "json-display") {
    let display = value;
    if (Array.isArray(value)) {
      display = value.map((item, i) => {
        if (typeof item === "object") {
          return `${i + 1}. ${item.product_name || item.name || ""} ×${item.qty || 1} — ৳${item.subtotal || item.unit_price || 0}`;
        }
        return String(item);
      }).join("\n");
    } else if (typeof value === "object" && value !== null) {
      display = JSON.stringify(value, null, 2);
    }
    return (
      <div>
        {label && <div className="text-sm font-medium mb-1">{label}</div>}
        <pre className="bii-input text-xs bg-[var(--bii-cream)] min-h-[60px] whitespace-pre-wrap break-words font-mono">
          {display || "—"}
        </pre>
      </div>
    );
  }
  if (type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input data-testid={testid} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  if (type === "textarea") {
    return (
      <div>
        {label && <div className="text-sm font-medium mb-1">{label}</div>}
        <textarea data-testid={testid} className="bii-input min-h-[100px]" rows={rows || 4} placeholder={placeholder || label} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} />
      </div>
    );
  }
  if (type === "select") {
    return (
      <div>
        {label && <div className="text-sm font-medium mb-1">{label}</div>}
        <select data-testid={testid} className="bii-input" value={value || ""} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">— বাছাই করুন —</option>
          {(options || []).map((o) => (
            <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (type === "color") {
    return (
      <div>
        {label && <div className="text-sm font-medium mb-1">{label}</div>}
        <div className="flex items-center gap-2">
          <input data-testid={testid} type="color" className="w-12 h-10 rounded border border-[var(--bii-border)] cursor-pointer" value={value || "#0A422B"} onChange={(e) => onChange(e.target.value)} />
          <input className="bii-input flex-1" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#0A422B" />
        </div>
      </div>
    );
  }
  return (
    <div>
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      <input
        data-testid={testid}
        type={type}
        className="bii-input"
        placeholder={placeholder || label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

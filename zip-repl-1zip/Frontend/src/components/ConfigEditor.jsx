import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useLang } from "../contexts/LangContext";

/**
 * Single-document configuration editor — /api/configs/{key}
 *   fields: [{ name, label, type, placeholder }]
 */
export default function ConfigEditor({ configKey, title, description, fields }) {
  const { pick: selectText } = useLang();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/configs/${configKey}`)
      .then((r) => setData(r.data || {}))
      .catch(() => setData({}));
  }, [configKey]);

  if (!data) return <div className="text-center py-6 text-[var(--bii-text-soft)]">{selectText("লোড হচ্ছে...", "Loading...")}</div>;

  const set = (k, v) => setData({ ...data, [k]: v });

  const save = async () => {
    setErr(""); setOk(""); setSaving(true);
    try {
      await api.put(`/configs/${configKey}`, data);
      setOk(selectText("সফলভাবে সংরক্ষিত হয়েছে", "Saved successfully"));
      setTimeout(() => setOk(""), 2500);
    } catch (e) { setErr(formatApiError(e)); } finally { setSaving(false); }
  };

  return (
    <div data-testid={`config-${configKey}`} className="max-w-2xl">
      <div className="bii-card p-6 space-y-4">
        <div>
          <h2 className="font-heading text-2xl text-[var(--bii-emerald)]">{title}</h2>
          {description && <p className="text-sm text-[var(--bii-text-soft)] mt-1">{description}</p>}
        </div>
        {fields.map((f) => (
          <Renderer key={f.name} field={f} value={data[f.name] ?? f.default ?? ""} onChange={(v) => set(f.name, v)} testid={`cfg-${configKey}-${f.name}`} />
        ))}
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        {ok && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{ok}</div>}
        <button data-testid={`cfg-${configKey}-save`} onClick={save} disabled={saving} className="bii-btn-primary w-full">
          {saving ? selectText("সংরক্ষণ হচ্ছে...", "Saving...") : selectText("সংরক্ষণ করুন", "Save")}
        </button>
      </div>
    </div>
  );
}

function Renderer({ field, value, onChange, testid }) {
  const { pick: selectText } = useLang();
  const { name, label, type = "text", placeholder, options } = field;
  if (type === "heading") {
    return (
      <div className="pt-2 pb-1 border-t border-[var(--bii-border)]">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-[var(--bii-emerald)]">{label}</div>
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
        <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
        <textarea data-testid={testid} className="bii-input min-h-[100px]" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    );
  }
  if (type === "select") {
    return (
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
        <select data-testid={testid} className="bii-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">{selectText("— বাছাই —", "— Select —")}</option>
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
        <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <input data-testid={testid} type="color" className="w-12 h-10 rounded border border-[var(--bii-border)] cursor-pointer" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} />
          <input className="bii-input flex-1 font-mono text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{label}</div>
      <input
        data-testid={testid}
        type={type}
        className="bii-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

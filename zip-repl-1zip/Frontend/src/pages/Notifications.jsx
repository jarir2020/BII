import React, { useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { api } from "../lib/api";
import BottomBanner from "../components/BottomBanner";

export default function Notifications() {
  const { t, pick } = useLang();
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notifications").then((r) => setItems(r.data)); }, []);

  return (
    <div data-testid="notifications-page" className="pb-16 sm:pb-24">
      <h1 className="font-heading text-3xl text-[var(--bii-emerald)] mb-6 flex items-center gap-2">
        <Bell size={32} weight="duotone" /> {t("menuNotifications")}
      </h1>
      {items.length === 0 && <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">{pick("কোন নোটিফিকেশন নেই", "No notifications yet")}</div>}
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="bii-card p-5" data-testid={`notif-${n.id}`}>
            <h3 className="font-heading text-lg text-[var(--bii-emerald)]">{pick(n.title_bn, n.title_en)}</h3>
            <p className="text-sm text-[var(--bii-text-soft)] mt-1">{pick(n.body_bn, n.body_en)}</p>
            <div className="text-xs text-[var(--bii-text-soft)] mt-2">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <BottomBanner slot="notifications-bottom" />
    </div>
  );
}

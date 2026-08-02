import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FileText, ShieldCheck, CurrencyCircleDollar, ArrowLeft } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useLang } from "../contexts/LangContext";

const DOCS = {
  terms: {
    icon: FileText,
    title_bn: "ব্যবহারের শর্তাবলী",
    title_en: "Terms of Service",
    desc_bn: "এই প্ল্যাটফর্ম ব্যবহার করে আপনি নিচের শর্তগুলো মেনে নিচ্ছেন।",
    defaultContent_bn: `**বাঙালি ইসলামিক ইনস্টিটিউট — ব্যবহারের শর্তাবলী**

সর্বশেষ আপডেট: ২০২৫

**১. সেবা গ্রহণ**
এই ওয়েবসাইট ও অ্যাপ ব্যবহার করে আপনি নিম্নোক্ত শর্তাবলী মেনে নিচ্ছেন।

**২. নিবন্ধন**
সঠিক ও হালনাগাদ তথ্য প্রদান করতে হবে। মিথ্যা তথ্য দিয়ে নিবন্ধন করলে অ্যাকাউন্ট বাতিল করা হবে।

**৩. পেমেন্ট**
কোর্স ফি পরিশোধের পর রিফান্ড পলিসি অনুযায়ী রিফান্ড প্রদান করা হবে। পেমেন্ট যাচাই করার পর ভর্তি নিশ্চিত করা হবে।

**৪. কন্টেন্ট**
প্ল্যাটফর্মের সকল কোর্স, ভিডিও এবং উপকরণ বাঙালি ইসলামিক ইনস্টিটিউটের সম্পদ। অনুমতি ছাড়া শেয়ার বা বিক্রি করা যাবে না।

**৫. আচরণবিধি**
অন্য ব্যবহারকারীর সাথে সম্মানজনক আচরণ করতে হবে। ইসলামী আদব মেনে চলতে হবে।

**৬. পরিবর্তন**
আমরা যেকোনো সময় শর্তাবলী পরিবর্তন করার অধিকার রাখি।`,
  },
  privacy: {
    icon: ShieldCheck,
    title_bn: "গোপনীয়তা নীতি",
    title_en: "Privacy Policy",
    desc_bn: "আপনার তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত করা হয়।",
    defaultContent_bn: `**বাঙালি ইসলামিক ইনস্টিটিউট — গোপনীয়তা নীতি**

সর্বশেষ আপডেট: ২০২৫

**১. তথ্য সংগ্রহ**
আমরা নিম্নোক্ত তথ্য সংগ্রহ করি:
- নাম, ইমেইল, ফোন নম্বর (নিবন্ধনের সময়)
- পেমেন্ট তথ্য (ট্রানজেকশন ID, পদ্ধতি)
- কোর্স অগ্রগতি ও কার্যক্রম
- ডিভাইস তথ্য ও ব্রাউজার লগ

**২. তথ্য ব্যবহার**
সংগৃহীত তথ্য ব্যবহার করা হয়:
- কোর্স প্রদান ও সেবা উন্নয়নে
- পেমেন্ট যাচাই ও এনরোলমেন্টে
- গুরুত্বপূর্ণ আপডেট ও বিজ্ঞপ্তি পাঠাতে

**৩. তথ্য শেয়ার**
আমরা কখনো আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না। শুধুমাত্র পেমেন্ট গেটওয়ে প্রসেসিংয়ের জন্য প্রয়োজনীয় তথ্য শেয়ার করা হয়।

**৪. কুকিজ**
এই ওয়েবসাইট সেশন ও প্রেফারেন্স সংরক্ষণের জন্য কুকিজ ব্যবহার করে।

**৫. নিরাপত্তা**
আপনার তথ্য এনক্রিপ্টেড সার্ভারে সংরক্ষিত। আমরা শিল্প-মানের নিরাপত্তা পদ্ধতি অনুসরণ করি।

**৬. যোগাযোগ**
গোপনীয়তা সংক্রান্ত প্রশ্নে: contact@bii.edu.bd`,
  },
  refund: {
    icon: CurrencyCircleDollar,
    title_bn: "রিফান্ড নীতি",
    title_en: "Refund Policy",
    desc_bn: "কোর্স ফি ফেরত পাওয়ার নিয়মকানুন।",
    defaultContent_bn: `**বাঙালি ইসলামিক ইনস্টিটিউট — রিফান্ড নীতি**

সর্বশেষ আপডেট: ২০২৫

**রিফান্ড যোগ্য পরিস্থিতি:**
- পেমেন্ট করার পর ৭ দিনের মধ্যে কোর্স শুরু না হলে
- ডুপ্লিকেট পেমেন্ট বা ভুলবশত অতিরিক্ত পেমেন্ট
- আমাদের পক্ষ থেকে কোর্স বাতিল

**রিফান্ড যোগ্য নয়:**
- কোর্সের ৩০% বা তার বেশি সম্পন্ন হলে
- অ্যাকাউন্ট নীতি লঙ্ঘনের কারণে বাতিল হলে
- ডিজিটাল কন্টেন্ট ডাউনলোড করার পর

**রিফান্ড প্রক্রিয়া:**
১. support@bii.edu.bd তে ইমেইল করুন
২. ট্রানজেকশন ID ও কারণ উল্লেখ করুন
৩. ৭-১০ কার্যদিবসের মধ্যে একই মাধ্যমে ফেরত দেওয়া হবে

**যোগাযোগ:**
সমস্যা হলে আমাদের সাথে যোগাযোগ করুন — আমরা সর্বদা সহায়তা করতে প্রস্তুত।`,
  },
};

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export default function Legal() {
  const { doc } = useParams();
  const navigate = useNavigate();
  const { pick } = useLang();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const meta = DOCS[doc] || DOCS.terms;
  const Icon = meta.icon;

  useEffect(() => {
    setLoading(true);
    api.get(`/configs/legal_${doc || "terms"}`)
      .then((r) => setContent(r.data))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [doc]);

  const displayContent =
    content?.content_bn ||
    content?.content_en ||
    meta.defaultContent_bn;

  return (
    <div className="max-w-3xl mx-auto py-4" data-testid={`legal-${doc}`}>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[var(--bii-text-soft)] text-sm mb-4 hover:text-[var(--bii-emerald)] transition-colors"
      >
        <ArrowLeft size={15} weight="bold" /> ফিরে যান
      </button>

      {/* Tab strip */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(DOCS).map(([key, d]) => {
          const DIcon = d.icon;
          return (
            <Link
              key={key}
              to={`/legal/${key}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                (doc || "terms") === key
                  ? "bg-[var(--bii-emerald)] text-white border-transparent"
                  : "border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream)]"
              }`}
            >
              <DIcon size={15} weight={doc === key ? "fill" : "regular"} />
              {pick(d.title_bn, d.title_en)}
            </Link>
          );
        })}
      </div>

      {/* Content card */}
      <div className="bii-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[var(--bii-emerald)]/10 flex items-center justify-center">
            <Icon size={24} weight="duotone" className="text-[var(--bii-emerald)]" />
          </div>
          <div>
            <h1 className="font-heading text-xl text-[var(--bii-emerald)]">
              {pick(meta.title_bn, meta.title_en)}
            </h1>
            <p className="text-xs text-[var(--bii-text-soft)]">{meta.desc_bn}</p>
          </div>
        </div>

        <div className="gold-divider mb-5" />

        {loading ? (
          <div className="text-center py-8 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-[var(--bii-text)] leading-relaxed space-y-2 legal-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
          />
        )}

        {content?.updated_at && (
          <p className="text-xs text-[var(--bii-text-soft)] mt-6 pt-4 border-t border-[var(--bii-border)]">
            সর্বশেষ আপডেট: {new Date(content.updated_at).toLocaleDateString("bn-BD")}
          </p>
        )}
      </div>
    </div>
  );
}

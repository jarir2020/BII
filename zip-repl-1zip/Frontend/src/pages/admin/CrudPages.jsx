import React from "react";
import CrudResource from "../../components/CrudResource";
import { useLang } from "../../contexts/LangContext";

// Generic CRUD pages
export const AdminCategories = () => (
  <CrudResource resource="course_categories" title="কোর্স ক্যাটাগরি" fields={[
    { name: "name_bn", label: "বাংলা নাম", required: true, preview: true },
    { name: "name_en", label: "English name" },
    { name: "icon", label: "আইকন (ইমোজি বা SVG class)" },
    { name: "description", label: "বিবরণ", type: "textarea" },
    { name: "cover_image", label: "কভার ছবি", type: "image" },
    { name: "sort_order", label: "ক্রম (সংখ্যা)", type: "number" },
  ]} listColumns={["name_bn", "name_en"]} />
);

export const AdminChapters = () => (
  <CrudResource resource="chapters" title="চ্যাপ্টার" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "title_en", label: "English title" },
    { name: "course_id", label: "কোর্স আইডি" },
    { name: "sort_order", label: "ক্রম", type: "number" },
    { name: "description", label: "বিবরণ", type: "textarea" },
  ]} listColumns={["title_bn", "course_id"]} />
);

export const AdminLessons = () => (
  <CrudResource resource="lessons" title="লেসন" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "title_en", label: "English title" },
    { name: "chapter_id", label: "চ্যাপ্টার আইডি" },
    { name: "course_id", label: "কোর্স আইডি" },
    { name: "video_url", label: "ভিডিও URL", type: "url" },
    { name: "duration_minutes", label: "সময় (মিনিট)", type: "number" },
    { name: "content_bn", label: "বাংলা কন্টেন্ট", type: "textarea" },
    { name: "is_published", label: "প্রকাশিত", type: "checkbox" },
  ]} />
);

export const AdminPdfs = () => (
  <CrudResource resource="pdfs" title="PDF ফাইল" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "title_en", label: "English title" },
    { name: "course_id", label: "কোর্স আইডি (ঐচ্ছিক)" },
    { name: "file_url", label: "PDF ফাইল URL (আপলোড: মিডিয়া পেজ থেকে)", type: "url" },
    { name: "cover_image", label: "কভার ছবি", type: "image" },
    { name: "description", label: "বিবরণ", type: "textarea" },
  ]} />
);

export const AdminAssignments = () => (
  <CrudResource resource="assignments" title="অ্যাসাইনমেন্ট" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "course_id", label: "কোর্স আইডি" },
    { name: "instructions", label: "নির্দেশনা", type: "textarea" },
    { name: "due_date", label: "জমা দেওয়ার শেষ তারিখ", type: "date" },
    { name: "marks", label: "নম্বর", type: "number" },
  ]} />
);

export const AdminExams = () => (
  <CrudResource resource="exams" title="পরীক্ষা" fields={[
    { name: "title_bn", label: "বাংলা নাম", required: true, preview: true },
    { name: "course_id", label: "কোর্স আইডি" },
    { name: "duration_minutes", label: "সময় (মিনিট)", type: "number" },
    { name: "total_marks", label: "মোট নম্বর", type: "number" },
    { name: "passing_marks", label: "পাশ নম্বর", type: "number" },
    { name: "starts_at", label: "শুরু", type: "datetime-local" },
    { name: "ends_at", label: "শেষ", type: "datetime-local" },
    { name: "description", label: "বিবরণ", type: "textarea" },
  ]} />
);

export const AdminResults = () => (
  <CrudResource resource="results" title="ফলাফল" fields={[
    { name: "student_id", label: "Student ID", required: true, preview: true },
    { name: "student_name", label: "ছাত্রের নাম" },
    { name: "exam_id", label: "পরীক্ষা আইডি" },
    { name: "exam_title", label: "পরীক্ষার নাম" },
    { name: "marks_obtained", label: "প্রাপ্ত নম্বর", type: "number" },
    { name: "total_marks", label: "মোট নম্বর", type: "number" },
    { name: "grade", label: "গ্রেড (A+/A/B...)" },
    { name: "passed", label: "পাশ", type: "checkbox" },
  ]} listColumns={["student_name", "exam_title"]} />
);

export const AdminCertificates = () => (
  <CrudResource resource="certificates" title="সার্টিফিকেট" fields={[
    { name: "title_bn", label: "শিরোনাম", required: true, preview: true },
    { name: "student_id", label: "Student ID" },
    { name: "student_name", label: "ছাত্রের নাম" },
    { name: "course_title", label: "কোর্সের নাম" },
    { name: "issued_date", label: "ইস্যু তারিখ", type: "date" },
    { name: "certificate_image", label: "সার্টিফিকেট ছবি", type: "image" },
  ]} />
);

export const AdminRecorded = () => (
  <CrudResource resource="recorded_classes" title="রেকর্ডেড ক্লাস" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "title_en", label: "English title" },
    { name: "course_id", label: "কোর্স আইডি" },
    { name: "video_url", label: "ভিডিও URL (YouTube/Direct)", required: true },
    { name: "thumbnail", label: "থাম্বনেইল", type: "image" },
    { name: "recorded_date", label: "রেকর্ডের তারিখ", type: "date" },
    { name: "description", label: "বিবরণ", type: "textarea" },
  ]} />
);

export const AdminHadiths = () => (
  <CrudResource resource="hadiths" title="দৈনিক হাদীস" fields={[
    { name: "title_bn", label: "শিরোনাম", preview: true },
    { name: "text_arabic", label: "আরবি মূল", type: "textarea" },
    { name: "text_bn", label: "বাংলা অনুবাদ", type: "textarea", required: true },
    { name: "text_en", label: "English translation", type: "textarea" },
    { name: "reference", label: "রেফারেন্স (যেমন: সহীহ বুখারী ১/১২৩)" },
    { name: "narrator", label: "বর্ণনাকারী" },
    { name: "category", label: "ক্যাটাগরি" },
    { name: "display_date", label: "প্রদর্শন তারিখ", type: "date" },
  ]} />
);

export const AdminIslamicContent = () => (
  <CrudResource resource="islamic_content" title="ইসলামিক কন্টেন্ট" fields={[
    { name: "title_bn", label: "শিরোনাম", required: true, preview: true },
    { name: "type", label: "ধরন", type: "select", options: ["আয়াত", "দোয়া", "জিকির", "সূরা", "অন্যান্য"] },
    { name: "text_arabic", label: "আরবি", type: "textarea" },
    { name: "text_bn", label: "বাংলা অনুবাদ", type: "textarea" },
    { name: "transliteration", label: "উচ্চারণ", type: "textarea" },
    { name: "reference", label: "রেফারেন্স" },
    { name: "audio_url", label: "অডিও URL" },
  ]} />
);

export const AdminBlogs = () => (
  <CrudResource resource="blogs" title="ব্লগ পোস্ট" fields={[
    { name: "title_bn", label: "বাংলা শিরোনাম", required: true, preview: true },
    { name: "title_en", label: "English title" },
    { name: "slug", label: "URL Slug (e.g. islam-er-itihash)" },
    { name: "summary", label: "সারসংক্ষেপ", type: "textarea" },
    { name: "body_bn", label: "বাংলা বডি (Markdown OK)", type: "textarea" },
    { name: "cover_image", label: "কভার ছবি", type: "image" },
    { name: "author", label: "লেখক" },
    { name: "tags", label: "ট্যাগ (কমা দিয়ে)" },
    { name: "is_published", label: "প্রকাশিত", type: "checkbox" },
  ]} />
);

export const AdminProducts = () => (
  <CrudResource resource="products" title="প্রোডাক্ট" fields={[
    { name: "name_bn", label: "বাংলা নাম", required: true, preview: true },
    { name: "name_en", label: "English name" },
    { name: "category", label: "ক্যাটাগরি (বই, আতর, টুপি...)" },
    { name: "price", label: "মূল্য (৳)", type: "number" },
    { name: "discount_price", label: "ডিসকাউন্ট মূল্য (৳) — ছাড়ের পর দাম", type: "number" },
    { name: "stock", label: "স্টক (০ = আনলিমিটেড)", type: "number" },
    { name: "description", label: "বিবরণ", type: "textarea" },
    { name: "image", label: "প্রধান/কভার ছবি (ঐচ্ছিক)", type: "image" },
    { name: "images", label: "প্রোডাক্টের ছবি", type: "images", max: 5 },
    { name: "video_url", label: "প্রোডাক্ট ভিডিও লিংক (YouTube/Direct)", type: "url", placeholder: "https://..." },
    { name: "is_active", label: "সক্রিয়", type: "checkbox" },
    { name: "is_featured", label: "ফিচার্ড", type: "checkbox" },
  ]} listColumns={["name_bn", "category"]} />
);

export const AdminOrders = () => (
  <CrudResource resource="orders" title="অর্ডার" allowCreate={false} fields={[
    { name: "order_number", label: "অর্ডার নং", preview: true },
    { name: "customer_name", label: "কাস্টমার নাম" },
    { name: "customer_phone", label: "ফোন নম্বর" },
    { name: "user_email", label: "ইমেইল" },
    { name: "customer_address", label: "ঠিকানা", type: "textarea" },
    { name: "products", label: "অর্ডারকৃত পণ্যসমূহ", type: "json-display" },
    { name: "total", label: "মোট (৳)", type: "number" },
    { name: "payment_method", label: "পেমেন্ট পদ্ধতি", type: "select", options: ["cod","bkash","nagad"] },
    { name: "payment_number", label: "পেমেন্ট নম্বর (প্রেরক)" },
    { name: "transaction_id", label: "ট্রানজেকশন ID" },
    { name: "note", label: "কাস্টমার নোট" },
    { name: "status", label: "ডেলিভারি স্ট্যাটাস", type: "select", options: ["pending","confirmed","shipped","delivered","cancelled"] },
  ]} listColumns={["order_number", "customer_name", "status"]} />
);

export const AdminPayments = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="payments" title={pick("পেমেন্ট রেকর্ড","Payment Records")} fields={[
      { name: "transaction_id", label: pick("ট্রানজেকশন আইডি","Transaction ID"), required: true, preview: true },
      { name: "user_email", label: pick("ইউজার ইমেইল","User Email") },
      { name: "amount", label: pick("পরিমাণ","Amount"), type: "number" },
      { name: "method", label: pick("পদ্ধতি","Method"), type: "select", options: ["bkash", "nagad", "rocket", "card", "cash"] },
      { name: "status", label: pick("স্ট্যাটাস","Status"), type: "select", options: ["pending", "success", "failed", "refunded"] },
      { name: "reference", label: pick("রেফারেন্স / নোট","Reference / Note") },
    ]} />
  );
};

export const AdminBanners = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="banners" title={pick("ব্যানার","Banner")} fields={[
      { name: "title_bn", label: pick("টাইটেল","Title"), preview: true },
      { name: "subtitle", label: pick("সাবটাইটেল","Subtitle") },
      { name: "image", label: pick("ব্যানার ছবি","Banner Image"), type: "image" },
      { name: "link_url", label: "লিংক URL" },
      { name: "position", label: pick("অবস্থান","Position"), type: "select", options: ["home_top", "home_middle", "course_top", "footer"] },
      { name: "is_active", label: pick("সক্রিয়","Active"), type: "checkbox" },
    ]} />
  );
};

export const AdminSliders = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="sliders" title={pick("স্লাইডার","Slider")} fields={[
      { name: "title_bn", label: pick("টাইটেল","Title"), required: true, preview: true },
      { name: "subtitle", label: pick("সাবটাইটেল","Subtitle") },
      { name: "image", label: "ছবি", type: "image" },
      { name: "cta_label", label: pick("বাটন টেক্সট","Button Text") },
      { name: "cta_link", label: pick("বাটন লিংক","Button Link") },
      { name: "sort_order", label: pick("ক্রম","Order"), type: "number" },
      { name: "is_active", label: pick("সক্রিয়","Active"), type: "checkbox" },
    ]} />
  );
};

export const AdminGallery = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="gallery" title={pick("গ্যালারি","Gallery")} fields={[
      { name: "title", label: pick("শিরোনাম","Title"), preview: true },
      { name: "image", label: "ছবি", type: "image" },
      { name: "category", label: pick("ক্যাটাগরি (ইভেন্ট, ক্লাস, ক্যাম্পাস...)","Category (event, class, campus...)") },
      { name: "caption", label: pick("ক্যাপশন","Caption"), type: "textarea" },
    ]} />
  );
};

export const AdminDownloads = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="downloads" title={pick("ডাউনলোড","Download")} fields={[
      { name: "title_bn", label: pick("ফাইলের নাম","Filename"), required: true, preview: true },
      { name: "category", label: "ক্যাটাগরি (সিলেবাস, রুটিন, ফর্ম...)" },
      { name: "file_url", label: "ফাইল URL (PDF/DOC)" },
      { name: "description", label: pick("বিবরণ","Description"), type: "textarea" },
    ]} />
  );
};

export const AdminWinnerReviews = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="winner_reviews" title={pick("বিজয়ীদের রিভিউ","Winner Reviews")} fields={[
      { name: "winner_name", label: pick("বিজয়ীর নাম","Winner Name"), required: true, preview: true },
      { name: "district", label: pick("জেলা","District") },
      { name: "month", label: pick("মাস (যেমন: জুলাই ২০২৬)","Month (e.g. July 2026)") },
      { name: "rank", label: pick("স্থান (১/২/৩)","Rank (1/2/3)"), type: "number" },
      { name: "prize", label: pick("পুরস্কার","Prize") },
      { name: "winner_photo", label: pick("বিজয়ীর ছবি","Winner Photo"), type: "image" },
      { name: "rating", label: pick("রেটিং","Rating"), type: "number" },
      { name: "review_text", label: pick("রিভিউ","Review"), type: "textarea" },
      { name: "video_url", label: pick("ভিডিও","Video"), type: "url" },
      { name: "is_visible", label: pick("দেখানো হবে (Show)","Show"), type: "checkbox" },
      { name: "is_featured", label: "Featured", type: "checkbox" },
      { name: "display_order", label: pick("ক্রম","Order"), type: "number" },
    ]} listColumns={["winner_name", "month", "district"]} initial={{ is_visible: true, rating: 5, rank: 1, display_order: 1 }} />
  );
};

export const AdminLibrary = () => {
  const { pick } = useLang();
  return (
    <CrudResource resource="books" title={pick("লাইব্রেরি — বইসমূহ","Library — Books")} fields={[
      { name: "title_bn", label: pick("বাংলা শিরোনাম","Bengali Title"), required: true, preview: true },
      { name: "title_en", label: pick("ইংরেজি শিরোনাম","English Title") },
      { name: "author_bn", label: pick("লেখক (বাংলা)","Author (Bengali)") },
      { name: "author_en", label: pick("লেখক (ইংরেজি)","Author (English)") },
      { name: "category", label: pick("ক্যাটাগরি","Category"), type: "select",
        options: ["general","islamic","science","history","literature","self_help","philosophy","business","children","biography","health","technology"] },
      { name: "description_bn", label: pick("বিবরণ (বাংলা)","Description (Bengali)"), type: "textarea" },
      { name: "description_en", label: pick("বিবরণ (ইংরেজি)","Description (English)"), type: "textarea" },
      { name: "reader_content_bn", label: pick("ওয়েবসাইট Reader-এর বাংলা কনটেন্ট","In-site Reader Content (Bengali)"), type: "textarea", rows: 12 },
      { name: "reader_content_en", label: pick("ওয়েবসাইট Reader-এর ইংরেজি কনটেন্ট","In-site Reader Content (English)"), type: "textarea", rows: 12 },
      { name: "cover_image", label: pick("কভার ছবি","Cover Image"), type: "image" },
      { name: "read_url", label: pick("পড়ার লিংক","Read URL"), type: "url" },
      { name: "read_url_bn", label: pick("বাংলা পড়ার লিংক","Bengali Reading URL"), type: "url" },
      { name: "read_url_en", label: pick("ইংরেজি পড়ার লিংক","English Reading URL"), type: "url" },
      { name: "download_url", label: pick("ডাউনলোড লিংক","Download URL"), type: "url" },
      { name: "gutenberg_id", label: "Gutenberg ID (cover auto-fetch)", type: "number" },
      { name: "pages", label: pick("পৃষ্ঠা সংখ্যা","Pages"), type: "number" },
      { name: "year", label: pick("প্রকাশ সাল","Year"), type: "number" },
      { name: "language", label: pick("ভাষা","Language"), type: "select", options: ["en","bn","ar","ur","fr","de"] },
      { name: "is_featured", label: "Featured", type: "checkbox" },
      { name: "is_published", label: pick("প্রকাশিত","Published"), type: "checkbox" },
    ]} listColumns={["title_bn","author_en","category"]} initial={{ is_published: true, language: "en", category: "general" }} />
  );
};

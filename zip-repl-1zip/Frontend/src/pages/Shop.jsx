import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Storefront, ShoppingCart, X, Plus, Minus, Trash,
  MagnifyingGlass, Package, CheckCircle, MapPin,
  CreditCard, ArrowLeft, SealPercent, ClockCounterClockwise,
  Warning, Info, CaretLeft, CaretRight, Image,
  Lightning, Tag, ListBullets, MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const absUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  return `${BACKEND}${u}`;
};

const fmt = (n) =>
  "৳ " + Number(n || 0).toLocaleString("bn-BD", { maximumFractionDigits: 0 });

const discountPct = (p) => {
  const orig = Number(p.price || 0);
  const sale = Number(p.discount_price || 0);
  if (!orig || !sale || sale >= orig) return 0;
  return Math.round(((orig - sale) / orig) * 100);
};

const effectivePrice = (p) => {
  const sale = Number(p.discount_price || 0);
  const orig = Number(p.price || 0);
  return sale > 0 && sale < orig ? sale : orig;
};

/* All images for a product — gallery array, fall back to cover_image */
const productImages = (p) => {
  const arr = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (arr.length) return arr;
  return p.cover_image ? [p.cover_image] : [];
};

/* ─── Payment Methods ─────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  { value: "bkash", label: "bKash",  emoji: "💗", color: "#E3106E" },
  { value: "nagad", label: "Nagad",  emoji: "🟠", color: "#F7941D" },
  { value: "cod",   label: "ক্যাশ অন ডেলিভারি", label_en: "Cash on Delivery", emoji: "💵", color: "#16a34a" },
];

/* ─── Fullscreen Image Lightbox ───────────────────────────────────────────── */
function ImageLightbox({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95"
         onClick={onClose}>
      <button
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition z-10 text-xl font-bold"
        onClick={onClose}>
        ✕
      </button>
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs">
        {/* static hint – keep in Bengali, not a UI label */}
        যেকোনো জায়গায় ক্লিক করলে বন্ধ হবে
      </p>
      <img
        src={absUrl(url)} alt="পণ্যের ছবি"
        className="max-w-[95vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ─── Image Gallery (shared) ──────────────────────────────────────────────── */
function ImageGallery({ images, onImageClick }) {
  const [idx, setIdx] = useState(0);
  const imgs = images.length ? images : [];
  if (!imgs.length) {
    return (
      <div className="w-full aspect-square bg-[var(--bii-cream)] flex items-center justify-center rounded-2xl">
        <Package size={80} className="text-[var(--bii-border)]" weight="duotone" />
      </div>
    );
  }
  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + imgs.length) % imgs.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); };
  return (
    <div className="space-y-2">
      {/* Main image — click to open lightbox */}
      <div className="relative aspect-square bg-[var(--bii-cream)] rounded-2xl overflow-hidden group cursor-zoom-in"
           onClick={() => onImageClick && onImageClick(imgs[idx])}>
        <img src={absUrl(imgs[idx])} alt="product"
             className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {/* Zoom hint overlay */}
        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <MagnifyingGlassPlus size={13} weight="bold" /> বড় করে দেখুন
          </span>
        </div>
        {imgs.length > 1 && (
          <>
            <button onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition">
              <CaretLeft size={18} weight="bold" />
            </button>
            <button onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition">
              <CaretRight size={18} weight="bold" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
                 onClick={(e) => e.stopPropagation()}>
              {imgs.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imgs.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === idx ? "border-[var(--bii-emerald)] scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    }`}>
              <img src={absUrl(url)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Product Card ────────────────────────────────────────────────────────── */
function ProductCard({ product, onAddCart, onView, onQuickOrder, onImageClick }) {
  const { pick } = useLang();
  const disc = discountPct(product);
  const price = effectivePrice(product);
  const stock = Number(product.stock ?? 99);
  const outOfStock = stock === 0;
  const cover = product.cover_image || productImages(product)[0] || "";

  return (
    <div className="bii-card overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
      {/* Image — click → lightbox */}
      <div className="relative aspect-square bg-[var(--bii-cream)] overflow-hidden cursor-zoom-in"
           onClick={(e) => { e.stopPropagation(); cover && onImageClick && onImageClick(cover); }}>
        {cover ? (
          <img src={absUrl(cover)} alt={product.name_bn}
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center cursor-default"
               onClick={(e) => { e.stopPropagation(); onView(product); }}>
            <Package size={56} className="text-[var(--bii-border)]" weight="duotone" />
          </div>
        )}
        {/* zoom hint */}
        {cover && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="bg-black/55 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
              <MagnifyingGlassPlus size={11} weight="bold" /> {pick("বড় দেখুন", "Zoom")}
            </span>
          </div>
        )}
        {disc > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            {disc}% {pick("ছাড়", "off")}
          </div>
        )}
        {productImages(product).length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Image size={10} /> +{productImages(product).length - 1}
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white font-bold text-sm px-3 py-1 bg-black/60 rounded-full">{pick("স্টক শেষ", "Out of Stock")}</span>
          </div>
        )}
      </div>

      {/* Info — click card body to open detail modal */}
      <div className="p-3 flex flex-col flex-1 gap-1.5 cursor-pointer"
           onClick={() => onView(product)}>
        {product.category && (
          <span className="text-[10px] font-bold text-[var(--bii-gold)] uppercase tracking-wide">{product.category}</span>
        )}
        <h3 className="text-sm font-semibold text-[var(--bii-text)] leading-snug line-clamp-2">
          {product.name_bn}
        </h3>
        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-base font-bold text-[var(--bii-emerald)]">{fmt(price)}</span>
          {disc > 0 && (
            <span className="text-xs text-[var(--bii-text-soft)] line-through">{fmt(product.price)}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
        {/* অর্ডার করুন → নতুন পেজ */}
        <button
          disabled={outOfStock}
          onClick={() => onQuickOrder(product)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            outOfStock
              ? "bg-[var(--bii-border)] text-[var(--bii-text-soft)] cursor-not-allowed"
              : "bg-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/90 text-white shadow-sm"
          }`}
        >
          <Lightning size={12} weight="fill" />
          {pick("অর্ডার করুন", "Order")}
        </button>
        {/* কার্টে যোগ */}
        <button
          disabled={outOfStock}
          onClick={() => onAddCart(product)}
          className={`px-2.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
            outOfStock
              ? "bg-[var(--bii-border)] text-[var(--bii-text-soft)] cursor-not-allowed"
              : "bg-[var(--bii-cream)] border border-[var(--bii-emerald)] text-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/10"
          }`}
          title={pick("কার্টে যোগ করুন", "Add to Cart")}
        >
          <ShoppingCart size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/* ─── Checkout Form (shared between modal and cart) ───────────────────────── */
function CheckoutForm({ cart, user, onSuccess, onBack, showBack = false }) {
  const { t, pick } = useLang();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    method: "cod",
    paymentNumber: "",
    transactionId: "",
    note: "",
  });
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoData, setPromoData] = useState(null);  // {discount, code, discount_type, discount_value}
  const [promoErr, setPromoErr]   = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const subtotal = cart.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);
  const discount = promoData?.discount ?? 0;
  const total    = subtotal - discount;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === form.method);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoErr(""); setPromoLoading(true); setPromoData(null);
    try {
      const res = await api.get(`/promo-codes/validate?code=${encodeURIComponent(promoCode.trim())}&order_total=${subtotal}`);
      setPromoData(res.data);
    } catch (ex) {
      setPromoErr(formatApiError(ex));
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => { setPromoData(null); setPromoCode(""); setPromoErr(""); };

  const place = async () => {
    setErr("");
    if (!form.name.trim())    { setErr(pick("নাম দিন।", "Please enter your name.")); return; }
    if (!form.phone.trim())   { setErr(pick("ফোন নম্বর দিন।", "Please enter your phone.")); return; }
    if (!form.address.trim()) { setErr(pick("ঠিকানা দিন।", "Please enter your address.")); return; }
    if (form.method !== "cod" && !form.paymentNumber.trim()) {
      const mLabel = selectedMethod?.label_en ? pick(selectedMethod.label, selectedMethod.label_en) : selectedMethod?.label;
      setErr(`${mLabel} ${pick("নম্বর দিন।", "number required.")}`); return;
    }
    setLoading(true);
    try {
      const res = await api.post("/shop/place-order", {
        items: cart.map((i) => ({
          product_id:     i.product.id,
          product_name:   i.product.name_bn,
          qty:            i.qty,
          unit_price:     effectivePrice(i.product),
          selected_color: i.selectedColor || "",
          selected_size:  i.selectedSize  || "",
        })),
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        payment_method: form.method,
        payment_number: form.paymentNumber,
        transaction_id: form.transactionId,
        note: form.note,
        promo_code: promoData?.code || "",
      });
      onSuccess(res.data.order_number, res.data.total ?? total);
    } catch (ex) {
      setErr(formatApiError(ex));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Order summary */}
        <div className="bg-[var(--bii-cream)] rounded-2xl p-3 space-y-1.5 border border-[var(--bii-border)]">
          <p className="text-xs font-bold text-[var(--bii-text-soft)] uppercase tracking-wide mb-2">{pick("অর্ডার সারসংক্ষেপ", "Order Summary")}</p>
          {cart.map((i) => (
            <div key={i.product.id} className="flex justify-between text-sm">
              <div className="flex-1 mr-2 truncate">
                <span className="text-[var(--bii-text)]">
                  {i.product.name_bn} <span className="text-[var(--bii-text-soft)]">×{i.qty}</span>
                </span>
                {(i.selectedColor || i.selectedSize) && (
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {i.selectedColor && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">🎨 {i.selectedColor}</span>
                    )}
                    {i.selectedSize && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">📐 {i.selectedSize}</span>
                    )}
                  </div>
                )}
              </div>
              <span className="font-semibold flex-shrink-0 text-[var(--bii-emerald)]">
                {fmt(effectivePrice(i.product) * i.qty)}
              </span>
            </div>
          ))}
          {promoData && (
            <div className="flex justify-between text-sm text-green-700">
              <span className="flex items-center gap-1">
                <SealPercent size={14} weight="bold" /> {promoData.code} {pick("ছাড়", "discount")}
              </span>
              <span className="font-semibold">- {fmt(promoData.discount)}</span>
            </div>
          )}
          <div className="border-t border-[var(--bii-border)] pt-2 mt-2 flex justify-between font-bold text-base">
            <span>{pick("সর্বমোট", "Total")}</span>
            <span className="text-[var(--bii-emerald)]">{fmt(total)}</span>
          </div>
        </div>

        {/* Promo Code */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <SealPercent size={16} weight="bold" className="text-[var(--bii-gold)]" />
            {pick("প্রমো কোড (ঐচ্ছিক)", "Promo Code (optional)")}
          </h3>
          {promoData ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-xl px-3 py-2">
              <CheckCircle size={18} weight="fill" className="text-green-600 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-mono font-bold text-green-700">{promoData.code}</span>
                <span className="text-green-600 ml-2">— {fmt(promoData.discount)} {pick("ছাড়", "off")}</span>
              </div>
              <button onClick={removePromo} className="text-red-400 hover:text-red-600 text-xs underline">
                {pick("সরান", "Remove")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="bii-input flex-1 font-mono uppercase"
                placeholder={pick("PROMO কোড লিখুন", "Enter PROMO code")}
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
              />
              <button
                onClick={applyPromo}
                disabled={promoLoading || !promoCode.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--bii-gold)] text-white font-bold text-sm disabled:opacity-50 hover:opacity-90 transition flex-shrink-0"
              >
                {promoLoading ? "..." : pick("প্রয়োগ", "Apply")}
              </button>
            </div>
          )}
          {promoErr && <p className="text-xs text-red-600">{promoErr}</p>}
        </div>

        {/* Delivery info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <span className="w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white flex items-center justify-center text-xs font-bold">১</span>
            {pick("ডেলিভারি তথ্য", "Delivery Info")}
          </h3>
          <div className="space-y-2 pl-8">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">{pick("আপনার নাম *", "Your Name *")}</label>
              <input className="bii-input" value={form.name} onChange={set("name")} placeholder={pick("সম্পূর্ণ নাম", "Full name")} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">{pick("মোবাইল নম্বর *", "Mobile *")}</label>
              <input className="bii-input" value={form.phone} onChange={set("phone")} type="tel" placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">{pick("ডেলিভারি ঠিকানা *", "Delivery Address *")}</label>
              <textarea className="bii-input min-h-[80px]" value={form.address} onChange={set("address")}
                        placeholder={pick("বাড়ি নং, রাস্তা, এলাকা, থানা, জেলা", "House, Road, Area, District")} />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <span className="w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white flex items-center justify-center text-xs font-bold">২</span>
            {pick("পেমেন্ট পদ্ধতি *", "Payment Method *")}
          </h3>
          <div className="pl-8 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} type="button"
                        onClick={() => setForm((f) => ({ ...f, method: m.value }))}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.method === m.value
                            ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)]/5 shadow-sm"
                            : "border-[var(--bii-border)] hover:border-[var(--bii-emerald)]/50"
                        }`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span>{m.label_en ? pick(m.label, m.label_en) : m.label}</span>
                </button>
              ))}
            </div>

            {form.method !== "cod" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-3">
                <p className="text-xs text-orange-700 flex items-start gap-1.5">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  {selectedMethod?.label_en ? pick(selectedMethod.label, selectedMethod.label_en) : selectedMethod?.label} {pick("নম্বরে", "number")} ৳{fmt(total)} {pick("পেমেন্ট করে নিচের তথ্য পূরণ করুন।", "— pay and fill the details below.")}
                </p>
                <div>
                  <label className="block text-xs font-medium mb-1">{pick("আপনার", "Your")} {selectedMethod?.label_en ? pick(selectedMethod.label, selectedMethod.label_en) : selectedMethod?.label} {pick("নম্বর *", "number *")}</label>
                  <input className="bii-input" value={form.paymentNumber} onChange={set("paymentNumber")}
                         type="tel" placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">ট্রানজেকশন ID (ঐচ্ছিক)</label>
                  <input className="bii-input" value={form.transactionId} onChange={set("transactionId")}
                         placeholder="TrxID..." />
                </div>
              </div>
            )}

            {form.method === "cod" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-green-700 flex items-start gap-1.5">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" weight="fill" />
                  {pick("ডেলিভারির সময় ক্যাশ পেমেন্ট করুন। কোনো অগ্রিম পেমেন্ট নেই।", "Pay cash on delivery. No advance payment required.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="pl-0">
          <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">{pick("বিশেষ নির্দেশনা (ঐচ্ছিক)", "Special Instructions (optional)")}</label>
          <textarea className="bii-input min-h-[60px]" value={form.note} onChange={set("note")}
                    placeholder={pick("কোনো বিশেষ কথা থাকলে লিখুন...", "Any special notes...")} />
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2">
            <Warning size={16} className="flex-shrink-0 mt-0.5" /> {err}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-[var(--bii-border)] space-y-2">
        {showBack && (
          <button onClick={onBack}
                  className="w-full py-2 text-sm text-[var(--bii-text-soft)] flex items-center justify-center gap-1 hover:text-[var(--bii-emerald)] transition">
            <ArrowLeft size={14} /> {pick("কার্টে ফিরুন", "Back to Cart")}
          </button>
        )}
        <button onClick={place} disabled={loading}
                className="bii-btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
          {loading
            ? pick("অর্ডার দেওয়া হচ্ছে...", "Placing order...")
            : <><CheckCircle size={20} weight="bold" /> {pick("অর্ডার নিশ্চিত করুন", "Confirm Order")} — {fmt(total)}{discount > 0 ? ` (${pick("ছাড়", "discount")} ${fmt(discount)})` : ""}</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Order Success Screen ────────────────────────────────────────────────── */
function OrderSuccess({ orderNumber, total, onClose }) {
  const { pick } = useLang();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle size={64} weight="fill" className="text-green-600" />
      </div>
      <div>
        <h2 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("অর্ডার সম্পন্ন! 🎉", "Order Placed! 🎉")}</h2>
        <p className="text-[var(--bii-text-soft)] mt-2 text-sm leading-relaxed">
          {pick("আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।", "Your order has been successfully placed.")}<br />
          {pick("আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।", "Our team will contact you shortly.")}
        </p>
      </div>
      <div className="bg-[var(--bii-cream)] rounded-2xl p-5 w-full space-y-3 border border-[var(--bii-border)]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--bii-text-soft)]">{pick("অর্ডার নম্বর", "Order No.")}</span>
          <span className="font-bold text-[var(--bii-emerald)] text-lg">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center border-t border-[var(--bii-border)] pt-3">
          <span className="text-sm text-[var(--bii-text-soft)]">{pick("মোট মূল্য", "Total")}</span>
          <span className="font-bold text-base">{fmt(total)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--bii-text-soft)]">{pick("অবস্থা", "Status")}</span>
          <span className="text-orange-600 font-semibold text-sm bg-orange-50 px-3 py-1 rounded-full">{pick("প্রক্রিয়াধীন", "Processing")}</span>
        </div>
      </div>
      <button onClick={onClose} className="bii-btn-primary w-full">{pick("শপিং চালিয়ে যান", "Continue Shopping")}</button>
    </div>
  );
}

/* ─── Color / Size Picker (shared) ───────────────────────────────────────── */
function VariantPicker({ label, options, selected, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--bii-text)]">{label}</span>
        {selected && (
          <span className="text-xs text-[var(--bii-emerald)] font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
            ✓ {selected}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt} onClick={() => onSelect(selected === opt ? "" : opt)}
            className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              selected === opt
                ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white shadow-sm"
                : "border-[var(--bii-border)] text-[var(--bii-text)] hover:border-[var(--bii-emerald)]/60"
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const parseVariants = (str) =>
  (str || "").split(",").map((s) => s.trim()).filter(Boolean);

/* ─── Product Detail Modal (gallery + info, order goes to new page) ──────── */
function ProductModal({ product, onClose, onAddCart, user, onImageClick }) {
  const navigate = useNavigate();
  const { t, pick } = useLang();
  const [selColor, setSelColor] = useState("");
  const [selSize,  setSelSize]  = useState("");

  if (!product) return null;
  const disc      = discountPct(product);
  const price     = effectivePrice(product);
  const stock     = Number(product.stock ?? 99);
  const imgs      = productImages(product);
  const colorList = parseVariants(product.colors);
  const sizeList  = parseVariants(product.sizes);

  const needsColor = colorList.length > 0 && !selColor;
  const needsSize  = sizeList.length  > 0 && !selSize;
  const canOrder   = stock > 0 && !needsColor && !needsSize;
  const blockLabel = needsColor ? pick("রঙ বাছাই করুন", "Choose a color") : needsSize ? pick("সাইজ বাছাই করুন", "Choose a size") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[95vh] flex flex-col shadow-2xl"
           onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose}
                className="absolute top-3 right-3 z-10 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition">
          <X size={20} weight="bold" />
        </button>

        {/* Gallery — clicking image opens fullscreen lightbox */}
        <div className="relative p-4 bg-[var(--bii-cream)] border-b border-[var(--bii-border)]">
          <ImageGallery images={imgs} onImageClick={onImageClick} />
          {disc > 0 && (
            <div className="absolute top-6 left-6 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
              {disc}% ছাড়
            </div>
          )}
        </div>

        {/* Product details */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {product.category && (
            <span className="inline-block text-xs font-bold text-[var(--bii-gold)] bg-[var(--bii-cream)] px-3 py-0.5 rounded-full uppercase tracking-wide">
              {product.category}
            </span>
          )}
          <h2 className="font-heading text-xl text-[var(--bii-emerald)] leading-snug">{product.name_bn}</h2>
          {product.name_en && <p className="text-sm text-[var(--bii-text-soft)]">{product.name_en}</p>}

          {/* Price box */}
          <div className="flex items-center gap-4 bg-[var(--bii-cream)] rounded-2xl p-4 border border-[var(--bii-border)]">
            <div>
              <div className="text-3xl font-bold text-[var(--bii-emerald)]">{fmt(price)}</div>
              {disc > 0 && (
                <div className="text-sm text-[var(--bii-text-soft)] line-through mt-0.5">{fmt(product.price)}</div>
              )}
            </div>
            {disc > 0 && (
              <div className="ml-auto bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <SealPercent size={16} weight="bold" /> {disc}% {pick("সাশ্রয়", "off")}
              </div>
            )}
          </div>

          {/* Stock */}
          <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl ${
            stock === 0 ? "text-red-600 bg-red-50" :
            stock < 5  ? "text-orange-600 bg-orange-50" :
                         "text-green-700 bg-green-50"}`}>
            <Package size={16} weight="fill" />
            {stock === 0 ? pick("স্টক শেষ হয়ে গেছে", "Out of stock") :
             stock < 5  ? pick(`মাত্র ${stock}টি বাকি আছে!`, `Only ${stock} left!`) :
                          pick("স্টক পাওয়া যাচ্ছে", "In stock")}
          </div>

          {/* Variant selectors */}
          <VariantPicker label={pick("রঙ বাছাই করুন", "Choose Color")} options={colorList} selected={selColor} onSelect={setSelColor} />
          <VariantPicker label={pick("সাইজ বাছাই করুন", "Choose Size")} options={sizeList} selected={selSize} onSelect={setSelSize} />

          {/* Description */}
          {product.description_bn && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-[var(--bii-text)]">{t("description")}</h4>
              <p className="text-sm text-[var(--bii-text-soft)] leading-relaxed whitespace-pre-line">
                {product.description_bn}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--bii-border)] bg-white space-y-2">
          {blockLabel && stock > 0 && (
            <p className="text-xs text-center text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              ⚠️ {pick("অর্ডার করতে আগে", "To order first")} {blockLabel}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={stock === 0}
              onClick={() => { onAddCart(product, selColor, selSize); onClose(); }}
              className={`flex-1 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border-2 ${
                stock === 0
                  ? "border-[var(--bii-border)] text-[var(--bii-text-soft)] cursor-not-allowed"
                  : "border-[var(--bii-emerald)] text-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/5"
              }`}>
              <ShoppingCart size={18} weight="bold" />
              {pick("কার্টে যোগ করুন", "Add to Cart")}
            </button>
            <button
              disabled={!canOrder}
              onClick={() => { onClose(); navigate("/shop/order", { state: { product, selectedColor: selColor, selectedSize: selSize } }); }}
              className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                !canOrder
                  ? "bg-[var(--bii-border)] text-[var(--bii-text-soft)] cursor-not-allowed"
                  : "bg-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)]/90 text-white shadow-md"
              }`}>
              <Lightning size={18} weight="fill" />
              {pick("অর্ডার করুন", "Order Now")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Cart Drawer ─────────────────────────────────────────────────────────── */
function CartDrawer({ cart, onClose, onQtyChange, onRemove, onClearAndClose, user }) {
  const { t, pick } = useLang();
  const [view, setView]           = useState("cart");
  const [orderNum, setOrderNum]   = useState("");
  const [orderTotal, setOrderTotal] = useState(0);

  const total     = cart.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleSuccess = (num, tot) => {
    setOrderNum(num);
    setOrderTotal(tot);
    setView("done");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-[var(--bii-emerald)] text-white px-4 py-4 flex items-center gap-3">
          {view === "checkout" && (
            <button onClick={() => setView("cart")} className="hover:opacity-75 transition">
              <ArrowLeft size={22} weight="bold" />
            </button>
          )}
          <ShoppingCart size={22} weight="bold" />
          <span className="font-semibold text-lg flex-1">
            {view === "cart"     ? `${pick("আমার কার্ট", "My Cart")} (${itemCount})` :
             view === "checkout" ? pick("অর্ডার করুন", "Place Order") : pick("অর্ডার সম্পন্ন", "Order Done")}
          </span>
          <button onClick={view === "done" ? onClearAndClose : onClose} className="hover:opacity-75">
            <X size={22} weight="bold" />
          </button>
        </div>

        {/* Cart view */}
        {view === "cart" && (
          <>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--bii-text-soft)] p-8">
                <ShoppingCart size={80} weight="duotone" className="opacity-25" />
                <p className="font-medium text-lg">{pick("কার্ট খালি", "Cart is empty")}</p>
                <button onClick={onClose} className="text-sm text-[var(--bii-emerald)] underline">
                  {pick("শপিং চালিয়ে যান", "Continue Shopping")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-[var(--bii-border)]">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3 p-4 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--bii-cream)] flex-shrink-0">
                        {(item.product.cover_image || productImages(item.product)[0]) ? (
                          <img src={absUrl(item.product.cover_image || productImages(item.product)[0])}
                               alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={28} className="text-[var(--bii-border)]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--bii-text)] line-clamp-2">
                          {item.product.name_bn}
                        </p>
                        {(item.selectedColor || item.selectedSize) && (
                          <div className="flex gap-1.5 mt-0.5 flex-wrap">
                            {item.selectedColor && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">🎨 {item.selectedColor}</span>
                            )}
                            {item.selectedSize && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">📐 {item.selectedSize}</span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-[var(--bii-emerald)] font-bold mt-0.5">
                          {fmt(effectivePrice(item.product))}
                        </p>
                        {/* Qty controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => onQtyChange(item.product.id, item.qty - 1)}
                                  className="w-7 h-7 rounded-full border border-[var(--bii-border)] flex items-center justify-center hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition">
                            <Minus size={12} weight="bold" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                          <button onClick={() => onQtyChange(item.product.id, item.qty + 1)}
                                  className="w-7 h-7 rounded-full border border-[var(--bii-border)] flex items-center justify-center hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition">
                            <Plus size={12} weight="bold" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{fmt(effectivePrice(item.product) * item.qty)}</span>
                        <button onClick={() => onRemove(item.product.id)}
                                className="text-red-400 hover:text-red-600 transition">
                          <Trash size={16} weight="fill" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart footer */}
                <div className="border-t border-[var(--bii-border)] p-4 space-y-3 bg-[var(--bii-cream)]">
                  <div className="flex justify-between items-center text-sm text-[var(--bii-text-soft)]">
                    <span>{pick("মোট পণ্য", "Items")}</span><span>{itemCount}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-xl">
                    <span>{pick("সর্বমোট", "Total")}</span>
                    <span className="text-[var(--bii-emerald)]">{fmt(total)}</span>
                  </div>
                  <button onClick={() => setView("checkout")}
                          className="bii-btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
                    <Lightning size={18} weight="fill" /> {pick("অর্ডার করুন", "Order Now")}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Checkout view */}
        {view === "checkout" && (
          <CheckoutForm
            cart={cart}
            user={user}
            onSuccess={handleSuccess}
            onBack={() => setView("cart")}
            showBack
          />
        )}

        {/* Success view */}
        {view === "done" && (
          <OrderSuccess
            orderNumber={orderNum}
            total={orderTotal}
            onClose={onClearAndClose}
          />
        )}
      </div>
    </div>
  );
}

/* ─── My Orders Modal ─────────────────────────────────────────────────────── */
function MyOrdersModal({ onClose }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/shop/my-orders")
       .then((r) => setOrders(Array.isArray(r.data) ? r.data : []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  const { t, pick } = useLang();
  const statusCfg = {
    pending:   { label: pick("প্রক্রিয়াধীন", "Processing"),    cls: "text-orange-700 bg-orange-50 border-orange-200" },
    confirmed: { label: pick("নিশ্চিত", "Confirmed"),          cls: "text-blue-700 bg-blue-50 border-blue-200" },
    shipped:   { label: pick("পাঠানো হয়েছে", "Shipped"),       cls: "text-purple-700 bg-purple-50 border-purple-200" },
    delivered: { label: pick("ডেলিভারি হয়েছে", "Delivered"),  cls: "text-green-700 bg-green-50 border-green-200" },
    cancelled: { label: pick("বাতিল", "Cancelled"),            cls: "text-red-700 bg-red-50 border-red-200" },
  };
  const payLabel = {
    unpaid:   pick("অপরিশোধিত", "Unpaid"),
    pending:  pick("যাচাইয়ে আছে", "Verifying"),
    paid:     pick("পরিশোধিত", "Paid"),
    refunded: pick("ফেরত", "Refunded"),
  };
  const payIcon  = { bkash: "💗", nagad: "🟠", cod: "💵" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
        <div className="bg-[var(--bii-emerald)] text-white px-4 py-4 flex items-center gap-3">
          <ClockCounterClockwise size={22} weight="bold" />
          <span className="font-semibold text-lg flex-1">{pick("আমার অর্ডার", "My Orders")}</span>
          <button onClick={onClose}><X size={22} weight="bold" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-[var(--bii-text-soft)]">{t("loading")}</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ClockCounterClockwise size={64} className="mx-auto mb-3 text-[var(--bii-border)]" weight="duotone" />
              <p className="text-[var(--bii-text-soft)] font-medium">{pick("কোনো অর্ডার নেই", "No orders yet")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bii-border)]">
              {orders.map((order) => {
                const st = statusCfg[order.status] || { label: order.status, cls: "text-gray-600 bg-gray-50 border-gray-200" };
                return (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--bii-emerald)] text-base">{order.order_number}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="text-xs text-[var(--bii-text-soft)]">
                      {new Date(order.created_at).toLocaleString("bn-BD")}
                    </div>

                    {/* Products */}
                    <div className="bg-[var(--bii-cream)] rounded-xl p-3 space-y-1">
                      {Array.isArray(order.products) && order.products.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[var(--bii-text)]">{p.product_name} <span className="text-[var(--bii-text-soft)]">×{p.qty}</span></span>
                          <span className="font-semibold">{fmt(p.subtotal)}</span>
                        </div>
                      ))}
                      <div className="border-t border-[var(--bii-border)] pt-2 mt-1 flex justify-between font-bold">
                        <span>{pick("মোট", "Total")}</span>
                        <span className="text-[var(--bii-emerald)]">{fmt(order.total)}</span>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="flex gap-2 text-xs flex-wrap">
                      <span className="bg-[var(--bii-cream)] border border-[var(--bii-border)] px-2 py-1 rounded-full">
                        {payIcon[order.payment_method] || "💳"} {order.payment_method?.toUpperCase()}
                      </span>
                      <span className="bg-[var(--bii-cream)] border border-[var(--bii-border)] px-2 py-1 rounded-full">
                        {payLabel[order.payment_status] || order.payment_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN SHOP PAGE ──────────────────────────────────────────────────────── */
export default function Shop() {
  const { user } = useAuth();
  const { t, pick } = useLang();

  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("সব");
  const [cart, setCart]           = useState([]);
  const [viewProduct, setViewProduct]   = useState(null);
  const [quickOrder, setQuickOrder]     = useState(null);
  const [showCart, setShowCart]         = useState(false);
  const [showOrders, setShowOrders]     = useState(false);
  const [toast, setToast]               = useState("");
  const [lightboxUrl, setLightboxUrl]   = useState("");

  /* Load products */
  useEffect(() => {
    api.get("/products")
       .then((r) => setProducts(r.data.filter((p) => p.is_published !== false)))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  /* Categories */
  const categories = ["সব", ...new Set(products.map((p) => p.category).filter(Boolean))];

  /* Filtered */
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (category === "সব" || p.category === category) &&
           (!q || p.name_bn?.toLowerCase().includes(q) || p.name_en?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  });

  /* Toast */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  /* Add to cart */
  const addToCart = useCallback((product, selectedColor = "", selectedSize = "") => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      return ex
        ? prev.map((i) => i.product.id === product.id
            ? { ...i, qty: i.qty + 1, selectedColor, selectedSize }
            : i)
        : [...prev, { product, qty: 1, selectedColor, selectedSize }];
    });
    showToast(`"${product.name_bn}" ${pick("কার্টে যোগ হয়েছে ✓", "added to cart ✓")}`);
  }, [showToast, pick]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeQty = useCallback((id, qty) => {
    setCart((p) => qty < 1 ? p.filter((i) => i.product.id !== id) : p.map((i) => i.product.id === id ? { ...i, qty } : i));
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((p) => p.filter((i) => i.product.id !== id));
  }, []);

  const clearAndClose = () => {
    setCart([]);
    setShowCart(false);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-5 pb-10">
      <AdBanner slot="shop-top" format="responsive" />

      {/* ── Hero header ──────────────────────────────────────────────── */}
      <div className="bii-card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-[var(--bii-emerald)] to-[var(--bii-emerald)]/80 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Storefront size={30} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-white">{pick("অনলাইন শপ", "Online Shop")}</h1>
              <p className="text-white/70 text-xs mt-0.5">{products.length}টি পণ্য পাওয়া যাচ্ছে</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* My orders */}
            <button onClick={() => setShowOrders(true)}
                    className="p-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition"
                    title="আমার অর্ডার">
              <ClockCounterClockwise size={22} weight="bold" />
            </button>
            {/* Cart */}
            <button onClick={() => setShowCart(true)}
                    className="relative p-2.5 bg-white text-[var(--bii-emerald)] rounded-xl hover:bg-white/90 transition shadow">
              <ShoppingCart size={24} weight="fill" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]" />
        <input className="bii-input pl-10" placeholder={pick("পণ্য খুঁজুন...", "Search products...")} value={search}
               onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]">
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Category filter ───────────────────────────────────────────── */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      category === cat
                        ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)] shadow-sm"
                        : "bg-white text-[var(--bii-text-soft)] border-[var(--bii-border)] hover:border-[var(--bii-emerald)]"
                    }`}>
              {cat === "সব" ? <><Tag size={13} weight="bold" /> {pick("সব পণ্য", "All")}</> : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Product grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bii-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-[var(--bii-cream)]" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-[var(--bii-cream)] rounded w-1/3" />
                <div className="h-3 bg-[var(--bii-cream)] rounded w-full" />
                <div className="h-3 bg-[var(--bii-cream)] rounded w-2/3" />
                <div className="h-5 bg-[var(--bii-cream)] rounded" />
                <div className="h-8 bg-[var(--bii-cream)] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bii-card p-12 text-center">
          <Package size={72} className="mx-auto text-[var(--bii-border)] mb-4" weight="duotone" />
          <p className="text-[var(--bii-text-soft)] font-semibold text-base">
            {search || category !== "সব" ? pick("কোনো পণ্য পাওয়া যায়নি", "No products found") : pick("এখনো কোনো পণ্য যোগ করা হয়নি", "No products yet")}
          </p>
          {(search || category !== "সব") && (
            <button onClick={() => { setSearch(""); setCategory("সব"); }}
                    className="mt-3 text-sm text-[var(--bii-emerald)] underline">
              {pick("সব পণ্য দেখুন", "View All")}
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--bii-text-soft)]">{filtered.length}টি পণ্য পাওয়া গেছে</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddCart={addToCart}
                onView={setViewProduct}
                onQuickOrder={setQuickOrder}
                onImageClick={setLightboxUrl}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {/* Product detail modal */}
      {viewProduct && (
        <ProductModal
          product={viewProduct}
          onClose={() => setViewProduct(null)}
          onAddCart={addToCart}
          user={user}
          onImageClick={setLightboxUrl}
        />
      )}

      {/* Quick order modal (from card button) */}
      {quickOrder && (
        <ProductModal
          product={quickOrder}
          onClose={() => setQuickOrder(null)}
          onAddCart={addToCart}
          user={user}
          onImageClick={setLightboxUrl}
        />
      )}

      {/* Fullscreen image lightbox */}
      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl("")} />
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onQtyChange={changeQty}
          onRemove={removeFromCart}
          onClearAndClose={clearAndClose}
          user={user}
        />
      )}

      {/* My orders */}
      {showOrders && <MyOrdersModal onClose={() => setShowOrders(false)} />}

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
                        bg-[var(--bii-emerald)] text-white px-5 py-3 rounded-2xl shadow-2xl
                        text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          <CheckCircle size={18} weight="fill" />
          {toast}
        </div>
      )}
      <BottomBanner slot="shop-bottom" />
    </div>
  );
}

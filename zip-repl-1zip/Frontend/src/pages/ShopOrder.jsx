import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, Warning, SealPercent,
  Info, Package, Lightning, CaretLeft, CaretRight,
  MapPin, CreditCard,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const absUrl  = (u) => (!u ? "" : u.startsWith("http") || u.startsWith("data:") ? u : `${BACKEND}${u}`);
const fmt     = (n) => "৳ " + Number(n || 0).toLocaleString("bn-BD", { maximumFractionDigits: 0 });

const effectivePrice = (p) => {
  const sale = Number(p.discount_price || 0);
  const orig = Number(p.price || 0);
  return sale > 0 && sale < orig ? sale : orig;
};
const discountPct = (p) => {
  const orig = Number(p.price || 0);
  const sale = Number(p.discount_price || 0);
  if (!orig || !sale || sale >= orig) return 0;
  return Math.round(((orig - sale) / orig) * 100);
};
const productImages = (p) => {
  const arr = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  return arr.length ? arr : p.cover_image ? [p.cover_image] : [];
};

const parseVariants = (str) =>
  (str || "").split(",").map((s) => s.trim()).filter(Boolean);

const PAYMENT_METHODS = [
  { value: "bkash", label: "bKash",               emoji: "💗", color: "#E3106E" },
  { value: "nagad", label: "Nagad",               emoji: "🟠", color: "#F7941D" },
  { value: "cod",   label: "ক্যাশ অন ডেলিভারি",  emoji: "💵", color: "#16a34a" },
];

/* ─── Image mini-gallery ──────────────────────────────────────────────────── */
function MiniGallery({ images, onZoom }) {
  const [idx, setIdx] = useState(0);
  if (!images.length)
    return (
      <div className="w-full h-48 bg-[var(--bii-cream)] flex items-center justify-center rounded-2xl">
        <Package size={60} className="text-[var(--bii-border)]" weight="duotone" />
      </div>
    );
  return (
    <div className="space-y-2">
      <div className="relative h-52 bg-[var(--bii-cream)] rounded-2xl overflow-hidden cursor-zoom-in"
           onClick={() => onZoom(images[idx])}>
        <img src={absUrl(images[idx])} alt="product" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/20">
          <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">🔍 বড় করে দেখুন</span>
        </div>
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60 transition">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60 transition">
              <CaretRight size={16} weight="bold" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
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

/* ─── Fullscreen Lightbox ─────────────────────────────────────────────────── */
function Lightbox({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
         onClick={onClose}>
      <button className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition z-10"
              onClick={onClose}>
        <span className="text-xl font-bold">✕</span>
      </button>
      <img src={absUrl(url)} alt="full"
           className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
           onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/* ─── Order Success Screen ────────────────────────────────────────────────── */
function OrderSuccess({ orderNumber, total, onBackToShop }) {
  return (
    <div className="min-h-screen bg-[var(--bii-cream)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5">
        <CheckCircle size={64} weight="fill" className="text-green-600" />
      </div>
      <h2 className="font-heading text-2xl text-[var(--bii-emerald)] mb-2">অর্ডার সম্পন্ন! 🎉</h2>
      <p className="text-[var(--bii-text-soft)] text-sm leading-relaxed mb-6">
        আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।<br />
        আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।
      </p>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 border border-[var(--bii-border)] shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--bii-text-soft)]">অর্ডার নম্বর</span>
          <span className="font-bold text-[var(--bii-emerald)] text-lg">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center border-t border-[var(--bii-border)] pt-3">
          <span className="text-sm text-[var(--bii-text-soft)]">মোট মূল্য</span>
          <span className="font-bold text-base">{fmt(total)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--bii-text-soft)]">অবস্থা</span>
          <span className="text-orange-600 font-semibold text-sm bg-orange-50 px-3 py-1 rounded-full">প্রক্রিয়াধীন</span>
        </div>
      </div>
      <button onClick={onBackToShop} className="bii-btn-primary w-full max-w-sm">
        শপে ফিরুন
      </button>
    </div>
  );
}

/* ─── Main ShopOrder Page ─────────────────────────────────────────────────── */
export default function ShopOrder() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const stateProduct     = location.state?.product      || null;
  const stateCart        = location.state?.cart         || null;
  const stateSelColor    = location.state?.selectedColor || "";
  const stateSelSize     = location.state?.selectedSize  || "";

  // If accessed directly without state, go back to shop
  useEffect(() => {
    if (!stateProduct && !stateCart) navigate("/shop", { replace: true });
  }, [stateProduct, stateCart, navigate]);

  /* Build internal cart from either a single product or passed cart */
  const [qty,      setQty]      = useState(1);
  const [selColor, setSelColor] = useState(stateSelColor);
  const [selSize,  setSelSize]  = useState(stateSelSize);
  const cart = stateCart
    ? stateCart
    : stateProduct
    ? [{ product: stateProduct, qty }]
    : [];

  const [form, setForm] = useState({
    name:          user?.name    || "",
    phone:         user?.phone   || "",
    address:       user?.address || "",
    method:        "cod",
    paymentNumber: "",
    transactionId: "",
    note:          "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const [promoCode,    setPromoCode]    = useState("");
  const [promoData,    setPromoData]    = useState(null);
  const [promoErr,     setPromoErr]     = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [success,  setSuccess]  = useState(null);  // { orderNumber, total }
  const [lightbox, setLightbox] = useState(null);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === form.method);
  const subtotal = cart.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);
  const discount = promoData?.discount ?? 0;
  const total    = subtotal - discount;

  /* single-product qty changes */
  const isSingleProduct = !!stateProduct && !stateCart;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoErr(""); setPromoLoading(true); setPromoData(null);
    try {
      const res = await api.get(`/promo-codes/validate?code=${encodeURIComponent(promoCode.trim())}&order_total=${subtotal}`);
      setPromoData(res.data);
    } catch (ex) { setPromoErr(formatApiError(ex)); }
    finally { setPromoLoading(false); }
  };

  const place = async () => {
    setErr("");
    if (!form.name.trim())    { setErr("নাম দিন।"); return; }
    if (!form.phone.trim())   { setErr("ফোন নম্বর দিন।"); return; }
    if (!form.address.trim()) { setErr("ঠিকানা দিন।"); return; }
    if (form.method !== "cod" && !form.paymentNumber.trim()) {
      setErr(`${selectedMethod?.label} নম্বর দিন।`); return;
    }
    setLoading(true);
    try {
      const effectiveCart = isSingleProduct
        ? [{ product: stateProduct, qty, selectedColor: selColor, selectedSize: selSize }]
        : cart;
      const res = await api.post("/shop/place-order", {
        items: effectiveCart.map((i) => ({
          product_id:     i.product.id,
          product_name:   i.product.name_bn,
          qty:            i.qty,
          unit_price:     effectivePrice(i.product),
          selected_color: i.selectedColor || selColor || "",
          selected_size:  i.selectedSize  || selSize  || "",
        })),
        customer_name:    form.name,
        customer_phone:   form.phone,
        customer_address: form.address,
        payment_method:   form.method,
        payment_number:   form.paymentNumber,
        transaction_id:   form.transactionId,
        note:             form.note,
        promo_code:       promoData?.code || "",
      });
      setSuccess({ orderNumber: res.data.order_number, total: res.data.total ?? total });
    } catch (ex) { setErr(formatApiError(ex)); }
    finally { setLoading(false); }
  };

  if (!stateProduct && !stateCart) return null;

  if (success)
    return <OrderSuccess orderNumber={success.orderNumber} total={success.total}
                         onBackToShop={() => navigate("/shop")} />;

  const imgs = stateProduct ? productImages(stateProduct) : [];
  const price = stateProduct ? effectivePrice(stateProduct) : 0;
  const disc  = stateProduct ? discountPct(stateProduct) : 0;

  return (
    <div className="min-h-screen bg-[var(--bii-cream)] pb-10">
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--bii-emerald)] text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
        <button onClick={() => navigate(-1)} className="hover:opacity-75 transition">
          <ArrowLeft size={22} weight="bold" />
        </button>
        <span className="font-semibold text-base flex-1">অর্ডার করুন</span>
        <Lightning size={22} weight="fill" className="opacity-70" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* ── Product info ─────────────────────────────────────────── */}
        {stateProduct && (
          <div className="bii-card p-4 space-y-3">
            {imgs.length > 0 && (
              <MiniGallery images={imgs} onZoom={setLightbox} />
            )}
            <div>
              {stateProduct.category && (
                <span className="text-[10px] font-bold text-[var(--bii-gold)] uppercase tracking-wide">
                  {stateProduct.category}
                </span>
              )}
              <h2 className="font-heading text-lg text-[var(--bii-emerald)] leading-snug mt-0.5">
                {stateProduct.name_bn}
              </h2>
              {stateProduct.name_en && (
                <p className="text-xs text-[var(--bii-text-soft)]">{stateProduct.name_en}</p>
              )}
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-[var(--bii-emerald)]">{fmt(price)}</span>
                {disc > 0 && (
                  <span className="text-sm text-[var(--bii-text-soft)] line-through">{fmt(stateProduct.price)}</span>
                )}
                {disc > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{disc}% ছাড়</span>
                )}
              </div>
            </div>

            {/* Qty selector (only for single-product orders) */}
            {isSingleProduct && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--bii-text-soft)]">পরিমাণ:</span>
                <div className="flex items-center gap-2 bg-[var(--bii-cream)] rounded-xl px-2 py-1 border border-[var(--bii-border)]">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                          className="w-7 h-7 rounded-lg border border-[var(--bii-border)] flex items-center justify-center
                                     hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition font-bold">−</button>
                  <span className="w-8 text-center font-bold text-[var(--bii-text)]">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)}
                          className="w-7 h-7 rounded-lg border border-[var(--bii-border)] flex items-center justify-center
                                     hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition font-bold">+</button>
                </div>
                <span className="ml-auto font-bold text-[var(--bii-emerald)]">{fmt(price * qty)}</span>
              </div>
            )}

            {/* Color selector */}
            {isSingleProduct && parseVariants(stateProduct?.colors).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--bii-text)]">রঙ বাছাই করুন</span>
                  {selColor && <span className="text-xs text-[var(--bii-emerald)] font-medium bg-emerald-50 px-2 py-0.5 rounded-full">✓ {selColor}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {parseVariants(stateProduct.colors).map((c) => (
                    <button key={c} onClick={() => setSelColor(selColor === c ? "" : c)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selColor === c
                          ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white shadow-sm"
                          : "border-[var(--bii-border)] text-[var(--bii-text)] hover:border-[var(--bii-emerald)]/60"
                      }`}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {isSingleProduct && parseVariants(stateProduct?.sizes).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--bii-text)]">সাইজ বাছাই করুন</span>
                  {selSize && <span className="text-xs text-[var(--bii-emerald)] font-medium bg-emerald-50 px-2 py-0.5 rounded-full">✓ {selSize}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {parseVariants(stateProduct.sizes).map((s) => (
                    <button key={s} onClick={() => setSelSize(selSize === s ? "" : s)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selSize === s
                          ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white shadow-sm"
                          : "border-[var(--bii-border)] text-[var(--bii-text)] hover:border-[var(--bii-emerald)]/60"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Cart summary (for cart checkout) ─────────────────────── */}
        {stateCart && (
          <div className="bii-card p-4 space-y-2">
            <p className="text-xs font-bold text-[var(--bii-text-soft)] uppercase tracking-wide">অর্ডার সারসংক্ষেপ</p>
            {cart.map((i) => (
              <div key={i.product.id} className="flex justify-between text-sm">
                <div className="flex-1 mr-2 min-w-0">
                  <span className="text-[var(--bii-text)] truncate block">
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
                <span className="font-semibold flex-shrink-0 text-[var(--bii-emerald)]">{fmt(effectivePrice(i.product) * i.qty)}</span>
              </div>
            ))}
            <div className="border-t border-[var(--bii-border)] pt-2 flex justify-between font-bold">
              <span>সর্বমোট</span>
              <span className="text-[var(--bii-emerald)]">{fmt(subtotal)}</span>
            </div>
          </div>
        )}

        {/* ── Promo code ────────────────────────────────────────────── */}
        <div className="bii-card p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <SealPercent size={16} weight="bold" className="text-[var(--bii-gold)]" />
            প্রমো কোড (ঐচ্ছিক)
          </h3>
          {promoData ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-xl px-3 py-2">
              <CheckCircle size={18} weight="fill" className="text-green-600 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-mono font-bold text-green-700">{promoData.code}</span>
                <span className="text-green-600 ml-2">— {fmt(promoData.discount)} ছাড়</span>
              </div>
              <button onClick={() => { setPromoData(null); setPromoCode(""); }}
                      className="text-red-400 hover:text-red-600 text-xs underline">সরান</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="bii-input flex-1 font-mono uppercase"
                     placeholder="PROMO কোড লিখুন"
                     value={promoCode}
                     onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoErr(""); }}
                     onKeyDown={(e) => e.key === "Enter" && applyPromo()} />
              <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                      className="px-4 py-2 rounded-xl bg-[var(--bii-gold)] text-white font-bold text-sm
                                 disabled:opacity-50 hover:opacity-90 transition flex-shrink-0">
                {promoLoading ? "..." : "প্রয়োগ"}
              </button>
            </div>
          )}
          {promoErr && <p className="text-xs text-red-600">{promoErr}</p>}
          {discount > 0 && (
            <div className="flex justify-between text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <span>ছাড়ের পর মোট</span>
              <span>{fmt(total)}</span>
            </div>
          )}
        </div>

        {/* ── Delivery info ─────────────────────────────────────────── */}
        <div className="bii-card p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <span className="w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white flex items-center justify-center text-xs font-bold">১</span>
            <MapPin size={14} weight="fill" className="text-[var(--bii-emerald)]" />
            ডেলিভারি তথ্য
          </h3>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">আপনার নাম *</label>
              <input className="bii-input" value={form.name} onChange={set("name")} placeholder="সম্পূর্ণ নাম" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">মোবাইল নম্বর *</label>
              <input className="bii-input" value={form.phone} onChange={set("phone")} type="tel" placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">ডেলিভারি ঠিকানা *</label>
              <textarea className="bii-input min-h-[80px]" value={form.address} onChange={set("address")}
                        placeholder="বাড়ি নং, রাস্তা, এলাকা, থানা, জেলা" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
              <textarea className="bii-input min-h-[56px]" value={form.note} onChange={set("note")}
                        placeholder="কোনো বিশেষ কথা থাকলে লিখুন..." />
            </div>
          </div>
        </div>

        {/* ── Payment method ────────────────────────────────────────── */}
        <div className="bii-card p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--bii-text)]">
            <span className="w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white flex items-center justify-center text-xs font-bold">২</span>
            <CreditCard size={14} weight="fill" className="text-[var(--bii-emerald)]" />
            পেমেন্ট পদ্ধতি *
          </h3>

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
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {form.method !== "cod" && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-3">
              <p className="text-xs text-orange-700 flex items-start gap-1.5">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                {selectedMethod?.label} নম্বরে {fmt(total)} পেমেন্ট করে নিচের তথ্য পূরণ করুন।
              </p>
              <div>
                <label className="block text-xs font-medium mb-1">আপনার {selectedMethod?.label} নম্বর *</label>
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
                ডেলিভারির সময় ক্যাশ পেমেন্ট করুন। কোনো অগ্রিম পেমেন্ট নেই।
              </p>
            </div>
          )}
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2">
            <Warning size={16} className="flex-shrink-0 mt-0.5" /> {err}
          </div>
        )}

        {/* ── Place order button ────────────────────────────────────── */}
        <button onClick={place} disabled={loading}
                className="bii-btn-primary w-full flex items-center justify-center gap-2 text-base py-4 rounded-2xl">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              অর্ডার দেওয়া হচ্ছে...
            </span>
          ) : (
            <>
              <CheckCircle size={22} weight="bold" />
              অর্ডার নিশ্চিত করুন — {fmt(total)}
              {discount > 0 && <span className="text-xs opacity-80">(ছাড় {fmt(discount)})</span>}
            </>
          )}
        </button>

        <p className="text-center text-xs text-[var(--bii-text-soft)] pb-4">
          অর্ডার করার পরে আমাদের টিম আপনার সাথে যোগাযোগ করবে।
        </p>
      </div>
    </div>
  );
}

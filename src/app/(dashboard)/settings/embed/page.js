"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../../lib/api";
import {
  FileCode,
  Copy,
  Check,
  Activity,
  Tag,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";

const EMBED_SRC =
  process.env.NEXT_PUBLIC_EMBED_SRC || "https://cdn.purebook.in/engine.js";

export default function EmbedAndMarketingSettingsPage() {
  const [hotel, setHotel] = useState(null);
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);

  // Tracking Pixels state (#6)
  const [integrations, setIntegrations] = useState({
    metaPixelId: "",
    ga4MeasurementId: "",
    googleTagManagerId: "",
  });
  const [savingPixels, setSavingPixels] = useState(false);
  const [pixelStatus, setPixelStatus] = useState({ type: "", message: "" });

  // Promo Codes state (#2)
  const [promoCodes, setPromoCodes] = useState([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    maxDiscountAmount: "",
    minNights: 1,
    minOrderAmount: 0,
    usageLimit: "",
  });

  const loadHotelData = async () => {
    try {
      const res = await fetchWithAuth("/hotel");
      const data = res.data || {};
      setHotel(data);
      setSlug(data.slug || "");
      setIntegrations({
        metaPixelId: data.integrations?.metaPixelId || "",
        ga4MeasurementId: data.integrations?.ga4MeasurementId || "",
        googleTagManagerId: data.integrations?.googleTagManagerId || "",
      });
      setPromoCodes(data.promoCodes || []);
    } catch (err) {
      console.error("Failed to load hotel config:", err);
    }
  };

  useEffect(() => {
    loadHotelData();
  }, []);

  const snippet = `<!-- PureBook Direct Booking Engine Embed -->
<hotel-booking-engine data-hotel="${slug || "your-hotel-slug"}"></hotel-booking-engine>
<script defer src="${EMBED_SRC}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Save Tracking Integrations ──
  const handleSavePixels = async (e) => {
    e.preventDefault();
    setSavingPixels(true);
    setPixelStatus({ type: "", message: "" });

    try {
      await fetchWithAuth("/hotel/settings", {
        method: "PATCH",
        body: JSON.stringify({
          integrations,
        }),
      });
      setPixelStatus({
        type: "success",
        message: "Tracking pixels and GTM ID saved successfully!",
      });
      setTimeout(() => setPixelStatus({ type: "", message: "" }), 3000);
    } catch (err) {
      setPixelStatus({
        type: "error",
        message: err.message || "Failed to save pixel settings.",
      });
    } finally {
      setSavingPixels(false);
    }
  };

  // ── Save New Promo Code ──
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.discountValue) return;

    setSavingPromo(true);
    const newPromo = {
      code: promoForm.code.trim().toUpperCase(),
      description: promoForm.description.trim(),
      discountType: promoForm.discountType,
      discountValue: Number(promoForm.discountValue),
      maxDiscountAmount: promoForm.maxDiscountAmount
        ? Number(promoForm.maxDiscountAmount)
        : null,
      minNights: Math.max(1, parseInt(promoForm.minNights, 10) || 1),
      minOrderAmount: Math.max(0, Number(promoForm.minOrderAmount) || 0),
      usageLimit: promoForm.usageLimit
        ? parseInt(promoForm.usageLimit, 10)
        : null,
      isActive: true,
    };

    const updated = [...promoCodes, newPromo];

    try {
      await fetchWithAuth("/hotel/settings", {
        method: "PATCH",
        body: JSON.stringify({ promoCodes: updated }),
      });
      setPromoCodes(updated);
      setShowPromoModal(false);
      setPromoForm({
        code: "",
        description: "",
        discountType: "PERCENT",
        discountValue: "",
        maxDiscountAmount: "",
        minNights: 1,
        minOrderAmount: 0,
        usageLimit: "",
      });
    } catch (err) {
      alert(err.message || "Failed to save promo code.");
    } finally {
      setSavingPromo(false);
    }
  };

  // ── Delete Promo Code ──
  const handleDeletePromo = async (codeToDelete) => {
    if (
      !confirm(`Are you sure you want to remove promo code "${codeToDelete}"?`)
    )
      return;

    const updated = promoCodes.filter((p) => p.code !== codeToDelete);
    try {
      await fetchWithAuth("/hotel/settings", {
        method: "PATCH",
        body: JSON.stringify({ promoCodes: updated }),
      });
      setPromoCodes(updated);
    } catch (err) {
      alert("Failed to delete coupon code.");
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* ── Section 1: Embed Script ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Direct Booking &amp; Growth Tools
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Embed your direct booking engine, configure ad tracking pixels, and
          launch promo codes.
        </p>
      </div>

      <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 font-mono text-xs relative shadow-xl border border-slate-800">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-blue-400" />
            <span>One-Line Embed HTML</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <pre className="overflow-x-auto text-emerald-400 leading-relaxed">
          {snippet}
        </pre>
      </div>

      {/* ── Section 2: Tracking Pixels & GTM ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Activity size={20} className="text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Marketing &amp; Ad Tracking Pixels
            </h2>
            <p className="text-xs text-slate-500">
              Track conversions, search dates, room pageviews, and checkout
              events in Meta Ads, GA4, and Google Tag Manager.
            </p>
          </div>
        </div>

        {pixelStatus.message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              pixelStatus.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <AlertCircle size={14} />
            <span>{pixelStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleSavePixels} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meta Pixel ID (Facebook / Instagram)
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789012345"
                value={integrations.metaPixelId}
                onChange={(e) =>
                  setIntegrations({
                    ...integrations,
                    metaPixelId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Fires ViewContent, InitiateCheckout, and Purchase events.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Analytics 4 (GA4 Measurement ID)
              </label>
              <input
                type="text"
                placeholder="e.g. G-XXXXXXXXXX"
                value={integrations.ga4MeasurementId}
                onChange={(e) =>
                  setIntegrations({
                    ...integrations,
                    ga4MeasurementId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Fires view_item, begin_checkout, and purchase eCommerce events.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Tag Manager (GTM Container ID)
            </label>
            <input
              type="text"
              placeholder="e.g. GTM-XXXXXXX"
              value={integrations.googleTagManagerId}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  googleTagManagerId: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Loads the GTM container script and populates dataLayer events
              automatically.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPixels}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>
                {savingPixels ? "Saving…" : "Save Tracking Integrations"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 3: Promo Codes & Discounts (#2) ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Tag size={20} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Promo Codes &amp; Coupons
              </h2>
              <p className="text-xs text-slate-500">
                Provide direct booking discounts to guests on your widget.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPromoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Plus size={14} />
            <span>Create Promo</span>
          </button>
        </div>

        {promoCodes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No promo codes created yet. Click "Create Promo" to launch your
            first direct booking campaign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Code</th>
                  <th className="py-2.5 px-3 font-semibold">Discount</th>
                  <th className="py-2.5 px-3 font-semibold">Min Stay</th>
                  <th className="py-2.5 px-3 font-semibold">Min Order</th>
                  <th className="py-2.5 px-3 font-semibold">Redemptions</th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promoCodes.map((p) => (
                  <tr key={p.code} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">
                      {p.discountType === "PERCENT"
                        ? `${p.discountValue}% OFF`
                        : `₹${p.discountValue} FLAT`}
                      {p.maxDiscountAmount
                        ? ` (cap ₹${p.maxDiscountAmount})`
                        : ""}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {p.minNights} {p.minNights === 1 ? "night" : "nights"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {p.minOrderAmount > 0 ? `₹${p.minOrderAmount}` : "None"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {p.usedCount || 0}{" "}
                      {p.usageLimit ? `/ ${p.usageLimit}` : "times"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeletePromo(p.code)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                        title="Delete promo code"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Promo Creation Modal ── */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Create New Promo Code
              </h3>
              <button
                onClick={() => setShowPromoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER15"
                  required
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm({
                      ...promoForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discountType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={
                      promoForm.discountType === "PERCENT" ? "15" : "500"
                    }
                    value={promoForm.discountValue}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discountValue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {promoForm.discountType === "PERCENT" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maximum Discount Cap (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={promoForm.maxDiscountAmount}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        maxDiscountAmount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Min Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.minNights}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, minNights: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Max Uses (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={promoForm.usageLimit}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, usageLimit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                >
                  {savingPromo ? "Saving…" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

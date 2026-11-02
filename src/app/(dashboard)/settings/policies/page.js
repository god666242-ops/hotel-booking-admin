"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../../lib/api";
import {
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Lock,
  Save,
  Clock,
  Info,
} from "lucide-react";

export default function CancellationAndRatePlansPolicyPage() {
  // Cancellation Tiers State
  const [tiers, setTiers] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [cutoffHours, setCutoffHours] = useState(12);
  const [paymentMode, setPaymentMode] = useState("PAY_AT_HOTEL");

  // Rate Plans State (Non-Refundable, Minimum Stay & CTA Rules)
  const [ratePlans, setRatePlans] = useState([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    isNonRefundable: false,
    discountType: "PERCENT",
    discountValue: 10,
    minStayNights: 1,
    mealsIncluded: false,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchWithAuth("/hotel").then((res) => {
      const data = res.data || {};
      if (data.cancellationPolicy) {
        setEnabled(data.cancellationPolicy.enabled !== false);
        setTiers(data.cancellationPolicy.tiers || []);
        setCutoffHours(data.cancellationPolicy.cutoffHours ?? 12);
      }
      setPaymentMode(
        data.paymentConfig?.mode === "HOTEL_GATEWAY"
          ? "HOTEL_GATEWAY"
          : "PAY_AT_HOTEL",
      );
      if (Array.isArray(data.ratePlans)) {
        setRatePlans(data.ratePlans);
      }
    });
  }, []);

  const handleTierChange = (index, field, value) => {
    const updated = [...tiers];
    updated[index][field] = Number(value);
    setTiers(updated);
  };

  const addTier = () => {
    setTiers([...tiers, { daysBeforeCheckIn: 1, refundPercent: 50 }]);
  };

  const removeTier = (index) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  // Rate Plan Handlers
  const handleAddRatePlan = (e) => {
    e.preventDefault();
    if (!newPlan.name.trim()) return;

    const planDoc = {
      ...newPlan,
      name: newPlan.name.trim(),
      discountValue: Number(newPlan.discountValue) || 0,
      minStayNights: Math.max(1, parseInt(newPlan.minStayNights, 10) || 1),
    };

    setRatePlans([...ratePlans, planDoc]);
    setNewPlan({
      name: "",
      description: "",
      isNonRefundable: false,
      discountType: "PERCENT",
      discountValue: 10,
      minStayNights: 1,
      mealsIncluded: false,
      isActive: true,
    });
    setShowAddPlan(false);
  };

  const removeRatePlan = (index) => {
    setRatePlans(ratePlans.filter((_, i) => i !== index));
  };

  const toggleRatePlanStatus = (index) => {
    const updated = [...ratePlans];
    updated[index].isActive = !updated[index].isActive;
    setRatePlans(updated);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      await fetchWithAuth("/hotel/policies", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          cutoffHours: Math.min(
            72,
            Math.max(0, Math.floor(Number(cutoffHours) || 0)),
          ),
          tiers,
          ratePlans,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      alert(err.message || "Failed to save policies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Policies &amp; Rate Plans
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure cancellation refund tiers, non-refundable rates, and minimum
          stay requirements. Closed-to-arrival is managed per date in Inventory.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Policies and Rate Plans updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* ── Section 1: Rate Plans Management (Non-Refundable, Min Stay) ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Layers size={20} className="text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rate Plans &amp; Booking Rules
                </h2>
                <p className="text-xs text-slate-500">
                  Create tiered pricing options like Non-Refundable rates and
                  minimum night restrictions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPlan(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Add Rate Plan</span>
            </button>
          </div>

          {ratePlans.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No custom rate plans configured. The platform default flexible
              base rate is currently applied to all rooms.
            </div>
          ) : (
            <div className="space-y-3">
              {ratePlans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    plan.isActive
                      ? "bg-slate-50/70 border-slate-200"
                      : "bg-slate-50/30 border-slate-100 opacity-60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {plan.name}
                      </span>
                      {plan.isNonRefundable && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Lock size={10} /> Non-Refundable
                        </span>
                      )}
                      {plan.mealsIncluded && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Breakfast Included
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Adjustment:{" "}
                        <strong>
                          {plan.discountValue > 0
                            ? `-${plan.discountValue}${plan.discountType === "PERCENT" ? "%" : "₹"}`
                            : "Base Price"}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Min Stay:{" "}
                        <strong>
                          {plan.minStayNights || 1}{" "}
                          {plan.minStayNights === 1 ? "night" : "nights"}
                        </strong>
                      </span>
                      {plan.description && (
                        <>
                          <span>&bull;</span>
                          <span className="italic">{plan.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => toggleRatePlanStatus(idx)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition ${
                        plan.isActive
                          ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {plan.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRatePlan(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Plan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Rate Plan Modal / Sub-form */}
          {showAddPlan && (
            <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                <span className="text-xs font-bold text-slate-900">
                  New Rate Plan Configuration
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPlan(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Non-Refundable Saver (-10%)"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Guest Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pay now and save 10% on your stay"
                    value={newPlan.description}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={newPlan.discountType}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, discountType: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FLAT">Flat (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newPlan.discountValue}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          discountValue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPlan.minStayNights}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, minStayNights: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.isNonRefundable}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        isNonRefundable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-slate-800">
                    Strictly Non-Refundable
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.mealsIncluded}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        mealsIncluded: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-800">
                    Breakfast Included
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlan(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddRatePlan}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Add Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Online cancellation cutoff ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Clock size={20} className="text-slate-800" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Online Cancellation Cutoff
              </h2>
              <p className="text-xs text-slate-500">
                Guests can cancel online only until this many hours before
                check-in time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="72"
              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
            />
            <span className="text-sm text-slate-700">
              hours before check-in (0 to 72)
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            After the cutoff, the Cancel button disappears from the guest&apos;s
            booking page and they need to contact you. This stops guests (or
            front-desk staff) from cancelling a booking on the website after the
            guest has already arrived. Set 0 to allow cancellation right up to
            check-in time.
          </p>
        </div>
        {/* ── Section 2: Cancellation Policy Slabs ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <ShieldAlert size={20} className="text-slate-800" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Standard Tiered Cancellation Rules
              </h2>
              <p className="text-xs text-slate-500">
                Configure day-wise refund percentages for standard flexible rate
                bookings before check-in time.
              </p>
            </div>
          </div>

          {paymentMode === "PAY_AT_HOTEL" && (
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-700 leading-relaxed flex items-start gap-2">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                Your property uses <b>Pay at hotel</b>, so these refund slabs
                don&apos;t apply. If a guest cancels, their online booking fee
                is non-refundable and the booking is simply cancelled. If you
                cancel a booking, the fee is refunded to the guest in full. The
                slabs below take effect only if you switch to your own Razorpay
                account.
              </span>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900 block">
                Enable Automated Cancellation Engine
              </span>
              <span className="text-xs text-slate-500">
                When disabled, all guest reservations are strictly
                non-refundable regardless of rate plan.
              </span>
            </div>
          </label>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Refund Tiers (Slabs)
              </span>
              <button
                type="button"
                onClick={addTier}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                <Plus size={14} />
                <span>Add Refund Slab</span>
              </button>
            </div>

            {tiers.map((tier, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl"
              >
                <span className="text-xs font-medium text-slate-600">
                  If cancelled &ge;
                </span>
                <input
                  type="number"
                  min="0"
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={tier.daysBeforeCheckIn}
                  onChange={(e) =>
                    handleTierChange(idx, "daysBeforeCheckIn", e.target.value)
                  }
                />
                <span className="text-xs font-medium text-slate-600">
                  days prior to check-in:
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={tier.refundPercent}
                  onChange={(e) =>
                    handleTierChange(idx, "refundPercent", e.target.value)
                  }
                />
                <span className="text-xs font-bold text-slate-800">
                  % refund
                </span>

                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  className="ml-auto text-slate-400 hover:text-rose-600 transition p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <p className="text-[11px] text-slate-400 mt-2">
              * Note: The platform convenience fee is non-refundable and
              protected from cancellation refunds.
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-70 cursor-pointer"
          >
            <Save size={16} />
            <span>
              {loading
                ? "Saving Policies & Plans..."
                : "Save All Policies & Plans"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

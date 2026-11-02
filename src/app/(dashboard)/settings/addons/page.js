"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../../lib/api";
import {
  Gift,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Power,
} from "lucide-react";

const CHARGE_TYPES = [
  { value: "PER_STAY", label: "Flat per stay (e.g., Airport cab)" },
  { value: "PER_NIGHT", label: "Per night (e.g., Extra bed)" },
  { value: "PER_GUEST", label: "Per guest (e.g., Candlelight dinner)" },
  { value: "PER_GUEST_PER_NIGHT", label: "Per guest per night (e.g., Buffet breakfast)" },
];

export default function AddonsSettingsPage() {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadAddOns();
  }, []);

  async function loadAddOns() {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/hotel");
      if (res.success && res.data) {
        const list = (res.data.addOns || []).map((a) => ({
          ...a,
          isActive: a.isActive !== false,
        }));
        setAddOns(list);
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to load stay add-ons.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAddRow() {
    setAddOns((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        price: 0,
        chargeType: "PER_STAY",
        isActive: true,
      },
    ]);
  }

  function handleRemoveRow(index) {
    const updated = addOns.filter((_, i) => i !== index);
    setAddOns(updated);
  }

  function handleChange(index, field, value) {
    setAddOns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // Toggles the status and immediately saves to the database
  async function handleToggleActive(index) {
    const updated = addOns.map((item, i) => {
      if (i === index) {
        return { ...item, isActive: item.isActive === false ? true : false };
      }
      return item;
    });

    setAddOns(updated);
    await handleSave(updated);
  }

  async function handleSave(customList = null) {
    try {
      setSaving(true);
      setStatusMessage(null);

      const itemsToSave = customList || addOns;

      // Validate required fields
      for (let i = 0; i < itemsToSave.length; i++) {
        if (!itemsToSave[i].name?.trim()) {
          throw new Error(`Item #${i + 1} requires a valid title/name.`);
        }
      }

      const payload = {
        addOns: itemsToSave.map((item) => ({
          ...(item._id ? { _id: item._id } : {}),
          name: item.name.trim(),
          description: (item.description || "").trim(),
          price: Math.max(0, Number(item.price) || 0),
          chargeType: item.chargeType || "PER_STAY",
          isActive: item.isActive === false ? false : true,
        })),
      };

      const res = await fetchWithAuth("/hotel/addons", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Stay add-ons updated successfully!",
        });
        if (Array.isArray(res.data)) {
          setAddOns(
            res.data.map((a) => ({
              ...a,
              isActive: a.isActive !== false,
            }))
          );
        }
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save stay add-ons.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Gift size={15} />
            <span>Guest Upgrades & Amenities</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Enhance Your Stay Add-ons
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure optional services, packages, and extras displayed to guests during the direct checkout flow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Plus size={16} />
            Add New Item
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Empty State */}
      {addOns.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Gift size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No add-ons configured</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Give guests the option to book airport pick-ups, candlelight dinners, extra beds, or special tours.
          </p>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Plus size={16} />
            Create First Add-on
          </button>
        </div>
      ) : (
        /* Items List */
        <div className="space-y-4">
          {addOns.map((addon, index) => {
            const isActive = addon.isActive !== false;
            return (
              <div
                key={addon._id || index}
                className={`bg-white rounded-2xl border p-5 transition shadow-sm ${
                  isActive ? "border-slate-200" : "border-slate-200/60 bg-slate-50/50 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                    Add-on #{index + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleActive(index)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition disabled:opacity-50 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300"
                      }`}
                    >
                      <Power size={13} />
                      {isActive ? "Active (Click to Disable)" : "Disabled (Click to Enable)"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Title */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Title / Service Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Airport transfer, Candlelight dinner"
                      value={addon.name || ""}
                      onChange={(e) => handleChange(index, "name", e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                    />
                  </div>

                  {/* Subtitle / Description */}
                  <div className="md:col-span-7 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Description / Subtitle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Private cab, one way | Beach-side setup"
                      value={addon.description || ""}
                      onChange={(e) => handleChange(index, "description", e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                    />
                  </div>

                  {/* Price */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="1500"
                        value={addon.price ?? 0}
                        onChange={(e) => handleChange(index, "price", e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* Charge Type */}
                  <div className="md:col-span-8 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Pricing Unit / Calculation Basis
                      </label>
                      <div className="group relative cursor-pointer">
                        <HelpCircle size={13} className="text-slate-400" />
                        <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20 pointer-events-none">
                          Determines how the pricing engine computes total cost during multi-night stays or multi-guest bookings.
                        </div>
                      </div>
                    </div>
                    <select
                      value={addon.chargeType || "PER_STAY"}
                      onChange={(e) => handleChange(index, "chargeType", e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                    >
                      {CHARGE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
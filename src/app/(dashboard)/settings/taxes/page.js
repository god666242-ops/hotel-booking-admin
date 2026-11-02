'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../../lib/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Stops "-", "+" and "e" from being typed into number inputs
const blockInvalidKeys = (e) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
};

export default function TaxSettingsPage() {
  const [gstEnabled, setGstEnabled] = useState(true);
  const [useSlab, setUseSlab] = useState(false);
  const [taxPercent, setTaxPercent] = useState(12);
  const [tierThreshold, setTierThreshold] = useState(7500);
  const [rateBelowThreshold, setRateBelowThreshold] = useState(12);
  const [rateAboveThreshold, setRateAboveThreshold] = useState(18);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchWithAuth('/hotel')
      .then((res) => {
        const tax = res.data?.taxConfig;
        if (tax) {
          setGstEnabled(tax.gstEnabled ?? true);
          setUseSlab(tax.useSlab ?? false);
          setTaxPercent(tax.taxPercent ?? 12);
          setTierThreshold(tax.tierThreshold ?? 7500);
          setRateBelowThreshold(tax.rateBelowThreshold ?? 12);
          setRateAboveThreshold(tax.rateAboveThreshold ?? 18);
        }
      })
      .catch((err) => setFormError(err.message || 'Could not load tax settings.'));
  }, []);

  // Accepts only empty or non-negative values; `max` caps the value (e.g. 100 for percentages)
  const numberHandler = (setter, max) => (e) => {
    const val = e.target.value;
    setSaved(false);
    if (val === '') {
      setter('');
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n) || n < 0) return;
    if (max !== undefined && n > max) return;
    setter(val);
  };

  const validate = () => {
    const rates = useSlab
      ? [
          ['Below threshold rate', rateBelowThreshold],
          ['Above threshold rate', rateAboveThreshold],
        ]
      : [['Room tax rate', taxPercent]];

    for (const [label, value] of rates) {
      const n = Number(value);
      if (value === '' || Number.isNaN(n) || n < 0 || n > 100) {
        return `${label} must be between 0 and 100.`;
      }
    }

    if (useSlab) {
      const t = Number(tierThreshold);
      if (tierThreshold === '' || Number.isNaN(t) || t <= 0) {
        return 'Threshold tariff must be greater than 0.';
      }
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Only validate rate fields when GST is on; when off, nothing is collected
    if (gstEnabled) {
      const error = validate();
      if (error) {
        setFormError(error);
        setSaved(false);
        return;
      }
    }

    setFormError('');
    setLoading(true);
    setSaved(false);

    try {
      await fetchWithAuth('/hotel/taxes', {
        method: 'PUT',
        body: JSON.stringify({
          gstEnabled,
          useSlab,
          taxPercent: Number(taxPercent),
          tierThreshold: Number(tierThreshold),
          rateBelowThreshold: Number(rateBelowThreshold),
          rateAboveThreshold: Number(rateAboveThreshold),
        }),
      });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Room Taxes & GST Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Configure the exact dynamic tax percentage applied to room reservations</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Tax configuration saved and applied to your booking engine.</span>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gstEnabled}
            onChange={(e) => {
              setGstEnabled(e.target.checked);
              setFormError('');
              setSaved(false);
            }}
            className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
          />
          <div>
            <span className="text-sm font-semibold text-slate-900 block">Collect Room Tax / GST on Direct Bookings</span>
            <span className="text-xs text-slate-500">
              When disabled, guests are charged 0% tax (tax-inclusive pricing).
            </span>
          </div>
        </label>

        {gstEnabled && (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            {/* Mode Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => {
                  setUseSlab(false);
                  setFormError('');
                }}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  !useSlab ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10' : 'border-slate-200'
                }`}
              >
                <span className="font-bold text-sm text-slate-900 block">Flat Tax Percentage</span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Apply a standard percentage (e.g. 5%, 12%, or 18%) to all room bookings.
                </span>
              </div>

              <div
                onClick={() => {
                  setUseSlab(true);
                  setFormError('');
                }}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  useSlab ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10' : 'border-slate-200'
                }`}
              >
                <span className="font-bold text-sm text-slate-900 block">Indian GST Slab Threshold</span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Automatically switch tax bracket (12% below ₹7,500 / 18% above ₹7,500).
                </span>
              </div>
            </div>

            {!useSlab ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Room Tax Rate (%)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    inputMode="decimal"
                    onKeyDown={blockInvalidKeys}
                    className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={taxPercent}
                    onChange={numberHandler(setTaxPercent, 100)}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Typical hotel taxes in India: 5% (Homestays), 12% (Rooms &lt; ₹7.5k), 18% (Luxury).</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Threshold Tariff (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={tierThreshold}
                    onChange={numberHandler(setTierThreshold)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Below Threshold Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    onKeyDown={blockInvalidKeys}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={rateBelowThreshold}
                    onChange={numberHandler(setRateBelowThreshold, 100)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Above Threshold Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    onKeyDown={blockInvalidKeys}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={rateAboveThreshold}
                    onChange={numberHandler(setRateAboveThreshold, 100)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-70"
        >
          {loading ? 'Saving...' : 'Save Tax Rules'}
        </button>
      </form>
    </div>
  );
}
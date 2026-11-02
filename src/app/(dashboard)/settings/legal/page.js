'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../../../lib/api';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function LegalSettingsPage() {
  const [form, setForm] = useState({
    legalName: '', gstin: '', invoicePrefix: 'INV',
    termsUrl: '', privacyUrl: '', termsVersion: '1', privacyVersion: '1',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchWithAuth('/hotel')
      .then((res) => {
        const l = res.data?.legal || {};
        setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined && v !== null)) }));
      })
      .catch((e) => setMsg({ type: 'error', text: e.message }));
  }, []);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: k === 'gstin' || k === 'invoicePrefix' ? e.target.value.toUpperCase() : e.target.value });
    setMsg(null);
  };

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (form.gstin && !GSTIN_RE.test(form.gstin)) return setMsg({ type: 'error', text: 'GSTIN must be 15 characters, e.g. 37ABCDE1234F1Z5.' });
    setBusy(true);
    try {
      const res = await fetchWithAuth('/hotel/legal', { method: 'PUT', body: JSON.stringify(form) });
      setMsg({ type: 'ok', text: res.message });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const input = (k, label, props = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input value={form[k]} onChange={set(k)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" {...props} />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Legal & Invoicing</h1>
        <p className="text-sm text-slate-500 mt-1">Details printed on guest invoices, and the policies guests accept at checkout.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">GST invoice</h2>
          {input('legalName', 'Legal business name', { placeholder: 'As registered with GST, e.g. Sea View Hospitality Pvt Ltd' })}
          <div className="grid sm:grid-cols-2 gap-4">
            {input('gstin', 'GSTIN', { placeholder: '37ABCDE1234F1Z5', maxLength: 15 })}
            {input('invoicePrefix', 'Invoice prefix', { maxLength: 4, placeholder: 'INV' })}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              With a valid GSTIN, guests receive a numbered GST tax invoice (CGST + SGST). Without one they receive a plain receipt.
              Numbers run in sequence each financial year, e.g. <strong>{(form.invoicePrefix || 'INV')}/2627/00001</strong>.
            </span>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Terms & privacy (shown at checkout)</h2>
          {input('termsUrl', 'Terms & conditions link', { placeholder: 'https://yourhotel.com/terms', type: 'url' })}
          {input('privacyUrl', 'Privacy policy link', { placeholder: 'https://yourhotel.com/privacy', type: 'url' })}
          <div className="grid sm:grid-cols-2 gap-4">
            {input('termsVersion', 'Terms version', { maxLength: 30 })}
            {input('privacyVersion', 'Privacy version', { maxLength: 30 })}
          </div>
          <p className="text-xs text-slate-500">
            Every booking records the guest&apos;s acceptance with the time and these version labels. Change the version whenever you update a policy.
          </p>
        </section>

        {msg && (
          <div className={`flex items-start gap-2 text-sm ${msg.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {msg.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}
        <button disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60">
          {busy ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

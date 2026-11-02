'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { X, Phone, Footprints, AlertCircle } from 'lucide-react';

const IST = 'Asia/Kolkata';
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: IST });
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const METHODS = [
  ['CASH', 'Cash'],
  ['UPI', 'UPI'],
  ['CARD', 'Card'],
  ['BANK_TRANSFER', 'Bank transfer'],
  ['OTHER', 'Other'],
];

/**
 * Front-desk booking for phone calls and walk-ins. Taking one removes the rooms
 * from inventory, so they are also blocked on the website and in calendar feeds.
 */
export default function NewBookingModal({ rooms, onClose, onCreated }) {
  const [form, setForm] = useState({
    source: 'WALK_IN',
    roomTypeId: rooms[0]?._id || '',
    checkIn: todayStr(),
    checkOut: addDays(todayStr(), 1),
    roomCount: 1,
    adults: 2,
    children: 0,
    name: '',
    phone: '',
    email: '',
    ratePerNight: '',
    notes: '',
    payAmount: '',
    payMethod: 'CASH',
    payRef: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError('');
  };

  const nights = useMemo(() => {
    const n = Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000);
    return Number.isFinite(n) ? n : 0;
  }, [form.checkIn, form.checkOut]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.roomTypeId) return setError('Choose a room type.');
    if (nights < 1) return setError('Check-out must be after check-in.');
    if (!form.name.trim() || !form.phone.trim()) return setError('Guest name and phone are required.');

    setBusy(true);
    setError('');
    try {
      const body = {
        source: form.source,
        roomTypeId: form.roomTypeId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        roomCount: Number(form.roomCount) || 1,
        adults: Number(form.adults) || 1,
        children: Number(form.children) || 0,
        guest: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() },
        notes: form.notes,
        ...(form.ratePerNight !== '' ? { ratePerNight: Number(form.ratePerNight) } : {}),
        ...(Number(form.payAmount) > 0
          ? { payment: { amount: Number(form.payAmount), method: form.payMethod, reference: form.payRef } }
          : {}),
      };
      const res = await fetchWithAuth('/bookings/offline', { method: 'POST', body: JSON.stringify(body) });
      onCreated(res.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const input = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10';
  const label = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New booking</h2>
            <p className="text-xs text-slate-500 mt-0.5">For phone calls and walk-ins. The rooms are removed from availability straight away.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {[['WALK_IN', 'Walk-in', Footprints], ['PHONE', 'Phone', Phone]].map(([v, l, Icon]) => (
              <button type="button" key={v} onClick={() => setForm({ ...form, source: v })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md ${form.source === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                <Icon size={13} /> {l}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>Room type</label>
              <select value={form.roomTypeId} onChange={set('roomTypeId')} className={input}>
                {rooms.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div><label className={label}>Check-in</label><input type="date" min={todayStr()} value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value, checkOut: e.target.value >= f.checkOut ? addDays(e.target.value, 1) : f.checkOut }))} className={input} /></div>
            <div><label className={label}>Check-out ({nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'invalid'})</label><input type="date" min={addDays(form.checkIn, 1)} value={form.checkOut} onChange={set('checkOut')} className={input} /></div>
            <div><label className={label}>Rooms</label><input type="number" min="1" max="50" value={form.roomCount} onChange={set('roomCount')} className={input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Adults</label><input type="number" min="1" value={form.adults} onChange={set('adults')} className={input} /></div>
              <div><label className={label}>Children</label><input type="number" min="0" value={form.children} onChange={set('children')} className={input} /></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Guest name</label><input value={form.name} onChange={set('name')} maxLength={100} className={input} /></div>
            <div><label className={label}>Phone</label><input value={form.phone} onChange={set('phone')} maxLength={20} inputMode="tel" className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Email (optional, sends the confirmation and invoice)</label><input type="email" value={form.email} onChange={set('email')} className={input} /></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Rate per room per night (optional)</label>
              <input type="number" min="0" value={form.ratePerNight} onChange={set('ratePerNight')} placeholder="Leave empty to use the listed rate" className={input} />
            </div>
            <div><label className={label}>Notes (optional)</label><input value={form.notes} onChange={set('notes')} maxLength={1000} className={input} /></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment received now (optional)</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className={label}>Amount (₹)</label><input type="number" min="0" value={form.payAmount} onChange={set('payAmount')} className={input} /></div>
              <div><label className={label}>Method</label><select value={form.payMethod} onChange={set('payMethod')} className={input}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><label className={label}>Reference</label><input value={form.payRef} onChange={set('payRef')} maxLength={80} placeholder="UPI ref / receipt no." className={input} /></div>
            </div>
            <p className="text-xs text-slate-500">GST is added automatically. No platform convenience fee applies. Leave the amount empty to collect at the hotel.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-700"><AlertCircle size={16} className="mt-0.5" /> <span>{error}</span></div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button disabled={busy} className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60">{busy ? 'Creating...' : 'Create booking'}</button>
        </div>
      </form>
    </div>
  );
}

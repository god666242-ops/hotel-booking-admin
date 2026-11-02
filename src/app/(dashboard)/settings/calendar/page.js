'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../../../../lib/api';
import { Copy, RefreshCw, Trash2, Plus, CheckCircle2, AlertCircle, AlertTriangle, Link2 } from 'lucide-react';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never');
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function CalendarSyncPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ roomTypeId: '', name: '', url: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/calendars');
      setData(res.data);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key, fn) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fn();
      setMsg({ type: 'ok', text: res.message });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setBusy('');
      load();
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const add = (e) => {
    e.preventDefault();
    run('add', async () => {
      const res = await fetchWithAuth('/calendars', { method: 'POST', body: JSON.stringify(form) });
      setForm({ roomTypeId: '', name: '', url: '' });
      return res;
    });
  };

  if (!data) return <p className="text-sm text-slate-500">{msg?.text || 'Loading...'}</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendar Sync (iCal)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Keep Booking.com, Airbnb, MakeMyTrip and others in step with your direct bookings so the same room is never sold twice.
        </p>
      </div>

      {msg && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
          {msg.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {data.conflicts.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
          <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2"><AlertTriangle size={15} /> Possible double bookings</h2>
          <p className="text-xs text-amber-800">A channel booking landed on dates where no room was left. Contact the guest or the channel to resolve each one.</p>
          <ul className="text-sm text-amber-900 space-y-1">
            {data.conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.calendarName}</strong> · {c.roomName} · {fmtDay(c.start)} to {fmtDay(c.end)}
                {c.summary ? ` · ${c.summary}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">1. Send your availability to a channel</h2>
        <p className="text-xs text-slate-500">
          Paste one link per room type into the channel&apos;s &quot;import calendar&quot; setting. Dates with no room left are marked unavailable.
          Calendars only show busy or free, so a room type with several rooms is blocked when it is fully sold out.
        </p>
        <div className="divide-y divide-slate-100">
          {data.exportLinks.map((l) => (
            <div key={l.roomTypeId} className="py-2.5 flex items-center gap-3">
              <div className="w-44 shrink-0 text-sm font-medium text-slate-800 truncate">{l.roomName}</div>
              <input readOnly value={l.url} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50" />
              <button onClick={() => copy(l.url)} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Copy size={12} /> {copied === l.url ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => window.confirm('Old links stop working immediately. Continue?') && run('rotate', () => fetchWithAuth('/calendars/regenerate-token', { method: 'POST' }))}
          disabled={busy === 'rotate'}
          className="text-xs font-semibold text-slate-500 hover:text-rose-700"
        >
          Create new links (invalidates the old ones)
        </button>
      </section>

      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">2. Block rooms when a channel gets a booking</h2>
        <form onSubmit={add} className="grid sm:grid-cols-[180px_160px_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Room type</label>
            <select required value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">Choose...</option>
              {data.exportLinks.map((l) => <option key={l.roomTypeId} value={l.roomTypeId}>{l.roomName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Channel name</label>
            <input required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Booking.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Calendar (iCal) link from the channel</label>
            <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <button disabled={busy === 'add'} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60">
            <Plus size={15} /> {busy === 'add' ? 'Checking...' : 'Connect'}
          </button>
        </form>

        {data.imports.length === 0 ? (
          <p className="text-sm text-slate-500">No channels connected yet. We check connected calendars every 15 minutes.</p>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {data.imports.map((c) => (
              <div key={c.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Link2 size={13} className="text-slate-400" /> {c.name} <span className="text-xs font-normal text-slate-500">· {c.roomName}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.source} · last checked {fmt(c.lastSyncAt)} · {c.eventCount} reservation{c.eventCount === 1 ? '' : 's'}
                    {c.conflictCount > 0 && <span className="text-amber-700 font-semibold"> · {c.conflictCount} conflict{c.conflictCount === 1 ? '' : 's'}</span>}
                  </div>
                  {c.lastError && <div className="text-xs text-rose-700 mt-0.5">Last sync failed: {c.lastError}</div>}
                </div>
                <button onClick={() => run(`sync-${c.id}`, () => fetchWithAuth(`/calendars/${c.id}/sync`, { method: 'POST' }))} disabled={busy === `sync-${c.id}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60">
                  <RefreshCw size={12} className={busy === `sync-${c.id}` ? 'animate-spin' : ''} /> Sync now
                </button>
                <button onClick={() => window.confirm(`Disconnect ${c.name}? Rooms it was blocking will become available again.`) && run(`del-${c.id}`, () => fetchWithAuth(`/calendars/${c.id}`, { method: 'DELETE' }))} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 px-2.5 py-1.5 border border-rose-200 rounded-lg hover:bg-rose-50">
                  <Trash2 size={12} /> Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

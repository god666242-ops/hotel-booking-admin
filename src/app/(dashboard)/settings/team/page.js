'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { UserPlus, Mail, ShieldCheck, UserX, UserCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';

const ROLE_LABEL = { HOTELIER: 'Manager', STAFF: 'Front desk', SUPER_ADMIN: 'Platform admin' };

export default function TeamPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', role: 'STAFF' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/staff');
      setTeam(res.data || []);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => setMsg({ type, text });

  const invite = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetchWithAuth('/staff/invite', { method: 'POST', body: JSON.stringify(form) });
      flash('ok', res.message);
      setForm({ name: '', email: '', role: 'STAFF' });
    } catch (err) {
      flash('error', err.message);
    } finally {
      setBusy(false);
      load();
    }
  };

  const act = async (fn, okText) => {
    setMsg(null);
    try {
      const res = await fn();
      flash('ok', res?.message || okText);
    } catch (err) {
      flash('error', err.message);
    }
    load();
  };

  const resend = (m) => act(() => fetchWithAuth(`/staff/${m.id}/resend-invite`, { method: 'POST' }));
  const setActive = (m, isActive) =>
    act(() => fetchWithAuth(`/staff/${m.id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }), isActive ? 'Access restored.' : 'Access removed.');
  const setRole = (m, role) =>
    act(() => fetchWithAuth(`/staff/${m.id}`, { method: 'PATCH', body: JSON.stringify({ role }) }), 'Role updated.');

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team & Access</h1>
        <p className="text-sm text-slate-500 mt-1">
          Invite front-desk staff to handle arrivals, walk-ins and payments. Staff cannot cancel bookings or change settings.
        </p>
      </div>

      {msg && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
          {msg.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={invite} className="bg-white border border-slate-200/80 rounded-2xl p-5 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Asha Rao" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="asha@hotel.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="STAFF">Front desk</option>
            <option value="HOTELIER">Manager</option>
          </select>
        </div>
        <button disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60">
          <UserPlus size={15} /> {busy ? 'Sending...' : 'Invite'}
        </button>
      </form>

      <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100">
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading team...</p>
        ) : (
          team.map((m) => {
            const me = String(m.id) === String(user?.id || user?._id);
            return (
              <div key={m.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm truncate">{m.name}</span>
                    {me && <span className="text-[10px] font-bold uppercase text-slate-400">You</span>}
                    {m.invitePending && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Invite pending</span>}
                    {!m.isActive && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">No access</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5"><Mail size={12} /> {m.email}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600"><ShieldCheck size={13} /> {ROLE_LABEL[m.role] || m.role}</div>
                {!me && m.role !== 'SUPER_ADMIN' && (
                  <div className="flex items-center gap-2">
                    {m.invitePending && (
                      <button onClick={() => resend(m)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <Send size={12} /> Resend
                      </button>
                    )}
                    {!m.invitePending && m.isActive && (
                      <select value={m.role} onChange={(e) => setRole(m, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                        <option value="STAFF">Front desk</option>
                        <option value="HOTELIER">Manager</option>
                      </select>
                    )}
                    {m.isActive ? (
                      <button onClick={() => setActive(m, false)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 px-2.5 py-1.5 border border-rose-200 rounded-lg hover:bg-rose-50">
                        <UserX size={12} /> Remove access
                      </button>
                    ) : (
                      <button onClick={() => setActive(m, true)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 px-2.5 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50">
                        <UserCheck size={12} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

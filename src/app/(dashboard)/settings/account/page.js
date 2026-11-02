'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { KeyRound, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const change = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (form.newPassword.length < 8) return setMsg({ type: 'error', text: 'Use at least 8 characters.' });
    if (form.newPassword !== form.confirm) return setMsg({ type: 'error', text: 'The new passwords do not match.' });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetchWithAuth('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      // Other devices are now signed out; keep this one signed in with the fresh token
      if (res.token) localStorage.setItem('hbe_token', res.token);
      setMsg({ type: 'ok', text: res.message });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await fetchWithAuth('/auth/logout-all', { method: 'POST' });
    } catch {
      /* the token is revoked either way once the request lands */
    }
    logout();
    router.replace('/login');
  };

  const field = (key, label, auto) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type="password" autoComplete={auto} maxLength={128} value={form[key]}
        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setMsg(null); }}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account & Security</h1>
        <p className="text-sm text-slate-500 mt-1">Signed in as {user?.email}</p>
      </div>

      <form onSubmit={change} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><KeyRound size={15} /> Change password</h2>
        {field('currentPassword', 'Current password', 'current-password')}
        {field('newPassword', 'New password (at least 8 characters)', 'new-password')}
        {field('confirm', 'Confirm new password', 'new-password')}
        {msg && (
          <div className={`flex items-start gap-2 text-sm ${msg.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {msg.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}
        <button disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60">
          {busy ? 'Saving...' : 'Update password'}
        </button>
      </form>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Sign out everywhere</h2>
        <p className="text-sm text-slate-500">
          Ends every session on every device, including this one. Use it if a device was lost or shared.
        </p>
        <button onClick={signOutEverywhere} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50">
          <LogOut size={15} /> Sign out of all devices
        </button>
      </div>
    </div>
  );
}

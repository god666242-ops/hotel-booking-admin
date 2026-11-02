'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_API_URL } from '../../../lib/api';
import AuthCard, { inputCls, primaryBtn } from '../../../components/AuthCard';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) return setLoadError('This invitation link is incomplete.');
    fetch(`${ADMIN_API_URL}/auth/invite/${encodeURIComponent(t)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || 'This invitation is invalid or has expired.');
        setInfo(d.data);
      })
      .catch((e) => setLoadError(e instanceof TypeError ? 'Could not reach the server.' : e.message));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.message || 'Could not activate your account.');
      localStorage.setItem('hbe_token', data.token);
      localStorage.setItem('hbe_user', JSON.stringify(data.user));
      localStorage.setItem('hbe_hotel', JSON.stringify(data.hotel));
      router.push('/');
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Check your connection.' : err.message);
      setBusy(false);
    }
  };

  if (token === null) return null;

  return (
    <AuthCard
      title={info ? `Join ${info.hotelName || 'the team'}` : 'Team invitation'}
      subtitle={info ? `Hello ${info.name}. Set a password to activate your account (${info.email}).` : undefined}
    >
      {loadError ? (
        <p className="text-sm text-rose-700">{loadError} Ask your manager to send a new invitation.</p>
      ) : !info ? (
        <p className="text-sm text-slate-500">Checking your invitation...</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-slate-800 mb-1.5">Password</label>
            <input id="pw" type="password" autoComplete="new-password" maxLength={128} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm font-medium text-slate-800 mb-1.5">Confirm password</label>
            <input id="pw2" type="password" autoComplete="new-password" maxLength={128} value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }} className={inputCls} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Activating...' : 'Activate account'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

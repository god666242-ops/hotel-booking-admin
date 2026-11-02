'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ADMIN_API_URL } from '../../../lib/api';
import AuthCard, { inputCls, primaryBtn } from '../../../components/AuthCard';

export default function ResetPasswordPage() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not reset the password.');
      setDone(true);
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Check your connection.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (token === null) return null;

  return (
    <AuthCard title="Choose a new password" subtitle="You will be signed out everywhere and asked to sign in again.">
      {done ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800">
            Your password has been updated.
          </div>
          <Link href="/login" className={`${primaryBtn} no-underline`}>
            Sign in
          </Link>
        </div>
      ) : !token ? (
        <div className="space-y-4">
          <p className="text-sm text-rose-700">This reset link is incomplete. Request a new one.</p>
          <Link href="/forgot-password" className="text-sm font-semibold text-slate-800 hover:underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-slate-800 mb-1.5">New password</label>
            <input id="pw" type="password" autoComplete="new-password" maxLength={128} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm font-medium text-slate-800 mb-1.5">Confirm password</label>
            <input id="pw2" type="password" autoComplete="new-password" maxLength={128} value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }} className={inputCls} />
          </div>
          {error && (
            <p className="text-sm text-rose-600">
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>
              )}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Saving...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

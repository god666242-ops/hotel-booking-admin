'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ADMIN_API_URL } from '../../../lib/api';
import AuthCard, { inputCls, primaryBtn } from '../../../components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address you sign in with.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.status === 429) throw new Error('Too many requests. Please try again in an hour.');
      if (!res.ok) throw new Error('Something went wrong. Please try again.');
      setDone(true);
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Check your connection.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
    >
      {done ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800">
            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It expires in 1 hour.
          </div>
          <Link href="/login" className="block text-center text-sm font-semibold text-slate-700 hover:text-slate-900">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={inputCls}
              placeholder="manager@hotel.com"
            />
            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
          </div>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
          <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-slate-800">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}

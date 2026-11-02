'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_API_URL } from '../../../lib/api';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, TriangleAlert } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validateEmail = (value) => {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Enter a valid email, like manager@hotel.com.';
  return '';
};

const validatePassword = (value) => {
  if (!value) return 'Enter your password.';
  if (value.length > 128) return 'Password is too long.';
  return '';
};

const VALIDATORS = { email: validateEmail, password: validatePassword };

/* ------------------------------------------------------------------ */
/* Decorative occupancy preview (mirrors the Bookings calendar)        */
/* ------------------------------------------------------------------ */
const PREVIEW_CELLS = [
  0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.6,
  0.3, 0.2, 0.35, 0.5, 0.65, 0.9, 0.75,
  0.45, 0.3, 0.25, 0.4, 0.6, 0.8, 0.95,
  0.7, 0.5, 0.35, 0.3, 0.45, 0.65, 0.85,
  0.55, 0.4, 0.3, 0.2, 0.35, 0.5, 0.6,
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const errors = {
    email: touched.email ? validateEmail(form.email) : '',
    password: touched.password ? validatePassword(form.password) : '',
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleBlur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setTouched({ email: true, password: true });
    const emailErr = VALIDATORS.email(form.email);
    const passwordErr = VALIDATORS.password(form.password);
    if (emailErr || passwordErr) {
      (emailErr ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response, handled below
      }

      if (res.status === 429) {
        throw new Error('Too many sign-in attempts. Wait a few minutes and try again.');
      }
      if (!res.ok) {
        throw new Error(data.message || 'Email or password is incorrect.');
      }
      if (!data.token) {
        throw new Error('Sign-in did not complete. Please try again.');
      }

      localStorage.setItem('hbe_token', data.token);
      localStorage.setItem('hbe_user', JSON.stringify(data.user));
      localStorage.setItem('hbe_hotel', JSON.stringify(data.hotel));
      router.push('/');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Could not reach the server. Check your connection and try again.'
          : err.message
      );
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
        : 'border-slate-300 focus:ring-slate-900/15 focus:border-slate-900'
    }`;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* ───────────── Brand panel (large screens) ───────────── */}
      <aside className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
            <ShieldCheck size={21} className="text-emerald-400" />
          </div>
          <span className="text-base font-semibold tracking-tight">Direct Booking Engine</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl xl:text-[44px] font-bold tracking-tight leading-[1.1]">
            Every room, every night, in one view.
          </h2>
          <p className="mt-4 text-slate-400 text-base leading-relaxed">
            Set rates, watch arrivals and departures, and take bookings straight from your own website.
          </p>

          {/* Occupancy preview: same look as the Bookings calendar */}
          <div aria-hidden="true" className="mt-10 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-5">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-[11px] font-medium text-slate-500 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {PREVIEW_CELLS.map((o, i) => (
                <div
                  key={i}
                  className="h-9 rounded-md"
                  style={{ backgroundColor: `rgba(52, 211, 153, ${o * 0.75})` }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Darker green means more rooms occupied</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">Hotelier management console</p>
      </aside>

      {/* ───────────── Sign-in form ───────────── */}
      <main className="flex items-center justify-center p-6 sm:p-10 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-sm">
          {/* Compact brand for small screens */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <ShieldCheck size={21} className="text-emerald-400" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Direct Booking Engine</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-2 mb-8">
            Use the email you registered your property with.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2.5"
            >
              <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1.5">
                Work email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  placeholder="manager@hotel.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  onBlur={handleBlur('email')}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={inputClass(errors.email)}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-rose-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={128}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`${inputClass(errors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-rose-600">
                  {errors.password}
                </p>
              )}
              {capsLock && !errors.password && (
                <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
                  <TriangleAlert size={13} /> Caps Lock is on
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">
            New to the platform?{' '}
            <Link
              href="/register"
              className="font-semibold text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition"
            >
              Register your property
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
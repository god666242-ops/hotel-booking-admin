'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_API_URL } from '../../../lib/api';
import {
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Circle,
  ShieldCheck,
  MailCheck,
  RotateCcw,
  KeyRound,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^\p{L}[\p{L}\s.'-]*$/u;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const squash = (v) => v.replace(/\s+/g, ' ').trim();

const slugify = (name) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50)
    .replace(/-$/, '');

const sanitizeSlugInput = (v) =>
  v
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 50);

const normalizePhone = (digits) => (/^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null);

const passwordRules = (pw) => [
  { ok: pw.length >= 8, label: 'At least 8 characters' },
  { ok: /[A-Za-z]/.test(pw), label: 'A letter' },
  { ok: /\d/.test(pw), label: 'A number' },
];

const VALIDATORS = {
  hotelName: (v) => {
    const t = squash(v);
    if (!t) return 'Enter your hotel or resort name.';
    if (t.length < 2) return 'Hotel name must be at least 2 characters.';
    if (t.length > 100) return 'Hotel name must be 100 characters or fewer.';
    return '';
  },
  hotelSlug: (v) => {
    if (!v) return 'Enter a widget slug.';
    if (v.length < 3) return 'Slug must be at least 3 characters.';
    if (!SLUG_RE.test(v)) return 'Use lowercase letters, numbers and single hyphens, with no hyphen at the start or end.';
    return '';
  },
  name: (v) => {
    const t = squash(v);
    if (!t) return 'Enter the manager’s full name.';
    if (t.length < 2) return 'Name must be at least 2 characters.';
    if (t.length > 60) return 'Name must be 60 characters or fewer.';
    if (!NAME_RE.test(t)) return 'Name can contain letters, spaces, apostrophes, dots and hyphens only.';
    return '';
  },
  phone: (v) => {
    if (!v) return 'Enter a contact phone number.';
    if (!normalizePhone(v)) return 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
    return '';
  },
  email: (v) => {
    const t = v.trim();
    if (!t) return 'Enter your email address.';
    if (t.length > 254 || !EMAIL_RE.test(t)) return 'Enter a valid email, like admin@hotel.com.';
    return '';
  },
  password: (v) => {
    if (!v) return 'Create a password.';
    if (v.length > 128) return 'Password must be 128 characters or fewer.';
    if (!passwordRules(v).every((r) => r.ok)) return 'Password needs at least 8 characters, with a letter and a number.';
    return '';
  },
  confirmPassword: (v, form) => {
    if (!v) return 'Re-enter your password.';
    if (v !== form.password) return 'Passwords do not match.';
    return '';
  },
};

const FIELD_ORDER = ['hotelName', 'hotelSlug', 'name', 'phone', 'email', 'password', 'confirmPassword'];

const INITIAL_FORM = {
  hotelName: '',
  hotelSlug: '',
  name: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 mb-1.5">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // Registration step flow: 'DETAILS' -> 'SUPER_ADMIN_OTP' -> 'HOTELIER_OTP'
  const [step, setStep] = useState('DETAILS');
  const [registrationId, setRegistrationId] = useState('');

  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP inputs
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const refs = useRef({});

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const errors = {};
  for (const f of FIELD_ORDER) {
    errors[f] = touched[f] ? VALIDATORS[f](form[f], form) : '';
  }

  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError('');
  };

  /* ---------------- Field handlers ---------------- */
  const handleHotelName = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, hotelName: name, ...(slugEdited ? {} : { hotelSlug: slugify(name) }) }));
    if (error) setError('');
  };

  const handleSlug = (e) => {
    const slug = sanitizeSlugInput(e.target.value);
    setSlugEdited(slug !== '');
    setField('hotelSlug', slug);
  };

  const handleSlugBlur = () => {
    setField('hotelSlug', form.hotelSlug.replace(/-$/, ''));
    touch('hotelSlug');
  };

  const handlePhone = (e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10));

  const handlePhonePaste = (e) => {
    e.preventDefault();
    let d = e.clipboardData.getData('text').replace(/\D/g, '');
    if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
    else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
    setField('phone', d.slice(0, 10));
  };

  // The server destroys a registration after too many wrong codes / resends or on expiry.
  // Send the person back to the first step with the reason instead of leaving them stuck.
  const resetToDetails = (message) => {
    setStep('DETAILS');
    setRegistrationId('');
    setOtp('');
    setSuccessMsg('');
    setResendCooldown(0);
    setError(message || 'This registration session ended. Please start again.');
  };

  /* ---------------- Step 1: Initiate ---------------- */
  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const slug = form.hotelSlug.replace(/-$/, '');
    const current = { ...form, hotelSlug: slug };
    setForm(current);

    const allTouched = Object.fromEntries(FIELD_ORDER.map((f) => [f, true]));
    setTouched(allTouched);

    const firstInvalid = FIELD_ORDER.find((f) => VALIDATORS[f](current[f], current));
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/register/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: squash(current.name),
          email: current.email.trim().toLowerCase(),
          password: current.password,
          hotelName: squash(current.hotelName),
          hotelSlug: current.hotelSlug,
          phone: normalizePhone(current.phone),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed to initiate. Please try again.');
      }

      setRegistrationId(data.registrationId);
      setStep('SUPER_ADMIN_OTP');
      setOtp('');
      setResendCooldown(60);
      setSuccessMsg(data.message || 'Verification code sent to the platform administrator.');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Could not reach the server. Check your connection and try again.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Step 2: Verify Super Admin OTP ---------------- */
  const handleVerifySuperAdminOtp = async (e) => {
    e.preventDefault();
    if (loading || !otp.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/register/verify-admin-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          otp: otp.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 410 || data.sessionClosed) {
        resetToDetails(data.message);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Invalid administrator approval code.');
      }

      setStep('HOTELIER_OTP');
      setOtp('');
      setResendCooldown(60);
      setSuccessMsg(`Approval confirmed! We’ve sent a 6-digit confirmation code to ${form.email}.`);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Step 3: Complete Hotelier OTP ---------------- */
  const handleVerifyHotelierOtp = async (e) => {
    e.preventDefault();
    if (loading || !otp.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/register/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          otp: otp.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 410 || data.sessionClosed) {
        resetToDetails(data.message);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Invalid email verification code.');
      }

      if (!data.token) {
        throw new Error('Registration could not be completed. Please try again.');
      }

      localStorage.setItem('hbe_token', data.token);
      localStorage.setItem('hbe_user', JSON.stringify(data.user));
      localStorage.setItem('hbe_hotel', JSON.stringify(data.hotel));
      router.push('/');
    } catch (err) {
      setError(err.message || 'Final verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Resend OTP Helper ---------------- */
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${ADMIN_API_URL}/auth/register/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 410 || data.sessionClosed) {
        resetToDetails(data.message);
        return;
      }

      if (!res.ok) throw new Error(data.message || 'Failed to resend code.');

      setResendCooldown(60);
      setSuccessMsg(data.message || 'A new code has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI helpers ---------------- */
  const inputClass = (hasError, extra = '') =>
    `w-full px-3.5 py-3 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
        : 'border-slate-300 focus:ring-slate-900/15 focus:border-slate-900'
    } ${extra}`;

  const aria = (id) => ({
    'aria-invalid': Boolean(errors[id]),
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  });

  const rules = passwordRules(form.password);
  const showRules = touched.password || form.password.length > 0;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-white">
      {/* ───────────── Brand panel (large screens) ───────────── */}
      <aside className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 xl:p-16 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
            <Building2 size={21} className="text-emerald-400" />
          </div>
          <span className="text-base font-semibold tracking-tight">Direct Booking Engine</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl xl:text-[44px] font-bold tracking-tight leading-[1.1]">
            Take direct bookings on your own website.
          </h2>

          <ul className="mt-6 space-y-3 text-slate-300 text-base">
            {[
              'Add a booking widget to your site with one tag',
              'Control rates, availability and cancellation policy',
              'Receive guest payments through Razorpay',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-1" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <div aria-hidden="true" className="mt-10 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-5">
            <p className="text-xs text-slate-500 mb-3">Your property is identified by its slug in the embed tag</p>
            <pre className="text-[13px] leading-relaxed font-mono text-slate-400 whitespace-pre-wrap break-all">
              {'<script\n  src="…"\n  data-hotel="'}
              <span className={form.hotelSlug ? 'text-emerald-300' : 'text-slate-600'}>
                {form.hotelSlug || 'your-slug'}
              </span>
              {'"\n></script>'}
            </pre>
          </div>
        </div>

        <p className="text-xs text-slate-500">Hotelier management console</p>
      </aside>

      {/* ───────────── Main Content Area ───────────── */}
      <main className="flex items-start lg:items-center justify-center p-6 sm:p-10 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md py-4">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Building2 size={21} className="text-emerald-400" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Direct Booking Engine</span>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-2 mb-6">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${
                step === 'DETAILS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              1
            </span>
            <div className="flex-1 h-0.5 bg-slate-200" />
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${
                step === 'SUPER_ADMIN_OTP'
                  ? 'bg-slate-900 text-white'
                  : step === 'HOTELIER_OTP'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <div className="flex-1 h-0.5 bg-slate-200" />
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${
                step === 'HOTELIER_OTP'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2.5"
            >
              <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div
              role="status"
              className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 1: INITIAL DETAILS REGISTRATION                           */}
          {/* ============================================================== */}
          {step === 'DETAILS' && (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Register your property</h1>
              <p className="text-sm text-slate-500 mt-2 mb-8">
                Set up your hotel and manager account. An administrator approval code will be sent to confirm registration.
              </p>

              <form onSubmit={handleInitiateSubmit} noValidate className="space-y-5">
                <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200">Your property</h2>

                <Field id="hotelName" error={errors.hotelName} label="Hotel or resort name">
                  <input
                    ref={(el) => (refs.current.hotelName = el)}
                    id="hotelName"
                    type="text"
                    autoComplete="organization"
                    maxLength={100}
                    placeholder="e.g. Sea Breeze Resort & Spa"
                    value={form.hotelName}
                    onChange={handleHotelName}
                    onBlur={() => touch('hotelName')}
                    {...aria('hotelName')}
                    className={inputClass(errors.hotelName)}
                  />
                </Field>

                <Field
                  id="hotelSlug"
                  error={errors.hotelSlug}
                  label="Widget slug"
                  hint="Lowercase letters, numbers and hyphens. This goes in your embed tag as data-hotel."
                >
                  <div className="relative">
                    <input
                      ref={(el) => (refs.current.hotelSlug = el)}
                      id="hotelSlug"
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={50}
                      placeholder="sea-breeze-resort"
                      value={form.hotelSlug}
                      onChange={handleSlug}
                      onBlur={handleSlugBlur}
                      {...aria('hotelSlug')}
                      className={inputClass(errors.hotelSlug, 'font-mono pr-24')}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                      data-hotel
                    </span>
                  </div>
                </Field>

                <h2 className="text-sm font-semibold text-slate-900 pb-2 pt-3 border-b border-slate-200">Your account</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="name" error={errors.name} label="Manager full name">
                    <input
                      ref={(el) => (refs.current.name = el)}
                      id="name"
                      type="text"
                      autoComplete="name"
                      maxLength={60}
                      placeholder="Vikram Sharma"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      onBlur={() => touch('name')}
                      {...aria('name')}
                      className={inputClass(errors.name)}
                    />
                  </Field>

                  <Field id="phone" error={errors.phone} label="Contact phone">
                    <div
                      className={`flex items-stretch bg-white border rounded-xl transition focus-within:ring-2 ${
                        errors.phone
                          ? 'border-rose-400 focus-within:ring-rose-500/30 focus-within:border-rose-500'
                          : 'border-slate-300 focus-within:ring-slate-900/15 focus-within:border-slate-900'
                      }`}
                    >
                      <span className="flex items-center pl-3.5 pr-3 text-sm font-medium text-slate-600 border-r border-slate-200 select-none">
                        +91
                      </span>
                      <input
                        ref={(el) => (refs.current.phone = el)}
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={handlePhone}
                        onPaste={handlePhonePaste}
                        onBlur={() => touch('phone')}
                        {...aria('phone')}
                        className="flex-1 min-w-0 px-3.5 py-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 rounded-r-xl focus:outline-none"
                      />
                    </div>
                  </Field>
                </div>

                <Field id="email" error={errors.email} label="Work email">
                  <input
                    ref={(el) => (refs.current.email = el)}
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    placeholder="admin@hotel.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    onBlur={() => touch('email')}
                    {...aria('email')}
                    className={inputClass(errors.email)}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="password" error={errors.password} label="Password">
                    <div className="relative">
                      <input
                        ref={(el) => (refs.current.password = el)}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        maxLength={128}
                        placeholder="Create a password"
                        value={form.password}
                        onChange={(e) => setField('password', e.target.value)}
                        onBlur={() => touch('password')}
                        {...aria('password')}
                        className={inputClass(errors.password, 'pr-11')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </Field>

                  <Field id="confirmPassword" error={errors.confirmPassword} label="Confirm password">
                    <input
                      ref={(el) => (refs.current.confirmPassword = el)}
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={128}
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => setField('confirmPassword', e.target.value)}
                      onBlur={() => touch('confirmPassword')}
                      {...aria('confirmPassword')}
                      className={inputClass(errors.confirmPassword)}
                    />
                  </Field>
                </div>

                {showRules && (
                  <ul className="flex flex-wrap gap-x-5 gap-y-1.5 -mt-1" aria-label="Password requirements">
                    {rules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          r.ok ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {r.ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending verification request...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ============================================================== */}
          {/* STEP 2: SUPER ADMIN APPROVAL OTP                               */}
          {/* ============================================================== */}
          {step === 'SUPER_ADMIN_OTP' && (
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administrator Approval</h1>
                <p className="text-sm text-slate-500 mt-2">
                  This platform requires administrator approval. A 6-digit authorization code has been dispatched to the platform admin inbox.
                </p>
              </div>

              <form onSubmit={handleVerifySuperAdminOtp} className="space-y-4">
                <div>
                  <label htmlFor="adminOtp" className="block text-sm font-medium text-slate-800 mb-1.5">
                    Enter Admin Authorization Code
                  </label>
                  <div className="relative">
                    <input
                      id="adminOtp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying authorization...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Admin Code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setStep('DETAILS');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="hover:text-slate-900 transition"
                >
                  &larr; Edit property details
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 inline-flex items-center gap-1 transition"
                >
                  <RotateCcw size={13} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: HOTELIER WORK EMAIL OTP                                */}
          {/* ============================================================== */}
          {step === 'HOTELIER_OTP' && (
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <MailCheck size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verify Your Work Email</h1>
                <p className="text-sm text-slate-500 mt-2">
                  Administrator approval granted! We sent a 6-digit confirmation code to{' '}
                  <strong className="text-slate-800">{form.email}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyHotelierOtp} className="space-y-4">
                <div>
                  <label htmlFor="hotelierOtp" className="block text-sm font-medium text-slate-800 mb-1.5">
                    Confirmation Code
                  </label>
                  <input
                    id="hotelierOtp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Completing setup...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Account Setup</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                <span>Didn’t get the email? Check spam.</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 inline-flex items-center gap-1 transition"
                >
                  <RotateCcw size={13} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-sm text-slate-500">
            Already registered?{' '}
            <Link
              href="/login"
              className="font-semibold text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth, API_BASE } from '../../../../lib/api';
import { CreditCard, CheckCircle2, Building2, Copy, Check, AlertTriangle, Info } from 'lucide-react';

// Same placeholder the API sends back for stored secrets. Sending it back
// unchanged tells the server "keep the saved value".
const MASK = '••••••••••••••••';

const WEBHOOK_EVENTS = ['payment.captured', 'payment.failed', 'order.paid', 'refund.processed'];

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900';
const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';

export default function GatewaySettingsPage() {
  const [mode, setMode] = useState('PAY_AT_HOTEL');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [percents, setPercents] = useState({ gateway: 5, payAtHotel: 8 });
  const [currentPassword, setCurrentPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_BASE}/webhooks/razorpay`;
  const isLocalhost = /localhost|127\.0\.0\.1/.test(API_BASE);

  useEffect(() => {
    fetchWithAuth('/hotel')
      .then((res) => {
        const cfg = res.data?.paymentConfig;
        if (!cfg) return;
        setMode(cfg.mode === 'HOTEL_GATEWAY' ? 'HOTEL_GATEWAY' : 'PAY_AT_HOTEL');
        if (cfg.hotelRazorpay?.keyId) setKeyId(cfg.hotelRazorpay.keyId);
        if (cfg.hotelRazorpay?.keySecretEncrypted) setKeySecret(MASK);
        if (cfg.hotelRazorpay?.webhookSecretEncrypted) setWebhookSecret(MASK);
        setPercents({
          gateway: cfg.gatewayCommissionPercent ?? 5,
          payAtHotel: cfg.payAtHotelCommissionPercent ?? 8,
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the URL is still visible to select manually */
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError('');

    try {
      const isGateway = mode === 'HOTEL_GATEWAY';
      await fetchWithAuth('/hotel/gateway', {
        method: 'PUT',
        body: JSON.stringify({
          mode,
          keyId: isGateway ? keyId : undefined,
          keySecret: isGateway ? keySecret : undefined,
          webhookSecret: isGateway ? webhookSecret : undefined,
          currentPassword,
        }),
      });
      setCurrentPassword('');
      if (isGateway) {
        // Do not leave freshly typed secrets sitting in the page
        setKeySecret(MASK);
        setWebhookSecret(MASK);
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardClass = (active) =>
    `border rounded-2xl p-5 cursor-pointer transition-all ${
      active
        ? 'border-slate-900 bg-slate-50/80 ring-2 ring-slate-900/10'
        : 'border-slate-200 hover:border-slate-300'
    }`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Gateway Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose how guests pay for bookings at your property
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Payment configuration saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div onClick={() => setMode('HOTEL_GATEWAY')} className={cardClass(mode === 'HOTEL_GATEWAY')}>
            <div className="flex items-center gap-2.5 mb-2">
              <CreditCard size={18} className={mode === 'HOTEL_GATEWAY' ? 'text-blue-600' : 'text-slate-400'} />
              <span className="font-bold text-sm text-slate-900">Use my own Razorpay</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guests pay the full amount straight into your Razorpay account. Refunds and cancellations
              are handled from your account. We charge {percents.gateway}% commission, billed weekly.
            </p>
          </div>

          <div onClick={() => setMode('PAY_AT_HOTEL')} className={cardClass(mode === 'PAY_AT_HOTEL')}>
            <div className="flex items-center gap-2.5 mb-2">
              <Building2 size={18} className={mode === 'PAY_AT_HOTEL' ? 'text-blue-600' : 'text-slate-400'} />
              <span className="font-bold text-sm text-slate-900">Pay at hotel</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              No gateway needed. Guests pay a {percents.payAtHotel}% non-refundable booking fee online and
              the rest at your front desk. You collect the balance directly.
            </p>
          </div>
        </div>

        {mode === 'HOTEL_GATEWAY' ? (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            {/* Setup guide */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Info size={16} className="text-blue-600" />
                How to connect your Razorpay account
              </div>

              <ol className="space-y-3 text-xs text-slate-700 leading-relaxed list-decimal list-inside">
                <li>
                  In your Razorpay Dashboard, open{' '}
                  <b>Account &amp; Settings → Business website details</b> and make sure the{' '}
                  <b>website domain where you embed the booking widget</b> is added and{' '}
                  <b>Approved</b> (Razorpay blocks live checkout on unverified domains).
                </li>
                <li>
                  Switch to <b>Live Mode</b>, then open{' '}
                  <b>Account &amp; Settings → API Keys → Generate Key</b>. Copy the <b>Key ID</b> and{' '}
                  <b>Key Secret</b> (the secret is shown only once).
                </li>
                <li>
                  Open <b>Account &amp; Settings → Webhooks → Add New Webhook</b>.
                </li>
                <li>
                  Paste this as the <b>Webhook URL</b>:
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px]">
                      {webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={copyWebhookUrl}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {isLocalhost && (
                    <span className="block mt-1.5 text-amber-700">
                      This address is only reachable from your own computer. Razorpay needs your public
                      server address, so complete this step on the live site.
                    </span>
                  )}
                </li>
                <li>
                  In the <b>Secret</b> box, type a strong secret of your own choice (at least 12
                  characters). Razorpay does not generate it for you. Save it somewhere safe, because you
                  will paste the <b>same value</b> below.
                </li>
                <li>
                  Under <b>Active Events</b> tick:{' '}
                  {WEBHOOK_EVENTS.map((ev, i) => (
                    <span key={ev}>
                      <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">{ev}</code>
                      {i < WEBHOOK_EVENTS.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                  , then click <b>Create Webhook</b>.
                </li>
                <li>Paste the Key ID, Key Secret and your webhook secret below and save.</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Razorpay Key ID</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="rzp_live_..."
                />
              </div>
              <div>
                <label className={labelClass}>Razorpay Key Secret (stored encrypted)</label>
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder="Key Secret"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Webhook Secret (stored encrypted)</label>
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="The secret you typed in Razorpay's webhook form"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Without the correct webhook secret, guest payments cannot be confirmed automatically.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
              <b className="text-slate-700">How billing works:</b> money from guests goes directly to you.
              Every Monday we send you one invoice for the previous week with a {percents.gateway}% commission
              on completed bookings (room charges and add-ons, excluding GST). Refunded bookings are
              adjusted automatically. Unpaid invoices lead to reminders, and eventually to your property
              being hidden from search until the invoice is paid.
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
            <p>
              <b className="text-slate-800">How it works:</b> when a guest books, they pay a {percents.payAtHotel}%
              booking fee online (calculated on room charges and add-ons, excluding GST). The remaining
              balance, including GST, is collected by you when the guest arrives. The booking confirmation
              tells both of you exactly how much is due at the hotel.
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>If the guest cancels, the online booking fee is not refunded and the booking is simply cancelled.</li>
              <li>If you cancel a booking, the guest gets the booking fee back in full.</li>
              <li>Nothing is billed to you later. Our commission is the booking fee paid online.</li>
            </ul>
            <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <b>Website domain verification:</b> Before embedding the booking widget on your live website,
                make sure your website domain is registered in your property settings and verified with our
                support team so online checkout works without interruption.
              </span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <label className={labelClass}>Confirm your password to save</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Your account password"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Payment details control where money goes, so we ask for your password again.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-70"
        >
          {loading ? 'Verifying and saving...' : 'Save Payment Configuration'}
        </button>
      </form>
    </div>
  );
}
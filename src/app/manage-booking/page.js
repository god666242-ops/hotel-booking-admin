"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  FileDown,
  MapPin,
  Phone,
  Copy,
  Check,
  AlertCircle,
  BedDouble,
  Users,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Mail,
  User,
  IndianRupee,
  X,
  FileText,
  CalendarDays,
  Loader2,
  RefreshCw,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const REFUND_TIMELINE = "4-5 days";
const IST = "Asia/Kolkata";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);

const dateParts = (value) => {
  if (!value) return { weekday: "", day: "-", month: "", year: "" };
  const d = new Date(value);
  const f = (opts) => d.toLocaleDateString("en-IN", { ...opts, timeZone: IST });
  return {
    weekday: f({ weekday: "short" }),
    day: f({ day: "numeric" }),
    month: f({ month: "short" }),
    year: f({ year: "numeric" }),
  };
};

const toInputDate = (d) => {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
};

const validateCode = (v) => {
  const t = v.trim();
  if (!t) return "Enter your booking code.";
  if (!/^[A-Za-z0-9-]{6,40}$/.test(t)) {
    return "Booking codes use letters, numbers and hyphens only, like BK-202610-A1B2C3.";
  }
  return "";
};

const validateEmail = (v) => {
  const t = v.trim();
  if (!t) return "Enter the email you used while booking.";
  if (t.length > 254 || !EMAIL_RE.test(t))
    return "Enter a valid email address.";
  return "";
};

const STATUS_STYLES = {
  CONFIRMED: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  CANCELLED: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
};
const statusStyle = (s) =>
  STATUS_STYLES[s] || "bg-amber-400/15 text-amber-300 ring-amber-400/30";
const statusLabel = (s) =>
  ({
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
    CANCELLATION_IN_PROGRESS: "Cancelling",
    PENDING: "Pending",
  })[s] || s;

/* ------------------------------------------------------------------ */
/* Presentational Pieces                                              */
/* ------------------------------------------------------------------ */
function DateBlock({ label, date, note, align = "left" }) {
  const p = dateParts(date);
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className="mt-1 flex items-baseline gap-1.5"
        style={{
          justifyContent: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <span className="text-4xl font-bold tracking-tight text-slate-900 leading-none">
          {p.day}
        </span>
        <span className="text-sm font-semibold text-slate-700">{p.month}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {p.weekday}, {p.year}
      </div>
      {note && (
        <div className="mt-1.5 text-xs font-medium text-slate-600">{note}</div>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-900 break-words">
          {children}
        </div>
      </div>
    </div>
  );
}

function RefundNote({ amount, className = "" }) {
  return (
    <p className={`flex items-start gap-2 ${className}`}>
      <Clock size={15} className="shrink-0 mt-0.5" />
      <span>
        {amount > 0 ? (
          <>
            Your refund of <strong>{formatCurrency(amount)}</strong> will reach
            your original payment method in <strong>{REFUND_TIMELINE}</strong>.
          </>
        ) : (
          <>
            No refund applies to this cancellation under the hotel&rsquo;s
            policy.
          </>
        )}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Main Manage Booking Page                                           */
/* ------------------------------------------------------------------ */
function ManageBookingContent() {
  const searchParams = useSearchParams();
  const hotelSlug = searchParams.get("hotel");
  const initialCode = searchParams.get("code") || "";
  const initialEmail = searchParams.get("email") || "";

  const [bookingCode, setBookingCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState({ code: false, email: false });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(null);

  // Modification state
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modCheckIn, setModCheckIn] = useState("");
  const [modCheckOut, setModCheckOut] = useState("");
  const [modAdults, setModAdults] = useState(2);
  const [modChildren, setModChildren] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deltaPreview, setDeltaPreview] = useState(null);
  const [modifying, setModifying] = useState(false);
  const [modError, setModError] = useState("");
  const [modSuccess, setModSuccess] = useState("");

  const codeRef = useRef(null);
  const emailRef = useRef(null);

  const errors = {
    code: touched.code ? validateCode(bookingCode) : "",
    email: touched.email ? validateEmail(email) : "",
  };

  const fetchBooking = async (slug, code, guestEmail) => {
    if (!slug || !code) return;
    setLoading(true);
    setError("");

    try {
      const url = new URL(
        `${API_BASE}/public/${slug}/bookings/${encodeURIComponent(code)}`,
      );
      if (guestEmail)
        url.searchParams.set("email", guestEmail.trim().toLowerCase());

      const res = await fetch(url.toString());
      let json = {};
      try {
        json = await res.json();
      } catch {
        // handled below
      }

      if (res.status === 429)
        throw new Error(
          "Too many attempts. Please wait a few minutes and try again.",
        );
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || "We could not find a reservation with those details.",
        );
      }

      setData(json.data);
      if (json.data?.booking?.dates) {
        setModCheckIn(toInputDate(json.data.booking.dates.checkIn));
        setModCheckOut(toInputDate(json.data.booking.dates.checkOut));
        setModAdults(json.data.booking.occupancy?.adults || 2);
        setModChildren(json.data.booking.occupancy?.children || 0);
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not reach the server. Check your connection and try again."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelSlug && initialCode) {
      fetchBooking(hotelSlug, initialCode, initialEmail);
    }
  }, [hotelSlug, initialCode, initialEmail]);

  const handlePreviewModification = async () => {
    const guestEmail = email || data?.booking?.guest?.email;
    if (!modCheckIn || !modCheckOut) return;

    setPreviewLoading(true);
    setModError("");
    setDeltaPreview(null);

    try {
      const res = await fetch(
        `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/modify-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: guestEmail,
            checkIn: modCheckIn,
            checkOut: modCheckOut,
            adults: Number(modAdults),
            children: Number(modChildren),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message ||
            "Could not verify rate or availability for those dates.",
        );
      }
      setDeltaPreview(json.data);
    } catch (err) {
      setModError(err.message || "Failed to calculate modification preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmModification = async () => {
    const guestEmail = email || data?.booking?.guest?.email;
    setModifying(true);
    setModError("");

    try {
      const payload = {
        email: guestEmail,
        checkIn: modCheckIn,
        checkOut: modCheckOut,
        adults: Number(modAdults),
        children: Number(modChildren),
      };

      const res = await fetch(
        `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to modify reservation.");
      }

      // If additional payment is required, dynamically load Razorpay script and open modal
      if (json.requiresPayment && json.data?.razorpayOrderId) {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          throw new Error(
            "Payment gateway could not be loaded. Please try again.",
          );
        }

        const options = {
          key: json.data.razorpayKeyId,
          amount: Math.round(json.data.deltaAmount * 100),
          currency: "INR",
          name: data?.hotel?.name || "Reservation Modification",
          description: `Stay Modification Difference (${data.booking.bookingCode})`,
          order_id: json.data.razorpayOrderId,
          handler: async function (response) {
            const confirmRes = await fetch(
              `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/modify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...payload,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              },
            );
            const confirmJson = await confirmRes.json();
            if (!confirmRes.ok)
              throw new Error(confirmJson.message || "Payment capture failed.");

            setModSuccess(
              "Your reservation has been successfully updated and payment received.",
            );
            setShowModifyModal(false);
            setDeltaPreview(null);
            fetchBooking(hotelSlug, data.booking.bookingCode, guestEmail);
          },
          prefill: {
            name: data.booking.guest?.name,
            email: data.booking.guest?.email,
            contact: data.booking.guest?.phone,
          },
          theme: { color: "#0f172a" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setModifying(false);
        return;
      }

      setModSuccess("Your reservation has been successfully updated.");
      setShowModifyModal(false);
      setDeltaPreview(null);
      await fetchBooking(hotelSlug, data.booking.bookingCode, guestEmail);
    } catch (err) {
      setModError(err.message || "Could not complete modification.");
    } finally {
      setModifying(false);
    }
  };

  const downloadInvoice = async () => {
    const guestEmail = email || data?.booking?.guest?.email;
    try {
      const url = new URL(
        `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/invoice`,
      );
      url.searchParams.set(
        "email",
        String(guestEmail || "")
          .trim()
          .toLowerCase(),
      );
      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not download the invoice.");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Invoice-${data.booking.bookingCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      window.alert(err.message || "Could not download the invoice.");
    }
  };

  const downloadCreditNote = async () => {
    const guestEmail = email || data?.booking?.guest?.email;
    try {
      const url = new URL(
        `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/credit-note`,
      );
      url.searchParams.set(
        "email",
        String(guestEmail || "")
          .trim()
          .toLowerCase(),
      );
      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.message || "Credit note is not available for this reservation.",
        );
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `CreditNote-${data.booking.bookingCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      window.alert(err.message || "Could not download the credit note.");
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (!cancelling) setShowCancelModal(false);
        if (!modifying) setShowModifyModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelling, modifying]);

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (loading) return;

    setTouched({ code: true, email: true });
    const codeErr = validateCode(bookingCode);
    const emailErr = validateEmail(email);
    if (codeErr || emailErr) {
      (codeErr ? codeRef : emailRef).current?.focus();
      return;
    }
    fetchBooking(hotelSlug, bookingCode.trim().toUpperCase(), email);
  };

  const handleCancelBooking = async () => {
    const guestEmail = email || data?.booking?.guest?.email;
    if (!guestEmail) {
      setCancelError("Guest email is required for cancellation verification.");
      return;
    }

    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(
        `${API_BASE}/public/${hotelSlug}/bookings/${encodeURIComponent(data.booking.bookingCode)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: guestEmail,
            reason: cancelReason.trim() || "Customer self-cancellation",
          }),
        },
      );

      let json = {};
      try {
        json = await res.json();
      } catch {
        // handled below
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to cancel reservation.");
      }

      setCancelSuccess(json.data);
      setShowCancelModal(false);
      setCancelReason("");
      fetchBooking(hotelSlug, data.booking.bookingCode, guestEmail);
    } catch (err) {
      setCancelError(
        err instanceof TypeError
          ? "Could not reach the server. Please try again."
          : err.message,
      );
    } finally {
      setCancelling(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.booking.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const refundPreview = data?.cancellation?.refundPreview;
  const refundedAmount =
    data?.booking?.cancellation?.amountRefunded ??
    cancelSuccess?.refundAmount ??
    0;
  const mapsLink = data?.hotel
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [data.hotel.name, data.hotel.address?.street, data.hotel.address?.city]
          .filter(Boolean)
          .join(", "),
      )}`
    : "#";

  const inputClass = (hasError) =>
    `w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
      hasError
        ? "border-rose-400 focus:ring-rose-500/30 focus:border-rose-500"
        : "border-slate-300 focus:ring-slate-900/15 focus:border-slate-900"
    }`;

  if (!hotelSlug) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            This link looks incomplete
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Open the manage-booking link from your confirmation email or
            message, or contact the hotel for help.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-4 no-print">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {data?.hotel?.name || "Guest self-service"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Manage your reservation
            </h1>
          </div>
          {data && (
            <div className="flex items-center gap-2 shrink-0">
              {["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED"].includes(
                data.booking?.status,
              ) && (
                <button
                  onClick={downloadInvoice}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  <FileDown size={15} />
                  <span>Invoice (PDF)</span>
                </button>
              )}
              {data.booking?.status === "CANCELLED" && (
                <button
                  onClick={downloadCreditNote}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 transition"
                >
                  <FileText size={15} />
                  <span>Credit Note (PDF)</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition shrink-0"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Print voucher</span>
                <span className="sm:hidden">Print</span>
              </button>
            </div>
          )}
        </div>

        {!data && !loading && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 no-print">
            <h2 className="text-lg font-bold text-slate-900">
              Find your booking
            </h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Enter the booking code from your confirmation and the email you
              booked with.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2.5"
              >
                <AlertCircle
                  size={17}
                  className="text-rose-600 shrink-0 mt-0.5"
                />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleManualLookup}
              noValidate
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Booking code
                </label>
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={codeRef}
                    id="code"
                    type="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    placeholder="BK-202610-A1B2C3"
                    value={bookingCode}
                    onChange={(e) => {
                      setBookingCode(e.target.value.toUpperCase());
                      if (error) setError("");
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, code: true }))}
                    aria-invalid={Boolean(errors.code)}
                    aria-describedby={errors.code ? "code-error" : undefined}
                    className={`${inputClass(errors.code)} font-mono tracking-wide`}
                  />
                </div>
                {errors.code && (
                  <p id="code-error" className="mt-1.5 text-xs text-rose-600">
                    {errors.code}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="guest-email"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Guest email
                </label>
                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={emailRef}
                    id="guest-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    placeholder="The email used while booking"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={inputClass(errors.email)}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1.5 text-xs text-rose-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                <span>Find reservation</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {loading && !data && (
          <div className="py-20 text-center no-print">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
            <p className="mt-3 text-sm text-slate-500">
              Loading your reservation...
            </p>
          </div>
        )}

        {modSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 no-print">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {modSuccess}
            </span>
          </div>
        )}

        {cancelSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl no-print">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Your reservation has been cancelled
                </p>
                <p className="text-sm text-emerald-800 mt-1">
                  {cancelSuccess.refundAmount > 0
                    ? `${cancelSuccess.refundPercent}% of your payment is being refunded.`
                    : data?.booking?.payment?.mode === "PAY_AT_HOTEL"
                      ? "The online booking fee is non-refundable when a guest cancels. Nothing further is payable at the hotel."
                      : "No refund applies under the hotel’s policy."}
                </p>
                {cancelSuccess.refundAmount > 0 && (
                  <RefundNote
                    amount={cancelSuccess.refundAmount}
                    className="mt-2 text-sm text-emerald-900"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print-card">
              <div className="bg-slate-900 text-white px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Confirmation code</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xl sm:text-2xl font-bold tracking-wide font-mono text-white break-all">
                        {data.booking.bookingCode}
                      </p>
                      <button
                        onClick={copyCode}
                        aria-label="Copy booking code"
                        className="no-print p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
                      >
                        {copied ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ring-1 shrink-0 ${statusStyle(data.booking.status)}`}
                  >
                    {statusLabel(data.booking.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{data.hotel.name}</p>
              </div>

              <div className="p-6 space-y-7">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                    <DateBlock
                      label="Check-in"
                      date={data.booking.dates.checkIn}
                      note={`From ${data.hotel.checkInTime || "12:00 PM"}`}
                    />
                    <div className="flex flex-col items-center gap-1.5 px-1">
                      <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap">
                        {data.booking.dates.nights}{" "}
                        {data.booking.dates.nights === 1 ? "night" : "nights"}
                      </span>
                      <div className="w-16 sm:w-24 border-t-2 border-dashed border-slate-300" />
                    </div>
                    <DateBlock
                      label="Check-out"
                      date={data.booking.dates.checkOut}
                      note={`By ${data.hotel.checkOutTime || "11:00 AM"}`}
                      align="right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Detail icon={BedDouble} label="Room">
                    {data.roomType.name}
                    <span className="block text-xs font-normal text-slate-500 mt-0.5">
                      {data.booking.roomCount}{" "}
                      {data.booking.roomCount === 1 ? "room" : "rooms"}
                    </span>
                  </Detail>
                  <Detail icon={Users} label="Guests">
                    {data.booking.occupancy?.adults || 2}{" "}
                    {(data.booking.occupancy?.adults || 2) === 1
                      ? "adult"
                      : "adults"}
                    {data.booking.occupancy?.children
                      ? `, ${data.booking.occupancy.children} ${data.booking.occupancy.children === 1 ? "child" : "children"}`
                      : ""}
                  </Detail>
                  <Detail icon={MapPin} label="Property">
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline underline-offset-2"
                    >
                      {[data.hotel.address?.street, data.hotel.address?.city]
                        .filter(Boolean)
                        .join(", ") || data.hotel.name}
                    </a>
                  </Detail>
                  <Detail icon={Phone} label="Front desk">
                    {data.hotel.contact?.phone ? (
                      <a
                        href={`tel:${data.hotel.contact.phone}`}
                        className="hover:underline underline-offset-2"
                      >
                        {data.hotel.contact.phone}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </Detail>
                </div>

                <div className="relative -mx-6">
                  <div className="border-t-2 border-dashed border-slate-200" />
                  <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border border-slate-200 no-print" />
                  <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border border-slate-200 no-print" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Primary guest
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Detail icon={User} label="Name">
                      {data.booking.guest?.name}
                    </Detail>
                    <Detail icon={Mail} label="Email">
                      {data.booking.guest?.email}
                    </Detail>
                    <Detail icon={Phone} label="Phone">
                      {data.booking.guest?.phone}
                    </Detail>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Billing summary
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Room tariff</span>
                      <span>
                        {formatCurrency(data.booking.billing.roomBaseTariff)}
                      </span>
                    </div>
                    {data.booking.billing.addOnsTotal > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Add-on services</span>
                        <span>
                          {formatCurrency(data.booking.billing.addOnsTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes & GST</span>
                      <span>
                        {formatCurrency(data.booking.billing.hotelGst)}
                      </span>
                    </div>
                    {data.booking.billing.platformConvenienceFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Convenience fee</span>
                        <span>
                          {formatCurrency(
                            data.booking.billing.platformConvenienceFee,
                          )}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const b = data.booking;
                      const dueAtHotel = Number(
                        b.payment?.amountDueAtHotel || 0,
                      );
                      const paidOnline = Number(
                        b.payment?.amountPaidOnline ?? b.billing.grandTotal,
                      );
                      const hasBalance =
                        b.payment?.mode === "PAY_AT_HOTEL" && dueAtHotel > 0;

                      return (
                        <>
                          <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                            <span>Booking total</span>
                            <span>{formatCurrency(b.billing.grandTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-base font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              <IndianRupee
                                size={16}
                                className="text-slate-400"
                              />
                              {hasBalance ? "Paid online" : "Total paid"}
                            </span>
                            <span>{formatCurrency(paidOnline)}</span>
                          </div>
                          {hasBalance && (
                            <div className="flex justify-between items-center text-sm font-bold text-red-600">
                              <span>Balance payable at hotel</span>
                              <span>{formatCurrency(dueAtHotel)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {data.booking.status === "CANCELLED" && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {data.booking.payment?.mode === "PAY_AT_HOTEL" &&
                    refundedAmount <= 0 ? (
                      <p className="flex items-start gap-2">
                        <Clock size={15} className="shrink-0 mt-0.5" />
                        <span>
                          The online booking fee is non-refundable on guest
                          cancellation.
                        </span>
                      </p>
                    ) : (
                      <RefundNote amount={refundedAmount} />
                    )}
                    <button
                      onClick={downloadCreditNote}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-2 shrink-0 no-print"
                    >
                      <FileText size={14} />
                      <span>Download Credit Note</span>
                    </button>
                  </div>
                )}

                {data.booking.status === "CONFIRMED" &&
                  ["PAY_AT_HOTEL", "OFFLINE"].includes(
                    data.booking.payment?.mode,
                  ) &&
                  !data.cancellation?.canModify && (
                    <div className="no-print rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
                      <p className="flex items-start gap-2 font-semibold text-slate-900">
                        <CalendarDays
                          size={16}
                          className="mt-0.5 shrink-0 text-indigo-600"
                        />
                        Need to change your dates or guests?
                      </p>
                      <p className="mt-1.5 text-slate-600">
                        Changes to pay-at-hotel bookings are made by the hotel.
                        Please contact {data.hotel.name} and quote your booking
                        code{" "}
                        <span className="font-mono font-semibold">
                          {data.booking.bookingCode}
                        </span>
                        .
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            What can be changed
                          </p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                            <li>
                              Move your stay to earlier or later dates, keeping
                              the same {data.booking.dates?.nights}{" "}
                              {data.booking.dates?.nights === 1
                                ? "night"
                                : "nights"}
                            </li>
                            <li>Number of rooms</li>
                            <li>Number of adults and children</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            What cannot be changed
                          </p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                            <li>
                              The number of nights cannot be reduced or
                              increased
                            </li>
                          </ul>
                        </div>
                      </div>

                      <p className="mt-3 rounded-lg bg-white/70 p-2.5 text-slate-600">
                        <span className="font-semibold text-slate-900">
                          Want to stay longer?
                        </span>{" "}
                        To add more days, please make a fresh booking for the
                        extra nights.
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 font-medium">
                        {data.hotel.contact?.phone && (
                          <a
                            href={`tel:${data.hotel.contact.phone}`}
                            className="text-indigo-700 underline underline-offset-2"
                          >
                            Call {data.hotel.contact.phone}
                          </a>
                        )}
                        {data.hotel.contact?.email && (
                          <a
                            href={`mailto:${data.hotel.contact.email}`}
                            className="text-indigo-700 underline underline-offset-2"
                          >
                            {data.hotel.contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                {data.booking.status === "CONFIRMED" && (
                  <div className="no-print pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                    {data.cancellation?.canModify && (
                      <button
                        onClick={() => {
                          setModError("");
                          setDeltaPreview(null);
                          setShowModifyModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <CalendarDays size={16} />
                        <span>Modify stay dates</span>
                      </button>
                    )}

                    {data.cancellation?.canCancel && (
                      <button
                        onClick={() => {
                          setCancelError("");
                          setShowCancelModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <X size={16} />
                        <span>Cancel reservation</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setData(null);
                setCancelSuccess(null);
                setModSuccess("");
                setError("");
              }}
              className="no-print mt-4 text-sm font-medium text-slate-500 hover:text-slate-900 underline underline-offset-4 decoration-slate-300"
            >
              Look up a different booking
            </button>
          </div>
        )}
      </div>

      {showModifyModal && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print backdrop-blur-xs"
          onClick={() => !modifying && setShowModifyModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Change your reservation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update stay dates or guests for booking{" "}
                  <span className="font-mono font-semibold">
                    {data.booking.bookingCode}
                  </span>
                  .
                </p>
              </div>
              <button
                onClick={() => setShowModifyModal(false)}
                disabled={modifying}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New check-in
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={modCheckIn}
                  onChange={(e) => setModCheckIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New check-out
                </label>
                <input
                  type="date"
                  min={modCheckIn || new Date().toISOString().slice(0, 10)}
                  value={modCheckOut}
                  onChange={(e) => setModCheckOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adults
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={modAdults}
                  onChange={(e) => setModAdults(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Children
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={modChildren}
                  onChange={(e) => setModChildren(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreviewModification}
                disabled={previewLoading || !modCheckIn || !modCheckOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {previewLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span>Check rate &amp; calculate delta</span>
              </button>
            </div>

            {deltaPreview && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Original booking total:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(deltaPreview.originalGrandTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>New calculated total:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(deltaPreview.newGrandTotal)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span>Adjustment:</span>
                  <span
                    className={
                      deltaPreview.action === "REFUND_DUE"
                        ? "text-emerald-700"
                        : deltaPreview.action === "PAYMENT_DUE"
                          ? "text-amber-700"
                          : "text-slate-900"
                    }
                  >
                    {deltaPreview.action === "REFUND_DUE" &&
                      `Refund: -${formatCurrency(deltaPreview.delta)}`}
                    {deltaPreview.action === "PAYMENT_DUE" &&
                      `Balance due: +${formatCurrency(deltaPreview.delta)}`}
                    {deltaPreview.action === "NO_CHANGE" &&
                      "No change in tariff"}
                  </span>
                </div>
                {deltaPreview.action === "REFUND_DUE" && (
                  <p className="text-[11px] text-emerald-800 pt-1">
                    The price delta will be automatically refunded to your
                    original payment method.
                  </p>
                )}
              </div>
            )}

            {modError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle
                  size={15}
                  className="text-rose-600 shrink-0 mt-0.5"
                />
                <span>{modError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModifyModal(false)}
                disabled={modifying}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModification}
                disabled={modifying || !deltaPreview}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {modifying && <Loader2 size={13} className="animate-spin" />}
                <span>
                  {modifying ? "Confirming..." : "Confirm modification"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && data && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4 no-print"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="cancel-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Cancel this reservation?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Booking{" "}
                  <span className="font-mono font-semibold text-slate-700">
                    {data.booking.bookingCode}
                  </span>
                  . This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                aria-label="Close"
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Refund percentage</span>
                <span className="font-semibold text-slate-900">
                  {refundPreview?.refundPercent ?? 0}%
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Refund amount</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(refundPreview?.refundAmount)}
                </span>
              </div>
              {data.booking.payment?.mode === "PAY_AT_HOTEL" &&
                !(refundPreview?.refundAmount > 0) && (
                  <p className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                    The online booking fee is non-refundable on guest
                    cancellation. Nothing is payable at the hotel.
                  </p>
                )}
            </div>

            <div>
              <label
                htmlFor="cancel-reason"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Reason{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={300}
                placeholder="Change of plans, travel delay, etc."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
            </div>

            {cancelError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2"
              >
                <AlertCircle
                  size={16}
                  className="text-rose-600 shrink-0 mt-0.5"
                />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelling && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {cancelling ? "Cancelling..." : "Yes, cancel reservation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">
            Loading reservation portal...
          </p>
        </div>
      }
    >
      <ManageBookingContent />
    </Suspense>
  );
}

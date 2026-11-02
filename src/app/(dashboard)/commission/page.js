'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../../../lib/api';
import StatCard from '../../../components/StatCard';
import { Wallet, Receipt, Clock, Building2, AlertTriangle, ExternalLink, X, Loader2 } from 'lucide-react';

const PAGE_SIZE = 10;

const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '—';

// periodEnd is stored as the following Monday (exclusive), so show the Sunday before it
const fmtPeriod = (start, end) =>
  `${fmtDate(start)} – ${fmtDate(new Date(new Date(end).getTime() - 86400000))}`;

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function CommissionPage() {
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (pageNo) => {
    setLoading(true);
    setError('');
    try {
      const [s, i] = await Promise.all([
        fetchWithAuth('/commission/summary'),
        fetchWithAuth(`/commission/invoices?page=${pageNo}&limit=${PAGE_SIZE}`),
      ]);
      setSummary(s.data);
      setInvoices(i.data?.invoices || []);
      setTotal(i.data?.total || 0);
    } catch (err) {
      setError(err.message || 'Could not load commission details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ loading: true });
    try {
      const res = await fetchWithAuth(`/commission/invoices/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetail(null);
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const getPaymentLink = async (inv, forceNew) => {
    if (!forceNew && inv.paymentLinkUrl) {
      window.open(inv.paymentLinkUrl, '_blank', 'noopener');
      return;
    }
    setBusyId(inv._id);
    try {
      const res = await fetchWithAuth(`/commission/invoices/${inv._id}/payment-link`, { method: 'POST' });
      const url = res.data?.paymentLinkUrl;
      if (url) window.open(url, '_blank', 'noopener');
      await load(page);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isGateway = summary?.mode === 'HOTEL_GATEWAY';
  const showGst = invoices.some((i) => Number(i.gstAmount) > 0);

  return (
    <div className="max-w-7xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Commission &amp; Billing</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isGateway
            ? `Guests pay you directly. Platform commission is ${summary.gatewayPercent}% of room charges and add-ons (excluding GST), invoiced weekly.`
            : `Guests pay a ${summary?.payAtHotelPercent ?? 8}% booking fee online and the balance at your front desk. Nothing is billed to you later.`}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isGateway && summary.gateway.overdueCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <span>
            You have {summary.gateway.overdueCount} overdue invoice{summary.gateway.overdueCount > 1 ? 's' : ''}.
            Please pay to keep your property visible to guests. Unpaid invoices lead to your property being hidden from search.
          </span>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {isGateway ? (
            <>
              <StatCard
                label="Outstanding"
                value={inr(summary.gateway.outstanding)}
                subtext={`${summary.gateway.outstandingCount} unpaid invoice${summary.gateway.outstandingCount === 1 ? '' : 's'}`}
                icon={Clock}
                color="amber"
              />
              <StatCard
                label="Paid to date"
                value={inr(summary.gateway.paid)}
                subtext="Commission invoices settled"
                icon={Receipt}
                color="emerald"
              />
              <StatCard
                label="Next invoice (estimate)"
                value={inr(summary.gateway.unbilledEstimate)}
                subtext={`${summary.gateway.unbilledBookings} bookings, before refunds`}
                icon={Wallet}
                color="blue"
              />
              <StatCard
                label="Gross booking value"
                value={inr(summary.grossBookingValue)}
                subtext={`${summary.liveBookings} bookings`}
                icon={Building2}
              />
            </>
          ) : (
            <>
              <StatCard
                label="To collect at hotel"
                value={inr(summary.payAtHotel.upcomingDueAtHotel)}
                subtext={`${summary.payAtHotel.upcomingBookings} upcoming and in-house bookings`}
                icon={Wallet}
                color="amber"
              />
              <StatCard
                label="Booking fees collected"
                value={inr(summary.payAtHotel.feesCollected)}
                subtext="Platform fee paid online by guests"
                icon={Receipt}
                color="emerald"
              />
              <StatCard
                label="Gross booking value"
                value={inr(summary.grossBookingValue)}
                subtext={`${summary.liveBookings} bookings`}
                icon={Building2}
              />
            </>
          )}
        </div>
      )}

      {/* Invoice table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Weekly commission invoices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Issued every Monday for the previous week. Small amounts under ₹100 roll into the next invoice.
          </p>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {isGateway
              ? 'No invoices yet. Your first invoice appears after the first full week with completed bookings.'
              : 'No invoices. Hotels using pay-at-hotel are not billed commission separately.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="px-6 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Week</th>
                  <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-right">Commission</th>
                  {showGst && <th className="px-4 py-3 font-semibold text-right">GST</th>}
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const unpaid = inv.status === 'PENDING' || inv.status === 'OVERDUE';
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => openDetail(inv._id)}
                          className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        {fmtPeriod(inv.periodStart, inv.periodEnd)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{inv.bookingCount}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{inr(inv.commissionAmount)}</td>
                      {showGst && <td className="px-4 py-3.5 text-right text-slate-700">{inr(inv.gstAmount)}</td>}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">{inr(inv.totalDue)}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            STATUS_STYLES[inv.status] || STATUS_STYLES.CANCELLED
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        {inv.status === 'PAID' ? `Paid ${fmtDate(inv.paidAt)}` : fmtDate(inv.dueDate)}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {unpaid && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyId === inv._id}
                              onClick={() => getPaymentLink(inv, false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-60"
                            >
                              {busyId === inv._id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <ExternalLink size={13} />
                              )}
                              {inv.paymentLinkUrl ? 'Pay now' : 'Get payment link'}
                            </button>
                            {inv.paymentLinkUrl && (
                              <button
                                type="button"
                                disabled={busyId === inv._id}
                                onClick={() => getPaymentLink(inv, true)}
                                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline disabled:opacity-60"
                                title="Use this if the link has expired"
                              >
                                New link
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {detail.invoiceNumber || 'Invoice'}
                </h3>
                {detail.periodStart && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmtPeriod(detail.periodStart, detail.periodEnd)}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setDetail(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {detailLoading || detail.loading ? (
              <div className="p-10 flex justify-center text-slate-400">
                <Loader2 className="animate-spin" size={22} />
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/70">
                      <th className="px-6 py-2.5 font-semibold">Booking</th>
                      <th className="px-4 py-2.5 font-semibold">Stay</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Base</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Rate</th>
                      <th className="px-6 py-2.5 font-semibold text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detail.lines || []).map((l) => (
                      <tr key={String(l.bookingId)}>
                        <td className="px-6 py-2.5 font-mono text-xs">{l.bookingCode}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                          {fmtDate(l.checkIn)} → {fmtDate(l.checkOut)}
                        </td>
                        <td className="px-4 py-2.5 text-right">{inr(l.commissionBase)}</td>
                        <td className="px-4 py-2.5 text-right">{l.percent}%</td>
                        <td className="px-6 py-2.5 text-right font-semibold">{inr(l.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-6 py-3 text-[11px] text-slate-400">
                  Base = room charges plus add-ons (after discounts, excluding GST). Refunded amounts are already deducted.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
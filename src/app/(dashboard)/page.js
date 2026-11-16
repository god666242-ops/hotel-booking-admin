'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../../lib/api';
import StatCard from '../../components/StatCard';
import {
  BookOpenCheck,
  IndianRupee,
  BedDouble,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Activity,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const formatDay = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function statusBadge(status) {
  const tone =
    status === 'CONFIRMED'
      ? ['bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20', 'bg-emerald-600']
      : status === 'CANCELLED'
      ? ['bg-rose-50 text-rose-700 ring-1 ring-rose-600/20', 'bg-rose-600']
      : ['bg-amber-50 text-amber-700 ring-1 ring-amber-600/20', 'bg-amber-600'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${tone[0]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone[1]}`} />
      {status}
    </span>
  );
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    grossRevenue: 0,
    activeRooms: 0,
    recentBookings: [],
    adr: 0,
    revpar: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isManager = user?.role !== 'STAFF';

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // /payouts is manager-only: STAFF must not call it, and one failed request
      // must never blank the whole page, so each call is settled independently.
      const [bookings, payouts, rooms, analytics] = await Promise.allSettled([
        fetchWithAuth('/bookings?limit=5'),
        isManager ? fetchWithAuth('/commission/summary') : Promise.resolve(null),
        fetchWithAuth('/rooms'),
        fetchWithAuth('/bookings/analytics/adr-revpar'),
      ]);

      const bookingsRes = bookings.status === 'fulfilled' ? bookings.value : {};
      const payoutsRes = payouts.status === 'fulfilled' ? payouts.value : null;
      const roomsRes = rooms.status === 'fulfilled' ? rooms.value : {};
      const analyticsRes = analytics.status === 'fulfilled' ? analytics.value : null;

      setStats({
        totalBookings: bookingsRes.pagination?.total || 0,
        grossRevenue: payoutsRes?.data?.grossBookingValue || 0,
        activeRooms: (roomsRes.data || []).filter((r) => r.isActive !== false).length,
        recentBookings: bookingsRes.data || [],
        adr: analyticsRes?.data?.metrics?.adr || 0,
        revpar: analyticsRes?.data?.metrics?.revpar || 0,
        occupancyRate: analyticsRes?.data?.metrics?.occupancyRate || 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user, isManager]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time booking revenue, confirmed stays & property health</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            title="Refresh dashboard stats and bookings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            href="/inventory"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            Adjust Rates
          </Link>
          <Link
            href="/settings/embed"
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition shadow-sm flex items-center gap-1.5"
          >
            <span>Get Embed Tag</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Total Direct Bookings"
          value={loading ? '...' : stats.totalBookings}
          subtext="Captured via widget"
          icon={BookOpenCheck}
          color="blue"
        />
        {isManager && (
          <StatCard
            label="Gross Revenue"
            value={loading ? '...' : `₹${stats.grossRevenue.toLocaleString('en-IN')}`}
            subtext="100% direct customer collections"
            icon={IndianRupee}
            color="emerald"
          />
        )}
        <StatCard
          label="Active Room Categories"
          value={loading ? '...' : stats.activeRooms}
          subtext="Sellable room types"
          icon={BedDouble}
          color="slate"
        />
        
        {/* New Analytics Cards */}
        <StatCard
          label="Occupancy Rate (30d)"
          value={loading ? '...' : `${stats.occupancyRate}%`}
          subtext="Rooms sold / available"
          icon={Percent}
          color="indigo"
        />
        <StatCard
          label="ADR (30d)"
          value={loading ? '...' : `₹${stats.adr.toLocaleString('en-IN')}`}
          subtext="Average Daily Rate"
          icon={Activity}
          color="amber"
        />
        <StatCard
          label="RevPAR (30d)"
          value={loading ? '...' : `₹${stats.revpar.toLocaleString('en-IN')}`}
          subtext="Revenue Per Available Room"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Direct Reservations</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time feed of guest check-ins and payments</p>
          </div>
          <Link
            href="/bookings"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>View All Reservations</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Mobile: stacked cards */}
        <ul className="md:hidden divide-y divide-slate-100">
          {stats.recentBookings.map((b) => (
            <li key={b._id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{b.guest?.name}</div>
                  <div className="text-xs text-slate-400 truncate">{b.guest?.phone}</div>
                </div>
                {statusBadge(b.status)}
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono font-medium text-slate-900 truncate">{b.bookingCode}</span>
                <span className="font-bold text-sm text-slate-900 shrink-0">
                  ₹{b.billing?.grandTotal?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-xs text-slate-700">
                <span className="font-medium">{formatDay(b.dates?.checkIn)}</span>
                <span className="text-slate-400 mx-1.5">&rarr;</span>
                <span className="font-medium">{formatDay(b.dates?.checkOut)}</span>
                <span className="text-slate-400 ml-2">({b.dates?.nights}N)</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Tablet/desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Booking Ref</th>
                <th className="px-6 py-3.5">Guest Name</th>
                <th className="px-6 py-3.5">Stay Dates</th>
                <th className="px-6 py-3.5">Net Amount</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentBookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900 text-xs">
                    {b.bookingCode}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{b.guest?.name}</div>
                    <div className="text-xs text-slate-400">{b.guest?.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className="font-medium text-slate-700">
                      {new Date(b.dates?.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-slate-400 mx-1.5">&rarr;</span>
                    <span className="font-medium text-slate-700">
                      {new Date(b.dates?.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-slate-400 ml-2">({b.dates?.nights}N)</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ₹{b.billing?.grandTotal?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    {statusBadge(b.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.recentBookings.length === 0 && !loading && (
          <div className="py-12 px-4 text-center text-slate-400 text-sm">
            No reservations captured yet. Test your embed widget to make your first booking!
          </div>
        )}
      </div>
    </div>
  );
}
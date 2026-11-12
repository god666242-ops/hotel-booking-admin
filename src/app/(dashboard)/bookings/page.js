"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchWithAuth, downloadWithAuth } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import NewBookingModal from "../../../components/NewBookingModal";
import {
  LogIn,
  LogOut as LogOutIcon,
  FileText,
  Plus,
  Wallet as WalletIcon,
  RefreshCw,
} from "lucide-react";
import {
  Ban,
  Search,
  X,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Phone,
  Mail,
  BedDouble,
  LogOut,
  Home,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const IST = "Asia/Kolkata";
const PAGE_SIZE = 15;

const ymd = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: IST });
const todayStr = () => ymd(new Date());

const addDays = (str, n) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const weekdayIdx = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

const fmtDay = (d, opts = { day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString("en-IN", { ...opts, timeZone: IST });

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STATUS = {
  CONFIRMED: {
    label: "Confirmed",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-600",
  },
  CHECKED_IN: {
    label: "Checked in",
    pill: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-600",
  },
  COMPLETED: {
    label: "Completed",
    pill: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-500",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-600",
  },
  CANCELLATION_IN_PROGRESS: {
    label: "Cancelling",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-600",
  },
  PENDING: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-600",
  },
};
const statusOf = (s) =>
  STATUS[s] || {
    label: s || "Unknown",
    pill: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-500",
  };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest booked" },
  { value: "checkInAsc", label: "Check-in: earliest" },
  { value: "checkInDesc", label: "Check-in: latest" },
  { value: "amountDesc", label: "Highest amount" },
];

const DATE_FIELD_OPTIONS = [
  { value: "checkIn", label: "Check-in" },
  { value: "checkOut", label: "Check-out" },
  { value: "createdAt", label: "Booked on" },
  { value: "stay", label: "Staying during" },
];

const EMPTY_FILTERS = {
  q: "",
  status: "",
  roomTypeId: "",
  dateField: "checkIn",
  from: "",
  to: "",
  sort: "newest",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function StatusPill({ status }) {
  const s = statusOf(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${s.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function BookingsListPage() {
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSelected, setRefreshingSelected] = useState(false);
  const [toast, setToast] = useState(null);

  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const { user } = useAuth();
  const isManager = user?.role !== "STAFF";
  const [monthStart, setMonthStart] = useState(
    () => `${todayStr().slice(0, 7)}-01`,
  );
  const [selectedDay, setSelectedDay] = useState(todayStr());

  const notify = useCallback((message, type = "ok") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(t);
  }, [filters.q]);

  const loadRooms = useCallback(() => {
    fetchWithAuth("/rooms")
      .then((res) => setRooms(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const gridDays = useMemo(() => {
    const start = addDays(monthStart, -weekdayIdx(monthStart));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthStart]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (filters.roomTypeId) params.set("roomTypeId", filters.roomTypeId);
      if (filters.status) params.set("status", filters.status);

      if (view === "calendar") {
        params.set("dateField", "stay");
        params.set("from", gridDays[0]);
        params.set("to", gridDays[gridDays.length - 1]);
        params.set("limit", "500");
      } else {
        params.set("sort", filters.sort);
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        if (filters.from || filters.to) {
          params.set("dateField", filters.dateField);
          if (filters.from) params.set("from", filters.from);
          if (filters.to) params.set("to", filters.to);
        }
      }

      const res = await fetchWithAuth(`/bookings?${params.toString()}`);
      const list = res.data || [];
      setBookings(list);
      if (res.summary) setSummary(res.summary);
      if (res.pagination) setPagination(res.pagination);

      setSelected((cur) => {
        if (!cur) return null;
        const fresh = list.find((item) => item._id === cur._id);
        return fresh ? { ...cur, ...fresh } : cur;
      });
    } catch (err) {
      notify(err.message || "Could not load bookings", "error");
    } finally {
      setLoading(false);
    }
  }, [
    view,
    debouncedQ,
    filters.roomTypeId,
    filters.status,
    filters.sort,
    filters.dateField,
    filters.from,
    filters.to,
    page,
    gridDays,
    notify,
  ]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefreshAll = async () => {
    loadRooms();
    await loadBookings();
  };

  const handleRefreshSelected = async (booking) => {
    if (!booking?._id) return;
    setRefreshingSelected(true);
    try {
      const res = await fetchWithAuth(`/bookings/${booking._id}`);
      if (res?.data) {
        setSelected((cur) =>
          cur && cur._id === res.data._id
            ? { ...cur, ...res.data, roomTypeId: res.data.roomTypeId || cur.roomTypeId }
            : cur,
        );
      }
      await loadBookings();
      notify("Booking details refreshed");
    } catch {
      await loadBookings();
      notify("Booking details refreshed");
    } finally {
      setRefreshingSelected(false);
    }
  };

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDebouncedQ("");
    setPage(1);
  };

  const today = todayStr();
  const presets = [
    {
      key: "arr",
      label: "Arriving today",
      patch: {
        dateField: "checkIn",
        from: today,
        to: today,
        status: "CONFIRMED",
      },
    },
    {
      key: "dep",
      label: "Leaving today",
      patch: {
        dateField: "checkOut",
        from: today,
        to: today,
        status: "CONFIRMED",
      },
    },
    {
      key: "inh",
      label: "In-house now",
      patch: { dateField: "stay", from: today, to: today, status: "CONFIRMED" },
    },
    {
      key: "next7",
      label: "Next 7 days",
      patch: {
        dateField: "checkIn",
        from: today,
        to: addDays(today, 7),
        status: "CONFIRMED",
      },
    },
    {
      key: "new",
      label: "Booked today",
      patch: { dateField: "createdAt", from: today, to: today, status: "" },
    },
  ];
  const activePreset = presets.find(
    (p) =>
      p.patch.dateField === filters.dateField &&
      p.patch.from === filters.from &&
      p.patch.to === filters.to &&
      p.patch.status === filters.status,
  )?.key;

  const applyPreset = (p) => {
    if (activePreset === p.key) {
      setFilter({ dateField: "checkIn", from: "", to: "", status: "" });
    } else {
      setFilter(p.patch);
      setView("list");
    }
  };

  const hasActiveFilters =
    filters.q ||
    filters.status ||
    filters.roomTypeId ||
    filters.from ||
    filters.to ||
    filters.sort !== "newest";

  const handleCancel = async (booking, reason) => {
    try {
      const res = await fetchWithAuth(`/bookings/${booking._id}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reason: reason?.trim() || "Cancelled by hotel front desk",
        }),
      });
      notify(res.message);
      setSelected(null);
      loadBookings();
    } catch (err) {
      notify(err.message || "Cancellation failed", "error");
    }
  };

  const handleModify = async (booking, form) => {
    try {
      const res = await fetchWithAuth(`/bookings/${booking._id}/modify`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const d = res?.data?.delta;
      const note =
        d?.delta > 0 && d.action === "PAYMENT_DUE"
          ? ` Total increased by ${money(d.delta)}.`
          : d?.delta > 0 && d.action === "REFUND_DUE"
            ? ` Total decreased by ${money(d.delta)}.`
            : "";
      notify((res.message || "Booking modified successfully.") + note);
      const updated = res?.data?.booking;
      if (updated?._id)
        setSelected((cur) =>
          cur && cur._id === updated._id
            ? { ...cur, ...updated, roomTypeId: cur.roomTypeId }
            : cur,
        );
      loadBookings();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err.message || "Could not modify the booking.",
      };
    }
  };

  const runAction = async (fn, okMessage) => {
    try {
      const res = await fn();
      notify(res?.message || okMessage);
      if (res?.data?._id)
        setSelected((cur) =>
          cur && cur._id === res.data._id
            ? { ...cur, ...res.data, roomTypeId: cur.roomTypeId }
            : cur,
        );
      loadBookings();
      return res;
    } catch (err) {
      notify(err.message || "Action failed", "error");
      return null;
    }
  };

  const handleCheckIn = (b) =>
    runAction(() =>
      fetchWithAuth(`/bookings/${b._id}/check-in`, { method: "POST" }),
    );

  const handleCheckOut = async (b) => {
    try {
      const res = await fetchWithAuth(`/bookings/${b._id}/check-out`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      notify(res.message);
      setSelected((cur) =>
        cur ? { ...cur, ...res.data, roomTypeId: cur.roomTypeId } : cur,
      );
      loadBookings();
    } catch (err) {
      if (
        err.data?.code === "BALANCE_DUE" &&
        window.confirm(`${err.message}\n\nCheck out anyway?`)
      ) {
        runAction(() =>
          fetchWithAuth(`/bookings/${b._id}/check-out`, {
            method: "POST",
            body: JSON.stringify({ allowUnpaid: true }),
          }),
        );
      } else {
        notify(err.message || "Check-out failed", "error");
      }
    }
  };

  const handlePayment = (b, payment) =>
    runAction(() =>
      fetchWithAuth(`/bookings/${b._id}/payments`, {
        method: "POST",
        body: JSON.stringify(payment),
      }),
    );

  const handleInvoice = async (b) => {
    try {
      await downloadWithAuth(
        `/bookings/${b._id}/invoice`,
        `Invoice-${b.bookingCode}.pdf`,
      );
    } catch (err) {
      notify(err.message || "Could not download the invoice", "error");
    }
  };

  /* ---------------- CSV export (Backend Call) ---------------- */
  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (filters.roomTypeId) params.set("roomTypeId", filters.roomTypeId);

      notify("Generating CSV download...");
      await downloadWithAuth(
        `/bookings/export/csv?${params.toString()}`,
        `bookings-${todayStr()}.csv`,
      );
      notify("CSV downloaded successfully");
    } catch (err) {
      notify(err.message || "Export failed", "error");
    }
  };

  const calendar = useMemo(() => {
    if (view !== "calendar") return null;
    const visible = bookings
      .filter((b) => filters.status || b.status !== "CANCELLED")
      .map((b) => ({
        ...b,
        _ci: ymd(b.dates.checkIn),
        _co: ymd(b.dates.checkOut),
      }));

    const byDay = {};
    let maxRooms = 1;
    for (const day of gridDays) {
      const arrivals = visible.filter((b) => b._ci === day);
      const departures = visible.filter((b) => b._co === day);
      const inHouse = visible.filter((b) => b._ci <= day && day < b._co);
      const rooms = inHouse.reduce((s, b) => s + Number(b.roomCount || 1), 0);
      maxRooms = Math.max(maxRooms, rooms);
      byDay[day] = { arrivals, departures, inHouse, rooms };
    }
    return { byDay, maxRooms };
  }, [view, bookings, gridDays, filters.status]);

  const shiftMonth = (delta) => {
    const [y, m] = monthStart.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonthStart(d.toISOString().slice(0, 10));
  };
  const monthLabel = (() => {
    const [y, m] = monthStart.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  })();

  /* ================================================================ */
  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bookings & Reservations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Guest stays, arrivals and departures, and cancellations in one place
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={loading}
            title="Refresh bookings and details"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowNew(true)}
            disabled={rooms.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <Plus size={14} /> New booking
          </button>
          {view === "list" && (
            <button
              onClick={exportCsv}
              disabled={bookings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {[
              { key: "list", label: "Table", icon: List },
              { key: "calendar", label: "Calendar", icon: CalendarDays },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  view === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-slate-200/80 rounded-2xl divide-x divide-y md:divide-y-0 divide-slate-100 overflow-hidden">
        {[
          {
            label: "Reservations",
            value: summary.total,
            tone: "text-slate-900",
          },
          {
            label: "Confirmed",
            value: summary.confirmed,
            tone: "text-emerald-700",
          },
          {
            label: "Cancelled",
            value: summary.cancelled,
            tone: "text-rose-700",
          },
          {
            label: "Booking Value (excl. cancelled)",
            value: money(summary.revenue),
            tone: "text-slate-900",
          },
        ].map((s) => (
          <div key={s.label} className="px-5 py-4">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-0.5 ${s.tone}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
              activePreset === p.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={filters.q}
              onChange={(e) => setFilter({ q: e.target.value })}
              placeholder="Search by guest, phone, email or booking ref"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <select
            value={filters.roomTypeId}
            onChange={(e) => setFilter({ roomTypeId: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All room types</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>

          {view === "list" && (
            <select
              value={filters.sort}
              onChange={(e) => setFilter({ sort: e.target.value })}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {[
              { value: "", label: "All", count: summary.total },
              {
                value: "CONFIRMED",
                label: "Confirmed",
                count: summary.confirmed,
              },
              {
                value: "CHECKED_IN",
                label: "In house",
                count: summary.checkedIn || 0,
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                count: summary.cancelled,
              },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter({ status: o.value })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  filters.status === o.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {o.label}{" "}
                <span className="text-slate-400 font-medium">{o.count}</span>
              </button>
            ))}
          </div>

          {view === "list" && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.dateField}
                onChange={(e) => setFilter({ dateField: e.target.value })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                {DATE_FIELD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => setFilter({ from: e.target.value })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => setFilter({ to: e.target.value })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              <RotateCcw size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ============================ TABLE VIEW ============================ */}
      {view === "list" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Stay</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading &&
                  bookings.length === 0 &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-4">
                        <div className="h-5 rounded bg-slate-100 animate-pulse" />
                      </td>
                    </tr>
                  ))}

                {bookings.map((b) => (
                  <tr
                    key={b._id}
                    onClick={() => setSelected(b)}
                    className={`hover:bg-slate-50/70 transition cursor-pointer ${loading ? "opacity-60" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-medium text-slate-900 text-xs">
                        {b.bookingCode}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Booked {b.createdAt ? fmtDay(b.createdAt) : "-"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {b.guest?.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {b.guest?.phone}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-medium text-slate-800">
                        {b.roomTypeId?.name || "Standard Room"}
                      </div>
                      {Number(b.roomCount) > 1 && (
                        <div className="text-slate-400">
                          {b.roomCount} rooms
                        </div>
                      )}
                      {b.selectedAddOns?.length > 0 && (
                        <div className="text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                          <Sparkles size={11} /> {b.selectedAddOns.length}{" "}
                          add-on{b.selectedAddOns.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <span className="font-medium text-slate-700">
                        {fmtDay(b.dates?.checkIn)}
                      </span>
                      <span className="text-slate-400 mx-1.5">&rarr;</span>
                      <span className="font-medium text-slate-700">
                        {fmtDay(b.dates?.checkOut)}
                      </span>
                      <div className="text-slate-400 mt-0.5">
                        {b.dates?.nights}{" "}
                        {b.dates?.nights === 1 ? "night" : "nights"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {money(b.billing?.grandTotal)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.status === "CONFIRMED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(b);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold transition"
                        >
                          <Ban size={13} /> Cancel & refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {bookings.length === 0 && !loading && (
              <div className="p-12 text-center">
                <div className="text-slate-700 font-medium text-sm">
                  {hasActiveFilters
                    ? "No bookings match these filters"
                    : "No reservations yet"}
                </div>
                <div className="text-slate-400 text-sm mt-1">
                  {hasActiveFilters
                    ? "Try widening the date range or clearing a filter."
                    : "New guest bookings will appear here."}
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-xs font-semibold text-slate-900 underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * PAGE_SIZE + 1}-
                {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of{" "}
                {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-medium text-slate-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page >= pagination.pages}
                  className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================== CALENDAR VIEW =========================== */}
      {view === "calendar" && calendar && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1.5 rounded-md hover:bg-slate-100"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="text-base font-bold text-slate-900 w-40 text-center">
                  {monthLabel}
                </h2>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1.5 rounded-md hover:bg-slate-100"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={() => {
                  setMonthStart(`${todayStr().slice(0, 7)}-01`);
                  setSelectedDay(todayStr());
                }}
                className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                Today
              </button>
            </div>

            <div className="grid grid-cols-7 text-xs font-medium text-slate-400 border-b border-slate-100">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className={`grid grid-cols-7 ${loading ? "opacity-60" : ""}`}>
              {gridDays.map((day) => {
                const info = calendar.byDay[day];
                const inMonth = day.slice(0, 7) === monthStart.slice(0, 7);
                const isToday = day === today;
                const isSel = day === selectedDay;
                const intensity =
                  calendar.maxRooms > 0 ? info.rooms / calendar.maxRooms : 0;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      backgroundColor: info.rooms
                        ? `rgba(16, 185, 129, ${0.06 + intensity * 0.22})`
                        : undefined,
                    }}
                    className={`relative h-[92px] p-2 text-left border-b border-r border-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                      inMonth ? "" : "opacity-40"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                        isToday ? "bg-slate-900 text-white" : "text-slate-700"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>

                    <div className="mt-1 space-y-0.5">
                      {info.arrivals.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                          <LogIn size={11} /> {info.arrivals.length} in
                        </div>
                      )}
                      {info.departures.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <LogOut size={11} /> {info.departures.length} out
                        </div>
                      )}
                    </div>

                    {info.rooms > 0 && (
                      <div className="absolute bottom-1.5 right-2 text-[11px] text-slate-500 font-medium">
                        {info.rooms} {info.rooms === 1 ? "room" : "rooms"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 px-5 py-2.5 text-[11px] text-slate-500 border-t border-slate-100">
              <span className="inline-flex items-center gap-1">
                <LogIn size={11} /> Arrivals
              </span>
              <span className="inline-flex items-center gap-1">
                <LogOut size={11} /> Departures
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/30" /> Darker
                green means more rooms occupied
              </span>
              {!filters.status && (
                <span className="ml-auto">Cancelled bookings hidden</span>
              )}
            </div>
          </div>

          <DayPanel
            day={selectedDay}
            info={calendar.byDay[selectedDay]}
            onOpen={setSelected}
          />
        </div>
      )}

      {/* ============================== DRAWER ============================== */}
      {selected && (
        <BookingDrawer
          booking={selected}
          rooms={rooms}
          isManager={isManager}
          refreshing={refreshingSelected}
          onRefresh={() => handleRefreshSelected(selected)}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onPayment={handlePayment}
          onInvoice={handleInvoice}
          onModify={handleModify}
        />
      )}

      {showNew && (
        <NewBookingModal
          rooms={rooms}
          onClose={() => setShowNew(false)}
          onCreated={(b) => {
            setShowNew(false);
            notify(`Booking ${b.bookingCode} created.`);
            loadBookings();
          }}
        />
      )}

      {/* ============================== TOAST =============================== */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day panel (calendar side column)                                   */
/* ------------------------------------------------------------------ */
function DayPanel({ day, info, onOpen }) {
  const [tab, setTab] = useState("arrivals");
  const tabs = [
    {
      key: "arrivals",
      label: "Arrivals",
      icon: LogIn,
      list: info?.arrivals || [],
    },
    {
      key: "departures",
      label: "Departures",
      icon: LogOut,
      list: info?.departures || [],
    },
    { key: "inHouse", label: "Staying", icon: Home, list: info?.inHouse || [] },
  ];
  const active = tabs.find((t) => t.key === tab);

  return (
    <aside className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden self-start">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="text-base font-bold text-slate-900">
          {new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: IST,
          })}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {info?.rooms || 0} {info?.rooms === 1 ? "room" : "rooms"} occupied
        </div>
      </div>

      <div className="flex border-b border-slate-100">
        {tabs.map(({ key, label, icon: Icon, list }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition ${
              tab === key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Icon size={13} /> {label}{" "}
            <span className="font-medium">{list.length}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
        {active.list.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            No {active.label.toLowerCase()} on this day.
          </div>
        )}
        {active.list.map((b) => (
          <button
            key={b._id}
            onClick={() => onOpen(b)}
            className="w-full text-left px-5 py-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {b.guest?.name}
              </span>
              <span className="text-xs font-bold text-slate-900">
                {money(b.billing?.grandTotal)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {b.roomTypeId?.name || "Standard Room"}
              {Number(b.roomCount) > 1 ? ` x ${b.roomCount}` : ""} &bull;{" "}
              {fmtDay(b.dates.checkIn)} to {fmtDay(b.dates.checkOut)}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Booking drawer with in-place cancel confirmation                    */
/* ------------------------------------------------------------------ */
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: IST });
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const paidOffline = (b) =>
  (b.payment?.offlinePayments || []).reduce(
    (a, p) => a + (Number(p.amount) || 0),
    0,
  );
const getRoomCapacity = (room) => {
  const direct = Number(
    room?.maxOccupancy ??
      room?.maxGuests ??
      room?.capacity ??
      room?.maxOccupants,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;
  const split =
    (Number(room?.maxAdults) || 0) + (Number(room?.maxChildren) || 0);
  return split > 0 ? split : null;
};

function BookingDrawer({
  booking: b,
  rooms,
  isManager,
  refreshing,
  onRefresh,
  onClose,
  onCancel,
  onCheckIn,
  onCheckOut,
  onPayment,
  onInvoice,
  onModify,
}) {
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "CASH",
    reference: "",
  });
  const [acting, setActing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showModify, setShowModify] = useState(false);

  useEffect(() => {
    // While the modify dialog is open, Esc closes only that dialog.
    const onKey = (e) => e.key === "Escape" && !showModify && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showModify]);

  const submit = async () => {
    setBusy(true);
    await onCancel(b, reason);
    setBusy(false);
  };

  const isOffline = b.payment?.mode === "OFFLINE";
  const balance = isOffline
    ? Math.max(0, Number(b.billing?.grandTotal || 0) - paidOffline(b))
    : 0;
  const canCheckIn =
    b.status === "CONFIRMED" &&
    todayKey() >= dayKey(b.dates?.checkIn) &&
    todayKey() < dayKey(b.dates?.checkOut);
  const hasInvoice = [
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
  ].includes(b.status);

  const act = async (fn) => {
    setActing(true);
    await fn();
    setActing(false);
  };

  const Row = ({ label, children }) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{children}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="font-mono text-xs text-slate-500">
              {b.bookingCode}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {b.guest?.name}
            </h2>
            <div className="mt-2">
              <StatusPill status={b.status} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh booking details"
              aria-label="Refresh booking details"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md disabled:opacity-50 transition"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section className="space-y-1.5">
            <a
              href={`tel:${b.guest?.phone}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
            >
              <Phone size={14} className="text-slate-400" /> {b.guest?.phone}
            </a>
            {b.guest?.email ? (
              <a
                href={`mailto:${b.guest.email}`}
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
              >
                <Mail size={14} className="text-slate-400" /> {b.guest.email}
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail size={14} /> No email on file
              </div>
            )}
          </section>

          <section className="divide-y divide-slate-100 border-y border-slate-100">
            <Row label="Room">
              <span className="inline-flex items-center gap-1.5">
                <BedDouble size={14} className="text-slate-400" />
                {b.roomTypeId?.name || "Standard Room"}
                {Number(b.roomCount) > 1 ? ` x ${b.roomCount}` : ""}
              </span>
            </Row>
            <Row label="Check-in">
              {fmtDay(b.dates?.checkIn, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Row>
            <Row label="Check-out">
              {fmtDay(b.dates?.checkOut, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Row>
            <Row label="Nights">{b.dates?.nights}</Row>
            <Row label="Booked on">
              {b.createdAt
                ? fmtDay(b.createdAt, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </Row>
          </section>

          {/* Enhance Your Stay / Add-ons section */}
          {b.selectedAddOns?.length > 0 && (
            <section className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Selected Add-ons ({b.selectedAddOns.length})</span>
              </div>
              <div className="space-y-2 divide-y divide-slate-200/60">
                {b.selectedAddOns.map((addon, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-2 text-xs ${idx > 0 ? "pt-2" : ""}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {addon.name}
                      </div>
                      <div className="text-slate-400">
                        Qty: {addon.quantity || 1} &bull; {money(addon.price)}{" "}
                        {addon.chargeType
                          ? `(${addon.chargeType.toLowerCase().replace(/_/g, " ")})`
                          : ""}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">
                      {money(
                        addon.subtotal || addon.price * (addon.quantity || 1),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="divide-y divide-slate-100 border-y border-slate-100">
            <Row label="Room Tariff">{money(b.billing?.roomBaseTariff)}</Row>
            {Number(b.billing?.addOnsTotal) > 0 && (
              <Row label="Add-ons Total">{money(b.billing?.addOnsTotal)}</Row>
            )}
            {Number(b.billing?.hotelGst) > 0 && (
              <Row label="Taxes & GST">{money(b.billing?.hotelGst)}</Row>
            )}
            <Row
              label={
                isOffline || b.payment?.mode === "PAY_AT_HOTEL"
                  ? "Total"
                  : "Total paid"
              }
            >
              <span className="text-base font-bold text-slate-900">
                {money(b.billing?.grandTotal)}
              </span>
            </Row>
            {b.payment?.mode === "PAY_AT_HOTEL" && (
              <>
                <Row label="Booking fee paid online">
                  {money(b.payment?.amountPayableNow)}
                </Row>
                <Row label="Collect at hotel">
                  <span className="font-bold text-rose-700">
                    {money(b.payment?.amountDueAtHotel)}
                  </span>
                </Row>
              </>
            )}
            {isOffline && (
              <Row label="Received so far">{money(paidOffline(b))}</Row>
            )}
            {isOffline && balance > 0 && (
              <Row label="Balance due">
                <span className="font-bold text-rose-700">
                  {money(balance)}
                </span>
              </Row>
            )}
            <Row label="Source">
              {{ ONLINE: "Website", PHONE: "Phone", WALK_IN: "Walk-in" }[
                b.source
              ] || "Website"}
            </Row>
            <Row label="Payment mode">
              {isOffline
                ? "Paid at hotel"
                : b.payment?.mode === "HOTEL_GATEWAY"
                  ? "Hotel gateway"
                  : b.payment?.mode === "PAY_AT_HOTEL"
                    ? "Pay at hotel (fee paid online)"
                    : "Platform managed"}
            </Row>
            {isOffline && b.offlineCommission?.status === "DUE" && (
              <Row label="Platform commission due">
                {money(b.offlineCommission.amount)} (
                {b.offlineCommission.percent}%)
              </Row>
            )}
            {b.payment?.razorpayPaymentId && (
              <Row label="Razorpay payment">
                <span className="font-mono text-xs">
                  {b.payment.razorpayPaymentId}
                </span>
              </Row>
            )}
          </section>

          {/* Front-desk actions */}
          {(canCheckIn || b.status === "CHECKED_IN" || hasInvoice) && (
            <section className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {canCheckIn && (
                  <button
                    disabled={acting}
                    onClick={() => act(() => onCheckIn(b))}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-60"
                  >
                    <LogIn size={15} /> Check in
                  </button>
                )}
                {b.status === "CHECKED_IN" && (
                  <button
                    disabled={acting}
                    onClick={() => act(() => onCheckOut(b))}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
                  >
                    <LogOutIcon size={15} /> Check out
                  </button>
                )}
                {hasInvoice && (
                  <button
                    onClick={() => onInvoice(b)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <FileText size={15} /> Invoice (PDF)
                  </button>
                )}
                {b.status === "CONFIRMED" &&
                  ["PAY_AT_HOTEL", "OFFLINE"].includes(b.payment?.mode) && (
                    <button
                      onClick={() => setShowModify(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <CalendarDays size={15} /> Modify booking
                    </button>
                  )}
              </div>
              {b.status === "CONFIRMED" &&
                !canCheckIn &&
                todayKey() < dayKey(b.dates?.checkIn) && (
                  <p className="text-xs text-slate-500">
                    Check-in opens on{" "}
                    {fmtDay(b.dates?.checkIn, {
                      day: "numeric",
                      month: "short",
                    })}
                    .
                  </p>
                )}
              {b.checkedInAt && (
                <p className="text-xs text-slate-500">
                  Checked in{" "}
                  {new Date(b.checkedInAt).toLocaleString("en-IN", {
                    timeZone: IST,
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {b.checkedOutAt
                    ? `, checked out ${new Date(b.checkedOutAt).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </p>
              )}
            </section>
          )}

          {isOffline &&
            balance > 0 &&
            ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status) && (
              <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <WalletIcon size={14} /> Record payment
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    max={balance}
                    value={payForm.amount}
                    onChange={(e) =>
                      setPayForm({ ...payForm, amount: e.target.value })
                    }
                    placeholder={`Up to ${balance}`}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, method: e.target.value })
                    }
                    className="px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input
                    value={payForm.reference}
                    onChange={(e) =>
                      setPayForm({ ...payForm, reference: e.target.value })
                    }
                    placeholder="Reference"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <button
                  disabled={acting || !(Number(payForm.amount) > 0)}
                  onClick={() =>
                    act(async () => {
                      const r = await onPayment(b, {
                        ...payForm,
                        amount: Number(payForm.amount),
                      });
                      if (r)
                        setPayForm({
                          amount: "",
                          method: "CASH",
                          reference: "",
                        });
                    })
                  }
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  Save payment
                </button>
              </section>
            )}

          {b.notes && (
            <section className="text-sm text-slate-600 bg-amber-50/60 border border-amber-100 rounded-xl p-3">
              <span className="font-semibold text-slate-800">Note: </span>
              {b.notes}
            </section>
          )}

          {b.status === "CANCELLED" && b.cancellation && (
            <section className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm space-y-1">
              <div className="font-semibold text-rose-800">
                Cancelled{" "}
                {b.cancellation.cancelledAt
                  ? fmtDay(b.cancellation.cancelledAt, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : ""}
              </div>
              <div className="text-rose-700">
                Refunded {money(b.cancellation.amountRefunded)} (
                {b.cancellation.refundPercentApplied}%), retained{" "}
                {money(b.cancellation.amountRetained)}
              </div>
              {b.cancellation.reason && (
                <div className="text-rose-700/80">
                  Reason: {b.cancellation.reason}
                </div>
              )}
            </section>
          )}

          {isManager && b.status === "CONFIRMED" && (
            <section>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition"
                >
                  <Ban size={15} /> Cancel booking & refund
                </button>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                  <p className="text-sm text-slate-700">
                    This releases the rooms and refunds the guest as per your
                    cancellation policy. It cannot be undone.
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={busy}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Keep booking
                    </button>
                    <button
                      onClick={submit}
                      disabled={busy}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busy ? "Cancelling..." : "Confirm cancellation"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {showModify && (
        <ModifyBookingModal
          booking={b}
          rooms={rooms}
          onClose={() => setShowModify(false)}
          onSave={async (form) => {
            const r = await onModify(b, form);
            if (r.ok) setShowModify(false);
            return r;
          }}
        />
      )}
    </div>
  );
}

function ModifyBookingModal({ booking: b, rooms = [], onClose, onSave }) {
  const originalCheckIn = ymd(b.dates.checkIn);
  const originalCheckOut = ymd(b.dates.checkOut);
  const originalNights = Math.round(
    (new Date(originalCheckOut) - new Date(originalCheckIn)) / 86400000,
  );
  const nightsLabel = `${originalNights} night${originalNights > 1 ? "s" : ""}`;

  const roomId = b.roomTypeId?._id || b.roomTypeId;
  const roomDoc = rooms.find((r) => String(r._id) === String(roomId));
  const roomName = b.roomTypeId?.name || roomDoc?.name || "Standard Room";
  const roomCount = Math.max(1, Number(b.roomCount) || 1);
  const perRoom = getRoomCapacity(roomDoc || b.roomTypeId);
  const maxGuests = perRoom ? perRoom * roomCount : null;

  const [form, setForm] = useState({
    checkIn: originalCheckIn,
    checkOut: originalCheckOut,
    adults: b.occupancy?.adults || 1,
    children: b.occupancy?.children || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const adults = Number(form.adults) || 0;
  const children = Number(form.children) || 0;
  const totalGuests = adults + children;
  const nights = Math.round(
    (new Date(form.checkOut) - new Date(form.checkIn)) / 86400000,
  );
  const overCapacity = maxGuests != null && totalGuests > maxGuests;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.checkIn || !form.checkOut || nights !== originalNights) {
      setError(
        `Stay length must stay ${nightsLabel}. You can only shift the dates.`,
      );
      return;
    }
    if (!Number.isInteger(adults) || adults < 1) {
      setError("At least 1 adult is required.");
      return;
    }
    if (!Number.isInteger(children) || children < 0) {
      setError("Children must be 0 or more.");
      return;
    }
    if (overCapacity) {
      setError(
        `This room allows a maximum of ${maxGuests} guest${maxGuests > 1 ? "s" : ""}.`,
      );
      return;
    }
    const unchanged =
      form.checkIn === originalCheckIn &&
      adults === (b.occupancy?.adults || 1) &&
      children === (b.occupancy?.children || 0);
    if (unchanged) {
      setError("Nothing to change. Pick new dates or change the guests.");
      return;
    }

    setSaving(true);
    setError("");
    // Room type and room count are never sent: they cannot be changed.
    const r = await onSave({
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults,
      children,
    });
    if (!r.ok) {
      setError(r.message);
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  const locked = `${input} mt-1 cursor-not-allowed bg-slate-50 text-slate-500`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Modify booking</h3>
            <p className="text-xs text-slate-500">
              {b.bookingCode} · {b.guest?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          Room (cannot be changed)
          <input
            className={locked}
            value={`${roomName}${roomCount > 1 ? ` x ${roomCount}` : ""}`}
            readOnly
            disabled
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Check-in
            <input
              type="date"
              className={`${input} mt-1`}
              value={form.checkIn}
              min={todayStr()}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setForm((f) => ({
                  ...f,
                  checkIn: v,
                  checkOut: addDays(v, originalNights),
                }));
              }}
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Check-out ({nightsLabel})
            <input
              type="date"
              className={locked}
              value={form.checkOut}
              readOnly
              disabled
            />
          </label>
        </div>

        <p className="text-xs text-slate-500">
          The stay length is fixed at {nightsLabel}. Choose a new check-in date
          and check-out moves with it.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Adults
            <input
              type="number"
              min="1"
              max={maxGuests ? Math.max(1, maxGuests - children) : undefined}
              className={`${input} mt-1`}
              value={form.adults}
              onChange={(e) =>
                setForm((f) => ({ ...f, adults: e.target.value }))
              }
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Children
            <input
              type="number"
              min="0"
              max={maxGuests ? Math.max(0, maxGuests - adults) : undefined}
              className={`${input} mt-1`}
              value={form.children}
              onChange={(e) =>
                setForm((f) => ({ ...f, children: e.target.value }))
              }
            />
          </label>
        </div>

        <p
          className={`text-xs ${overCapacity ? "font-semibold text-rose-600" : "text-slate-500"}`}
        >
          {maxGuests
            ? `Guests: ${totalGuests} of ${maxGuests} maximum (minimum 1).`
            : `Guests: ${totalGuests}.`}
        </p>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          The price is recalculated from your current rates, taxes and the
          guest’s plan or promo.
          {b.payment?.mode === "PAY_AT_HOTEL" &&
            " The online booking fee already paid stays unchanged; only the amount payable at the hotel changes."}
        </p>

        {error && (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || overCapacity}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
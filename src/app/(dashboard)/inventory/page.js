"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../lib/api";
import {
  Calendar,
  History,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Edit3,
  AlertCircle,
  Clock,
  Info,
  CalendarOff,
  Moon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
// Dates are handled in hotel time (IST). new Date().toISOString() is UTC and
// would return "yesterday" between 12:00 AM and 5:30 AM IST.
const todayStr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const toDateStr = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// Stops "-", "+" and "e" from being typed into number inputs
const blockInvalidKeys = (e) => {
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
};

export default function InventoryRatesPage() {
  const [activeTab, setActiveTab] = useState("UPDATE"); // 'UPDATE' | 'HISTORY'
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");
  const [minStay, setMinStay] = useState("");

  const [closedToArrival, setClosedToArrival] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Touched state & explicit reset triggers
  const [resetDefaults, setResetDefaults] = useState(false);
  const [ctaTouched, setCtaTouched] = useState(false);
  const [blockTouched, setBlockTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dateError, setDateError] = useState("");
  const [formError, setFormError] = useState("");

  // History state
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await fetchWithAuth("/rooms");
      setRooms(res.data || []);
      if (res.data && res.data.length > 0) setSelectedRoom(res.data[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchWithAuth("/inventory/history");
      setHistoryLogs(res.data?.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    const today = todayStr();
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (activeTab === "HISTORY") {
      loadHistory();
    }
  }, [activeTab]);

  const selectedRoomObj = rooms.find((r) => r._id === selectedRoom);

  /* ---------------- date handlers ---------------- */
  const handleStartDateChange = (val) => {
    if (val && val < todayStr()) {
      setDateError('"From Date" cannot be in the past.');
      return;
    }
    setStartDate(val);
    setDateError("");
    if (endDate && val > endDate) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (startDate && val < startDate) {
      setDateError('"To Date" cannot be earlier than "From Date".');
    } else {
      setDateError("");
    }
  };

  /* ---------------- number handlers ---------------- */
  const handlePriceChange = (val) => {
    if (val === "" || Number(val) >= 0) setPrice(val);
  };

  const handleUnitsChange = (val) => {
    if (val === "") return setAvailableRooms("");
    const n = Math.floor(Number(val));
    if (Number.isNaN(n) || n < 0) return;
    const max = selectedRoomObj?.totalUnits;
    setAvailableRooms(String(max != null && n > max ? max : n));
  };

  const handleMinStayChange = (val) => {
    if (val === "") return setMinStay("");
    const n = Math.floor(Number(val));
    if (Number.isNaN(n) || n < 1) return;
    setMinStay(String(n));
  };

  /* ---------------- history -> form ---------------- */
  const handleSelectHistoryLog = (log) => {
    if (log.roomTypeId) {
      setSelectedRoom(log.roomTypeId);
    }

    const today = todayStr();
    let logStart = toDateStr(log.startDate);
    let logEnd = toDateStr(log.endDate);
    if (logStart < today) logStart = today;
    if (logEnd < logStart) logEnd = logStart;
    setStartDate(logStart);
    setEndDate(logEnd);
    setDateError("");
    setFormError("");

    if (
      typeof log.changes?.price === "string" &&
      log.changes.price.startsWith("₹")
    ) {
      setPrice(log.changes.price.replace("₹", "").trim());
    } else if (typeof log.changes?.price === "number") {
      setPrice(String(log.changes.price));
    } else {
      setPrice("");
    }

    if (
      typeof log.changes?.availableRooms === "string" &&
      log.changes.availableRooms.includes("units")
    ) {
      const numMatch = log.changes.availableRooms.match(/\d+/);
      if (log.changes.availableRooms.includes("Default")) {
        setAvailableRooms("");
      } else if (numMatch) {
        setAvailableRooms(numMatch[0]);
      }
    } else if (typeof log.changes?.availableRooms === "number") {
      setAvailableRooms(String(log.changes.availableRooms));
    } else {
      setAvailableRooms("");
    }

    if (log.changes?.minStay != null) {
      setMinStay(String(log.changes.minStay));
    } else {
      setMinStay("");
    }

    setClosedToArrival(Boolean(log.changes?.closedToArrival));
    setIsBlocked(Boolean(log.changes?.isBlocked));
    setCtaTouched(true);
    setBlockTouched(true);
    setResetDefaults(false);

    setActiveTab("UPDATE");
    setMessage(
      `Loaded settings for ${log.roomName}. Modify and re-apply as needed.`,
    );
  };

  /* ---------------- submit ---------------- */
  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    setFormError("");
    setDateError("");

    if (startDate < todayStr()) {
      setDateError('"From Date" cannot be in the past.');
      return;
    }
    if (startDate > endDate) {
      setDateError('"To Date" cannot be earlier than "From Date".');
      return;
    }
    if (price !== "" && !(Number(price) > 0) && !resetDefaults) {
      setFormError("Night tariff must be greater than 0.");
      return;
    }
    if (availableRooms !== "" && !resetDefaults) {
      const n = Number(availableRooms);
      if (!Number.isInteger(n) || n < 0) {
        setFormError("Available units must be a whole number, 0 or more.");
        return;
      }
      if (selectedRoomObj && n > selectedRoomObj.totalUnits) {
        setFormError(
          `Available units cannot exceed ${selectedRoomObj.totalUnits}.`,
        );
        return;
      }
    }
    if (minStay !== "" && !resetDefaults) {
      const n = Number(minStay);
      if (!Number.isInteger(n) || n < 1) {
        setFormError("Minimum stay requirement must be at least 1 night.");
        return;
      }
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        roomTypeId: selectedRoom,
        startDate,
        endDate,
      };

      if (resetDefaults) {
        // Explicit reset to catalog defaults
        payload.price = null;
        payload.availableRooms = null;
        payload.minStay = null;
        payload.closedToArrival = false;
        payload.isBlocked = false;
      } else {
        if (price !== "") payload.price = Number(price);
        if (availableRooms !== "")
          payload.availableRooms = Number(availableRooms);
        if (minStay !== "") payload.minStay = Number(minStay);
        if (ctaTouched) payload.closedToArrival = closedToArrival;
        if (blockTouched) payload.isBlocked = isBlocked;
      }

      const res = await fetchWithAuth("/inventory/bulk-update", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage(res.message);
      setPrice("");
      setAvailableRooms("");
      setMinStay("");
      setClosedToArrival(false);
      setIsBlocked(false);
      setCtaTouched(false);
      setBlockTouched(false);
      setResetDefaults(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRetentionLabel = (expiresAt) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="text-[10px] text-rose-500 font-medium">
          Purge scheduled
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
          <Clock size={10} /> Auto-purging in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1">
        <Clock size={10} /> Retained ({diffDays}d)
      </span>
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory & Dynamic Rates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Adjust seasonal pricing, manage room allocations, and audit past
            modifications
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("UPDATE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "UPDATE"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={14} />
            Update Inventory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "HISTORY"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History size={14} />
            Change History
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {dateError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{dateError}</span>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* ── Tab 1: Update Form ── */}
      {activeTab === "UPDATE" && (
        <form
          onSubmit={handleBulkUpdate}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Room Category
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setAvailableRooms("");
                setFormError("");
              }}
            >
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} (Base Tariff: ₹{r.basePrice} &bull; Total Units:{" "}
                  {r.totalUnits})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                From Date
              </label>
              <input
                type="date"
                required
                min={todayStr()}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                To Date
              </label>
              <input
                type="date"
                required
                min={startDate || todayStr()}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  dateError
                    ? "border-rose-400 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-slate-900"
                }`}
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Override Night Tariff (₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                onKeyDown={blockInvalidKeys}
                placeholder={`Catalog Base: ₹${selectedRoomObj?.basePrice || 0} (Leave empty to keep current)`}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Leave empty to keep the current price.
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Available Units for Booking
              </label>
              <input
                type="number"
                min="0"
                step="1"
                max={selectedRoomObj?.totalUnits || undefined}
                inputMode="numeric"
                onKeyDown={blockInvalidKeys}
                placeholder={`Max: ${selectedRoomObj?.totalUnits || 0} units (Leave empty to keep current)`}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={availableRooms}
                onChange={(e) => handleUnitsChange(e.target.value)}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cannot exceed physical capacity (
                {selectedRoomObj?.totalUnits || 0} rooms).
              </span>
            </div>
          </div>

          {/* ── Advanced Stay Restrictions (Min Stay & Closed-To-Arrival) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Moon size={13} className="text-slate-500" />
                Minimum Stay Requirement
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                onKeyDown={blockInvalidKeys}
                placeholder="Default: 1 night (Leave empty to keep current)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={minStay}
                onChange={(e) => handleMinStayChange(e.target.value)}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Requires reservations starting in this date range to book at
                least this many nights.
              </span>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition">
                <input
                  type="checkbox"
                  checked={closedToArrival}
                  onChange={(e) => {
                    setClosedToArrival(e.target.checked);
                    setCtaTouched(true);
                  }}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarOff size={13} className="text-amber-600" />
                    Closed-to-Arrival (CTA)
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Prevent check-ins on these dates while still allowing
                    ongoing stays to continue.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => {
                  setIsBlocked(e.target.checked);
                  setBlockTouched(true);
                }}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  Stop-Sell Blackout
                </span>
                <span className="text-xs text-slate-500">
                  Close booking availability completely for the chosen date
                  range.
                </span>
              </div>
            </label>
          </div>

          {/* Reset Block */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetDefaults}
                onChange={(e) => setResetDefaults(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  Reset these dates to defaults
                </span>
                <span className="text-xs text-slate-600">
                  Restores base price, full availability, 1-night minimum, and
                  clears blackout and closed-to-arrival. Other fields above are
                  ignored.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-70"
          >
            {loading
              ? "Applying Calendar Changes..."
              : "Save Inventory Adjustments"}
          </button>
        </form>
      )}

      {/* ── Tab 2: History & Audit Log with 7-Day Notice ── */}
      {activeTab === "HISTORY" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
            <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>7-Day Retention Policy:</strong> Modification history for
              passed dates is kept for exactly 7 days after the affected dates
              have ended. Expired records are automatically and permanently
              deleted from the database.
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inventory Modification Log
              </h2>
              <p className="text-xs text-slate-400">
                Click &ldquo;Load into Form&rdquo; to modify or re-apply an
                earlier adjustment
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition"
              title="Refresh log"
            >
              <RefreshCw
                size={14}
                className={historyLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading audit history...
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active inventory logs found within the 7-day retention period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyLogs.map((log) => {
                const startDateStr = new Date(log.startDate).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );
                const endDateStr = new Date(log.endDate).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );
                const logTime = new Date(log.createdAt).toLocaleString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <div
                    key={log._id}
                    className="py-4 first:pt-2 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {log.roomName}
                        </span>
                        {log.actionType === "BLACKOUT" && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                            STOP-SELL
                          </span>
                        )}
                        {log.actionType === "RESET" && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                            RESET TO BASE
                          </span>
                        )}
                        {log.actionType === "RATE_OVERRIDE" && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">
                            RATE ADJUSTED
                          </span>
                        )}
                        {log.actionType === "STOCK_OVERRIDE" && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">
                            UNITS ADJUSTED
                          </span>
                        )}
                        {log.actionType === "MIXED" && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                            CUSTOM
                          </span>
                        )}
                        {log.changes?.closedToArrival && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md">
                            CTA
                          </span>
                        )}
                        {getRetentionLabel(log.expiresAt)}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">
                          {startDateStr}
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {endDateStr}
                        </span>
                        <span className="text-slate-400">
                          ({log.daysCount} night{log.daysCount > 1 ? "s" : ""})
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                        <span>
                          Price:{" "}
                          <strong className="text-slate-800">
                            {log.changes?.price}
                          </strong>
                        </span>
                        <span>
                          Units:{" "}
                          <strong className="text-slate-800">
                            {log.changes?.availableRooms}
                          </strong>
                        </span>
                        {log.changes?.minStay != null && (
                          <span>
                            Min Stay:{" "}
                            <strong className="text-slate-800">
                              {log.changes.minStay} night(s)
                            </strong>
                          </span>
                        )}
                        {log.changes?.isBlocked && (
                          <strong className="text-rose-600">Blocked</strong>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <div className="text-right text-[11px] text-slate-400">
                        <div>{logTime}</div>
                        <div className="text-slate-500">
                          {log.updatedBy?.email}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectHistoryLog(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                      >
                        <Edit3 size={13} className="text-slate-500" />
                        <span>Load into Form</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

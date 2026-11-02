"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BedDouble,
  BookOpenCheck,
  CreditCard,
  FileCode,
  ShieldAlert,
  Wallet,
  LogOut,
  Hotel,
  ExternalLink,
  Percent,
  Sparkles,
  Gift,
  Users,
  FileText,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { AuthProvider, useAuth } from "../../context/AuthContext";

// Optional link to a hosted widget preview. Hidden when not configured.
const WIDGET_PREVIEW_URL = process.env.NEXT_PUBLIC_WIDGET_PREVIEW_URL || "";

function DashboardShell({ children }) {
  const pathname = usePathname();
  const { hotel, user, logout } = useAuth();
  const isManager = user?.role !== "STAFF";

  const navItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Inventory & Rates", href: "/inventory", icon: Calendar },
    { label: "Room Catalog", href: "/rooms", icon: BedDouble },
    {
      label: "Enhance Stay (Add-ons)",
      href: "/settings/addons",
      icon: Gift,
    },
    {
      label: "Property Details & Trust",
      href: "/settings/content",
      icon: Sparkles,
    },
    { label: "Reservations", href: "/bookings", icon: BookOpenCheck },
    { label: "Commission & Billing", href: "/commission", icon: Wallet },
    { label: "Room Taxes & GST", href: "/settings/taxes", icon: Percent },
    { label: "Payment Gateway", href: "/settings/gateway", icon: CreditCard },
    {
      label: "Cancellation Rules",
      href: "/settings/policies",
      icon: ShieldAlert,
    },
    { label: "Calendar Sync (iCal)", href: "/settings/calendar", icon: RefreshCw },
    { label: "Legal & Invoicing", href: "/settings/legal", icon: FileText },
    { label: "Team & Access", href: "/settings/team", icon: Users },
    { label: "Embed Snippet", href: "/settings/embed", icon: FileCode },
    { label: "Account & Security", href: "/settings/account", icon: KeyRound },
  ];

  // Front-desk staff only see day-to-day screens; everything else is for managers.
  const STAFF_ALLOWED = ["/", "/bookings", "/settings/account"];
  const visibleItems = isManager ? navItems : navItems.filter((i) => STAFF_ALLOWED.includes(i.href));

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col fixed inset-y-0 z-30">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
            <Hotel size={20} className="text-blue-400" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 truncate">
              {hotel?.name || "Direct Hotel Engine"}
            </h1>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              {hotel?.slug ? `@${hotel.slug}` : "Hotelier Console"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm shadow-slate-900/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {hotel?.slug && WIDGET_PREVIEW_URL && (
            <Link
              href={WIDGET_PREVIEW_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <span>Test Live Widget</span>
              <ExternalLink size={13} className="text-slate-400" />
            </Link>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
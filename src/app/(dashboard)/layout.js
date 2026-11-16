"use client";

import { useState, useEffect } from "react";
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
  ExternalLink,
  Percent,
  Sparkles,
  Gift,
  Users,
  FileText,
  RefreshCw,
  KeyRound,
  Menu,
  X,
} from "lucide-react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import Logo from "../../components/Logo";

// Optional link to a hosted widget preview. Hidden when not configured.
const WIDGET_PREVIEW_URL = process.env.NEXT_PUBLIC_WIDGET_PREVIEW_URL || "";

function DashboardShell({ children }) {
  const pathname = usePathname();
  const { hotel, user, logout } = useAuth();
  const isManager = user?.role !== "STAFF";
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While the drawer is open: close on Escape and lock background scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile top bar (hidden on lg+) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4">
        <Link href="/" aria-label="PureBook dashboard" className="inline-flex">
          <Logo className="h-7" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="dashboard-sidebar"
          className="p-2 -mr-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-slate-900/40 transition-opacity ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar: off-canvas drawer on mobile, fixed on lg+ */}
      <aside
        id="dashboard-sidebar"
        className={`w-64 max-w-[85vw] bg-white border-r border-slate-200/80 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:z-30 lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="PureBook dashboard" className="inline-flex">
              <Logo className="h-8" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="lg:hidden p-2 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 ring-1 ring-slate-200/70 px-3 py-2.5 overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 truncate">
              {hotel?.name || "Your property"}
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
      <main className="min-w-0 min-h-screen pt-[4.5rem] px-4 pb-6 sm:px-6 lg:ml-64 lg:p-8">
        {children}
      </main>
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
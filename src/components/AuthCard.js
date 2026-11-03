'use client';

import Logo from './Logo';

/** Shared shell for the small account pages (forgot / reset / accept invite). */
export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo className="h-10" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Hotelier Console
          </span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-7">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400';
export const primaryBtn =
  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition';

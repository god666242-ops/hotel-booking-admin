export default function StatCard({ label, value, subtext, icon: Icon, color = 'slate' }) {
  const colorStyles = {
    slate: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60',
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/60',
    amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/60',
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.slate}`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

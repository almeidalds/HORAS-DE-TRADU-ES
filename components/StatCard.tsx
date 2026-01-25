import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color?: string; // Expecting Tailwind text class like "text-blue-500"
  gradientFrom?: string; // Optional custom gradient start
  gradientTo?: string; // Optional custom gradient end
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  color = "text-violet-600 dark:text-violet-400",
  gradientFrom = "from-violet-500/10",
  gradientTo = "to-indigo-500/10"
}) => {
  return (
    <div className="glass-card p-6 rounded-2xl flex items-start justify-between transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg relative overflow-hidden group">
      {/* Decorative gradient blob */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity`}></div>
      
      <div className="relative z-10">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">{value}</h3>
        {subValue && <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">{subValue}</p>}
      </div>
      
      <div className={`relative z-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} strokeWidth={2} />
      </div>
    </div>
  );
};
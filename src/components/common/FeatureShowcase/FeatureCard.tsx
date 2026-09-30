import React from 'react';
import { LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  name: string;
  description?: string;
  icon: any;
  color?: string;
  onClick: () => void;
  key?: any;
};

export default function FeatureCard({ name, description, icon: Icon, color = 'blue', onClick }: FeatureCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 text-left w-full group flex flex-col items-start gap-4"
    >
      <div className={`p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{name}</h3>
        {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
      </div>
    </button>
  );
}

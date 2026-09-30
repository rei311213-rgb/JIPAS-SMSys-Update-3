import React from 'react';
import { LucideIcon } from 'lucide-react';

type HighlightCardProps = {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  key?: any;
};

export default function HighlightCard({ title, description, icon: Icon, iconColor }: HighlightCardProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-slate-50 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

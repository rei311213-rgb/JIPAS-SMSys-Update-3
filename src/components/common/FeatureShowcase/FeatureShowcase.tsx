import React from 'react';
import FeatureCard from './FeatureCard';
import HighlightCard from './HighlightCard';
import { 
  ShieldCheck, Zap, Laptop, Clock3, Headphones,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS } from '../../../data/adminNavData';

interface FeatureShowcaseProps {
  onNavigate: (modId: string) => void;
}

export default function FeatureShowcase({ onNavigate }: FeatureShowcaseProps) {
  const highlights = [
    { title: 'Easy to Use', description: 'Intuitive interface designed for educators', icon: Zap, iconColor: 'text-yellow-500' },
    { title: 'Secure System', description: 'Enterprise-grade data protection', icon: ShieldCheck, iconColor: 'text-rose-500' },
    { title: 'Boost Productivity', description: 'Automate administrative tasks', icon: Laptop, iconColor: 'text-blue-500' },
    { title: 'Anywhere Access', description: 'Cloud-based platform for remote work', icon: Clock3, iconColor: 'text-emerald-500' },
    { title: 'Reliable Support', description: 'Dedicated technical assistance', icon: Headphones, iconColor: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {highlights.map((h, i) => (
          <HighlightCard 
            key={i}
            title={h.title}
            description={h.description}
            icon={h.icon}
            iconColor={h.iconColor}
          />
        ))}
      </div>

      {/* Key Features */}
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px bg-slate-200 w-12" />
          <h2 className="px-5 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest">
            Our Key Features
          </h2>
          <div className="h-px bg-slate-200 w-12" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {ADMIN_NAV_GROUPS.map((group) => (
            <FeatureCard 
              key={group.id}
              name={group.title}
              icon={group.icon}
              color={group.color}
              onClick={() => onNavigate(group.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

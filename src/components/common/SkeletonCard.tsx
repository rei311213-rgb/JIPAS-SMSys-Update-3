import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="group p-4 bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
        <div className="w-16 h-4 bg-slate-200 rounded-full"></div>
      </div>
      <div>
        <div className="w-3/4 h-4 bg-slate-200 rounded mb-2"></div>
        <div className="w-full h-3 bg-slate-100 rounded"></div>
      </div>
    </div>
  );
}

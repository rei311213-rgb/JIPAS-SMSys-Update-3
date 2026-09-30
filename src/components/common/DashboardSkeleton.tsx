import React from 'react';
import { motion } from 'motion/react';

export default function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3.5 pt-1">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 0.8 }}
          transition={{ 
            repeat: Infinity, 
            duration: 1.2, 
            repeatType: 'reverse',
            delay: i * 0.1 
          }}
          className="p-4 bg-slate-100 rounded-2xl h-40 border border-slate-200 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
            <div className="w-16 h-4 bg-slate-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
            <div className="w-full h-3 bg-slate-200 rounded"></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

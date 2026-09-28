import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Calendar, ChevronRight, MessageSquare, 
  Sparkles, Megaphone, Info, AlertTriangle, CheckCircle2,
  User, Clock, Filter, Search
} from 'lucide-react';
import { Student } from '../../types';
import { supabase } from '../../lib/supabase';
import { getStoredClassBroadcasts } from '../../services/storageService';

interface AnnouncementsFeedProps {
  student: Student;
}

export default function AnnouncementsFeed({ student }: AnnouncementsFeedProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Academic' | 'Events' | 'Fees'>('All');

  useEffect(() => {
    fetchAnnouncements();
  }, [student]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        setAnnouncements(data.map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          category: item.type || 'Academic',
          sentBy: 'Administration',
          sentAt: item.created_at
        })));
      } else {
        const broadcasts = getStoredClassBroadcasts();
        setAnnouncements(broadcasts.map(b => ({
          id: b.id,
          title: `Report Broadcast: ${b.className}`,
          message: b.releaseNotes || 'Report notification dispatched.',
          category: 'Academic',
          sentBy: 'Academic Board',
          sentAt: b.broadcastedAt
        })));
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      const broadcasts = getStoredClassBroadcasts();
      setAnnouncements(broadcasts);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (title: string, message: string) => {
    const t = (title + message).toLowerCase();
    if (t.includes('exam') || t.includes('test') || t.includes('academic')) return <BookOpen className="w-5 h-5" />;
    if (t.includes('fee') || t.includes('payment') || t.includes('arrears')) return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    if (t.includes('holiday') || t.includes('event') || t.includes('party')) return <Sparkles className="w-5 h-5 text-purple-400" />;
    return <Megaphone className="w-5 h-5 text-blue-400" />;
  };

  const filteredAnnouncements = announcements.filter(ann => {
    if (activeCategory === 'All') return true;
    const t = (ann.title + ann.message).toLowerCase();
    if (activeCategory === 'Academic') return t.includes('exam') || t.includes('test') || t.includes('class');
    if (activeCategory === 'Events') return t.includes('event') || t.includes('holiday') || t.includes('break');
    if (activeCategory === 'Fees') return t.includes('fee') || t.includes('payment');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12">
          <Megaphone className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Bell className="text-emerald-400" />
            Institutional Announcements
          </h2>
          <p className="text-emerald-100/70 text-xs mt-1">Stay updated with the latest news, events, and academic alerts.</p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Academic', 'Events', 'Fees'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' 
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/50 animate-pulse h-32 rounded-3xl border border-slate-100" />
              ))}
            </div>
          ) : filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((ann, idx) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                    {getIcon(ann.title, ann.message)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-black text-slate-900 truncate pr-4">{ann.title}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {ann.sentAt?.toDate ? ann.sentAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                      {ann.message}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                          <User className="w-2.5 h-2.5" /> {ann.sentBy || 'Office of Principal'}
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                          Target: {ann.target}
                        </span>
                      </div>
                      
                      <button className="text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read Full Notice <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-800">No Announcements Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">Check back later for school updates, event notices, and academic alerts.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Links / Tips */}
      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
          <Info className="w-4 h-4" />
          Notice Archive
        </div>
        <p className="text-[10px] text-emerald-600/80 leading-relaxed">
          Announcements are retained for 60 days. For older records, please visit the Academic Affairs Office or contact the school administrator.
        </p>
      </div>
    </div>
  );
}

// Internal icons helper
function BookOpen(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

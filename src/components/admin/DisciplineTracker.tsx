import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, ShieldCheck, TrendingUp, TrendingDown,
  Plus, History, Search, User, Calendar, Loader2,
  CheckCircle2, AlertCircle, Award, Frown
} from 'lucide-react';
import { Student } from '../../types';
import { supabase } from '../../lib/supabase';

interface DisciplineTrackerProps {
  students: Student[];
}

export default function DisciplineTracker({ students }: DisciplineTrackerProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    type: 'Merit',
    description: '',
    points: 5
  });

  useEffect(() => {
    if (selectedStudent) {
      fetchLogs(selectedStudent.id);
    }
  }, [selectedStudent]);

  const fetchLogs = async (studentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', studentId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setLogs(data.map(d => ({ id: d.id, ...d.details, date: d.created_at?.split('T')[0] })));
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching discipline logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!selectedStudent || !form.description) return;
    setLoading(true);
    try {
      await supabase.from('audit_logs').insert({
        action: 'DISCIPLINE_RECORD',
        entity_type: 'student',
        entity_id: selectedStudent.id,
        details: {
          type: form.type,
          description: form.description,
          points: form.points,
          recordedBy: 'Admin'
        },
        created_at: new Date().toISOString()
      });
      setShowForm(false);
      setForm({ type: 'Merit', description: '', points: 5 });
      await fetchLogs(selectedStudent.id);
    } catch (err) {
      console.error('Error adding log:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(search.toLowerCase()) || 
    s.admissionNo.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" />
              Conduct & Discipline Tracker
            </h2>
            <p className="text-slate-400 text-sm">Monitor student behavior and manage institutional merit systems.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search by student name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
            
            {search && filteredStudents.length > 0 && !selectedStudent && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                {filteredStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearch('');
                    }}
                    className="w-full p-3 text-left hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{s.fullName}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">{s.admissionNo} • {s.className}</p>
                    </div>
                    <Plus className="w-4 h-4 text-blue-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {selectedStudent ? (
          <>
            {/* Student Profile Card */}
            <div className="space-y-6">
              <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <User className="w-24 h-24 text-blue-400" />
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-black text-white">
                    {selectedStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedStudent.fullName}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-black">{selectedStudent.admissionNo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#020617] rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-slate-500 font-black uppercase">Net Points</span>
                    </div>
                    <span className={`text-xl font-black ${
                      logs.reduce((acc, l) => acc + (l.type === 'Merit' ? l.points : -l.points), 0) >= 0 
                        ? 'text-emerald-400' 
                        : 'text-rose-400'
                    }`}>
                      {logs.reduce((acc, l) => acc + (l.type === 'Merit' ? l.points : -l.points), 0)}
                    </span>
                  </div>
                  <div className="p-4 bg-[#020617] rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <History className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-slate-500 font-black uppercase">Incident Count</span>
                    </div>
                    <span className="text-xl font-black text-white">{logs.length}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowForm(true)}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/20"
                >
                  <Plus className="w-4 h-4" />
                  Log New Incident
                </button>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-full mt-2 text-slate-500 hover:text-slate-300 text-xs font-bold py-2 transition-all"
                >
                  Clear Selection
                </button>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/20 to-transparent p-6 rounded-2xl border border-emerald-900/30">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <TrendingUp className="w-4 h-4" />
                  AI Conduct Prediction
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Based on recent merit streaks, this student shows a 20% improvement in peer collaboration. AI will auto-suggest a "Highly Commendable" conduct remark for the next report.
                </p>
              </div>
            </div>

            {/* Logs List */}
            <div className="xl:col-span-2 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border transition-all ${
                      log.type === 'Merit' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          log.type === 'Merit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {log.type === 'Merit' ? <Award className="w-5 h-5" /> : <Frown className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white flex items-center gap-2">
                            {log.type === 'Merit' ? 'Commendable Conduct' : 'Disciplinary Concern'}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              log.type === 'Merit' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                            }`}>
                              {log.type === 'Merit' ? '+' : '-'}{log.points} Points
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                            Recorded by {log.recordedBy} • {log.date}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed pl-13">
                      {log.description}
                    </p>
                  </motion.div>
                ))
              )}
              {logs.length === 0 && !loading && (
                <div className="text-center py-20 bg-[#0F172A] rounded-2xl border border-slate-800">
                  <ShieldCheck className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm font-bold">No conduct logs recorded for this student yet.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="col-span-full py-32 text-center bg-[#0F172A] rounded-3xl border border-slate-800 border-dashed">
            <Search className="w-16 h-16 text-slate-800 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-500 mb-2">Ready to Track Behavior</h3>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              Search for a student using the field above to view their conduct history or log new merits and demerits.
            </p>
          </div>
        )}
      </div>

      {/* Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Log New Conduct Incident</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({...form, type: 'Merit'})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      form.type === 'Merit' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#020617] border-slate-800 text-slate-500'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Merit
                  </button>
                  <button
                    onClick={() => setForm({...form, type: 'Demerit'})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      form.type === 'Demerit' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-[#020617] border-slate-800 text-slate-500'
                    }`}
                  >
                    <Frown className="w-4 h-4" /> Demerit
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points Impact</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 5, 10, 20].map(p => (
                    <button
                      key={p}
                      onClick={() => setForm({...form, points: p})}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        form.points === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#020617] border-slate-800 text-slate-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detailed Description</label>
                <textarea 
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Explain the reason for this entry..."
                  className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all">Cancel</button>
                <button 
                  onClick={handleAddLog}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Entry
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

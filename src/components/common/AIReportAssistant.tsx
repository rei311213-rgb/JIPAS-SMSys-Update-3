import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, MessageSquare, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { TermReport } from '../../types';

interface AIReportAssistantProps {
  report: TermReport;
  onCommentGenerated: (comment: string) => void;
}

export default function AIReportAssistant({ report, onCommentGenerated }: AIReportAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atRiskAnalysis, setAtRiskAnalysis] = useState<any>(null);

  const generateComment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: report.studentName,
          subjects: report.scores.map(s => ({ subject: s.subject, total: s.total })),
          performanceLevel: report.averageScore >= 80 ? 'Excellent' : (report.averageScore >= 60 ? 'Good' : 'Needs Improvement')
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onCommentGenerated(data.comment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/analyze-at-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentData: {
            name: report.studentName,
            averageScore: report.averageScore,
            scores: report.scores,
            attendance: report.attendancePresent / (report.attendanceTotal || 1)
          }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAtRiskAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#020617] border border-blue-900/30 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Gemini AI Assistant</h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Academic Intelligence Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={generateComment}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
            Generate Remark
          </button>
          
          <button
            onClick={analyzeRisk}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
            Analyze Risk
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {atRiskAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border ${
              atRiskAnalysis.isAtRisk 
                ? 'bg-rose-500/10 border-rose-500/30' 
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Risk Analysis Result</span>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                atRiskAnalysis.riskLevel === 'High' ? 'bg-rose-500 text-white' : (atRiskAnalysis.riskLevel === 'Medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white')
              }`}>
                {atRiskAnalysis.riskLevel} Risk
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">{atRiskAnalysis.reason}</p>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recommended Actions</p>
              {atRiskAnalysis.suggestions.map((s: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <ChevronRight className="w-3 h-3 text-blue-400" />
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400 font-bold"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 p-3 bg-blue-950/20 border border-blue-900/20 rounded-xl">
        <CheckCircle2 className="w-4 h-4 text-blue-400" />
        <p className="text-[10px] text-slate-400 font-medium">
          AI insights are based on available academic data. Final judgment remains with the professional teaching staff.
        </p>
      </div>
    </div>
  );
}

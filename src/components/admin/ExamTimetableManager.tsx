import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, BookOpen, Plus, Edit3, Trash2, Send, CheckCircle2, 
  AlertTriangle, Filter, Search, Printer, Download, Sparkles, Building2, MapPin, UserCheck, X, Check
} from 'lucide-react';
import { ExamScheduleItem, ClassItem, SubjectItem } from '../../types';
import { saveExamSchedule, deleteExamSchedule, subscribeExamSchedules, saveNotification } from '../../services/dbService';
import { supabase } from '../../lib/supabase';

interface ExamTimetableManagerProps {
  classes: ClassItem[];
  subjects: SubjectItem[];
  currentUserRole?: string;
  currentUserName?: string;
}

export default function ExamTimetableManager({
  classes,
  subjects,
  currentUserRole = 'admin',
  currentUserName = 'Administrator'
}: ExamTimetableManagerProps) {
  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedTermFilter, setSelectedTermFilter] = useState('Third Term');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal state for Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamScheduleItem | null>(null);

  // Form fields
  const [formClassName, setFormClassName] = useState(classes[0]?.name || 'Basic 1');
  const [formSubjectName, setFormSubjectName] = useState(subjects[0]?.name || 'Mathematics');
  const [formExamDate, setFormExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('09:00 AM');
  const [formEndTime, setFormEndTime] = useState('11:00 AM');
  const [formVenue, setFormVenue] = useState('Main Exam Hall');
  const [formInvigilator, setFormInvigilator] = useState('Mr. Emmanuel Tetteh');
  const [formTotalMarks, setFormTotalMarks] = useState(100);
  const [formInstructions, setFormInstructions] = useState('Answer all questions. No calculators allowed unless specified.');
  const [formAcademicYear, setFormAcademicYear] = useState('2025-2026');
  const [formTerm, setFormTerm] = useState('Third Term');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsub = subscribeExamSchedules((data) => {
      setSchedules(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormClassName(classes[0]?.name || 'Basic 1');
    setFormSubjectName(subjects[0]?.name || 'Mathematics');
    setFormExamDate(new Date().toISOString().split('T')[0]);
    setFormStartTime('09:00 AM');
    setFormEndTime('11:00 AM');
    setFormVenue('Main Exam Hall');
    setFormInvigilator(currentUserName);
    setFormTotalMarks(100);
    setFormInstructions('Answer all questions. Show all necessary workings.');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: ExamScheduleItem) => {
    setEditingSchedule(item);
    setFormClassName(item.className);
    setFormSubjectName(item.subjectName);
    setFormExamDate(item.examDate);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormVenue(item.venue);
    setFormInvigilator(item.invigilator);
    setFormTotalMarks(item.totalMarks);
    setFormInstructions(item.instructions || '');
    setFormAcademicYear(item.academicYear);
    setFormTerm(item.term);
    setShowModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClassName || !formSubjectName || !formExamDate) {
      showToast('Please fill in all mandatory fields.');
      return;
    }

    const newItem: ExamScheduleItem = {
      id: editingSchedule ? editingSchedule.id : `exam-${Date.now()}`,
      className: formClassName,
      subjectName: formSubjectName,
      examDate: formExamDate,
      startTime: formStartTime,
      endTime: formEndTime,
      venue: formVenue,
      invigilator: formInvigilator,
      totalMarks: Number(formTotalMarks) || 100,
      instructions: formInstructions,
      status: editingSchedule ? editingSchedule.status : 'Scheduled',
      academicYear: formAcademicYear,
      term: formTerm,
      isBroadcasted: editingSchedule ? editingSchedule.isBroadcasted : false,
      broadcastedAt: editingSchedule ? editingSchedule.broadcastedAt : undefined,
      broadcastedBy: editingSchedule ? editingSchedule.broadcastedBy : undefined
    };

    try {
      await saveExamSchedule(newItem);
      showToast(editingSchedule ? 'Exam schedule updated successfully!' : 'New exam scheduled successfully!');
      setShowModal(false);
    } catch (err) {
      showToast('Error saving schedule: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam schedule?')) return;
    try {
      await deleteExamSchedule(id);
      showToast('Exam schedule deleted.');
    } catch (err) {
      showToast('Error deleting schedule.');
    }
  };

  const handleBroadcastSchedule = async (item: ExamScheduleItem) => {
    try {
      const updated: ExamScheduleItem = {
        ...item,
        isBroadcasted: true,
        broadcastedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        broadcastedBy: currentUserName
      };
      await saveExamSchedule(updated);

      // Also create an official communication/announcement for students to see in AnnouncementsFeed
      try {
        await saveNotification({
          id: `exam-broadcast-${Date.now()}`,
          title: `Exam Schedule Alert: ${item.subjectName} (${item.className})`,
          message: `Official Exam Timetable Notice: ${item.subjectName} exam for ${item.className} is scheduled on ${item.examDate} from ${item.startTime} to ${item.endTime} at ${item.venue}. Invigilator: ${item.invigilator}. Instructions: ${item.instructions || 'None'}`,
          type: 'academic',
          recipientGroup: 'student',
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (commsErr) {
        console.warn('Could not post announcement to notifications feed:', commsErr);
      }

      showToast(`Successfully broadcasted exam schedule for ${item.subjectName} to ${item.className} students!`);
    } catch (err) {
      showToast('Error broadcasting schedule.');
    }
  };

  const filteredSchedules = schedules.filter(s => {
    if (selectedClassFilter !== 'All' && s.className !== selectedClassFilter && s.className !== 'All Classes') return false;
    if (selectedTermFilter !== 'All' && s.term !== selectedTermFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.subjectName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.venue.toLowerCase().includes(q) ||
        s.invigilator.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> JIPAS Academic Examination Center
          </span>
          <h2 className="text-2xl font-black mt-1">Exam Timetable & Student Broadcast</h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Schedule examinations across subjects and classes, assign venues and invigilators, and instantly broadcast finalized timetables to student portals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded-xl text-xs font-bold border border-emerald-600/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Timetable
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" /> Schedule New Exam
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject, venue, class, invigilator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Class:
          </div>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">All Classes ({classes.length})</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold ml-2">
            Term:
          </div>
          <select
            value={selectedTermFilter}
            onChange={(e) => setSelectedTermFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">All Terms</option>
            <option value="First Term">First Term</option>
            <option value="Second Term">Second Term</option>
            <option value="Third Term">Third Term</option>
          </select>
        </div>
      </div>

      {/* Schedules List Grid / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scheduled Examination Timetable</h3>
              <p className="text-[11px] text-slate-500">Showing {filteredSchedules.length} examination slots</p>
            </div>
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No Exam Schedules Found</h4>
            <p className="text-xs text-slate-500 mt-1">Get started by clicking "Schedule New Exam" above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-6">Class / Level</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Venue & Invigilator</th>
                  <th className="py-3.5 px-4">Marks & Instructions</th>
                  <th className="py-3.5 px-4 text-center">Broadcast Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {item.className}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{item.term} ({item.academicYear})</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-slate-900 block">{item.subjectName}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        Total Marks: {item.totalMarks}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {item.examDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" /> {item.startTime} - {item.endTime}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> {item.venue}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <UserCheck className="w-3 h-3 text-indigo-500" /> {item.invigilator}
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 italic truncate" title={item.instructions}>
                        "{item.instructions || 'No special instructions'}"
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.isBroadcasted ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Broadcasted
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{item.broadcastedAt}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBroadcastSchedule(item)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 mx-auto"
                          title="Broadcast to Student Portals"
                        >
                          <Send className="w-3 h-3" /> Broadcast Now
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                          title="Edit Schedule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all cursor-pointer"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Examination Management</span>
                <h3 className="text-lg font-black mt-0.5">
                  {editingSchedule ? 'Edit Examination Schedule' : 'Schedule New Examination'}
                </h3>
                <p className="text-xs text-emerald-100">Set date, time, venue and assign to class</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class / Level *</label>
                  <select
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    <option value="All Classes">All Classes (General Exam)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({c.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject Name *</label>
                  <select
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.category})</option>
                    ))}
                    <option value="Mathematics">Mathematics</option>
                    <option value="English Language">English Language</option>
                    <option value="Integrated Science">Integrated Science</option>
                    <option value="Social Studies">Social Studies</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Date *</label>
                  <input
                    type="date"
                    value={formExamDate}
                    onChange={(e) => setFormExamDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Venue *</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Hall / Room 4"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invigilator / Officer *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Emmanuel Tetteh"
                    value={formInvigilator}
                    onChange={(e) => setFormInvigilator(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Marks *</label>
                  <input
                    type="number"
                    value={formTotalMarks}
                    onChange={(e) => setFormTotalMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Term</label>
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Instructions & Guidelines</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Enter exam rules, allowed materials, etc..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

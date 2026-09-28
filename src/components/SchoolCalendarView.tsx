import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, Tag, Plus, Filter, Search, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';

interface SchoolCalendarViewProps {
  events: CalendarEvent[];
  onAddEvent?: (event: CalendarEvent) => void;
  isAdmin?: boolean;
}

export default function SchoolCalendarView({ events, onAddEvent, isAdmin }: SchoolCalendarViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);

  // Month navigation state (default to September 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed (8 = September)

  // New event form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<CalendarEvent['category']>('Academic');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Generate days in month grid
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateString: '' });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(d).padStart(2, '0');
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      days.push({ dayNumber: d, dateString });
    }

    return days;
  };

  const monthDays = getDaysInMonth(currentYear, currentMonth);

  const filteredEvents = events.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ev.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'Holiday':
      case 'Vacation':
        return 'bg-red-100 text-red-800 border-red-300 ring-1 ring-red-200';
      case 'Exam':
        return 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200';
      case 'Academic':
        return 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200';
      case 'Reopening':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200';
      case 'Sports':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300 ring-1 ring-cyan-200';
      case 'Meeting':
        return 'bg-purple-100 text-purple-800 border-purple-300 ring-1 ring-purple-200';
      case 'Cultural':
      case 'Graduation':
        return 'bg-pink-100 text-pink-800 border-pink-300 ring-1 ring-pink-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200';
    }
  };

  const getEventCardBorder = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'Holiday':
      case 'Vacation':
        return 'border-l-4 border-l-red-500 border-slate-200 bg-red-50/10 hover:border-l-red-600';
      case 'Exam':
        return 'border-l-4 border-l-amber-500 border-slate-200 bg-amber-50/10 hover:border-l-amber-600';
      case 'Academic':
        return 'border-l-4 border-l-blue-500 border-slate-200 bg-blue-50/10 hover:border-l-blue-600';
      case 'Reopening':
        return 'border-l-4 border-l-emerald-500 border-slate-200 bg-emerald-50/10 hover:border-l-emerald-600';
      case 'Sports':
        return 'border-l-4 border-l-cyan-500 border-slate-200 bg-cyan-50/10 hover:border-l-cyan-600';
      case 'Meeting':
        return 'border-l-4 border-l-purple-500 border-slate-200 bg-purple-50/10 hover:border-l-purple-600';
      default:
        return 'border-l-4 border-l-blue-500 border-slate-200 bg-blue-50/10 hover:border-l-blue-600';
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    if (onAddEvent) {
      onAddEvent({
        id: `ev-${Date.now()}`,
        title,
        date,
        endDate: endDate || undefined,
        category,
        description,
        location
      });
    }
    setTitle('');
    setDescription('');
    setLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            School Academic Calendar 2026/2027
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visual full-month calendar grid highlighting term dates, holidays, examinations, and school events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Month Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List View
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search events or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          <span className="text-xs font-semibold text-slate-500 mr-2">Filter:</span>
          {['All', 'Academic', 'Holiday', 'Exam', 'Sports', 'Meeting', 'Cultural'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Event Category Color Legend */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
        <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-600" /> Event Category Color Guide:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 border border-red-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Holidays (Red)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Exams & Tests (Amber)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Regular Events (Blue)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Reopening (Emerald)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Meetings (Purple)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span> Sports & Games (Cyan)
          </span>
        </div>
      </div>

      {/* ===================== FULL-MONTH CALENDAR GRID VIEW ===================== */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Month & Year Navigation Header */}
          <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              {monthsList[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(8);
                  setCurrentYear(2026);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center font-bold text-xs text-slate-600 py-3 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
            {monthDays.map((d, idx) => {
              const dayEvents = d.dateString ? filteredEvents.filter(ev => ev.date === d.dateString || (ev.endDate && d.dateString >= ev.date && d.dateString <= ev.endDate)) : [];

              return (
                <div 
                  key={idx} 
                  className={`min-h-[110px] bg-white p-2.5 flex flex-col justify-between transition-colors ${
                    !d.dayNumber ? 'bg-slate-50/60 opacity-40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black ${d.dayNumber === 8 && currentMonth === 8 && currentYear === 2026 ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs' : 'text-slate-800'}`}>
                      {d.dayNumber || ''}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((ev) => (
                      <div 
                        key={ev.id} 
                        title={`${ev.title} (${ev.category})`}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border truncate cursor-pointer shadow-2xs ${getCategoryColor(ev.category)}`}
                      >
                        <span className="font-black mr-1">•</span>{ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ===================== LIST VIEW ===================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className={`bg-white rounded-2xl shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all ${getEventCardBorder(ev.category)}`}>
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryColor(ev.category)}`}>
                    {ev.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {ev.date} {ev.endDate ? `to ${ev.endDate}` : ''}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {ev.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {ev.description}
                </p>
              </div>
              {ev.location && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{ev.location}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 text-slate-500">
          <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-semibold">No calendar events found matching your filter.</p>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add School Calendar Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Science Fair & Exhibition"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CalendarEvent['category'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Academic">Academic</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Exam">Exam</option>
                  <option value="Sports">Sports</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Cultural">Cultural</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Main Hall"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details about the event..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

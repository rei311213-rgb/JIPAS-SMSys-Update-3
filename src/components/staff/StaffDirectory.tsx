import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Filter, Phone, Mail, Building2, Award, 
  ChevronRight, ArrowUpDown, Download, Printer
} from 'lucide-react';
import { Teacher } from '../../types';
import { printContent } from '../../utils/printUtils';

interface StaffDirectoryProps {
  teachers: Teacher[];
  title?: string;
  subtitle?: string;
  isReadOnly?: boolean;
}

export default function StaffDirectory({ 
  teachers, 
  title = 'Faculty & Staff Directory',
  subtitle = 'Official registry of all teaching and administrative staff members.',
  isReadOnly = false
}: StaffDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedRank, setSelectedRank] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'rank' | 'dept'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extract unique departments and ranks for filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => { if (t.department) set.add(t.department); });
    return ['All', ...Array.from(set).sort()];
  }, [teachers]);

  const ranks = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => { if (t.rank) set.add(t.rank); });
    return ['All', ...Array.from(set).sort()];
  }, [teachers]);

  // Filtered and sorted staff list
  const filteredStaff = useMemo(() => {
    let list = teachers.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        t.name.toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.phone || '').includes(q) ||
        (t.staffId || '').toLowerCase().includes(q);
      
      const matchesDept = selectedDepartment === 'All' || t.department === selectedDepartment;
      const matchesRank = selectedRank === 'All' || t.rank === selectedRank;

      return matchesSearch && matchesDept && matchesRank;
    });

    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortBy === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === 'rank') {
        valA = a.rank || '';
        valB = b.rank || '';
      } else if (sortBy === 'dept') {
        valA = a.department || '';
        valB = b.department || '';
      }

      if (sortOrder === 'asc') return valA.localeCompare(valB);
      return valB.localeCompare(valA);
    });

    return list;
  }, [teachers, searchQuery, selectedDepartment, selectedRank, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'rank' | 'dept') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePrintDirectory = () => {
    const html = `
      <div style="font-family: sans-serif; padding: 30px; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px;">
          <h1 style="margin: 0; font-size: 22px; color: #1e3a8a;">JOY INTERNATIONAL SCHOOL (JIPAS)</h1>
          <h2 style="margin: 5px 0; font-size: 16px; color: #475569;">OFFICIAL STAFF DIRECTORY</h2>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">Printed on: ${new Date().toLocaleDateString()} | Total Staff: ${filteredStaff.length}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">Staff Name</th>
              <th style="padding: 10px; text-align: left;">ID / Rank</th>
              <th style="padding: 10px; text-align: left;">Department</th>
              <th style="padding: 10px; text-align: left;">Contact Info</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStaff.map(t => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; font-weight: bold;">${t.name}</td>
                <td style="padding: 10px;">
                  <div>${t.staffId || '--'}</div>
                  <div style="font-size: 9px; color: #64748b;">${t.rank || '--'}</div>
                </td>
                <td style="padding: 10px;">${t.department || '--'}</td>
                <td style="padding: 10px;">
                  <div>${t.phone || '--'}</div>
                  <div style="font-size: 9px; color: #64748b;">${t.email || '--'}</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8;">
          © 2026 JIPAS Students Hub - Internal Faculty Document
        </div>
      </div>
    `;
    printContent(html, 'JIPAS_Staff_Directory');
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
      {/* Directory Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handlePrintDirectory}
              className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Directory</span>
            </button>
            <button
              className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, email or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
            >
              <option value="All">All Ranks</option>
              {ranks.filter(r => r !== 'All').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4">
                <button 
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider hover:text-indigo-600 transition-colors"
                >
                  Staff Member {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="p-4">
                <button 
                  onClick={() => toggleSort('rank')}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider hover:text-indigo-600 transition-colors"
                >
                  Rank & Designation {sortBy === 'rank' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="p-4">
                <button 
                  onClick={() => toggleSort('dept')}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider hover:text-indigo-600 transition-colors"
                >
                  Department {sortBy === 'dept' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Contact Details
              </th>
              {!isReadOnly && <th className="p-4 text-right"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-10 h-10 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">No staff members found matching filters</p>
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedDepartment('All');
                        setSelectedRank('All');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-100 shrink-0 bg-slate-50">
                        {staff.photo ? (
                          <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-black text-xs">
                            {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 leading-none">{staff.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{staff.staffId || 'NO-ID'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-slate-800">{staff.rank || '--'}</div>
                    <div className="text-[10px] text-indigo-600 font-medium mt-0.5">{staff.designation || 'Faculty'}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      {staff.department || 'General'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{staff.phone || '--'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 italic">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[180px]">{staff.email || '--'}</span>
                      </div>
                    </div>
                  </td>
                  {!isReadOnly && (
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer / Summary */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Showing {filteredStaff.length} of {teachers.length} Registry Entries
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Live Registry Database</span>
        </div>
      </div>
    </div>
  );
}

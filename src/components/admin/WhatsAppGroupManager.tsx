import React, { useState } from 'react';
import { 
  MessageCircle, Send, Users, CheckCircle2, Copy, Check, ExternalLink, 
  Plus, Trash2, History, AlertCircle, Share2, Sparkles, Smartphone, Shield,
  Layers, School, Bookmark, Eye
} from 'lucide-react';
import { NotificationItem, Student, WhatsAppGroupItem, WhatsAppLogItem } from '../../types';

interface WhatsAppGroupManagerProps {
  activeModule: string;
  students: Student[];
  notifications?: NotificationItem[];
  onAddNotification?: (notif: NotificationItem) => void;
  onNavigate?: (module: string) => void;
}

export const INITIAL_WHATSAPP_GROUPS: WhatsAppGroupItem[] = [
  { 
    id: 'wag-1', 
    name: 'JIPAS PTA Official Notice Board', 
    category: 'PTA', 
    memberCount: 245, 
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-PTA-Official', 
    description: 'Official school announcements, circulars, and PTA general meeting reminders' 
  },
  { 
    id: 'wag-2', 
    name: 'Class Basic 1 Parents Group', 
    category: 'Class', 
    classAssigned: 'Basic 1', 
    memberCount: 38, 
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-Basic1-Parents', 
    description: 'Homework, daily SBA assignments, and classroom announcements' 
  },
  { 
    id: 'wag-3', 
    name: 'Class Basic 2 Parents Group', 
    category: 'Class', 
    classAssigned: 'Basic 2', 
    memberCount: 42, 
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-Basic2-Parents', 
    description: 'Class notifications and teacher-parent updates for Basic 2' 
  },
  { 
    id: 'wag-4', 
    name: 'JIPAS Teaching Faculty & Staff', 
    category: 'Staff', 
    memberCount: 32, 
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-Staff-Noticeboard', 
    description: 'Academic directives, staff meeting schedules, and CPD workshop notices' 
  },
  { 
    id: 'wag-5', 
    name: 'JHS 1 Candidates & Parents Hub', 
    category: 'Class', 
    classAssigned: 'JHS 1A', 
    memberCount: 45, 
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-JHS1-Hub', 
    description: 'Junior High School syllabus updates, mock exams, and BECE prep guidance' 
  },
  {
    id: 'wag-6',
    name: 'School Bus & Logistics Transport Group',
    category: 'General',
    memberCount: 65,
    inviteLink: 'https://chat.whatsapp.com/invite/JIPAS-Transport',
    description: 'Morning pickup and afternoon drop-off bus scheduling notices'
  }
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLogItem[] = [];

export default function WhatsAppGroupManager({
  activeModule,
  students,
  notifications = [],
  onAddNotification,
  onNavigate
}: WhatsAppGroupManagerProps) {
  const [groups, setGroups] = useState<WhatsAppGroupItem[]>(INITIAL_WHATSAPP_GROUPS);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>(INITIAL_WHATSAPP_LOGS);

  // Broadcast state
  const [selectedGroupId, setSelectedGroupId] = useState<string>(INITIAL_WHATSAPP_GROUPS[0].id);
  const [headline, setHeadline] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'Announcement'>('Announcement');
  const [includePortalLink, setIncludePortalLink] = useState(true);
  const [alsoCreateInAppNotif, setAlsoCreateInAppNotif] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add group modal state
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<'PTA' | 'Class' | 'Staff' | 'General'>('Class');
  const [newGroupClass, setNewGroupClass] = useState('Basic 1');
  const [newGroupLink, setNewGroupLink] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState(30);
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Selected group object
  const targetGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  // Quick Template Injector
  const handleApplyTemplate = (type: string) => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (type === 'fee_reminder') {
      setHeadline('School Fee Settlement Reminder - Term 3');
      setMessage(`Dear Esteemed Parents & Guardians,\n\nThis is a gentle reminder that school fees for the ongoing 3rd Term are due for settlement.\n\nKindly effect payments through the school bursary or approved Mobile Money merchant accounts. Thank you for your continued partnership.`);
      setPriority('Urgent');
    } else if (type === 'exam_results') {
      setHeadline('Terminal Examination Results Release Notice');
      setMessage(`Dear Parents and Students,\n\nOfficial terminal examination marks and broadsheet report cards for the current academic session have been compiled and published on the JIPAS student portal.\n\nParents may log in using student admission numbers to view and print official report cards.`);
      setPriority('Announcement');
    } else if (type === 'pta_meeting') {
      setHeadline('Notice of PTA General Assembly Meeting');
      setMessage(`Notice is hereby served to all parents and guardians regarding our upcoming PTA General Meeting scheduled for this Friday at 9:00 AM prompt in the school auditorium.\n\nKey Agenda:\n1. Academic Performance Review\n2. Next Academic Session Calendar & Tariffs\n3. Campus Infrastructure Upgrades`);
      setPriority('Announcement');
    } else if (type === 'vacation') {
      setHeadline('School Vacation & Next Term Re-opening Dates');
      setMessage(`Dear Parents & Guardians,\n\nThe current school term officially concludes on Friday. Vacation begins immediately thereafter.\n\nThe school will re-open for the next academic term on Tuesday, 15th September 2026.\n\nWe wish all our learners a restful and productive holiday.`);
      setPriority('Normal');
    }
  };

  // Compile formatted WhatsApp message
  const generateFormattedWhatsAppText = () => {
    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jipas.edu.gh';
    const urgencyEmoji = priority === 'Urgent' ? '🚨' : priority === 'Announcement' ? '📢' : '📌';
    
    let text = `${urgencyEmoji} *JIPAS OFFICIAL CIRCULAR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*${headline.toUpperCase() || 'ANNOUNCEMENT'}*\n\n`;
    text += `${message || 'Please review this official notice from school administration.'}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👥 *Audience:* ${targetGroup?.name || 'School Community'}\n`;
    text += `📅 *Date:* ${new Date().toLocaleDateString()}\n`;
    if (includePortalLink) {
      text += `🌐 *Portal:* ${portalUrl}\n`;
    }
    text += `🏛️ *Issued by:* JIPAS Administration`;
    return text;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Copy formatted text
  const handleCopyText = () => {
    const text = generateFormattedWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showToast('WhatsApp announcement formatted text copied to clipboard!');
  };

  // Dispatch to WhatsApp Group
  const handleDispatchWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !message.trim()) {
      alert('Please provide a headline and message content.');
      return;
    }

    const formattedText = generateFormattedWhatsAppText();

    // Create WhatsApp Log entry
    const newLog: WhatsAppLogItem = {
      id: `wal-${Date.now()}`,
      groupName: targetGroup.name,
      groupId: targetGroup.id,
      title: headline,
      message: formattedText,
      dateSent: new Date().toLocaleString(),
      sentBy: 'Marcus Prosper (Admin)',
      status: 'Dispatched',
      memberCount: targetGroup.memberCount
    };

    setLogs(prev => [newLog, ...prev]);

    // Also trigger in-app portal notification if checked
    if (alsoCreateInAppNotif && onAddNotification) {
      onAddNotification({
        id: `notif-${Date.now()}`,
        title: headline,
        message: message,
        targetAudience: targetGroup.category === 'PTA' ? 'Parents & Guardians' : targetGroup.category === 'Staff' ? 'Teaching Staff' : 'All Students & Parents',
        targetClass: targetGroup.classAssigned || 'All Classes',
        dateSent: new Date().toLocaleString(),
        priority: priority === 'Urgent' ? 'High' : 'Normal',
        status: 'Delivered',
        sentBy: 'Administrator via WhatsApp Dispatch'
      });
    }

    // Open WhatsApp Web or Mobile App
    const encodedText = encodeURIComponent(formattedText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');

    showToast(`Notice successfully formatted and opened for dispatch to "${targetGroup.name}"!`);
  };

  // Add new group handler
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGrp: WhatsAppGroupItem = {
      id: `wag-${Date.now()}`,
      name: newGroupName,
      category: newGroupCategory,
      classAssigned: newGroupCategory === 'Class' ? newGroupClass : undefined,
      inviteLink: newGroupLink || `https://chat.whatsapp.com/invite/JIPAS-${Date.now().toString().slice(-4)}`,
      memberCount: Number(newGroupMembers) || 25,
      description: newGroupDesc || 'Active communication channel for JIPAS community'
    };

    setGroups(prev => [...prev, newGrp]);
    setShowAddGroupModal(false);
    setNewGroupName('');
    setNewGroupLink('');
    setNewGroupDesc('');
    showToast(`WhatsApp Group "${newGrp.name}" created and added to school channels!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-xs">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">WhatsApp Group Notification Dispatcher</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  WhatsApp Web & Mobile Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Broadcast instant school circulars, urgent reminders, and report card notices directly into WhatsApp parent and staff groups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('whatsapp_broadcast')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'whatsapp_broadcast' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Compose Broadcast
            </button>
            <button
              onClick={() => onNavigate?.('whatsapp_groups')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'whatsapp_groups' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Groups Directory ({groups.length})
            </button>
            <button
              onClick={() => onNavigate?.('whatsapp_history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'whatsapp_history' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Dispatch Logs ({logs.length})
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="text-white font-black ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* ==================== 1. BROADCAST MODULE ==================== */}
      {(activeModule === 'whatsapp_broadcast' || activeModule === 'notif_whatsapp') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Compose WhatsApp Group Broadcast
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Auto-formatted with WhatsApp Markdown</span>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Load Quick Announcement Template:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'fee_reminder', label: '💳 Fee Reminder' },
                  { id: 'exam_results', label: '📊 Results Released' },
                  { id: 'pta_meeting', label: '👥 PTA General Meeting' },
                  { id: 'vacation', label: '🏖️ Vacation & Reopening' }
                ].map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDispatchWhatsApp} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target WhatsApp Group *</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberCount} members)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notice Urgency / Badge</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-emerald-800"
                  >
                    <option value="Announcement">📢 Announcement (Standard)</option>
                    <option value="Urgent">🚨 Urgent Notice</option>
                    <option value="Normal">📌 Routine Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline / Subject Title *</label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Mandatory PTA Meeting & SBA Results Release"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Official Notice Message Body *</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {message.length} characters
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the message body clearly for WhatsApp group members..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePortalLink}
                    onChange={(e) => setIncludePortalLink(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">
                    Include Direct Student & Parent Portal Web Link in Message
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoCreateInAppNotif}
                    onChange={(e) => setAlsoCreateInAppNotif(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">
                    Synchronize with In-App Portal Notifications Archive
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Text'}</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Dispatch to WhatsApp Group</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Preview (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-100 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Live WhatsApp Chat Simulation
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {targetGroup?.category} Group
              </span>
            </div>

            {/* WhatsApp App Mock Frame */}
            <div className="bg-[#0b141a] rounded-2xl overflow-hidden shadow-xl border border-slate-800">
              {/* WhatsApp Chat Header */}
              <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs">
                    J
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight truncate max-w-[180px]">
                      {targetGroup?.name}
                    </h4>
                    <p className="text-[10px] text-emerald-400">
                      {targetGroup?.memberCount} participants • School Channel
                    </p>
                  </div>
                </div>
                <div className="text-[#aebac1] text-xs">⋮</div>
              </div>

              {/* Chat Canvas with Wallpaper */}
              <div className="bg-[#0b141a] p-4 min-h-[300px] flex flex-col justify-end">
                {/* Message Bubble */}
                <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 max-w-[95%] shadow-md ml-auto text-xs space-y-2 font-sans border border-emerald-600/30">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20 text-[10px] text-emerald-300 font-bold">
                    <span>{priority === 'Urgent' ? '🚨 URGENT' : '📢 CIRCULAR'}</span>
                    <span>JIPAS ADMIN</span>
                  </div>

                  <p className="font-extrabold text-white text-[13px] leading-snug">
                    {headline || 'Notice Headline'}
                  </p>

                  <p className="text-[#d1d7db] text-xs whitespace-pre-wrap leading-relaxed">
                    {message || 'Type message in the form on the left to see instant preview of how it appears on parents\' WhatsApp devices...'}
                  </p>

                  {includePortalLink && (
                    <div className="bg-black/20 p-2 rounded-lg text-[11px] text-emerald-200 border border-emerald-400/20">
                      🌐 <span className="font-bold underline">https://jipas.edu.gh</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-300/80 pt-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[#53bdeb] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Clicking <strong>Dispatch to WhatsApp Group</strong> automatically opens your WhatsApp Web or Desktop application with the target group text pre-filled.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. GROUPS DIRECTORY MODULE ==================== */}
      {activeModule === 'whatsapp_groups' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                School WhatsApp Groups & Channels Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage official school PTA, classroom, staff, and transport group platforms.
              </p>
            </div>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add WhatsApp Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(grp => (
              <div key={grp.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      grp.category === 'PTA' ? 'bg-indigo-100 text-indigo-800' :
                      grp.category === 'Staff' ? 'bg-purple-100 text-purple-800' :
                      grp.category === 'Class' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {grp.category} Channel
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {grp.memberCount} members
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm">{grp.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{grp.description}</p>
                  {grp.classAssigned && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      Class: {grp.classAssigned}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <a
                    href={grp.inviteLink || 'https://chat.whatsapp.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>Open Group</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      if (window.confirm(`Remove WhatsApp group "${grp.name}"?`)) {
                        setGroups(prev => prev.filter(x => x.id !== grp.id));
                        showToast(`Removed "${grp.name}"`);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 3. DISPATCH LOGS MODULE ==================== */}
      {activeModule === 'whatsapp_history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                WhatsApp Group Transmission Archive
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized log of notices, circulars, and announcements dispatched to WhatsApp groups.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Target WhatsApp Group</th>
                  <th className="p-3">Notice Title</th>
                  <th className="p-3 text-center">Audience Reach</th>
                  <th className="p-3">Dispatched By</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-emerald-800 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {log.groupName}
                    </td>
                    <td className="p-3 font-bold text-slate-900 max-w-xs truncate">{log.title}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">
                      {log.memberCount || 35} members
                    </td>
                    <td className="p-3 text-slate-600">{log.sentBy}</td>
                    <td className="p-3 font-mono text-slate-500">{log.dateSent}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const encoded = encodeURIComponent(log.message);
                            window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer"
                          title="Re-open in WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(log.message);
                            showToast('Copied notice text to clipboard!');
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                          title="Copy Message Text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLogs(prev => prev.filter(l => l.id !== log.id))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Log"
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
        </div>
      )}

      {/* Add WhatsApp Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Register New WhatsApp Group
              </h3>
              <button onClick={() => setShowAddGroupModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Class Nursery 1 Parents Group"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Channel Category</label>
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Class">Classroom Group</option>
                    <option value="PTA">PTA Official Group</option>
                    <option value="Staff">Staff Faculty</option>
                    <option value="General">General / Transport</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Members</label>
                  <input
                    type="number"
                    value={newGroupMembers}
                    onChange={(e) => setNewGroupMembers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp Group Invite Link</label>
                <input
                  type="url"
                  value={newGroupLink}
                  onChange={(e) => setNewGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/invite/..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Brief description of group purpose..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

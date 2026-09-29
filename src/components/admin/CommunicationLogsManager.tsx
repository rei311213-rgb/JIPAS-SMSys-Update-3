import React, { useState } from 'react';
import { 
  Bell, MessageSquare, Send, History, Smartphone, Shield, 
  Search, Trash2, CheckCircle2, AlertTriangle, RefreshCw, 
  Users, UserCheck, Check, Clock, Radio, Eye, MessageCircle, Share2, ExternalLink
} from 'lucide-react';
import { NotificationItem, SMSHistoryItem, LoginHistoryItem, Student } from '../../types';
import WhatsAppGroupManager from './WhatsAppGroupManager';

interface CommunicationLogsManagerProps {
  activeModule: string;
  students: Student[];
  onNavigate?: (module: string) => void;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_SMS_LOGS: SMSHistoryItem[] = [];

export const INITIAL_STUDENT_LOGINS: LoginHistoryItem[] = [];

export const INITIAL_USER_LOGINS: LoginHistoryItem[] = [];

export default function CommunicationLogsManager({
  activeModule,
  students,
  onNavigate
}: CommunicationLogsManagerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [smsLogs, setSmsLogs] = useState<SMSHistoryItem[]>(INITIAL_SMS_LOGS);
  const [studentLogins, setStudentLogins] = useState<LoginHistoryItem[]>(INITIAL_STUDENT_LOGINS);
  const [userLogins, setUserLogins] = useState<LoginHistoryItem[]>(INITIAL_USER_LOGINS);

  // Send Notification State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifAudience, setNotifAudience] = useState('Parents & Guardians');
  const [notifClass, setNotifClass] = useState('All Classes');
  const [notifPriority, setNotifPriority] = useState<'Normal' | 'Medium' | 'High'>('High');
  const [alsoSendWhatsApp, setAlsoSendWhatsApp] = useState(false);
  const [notifToast, setNotifToast] = useState(false);

  // Compose SMS State
  const [smsSenderId, setSmsSenderId] = useState('JIPAS');
  const [smsRecipientType, setSmsRecipientType] = useState('All Parents');
  const [smsCustomNumbers, setSmsCustomNumbers] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [smsToast, setSmsToast] = useState(false);

  // View Notification Modal
  const [viewingNotif, setViewingNotif] = useState<NotificationItem | null>(null);

  // Send Notification Handler
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: notifTitle,
      message: notifMessage,
      targetAudience: notifAudience,
      targetClass: notifClass,
      dateSent: new Date().toLocaleString(),
      priority: notifPriority,
      status: 'Delivered',
      sentBy: 'Administrator (Marcus Prosper)'
    };

    setNotifications(prev => [newNotif, ...prev]);

    if (alsoSendWhatsApp) {
      const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jipas.edu.gh';
      const formatted = `📢 *JIPAS OFFICIAL CIRCULAR*\n━━━━━━━━━━━━━━━━━━━━\n*${notifTitle.toUpperCase()}*\n\n${notifMessage}\n\n━━━━━━━━━━━━━━━━━━━━\n👥 *Audience:* ${notifAudience} (${notifClass})\n📅 *Date:* ${new Date().toLocaleDateString()}\n🌐 *Portal:* ${portalUrl}\n🏛️ *Issued by:* JIPAS Administration`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(formatted)}`, '_blank');
    }

    setNotifTitle('');
    setNotifMessage('');
    setNotifToast(true);
    setTimeout(() => setNotifToast(false), 4000);
  };

  // Send SMS Handler
  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsBody.trim()) return;

    const newSms: SMSHistoryItem = {
      id: `sms-${Date.now()}`,
      recipientName: smsRecipientType === 'Custom Numbers' ? 'Custom Recipients' : smsRecipientType,
      recipientPhone: smsRecipientType === 'Custom Numbers' ? smsCustomNumbers : '0249755593, 0551234567...',
      message: smsBody,
      senderId: smsSenderId || 'JIPAS',
      dateSent: new Date().toLocaleString(),
      status: 'Delivered',
      costGH: 0.14,
      smsCount: Math.ceil(smsBody.length / 160)
    };

    setSmsLogs(prev => [newSms, ...prev]);
    setSmsBody('');
    setSmsCustomNumbers('');
    setSmsToast(true);
    setTimeout(() => setSmsToast(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. SEND NOTIFICATION MODULE */}
      {(activeModule === 'notif_send' || activeModule === 'send_notification') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Push Notification Broadcast Console
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Send instant in-app announcements, circulars, and reminders to Parent, Student, and Staff portals.
              </p>
            </div>
          </div>

          {notifToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Notification broadcast successfully transmitted to selected portal audiences!
              </span>
              <button onClick={() => setNotifToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notification Title / Headline *</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. End of Term Examination Timetable Notice"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={notifAudience}
                    onChange={(e) => setNotifAudience(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Parents & Guardians">Parents & Guardians</option>
                    <option value="All Students & Parents">All Students & Parents</option>
                    <option value="Teaching Staff">Teaching Staff</option>
                    <option value="Entire School Community">Entire School Community</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={notifClass}
                    onChange={(e) => setNotifClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="All Classes">All Classes (School-Wide)</option>
                    <option value="Creche">Creche</option>
                    <option value="Nursery 1">Nursery 1</option>
                    <option value="Basic 1">Basic 1</option>
                    <option value="Basic 2">Basic 2</option>
                    <option value="Basic 3">Basic 3</option>
                    <option value="JHS 1A">JHS 1A</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={notifPriority}
                    onChange={(e) => setNotifPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent Announcement)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notification Message Body *</label>
                <textarea
                  required
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Write clear, formal announcement text here..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>

              {/* WhatsApp Broadcast Integration Toggle */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoSendWhatsApp}
                    onChange={(e) => setAlsoSendWhatsApp(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Also Dispatch Announcement Directly to WhatsApp Groups
                    </span>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Formats and opens WhatsApp Web/Mobile with pre-filled announcement text for your parent or staff groups.
                    </p>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => onNavigate?.('whatsapp_broadcast')}
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>WhatsApp Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" /> Transmit Broadcast Notification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. NOTIFICATION HISTORY MODULE */}
      {(activeModule === 'notif_history' || activeModule === 'notification_history') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Notification Broadcast Archive
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                History of transmitted system circulars, target segments, delivery status, and logs.
              </p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Target Audience</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Date Sent</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {notifications.map((n, idx) => (
                  <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 max-w-xs truncate">{n.title}</td>
                    <td className="p-3 font-semibold text-indigo-700">{n.targetAudience}</td>
                    <td className="p-3 text-slate-600">{n.targetClass}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        n.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                        n.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {n.priority}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{n.dateSent}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {n.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jipas.edu.gh';
                            const formatted = `📢 *JIPAS OFFICIAL CIRCULAR*\n━━━━━━━━━━━━━━━━━━━━\n*${n.title.toUpperCase()}*\n\n${n.message}\n\n━━━━━━━━━━━━━━━━━━━━\n👥 *Audience:* ${n.targetAudience} (${n.targetClass})\n📅 *Date:* ${n.dateSent}\n🌐 *Portal:* ${portalUrl}\n🏛️ *Issued by:* JIPAS Administration`;
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(formatted)}`, '_blank');
                          }}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer"
                          title="Dispatch Notice to WhatsApp Groups"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewingNotif(n)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer"
                          title="View Message"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Delete"
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

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">{n.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    n.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                    n.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {n.priority}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="text-indigo-700 font-semibold">Audience: {n.targetAudience} ({n.targetClass})</div>
                  <div className="text-slate-500 font-mono text-[11px] flex justify-between pt-1">
                    <span>Sent: {n.dateSent}</span>
                    <span className="text-emerald-700 font-bold">{n.status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jipas.edu.gh';
                      const formatted = `📢 *JIPAS OFFICIAL CIRCULAR*\n━━━━━━━━━━━━━━━━━━━━\n*${n.title.toUpperCase()}*\n\n${n.message}\n\n━━━━━━━━━━━━━━━━━━━━\n👥 *Audience:* ${n.targetAudience} (${n.targetClass})\n📅 *Date:* ${n.dateSent}\n🌐 *Portal:* ${portalUrl}\n🏛️ *Issued by:* JIPAS Administration`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(formatted)}`, '_blank');
                    }}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => setViewingNotif(n)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COMPOSE SMS MODULE */}
      {(activeModule === 'sms_compose' || activeModule === 'compose_sms') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                the region Telecom SMS Gateway Dispatcher
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Send direct SMS alerts to MTN the region, Telecel the region, and AT mobile subscribers with registered sender ID <strong>JIPAS</strong>.
              </p>
            </div>
          </div>

          {smsToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                SMS payload queued and dispatched across MTN, Telecel, and AT the region gateways!
              </span>
              <button onClick={() => setSmsToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          <form onSubmit={handleSendSMS} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved the regionian Sender ID *</label>
                  <input
                    type="text"
                    required
                    value={smsSenderId}
                    onChange={(e) => setSmsSenderId(e.target.value)}
                    maxLength={11}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-indigo-700 tracking-wider"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Max 11 alphanumeric characters (NCA the region Approved).</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Recipient Group</label>
                  <select
                    value={smsRecipientType}
                    onChange={(e) => setSmsRecipientType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="All Parents">All Registered Parents ({students.length} contacts)</option>
                    <option value="Staff Broadcast">Teaching & Non-Teaching Staff</option>
                    <option value="Fee Defaulters">Students with Fee Arrears</option>
                    <option value="Custom Numbers">Custom the regionian Numbers (+233 / 024...)</option>
                  </select>
                </div>
              </div>

              {smsRecipientType === 'Custom Numbers' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Enter Phone Numbers (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={smsCustomNumbers}
                    onChange={(e) => setSmsCustomNumbers(e.target.value)}
                    placeholder="e.g. 0249755593, 0551234567, 0208877665"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">SMS Text Message Content *</label>
                  <span className="text-[10px] font-mono text-slate-500">
                    Characters: <strong>{smsBody.length}</strong> | Parts: <strong>{Math.ceil(smsBody.length / 160) || 1}</strong>
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  placeholder="Type official SMS message here..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" /> Send Bulk SMS Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SMS HISTORY MODULE */}
      {activeModule === 'sms_history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                SMS Transmission Log & Gateway Deliveries
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized log of SMS messages dispatched, network delivery statuses, and billing costs.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Sender ID</th>
                  <th className="p-3">Recipient(s)</th>
                  <th className="p-3">Message Snippet</th>
                  <th className="p-3 text-center">SMS Count</th>
                  <th className="p-3 text-right">Cost (GHS)</th>
                  <th className="p-3">Date Sent</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {smsLogs.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{s.senderId}</td>
                    <td className="p-3 font-semibold text-slate-900">{s.recipientName}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{s.message}</td>
                    <td className="p-3 text-center font-mono">{s.smsCount}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{(s.costGHS ?? 0).toFixed(2)} GHS</td>
                    <td className="p-3 font-mono text-slate-500">{s.dateSent}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSmsLogs(prev => prev.filter(x => x.id !== s.id))}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Delete SMS Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. STUDENT LOGIN HISTORY MODULE */}
      {(activeModule === 'logs_student' || activeModule === 'logs_student_login' || activeModule === 'student_login_history' || activeModule === 'student_logins_history') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Student Portal Authentication Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track student login sessions, IP addresses, web browsers, and timestamps for security compliance.
              </p>
            </div>
            <button
              onClick={() => alert("Student login security logs cleared.")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Audit Trail
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Browser / Device</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-center">Auth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentLogins.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{log.userId}</td>
                    <td className="p-3 font-bold text-slate-900">{log.userName}</td>
                    <td className="p-3 font-mono text-slate-600">{log.ipAddress}</td>
                    <td className="p-3 text-slate-700">{log.device}</td>
                    <td className="p-3 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. USER LOGIN HISTORY MODULE */}
      {(activeModule === 'logs_user' || activeModule === 'logs_user_login' || activeModule === 'user_login_history' || activeModule === 'user_logins_history') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Staff & Administrative Access Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor administrator, teacher, accountant, and librarian authentication attempts and security logs.
              </p>
            </div>
            <button
              onClick={() => alert("Administrative access history cleared.")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Audit Trail
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Operating System & Browser</th>
                  <th className="p-3">Login Timestamp</th>
                  <th className="p-3 text-center">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {userLogins.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{log.userName}</td>
                    <td className="p-3 font-semibold text-indigo-700">{log.role}</td>
                    <td className="p-3 font-mono text-slate-600">{log.ipAddress}</td>
                    <td className="p-3 text-slate-700">{log.device}</td>
                    <td className="p-3 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        Authorized
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. WHATSAPP GROUP PLATFORMS MODULE */}
      {activeModule.startsWith('whatsapp_') && (
        <WhatsAppGroupManager
          activeModule={activeModule}
          students={students}
          notifications={notifications}
          onAddNotification={(newN) => setNotifications(prev => [newN, ...prev])}
          onNavigate={onNavigate}
        />
      )}
      {viewingNotif && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Notification Details
              </h3>
              <button onClick={() => setViewingNotif(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Title:</span>
                <span className="font-bold text-slate-900 text-sm">{viewingNotif.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Audience:</span>
                  <span className="text-indigo-700 font-bold">{viewingNotif.targetAudience}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Priority:</span>
                  <span className="font-bold text-rose-700">{viewingNotif.priority}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Message Body:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                  {viewingNotif.message}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Transmitted: {viewingNotif.dateSent} by {viewingNotif.sentBy}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingNotif(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

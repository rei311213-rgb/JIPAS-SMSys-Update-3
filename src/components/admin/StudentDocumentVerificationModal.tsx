import React, { useState } from 'react';
import { 
  FileCheck, Shield, CheckCircle2, XCircle, Clock, Upload, Trash2, 
  Eye, FileText, Check, AlertTriangle, X, Sparkles, Download
} from 'lucide-react';
import { Student, StudentDocument } from '../../types';
import { saveStudent } from '../../services/dbService';

interface StudentDocumentVerificationModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated?: (updated: Student) => void;
  currentUser?: any;
}

const STANDARD_DOCUMENT_TYPES: StudentDocument['type'][] = [
  'Birth Certificate',
  'Immunization Record',
  'BECE Results Slip',
  'WASSCE Results Slip',
  'Previous School Report',
  'Transfer Certificate',
  'National ID',
  'Other'
];

export default function StudentDocumentVerificationModal({
  student,
  isOpen,
  onClose,
  onStudentUpdated,
  currentUser
}: StudentDocumentVerificationModalProps) {
  const [documents, setDocuments] = useState<StudentDocument[]>(student.documents || []);
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDocType, setNewDocType] = useState<StudentDocument['type']>('Birth Certificate');
  const [newDocName, setNewDocName] = useState('Official Birth Certificate');
  const [newFileName, setNewFileName] = useState('');
  const [newFileSizeKb, setNewFileSizeKb] = useState(128);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleVerifyDocument = async (docId: string, verified: boolean) => {
    setIsSubmitting(true);
    try {
      const updatedDocs = documents.map(d => {
        if (d.id === docId) {
          return {
            ...d,
            verified,
            verifiedBy: currentUser?.name || 'Administrator',
            verifiedAt: new Date().toISOString(),
            verificationNotes: verified ? 'Verified against official institution register' : 'Verification rejected / document unclear'
          };
        }
        return d;
      });

      const updatedStudent: Student = {
        ...student,
        documents: updatedDocs
      };

      await saveStudent(updatedStudent);
      setDocuments(updatedDocs);
      if (onStudentUpdated) onStudentUpdated(updatedStudent);
      triggerToast(verified ? '✓ Document marked as Verified!' : 'Document marked as Rejected');
    } catch (err: any) {
      alert('Failed to update verification status: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newDoc: StudentDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: newDocName.trim() || newDocType,
        type: newDocType,
        fileName: newFileName.trim() || `${newDocType.toLowerCase().replace(/\s+/g, '_')}_scan.pdf`,
        fileSizeKb: newFileSizeKb || 145,
        uploadedAt: new Date().toISOString(),
        verified: false
      };

      const updatedDocs = [...documents, newDoc];
      const updatedStudent: Student = {
        ...student,
        documents: updatedDocs
      };

      await saveStudent(updatedStudent);
      setDocuments(updatedDocs);
      if (onStudentUpdated) onStudentUpdated(updatedStudent);

      triggerToast('✓ New document attached successfully!');
      setShowAddDocForm(false);
      setNewDocName('');
      setNewFileName('');
    } catch (err: any) {
      alert('Failed to attach document: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to remove this document record?')) return;
    setIsSubmitting(true);
    try {
      const updatedDocs = documents.filter(d => d.id !== docId);
      const updatedStudent: Student = {
        ...student,
        documents: updatedDocs
      };

      await saveStudent(updatedStudent);
      setDocuments(updatedDocs);
      if (onStudentUpdated) onStudentUpdated(updatedStudent);
      triggerToast('Document record deleted');
    } catch (err: any) {
      alert('Failed to delete document: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedCount = documents.filter(d => d.verified).length;
  const isFullyVerified = documents.length > 0 && verifiedCount === documents.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              isFullyVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">Document Verification</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  isFullyVerified 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {verifiedCount}/{documents.length} Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {student.fullName} • Adm No: <span className="font-mono text-slate-700 font-bold">{student.admissionNo || student.id}</span> • Class: {student.className}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Verification Overview Banner */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Statutory Verification Status</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Verify birth records, previous terminal reports, and national identity for Ministry compliance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDocForm(!showAddDocForm)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Attach Document Record
          </button>
        </div>

        {/* Add Document Form */}
        {showAddDocForm && (
          <form onSubmit={handleAddDocument} className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-3 animate-fadeIn text-xs">
            <h5 className="font-bold text-indigo-950 text-xs uppercase tracking-wider">Attach Student Document</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Category *</label>
                <select
                  value={newDocType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNewDocType(val);
                    setNewDocName(val);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  {STANDARD_DOCUMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Label / Name *</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Birth Certificate - Registrar General"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">File Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. birth_cert_official.pdf"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimated Size (KB)</label>
                <input
                  type="number"
                  value={newFileSizeKb}
                  onChange={(e) => setNewFileSizeKb(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDocForm(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Document Record'}
              </button>
            </div>
          </form>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Uploaded & Archived Documents ({documents.length})
          </h4>

          {documents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl p-4">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No documents attached for this student</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Attach Document Record" to add Birth Certificate, BECE Slip, etc.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    doc.verified 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      doc.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.verified ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{doc.name}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {doc.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {doc.fileName || 'document_file.pdf'} {doc.fileSizeKb ? `(${doc.fileSizeKb} KB)` : ''} • Uploaded {doc.uploadedAt?.slice(0, 10)}
                      </p>
                      {doc.verified && doc.verifiedBy && (
                        <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Verified by {doc.verifiedBy} on {doc.verifiedAt?.slice(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!doc.verified ? (
                      <button
                        type="button"
                        onClick={() => handleVerifyDocument(doc.id, true)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve & Verify
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVerifyDocument(doc.id, false)}
                        disabled={isSubmitting}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Revoke verification"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Revoke
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={isSubmitting}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete document record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}

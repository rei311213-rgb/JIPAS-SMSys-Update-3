import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, Package, Search, Filter, Plus, 
  Trash2, Edit3, CheckCircle2, AlertTriangle,
  ArrowRightLeft, User, Calendar, Tag, HardDrive,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AssetLibraryManager() {
  const [view, setView] = useState<'library' | 'assets'>('library');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const table = view === 'library' ? 'library_books' : 'library_books';
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      if (data) {
        setItems(data.map(d => ({
          id: d.id,
          title: d.title,
          author: d.author,
          category: d.category,
          copiesAvailable: d.copies_available,
          copiesTotal: d.copies_total,
          status: d.copies_available > 0 ? 'Available' : 'Borrowed',
          ...d
        })));
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const table = view === 'library' ? 'library_books' : 'library_books';
      const payload = {
        title: formData.title || 'Untitled Book',
        author: formData.author || 'Unknown Author',
        category: formData.category || 'General',
        copies_total: Number(formData.copiesTotal) || 1,
        copies_available: Number(formData.copiesAvailable) || 1,
        created_at: new Date().toISOString()
      };
      await supabase.from(table).insert(payload);
      setShowModal(false);
      setFormData({});
      await fetchData();
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      const table = view === 'library' ? 'library_books' : 'library_books';
      await supabase.from(table).delete().eq('id', id);
      await fetchData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex bg-[#020617] p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setView('library')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
              view === 'library' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Book className="w-4 h-4" />
            Library Catalog
          </button>
          <button 
            onClick={() => setView('assets')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
              view === 'assets' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            School Assets
          </button>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New {view === 'library' ? 'Book' : 'Asset'}
        </button>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                    {view === 'library' ? <Book className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{view === 'library' ? item.title : item.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{view === 'library' ? `by ${item.author}` : item.type}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#020617] rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">
                      {view === 'library' ? 'ISBN' : 'Location'}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{view === 'library' ? item.isbn : item.location}</span>
                  </div>
                  <div className="p-3 bg-[#020617] rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Status</span>
                    <span className={`text-[10px] font-black uppercase ${
                      item.status === 'Available' || item.status === 'Functional' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {view === 'library' && (
                  <button className="w-full py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-500/20">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Checkout to Student
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Add New {view === 'library' ? 'Book' : 'Asset'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {view === 'library' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Book Title</label>
                    <input required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Author</label>
                      <input required onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ISBN</label>
                      <input required onChange={e => setFormData({...formData, isbn: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Name</label>
                    <input required onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                      <select required onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select Type</option>
                        <option value="IT Equipment">IT Equipment</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Lab Tool">Lab Tool</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</label>
                      <input required onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Addition
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Building2, Plus, Users, Search, Bed, ShieldCheck, Printer, 
  CheckCircle2, AlertTriangle, Edit2, Trash2, X, Home
} from 'lucide-react';
import { BoardingRoomItem, Student } from '../../types';
import { getStoredBoardingRooms, saveStoredBoardingRooms } from '../../services/storageService';
import { printContent } from '../../utils/printUtils';
import JIPASLogo, { getSchoolLogo } from '../common/JIPASLogo';

interface BoardingManagerProps {
  students: Student[];
}

export default function BoardingManager({ students }: BoardingManagerProps) {
  const [rooms, setRooms] = useState<BoardingRoomItem[]>(() => getStoredBoardingRooms());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BoardingRoomItem | null>(null);

  // Form State
  const [hallName, setHallName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [gender, setGender] = useState<'Boys' | 'Girls'>('Boys');
  const [houseMaster, setHouseMaster] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [occupied, setOccupied] = useState(0);
  const [status, setStatus] = useState<'Available' | 'Full' | 'Maintenance'>('Available');
  const [campus, setCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setHallName('Excellence Hall');
    setRoomNumber('Room B-101');
    setGender('Boys');
    setHouseMaster('Mr. Emmanuel Tetteh');
    setCapacity(8);
    setOccupied(0);
    setStatus('Available');
    setCampus('JIPAS 1');
    setShowAddModal(true);
  };

  const handleOpenEdit = (room: BoardingRoomItem) => {
    setEditingRoom(room);
    setHallName(room.hallName);
    setRoomNumber(room.roomNumber);
    setGender(room.gender);
    setHouseMaster(room.houseMaster);
    setCapacity(room.capacity);
    setOccupied(room.occupied);
    setStatus(room.status);
    setCampus(room.campus);
    setShowAddModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallName.trim() || !roomNumber.trim()) {
      alert('Please fill in Hall Name and Room Number.');
      return;
    }

    let updated: BoardingRoomItem[];
    if (editingRoom) {
      updated = rooms.map(r => r.id === editingRoom.id ? {
        ...r,
        hallName: hallName.trim(),
        roomNumber: roomNumber.trim(),
        gender,
        houseMaster: houseMaster.trim(),
        capacity: Number(capacity) || 8,
        occupied: Number(occupied) || 0,
        status: Number(occupied) >= Number(capacity) ? 'Full' : status,
        campus
      } : r);
      triggerToast('✓ Boarding room updated successfully!');
    } else {
      const newRoom: BoardingRoomItem = {
        id: `br-${Date.now().toString().slice(-4)}`,
        hallName: hallName.trim(),
        roomNumber: roomNumber.trim(),
        gender,
        houseMaster: houseMaster.trim(),
        capacity: Number(capacity) || 8,
        occupied: Number(occupied) || 0,
        status: Number(occupied) >= Number(capacity) ? 'Full' : status,
        campus
      };
      updated = [...rooms, newRoom];
      triggerToast('✓ New boarding room created!');
    }

    setRooms(updated);
    saveStoredBoardingRooms(updated);
    setShowAddModal(false);
  };

  const handleDeleteRoom = (id: string, roomNum: string) => {
    if (!window.confirm(`Delete boarding room "${roomNum}"?`)) return;
    const updated = rooms.filter(r => r.id !== id);
    setRooms(updated);
    saveStoredBoardingRooms(updated);
    triggerToast('Room deleted');
  };

  const handlePrintBoardingManifest = () => {
    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: 0 auto;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h1 style="margin: 0; font-size: 20px; color: #1e3a8a; text-transform: uppercase;">Joy International School</h1>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Boarding House Room Allocation & Bed Capacity Manifest</p>
          </div>
          <img src="${absoluteLogoSrc}" alt="JIPAS Logo" style="width: 50px; height: 50px; object-fit: contain;" />
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
          <thead>
            <tr style="background: #1e293b; color: white; text-align: left;">
              <th style="padding: 6px 8px;">Hall / Wing</th>
              <th style="padding: 6px 8px;">Room No</th>
              <th style="padding: 6px 8px;">Gender</th>
              <th style="padding: 6px 8px;">House Master / Mistress</th>
              <th style="padding: 6px 8px; text-align: center;">Capacity</th>
              <th style="padding: 6px 8px; text-align: center;">Occupied</th>
              <th style="padding: 6px 8px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rooms.map((r, i) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="padding: 6px 8px; font-weight: bold;">${r.hallName}</td>
                <td style="padding: 6px 8px; font-family: monospace;">${r.roomNumber}</td>
                <td style="padding: 6px 8px;">${r.gender}</td>
                <td style="padding: 6px 8px;">${r.houseMaster}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${r.capacity}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #1e3a8a;">${r.occupied}</td>
                <td style="padding: 6px 8px; text-align: center;">${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>
            <div style="border-bottom: 1px solid #94a3b8; width: 180px; height: 30px;"></div>
            <p style="margin: 4px 0 0 0; font-weight: bold;">Boarding Master Signature</p>
          </div>
          <div>
            <div style="border-bottom: 1px solid #94a3b8; width: 180px; height: 30px;"></div>
            <p style="margin: 4px 0 0 0; font-weight: bold;">Headmaster Seal & Approval</p>
          </div>
        </div>
      </div>
    `;

    printContent(html, 'JIPAS_Boarding_Manifest');
  };

  const filteredRooms = rooms.filter(r => {
    const matchSearch = !searchQuery || 
      r.hallName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.houseMaster.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGender = filterGender === 'All' || r.gender === filterGender;
    return matchSearch && matchGender;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Residential Life & Accommodations</span>
          <h3 className="text-xl font-black text-slate-900">Boarding & Hostel Management</h3>
          <p className="text-xs text-slate-500">Configure residential halls, room allocations, bed capacities, and house masters</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintBoardingManifest}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" /> Print Boarding Manifest
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Add Boarding Room
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-700">Total Rooms</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">{rooms.length} Rooms</h4>
          </div>
          <Building2 className="w-8 h-8 text-purple-600 opacity-70" />
        </div>
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-700">Total Bed Capacity</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {rooms.reduce((acc, r) => acc + r.capacity, 0)} Beds
            </h4>
          </div>
          <Bed className="w-8 h-8 text-indigo-600 opacity-70" />
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700">Occupied Beds</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {rooms.reduce((acc, r) => acc + r.occupied, 0)} Students
            </h4>
          </div>
          <Users className="w-8 h-8 text-emerald-600 opacity-70" />
        </div>
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700">Available Bed Spaces</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {Math.max(0, rooms.reduce((acc, r) => acc + (r.capacity - r.occupied), 0))} Spaces
            </h4>
          </div>
          <Home className="w-8 h-8 text-blue-600 opacity-70" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search boarding rooms by hall name, room number, or house master..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
        >
          <option value="All">All Wings (Boys & Girls)</option>
          <option value="Boys">Boys Wing</option>
          <option value="Girls">Girls Wing</option>
        </select>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                <th className="p-3">Hall / Residence</th>
                <th className="p-3">Room No</th>
                <th className="p-3">Wing</th>
                <th className="p-3">House Master / Mistress</th>
                <th className="p-3 text-center">Bed Capacity</th>
                <th className="p-3 text-center">Occupied</th>
                <th className="p-3 text-center">Availability</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRooms.map((r) => {
                const available = Math.max(0, r.capacity - r.occupied);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{r.hallName}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">{r.roomNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.gender === 'Boys' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.gender}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{r.houseMaster}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{r.capacity} beds</td>
                    <td className="p-3 text-center font-bold text-indigo-700">{r.occupied}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{available} spaces</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 flex items-center justify-center cursor-pointer transition-colors"
                          title="Edit room"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(r.id, r.roomNumber)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">{editingRoom ? 'Edit Boarding Room' : 'Add Boarding Room'}</h3>
                <p className="text-xs text-slate-400">Configure room number, wing, and bed capacity</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Residence Hall / Wing Name *</label>
                <input
                  type="text"
                  required
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  placeholder="e.g. Excellence Hall (Boys Wing)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Room B-102"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wing / Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="Boys">Boys Wing</option>
                    <option value="Girls">Girls Wing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">House Master / Mistress</label>
                <input
                  type="text"
                  value={houseMaster}
                  onChange={(e) => setHouseMaster(e.target.value)}
                  placeholder="e.g. Mr. Emmanuel Tetteh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Occupied Beds</label>
                  <input
                    type="number"
                    value={occupied}
                    onChange={(e) => setOccupied(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="Full">Full</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

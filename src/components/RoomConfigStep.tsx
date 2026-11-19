import React, { useState } from 'react';
import { RoomConfig, AllocationStrategy, Student, ColumnConfig } from '../types/seatPlan';
import { getEffectiveRoomColumns, getRoomCapacity, getRoomTotalBenches } from '../utils/seatAllocator';
import {
  School,
  Plus,
  Trash2,
  Copy,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shuffle,
  Grid3X3,
  Sparkles,
  Sliders,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface Props {
  rooms: RoomConfig[];
  setRooms: React.Dispatch<React.SetStateAction<RoomConfig[]>>;
  strategy: AllocationStrategy;
  setStrategy: (strategy: AllocationStrategy) => void;
  students: Student[];
  onGeneratePlan: () => void;
}

export const RoomConfigStep: React.FC<Props> = ({
  rooms,
  setRooms,
  strategy,
  setStrategy,
  students,
  onGeneratePlan,
}) => {
  // Batch Generator State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState(2);
  const [batchStartNum, setBatchStartNum] = useState(101);
  const [batchBenches, setBatchBenches] = useState(15);
  const [batchStudentsPerBench, setBatchStudentsPerBench] = useState(2);
  const [batchColumns, setBatchColumns] = useState(2);

  // Pre-defined standard Bangladeshi secondary school classes and streams
  const STANDARD_CLASS_OPTIONS = [
    {
      group: 'ষষ্ঠ থেকে অষ্টম শ্রেণী (শাখা ক ও খ)',
      options: [
        { label: 'ষষ্ঠ (ক শাখা)', key: 'ষষ্ঠ - ক' },
        { label: 'ষষ্ঠ (খ শাখা)', key: 'ষষ্ঠ - খ' },
        { label: 'সপ্তম (ক শাখা)', key: 'সপ্তম - ক' },
        { label: 'সপ্তম (খ শাখা)', key: 'সপ্তম - খ' },
        { label: 'অষ্টম (ক শাখা)', key: 'অষ্টম - ক' },
        { label: 'অষ্টম (খ শাখা)', key: 'অষ্টম - খ' },
      ],
      wholeClasses: ['ষষ্ঠ', 'সপ্তম', 'অষ্টম'],
    },
    {
      group: 'নবম ও দশম শ্রেণী (বিভাগ বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা)',
      options: [
        { label: 'নবম (বিজ্ঞান)', key: 'নবম - বিজ্ঞান' },
        { label: 'নবম (মানবিক)', key: 'নবম - মানবিক' },
        { label: 'নবম (ব্যবসায় শিক্ষা)', key: 'নবম - ব্যবসায় শিক্ষা' },
        { label: 'দশম (বিজ্ঞান)', key: 'দশম - বিজ্ঞান' },
        { label: 'দশম (মানবিক)', key: 'দশম - মানবিক' },
        { label: 'দশম (ব্যবসায় শিক্ষা)', key: 'দশম - ব্যবসায় শিক্ষা' },
      ],
      wholeClasses: ['নবম', 'দশম'],
    },
  ];

  // Dynamic available classes from uploaded student list
  const uploadedClassSections = Array.from(
    new Set(students.map((s) => `${s.className} - ${s.section}`))
  );
  const uploadedClasses = Array.from(new Set(students.map((s) => s.className)));

  // Total capacity across all rooms
  const totalSeats = rooms.reduce((acc, r) => acc + getRoomCapacity(r), 0);
  const totalStudents = students.length;
  const seatDeficit = totalStudents - totalSeats;

  // Add single room
  const handleAddRoom = () => {
    const nextNum = 100 + rooms.length + 1;
    const defaultCols: ColumnConfig[] = [
      { columnIndex: 1, columnName: 'কলাম ১ (বাম সারি)', benchCount: 8, studentsPerBench: 2 },
      { columnIndex: 2, columnName: 'কলাম ২ (ডান সারি)', benchCount: 7, studentsPerBench: 2 },
    ];

    const newRoom: RoomConfig = {
      id: `room-${Date.now()}`,
      name: `কক্ষ নং ${nextNum}`,
      benchCount: 15,
      studentsPerBench: 2,
      columnsCount: 2,
      columnConfigs: defaultCols,
      benchOrder: 'column_wise',
    };
    setRooms([...rooms, newRoom]);
  };

  // Duplicate room
  const handleDuplicateRoom = (room: RoomConfig) => {
    const cols = getEffectiveRoomColumns(room);
    const duplicated: RoomConfig = {
      ...room,
      id: `room-${Date.now()}`,
      name: `${room.name} (কপি)`,
      columnConfigs: cols.map((c) => ({ ...c })),
    };
    setRooms([...rooms, duplicated]);
  };

  // Remove room
  const handleRemoveRoom = (id: string) => {
    if (rooms.length <= 1) {
      alert('অন্তত একটি কক্ষ থাকা আবশ্যক।');
      return;
    }
    setRooms(rooms.filter((r) => r.id !== id));
  };

  // Update room field
  const updateRoom = (id: string, field: keyof RoomConfig, value: any) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // Change columns count for a room and initialize column configs
  const handleColumnsCountChange = (room: RoomConfig, newCount: number) => {
    const count = Math.max(1, Math.min(4, newCount));
    const currentCols = getEffectiveRoomColumns(room);
    const totalB = room.benchCount || 15;
    const baseCount = Math.floor(totalB / count);
    const remainder = totalB % count;

    const colNames = ['বাম সারি (১)', 'ডান সারি (২)', 'মাঝের সারি (৩)', 'চতুর্থ সারি (৪)'];
    if (count === 3) {
      colNames[0] = 'বাম সারি (১)';
      colNames[1] = 'মাঝের সারি (২)';
      colNames[2] = 'ডান সারি (৩)';
    }

    const updatedCols: ColumnConfig[] = [];
    for (let c = 1; c <= count; c++) {
      const existing = currentCols.find((col) => col.columnIndex === c);
      const extra = c <= remainder ? 1 : 0;
      updatedCols.push({
        columnIndex: c,
        columnName: existing?.columnName || colNames[c - 1] || `সারি ${c}`,
        benchCount: existing ? existing.benchCount : Math.max(1, baseCount + extra),
        studentsPerBench: existing ? existing.studentsPerBench : room.studentsPerBench || 2,
      });
    }

    const newTotalBenches = updatedCols.reduce((sum, col) => sum + col.benchCount, 0);

    setRooms(
      rooms.map((r) =>
        r.id === room.id
          ? {
              ...r,
              columnsCount: count,
              columnConfigs: updatedCols,
              benchCount: newTotalBenches,
            }
          : r
      )
    );
  };

  // Update specific column benches or students per bench
  const handleUpdateColumn = (
    roomId: string,
    colIndex: number,
    field: 'benchCount' | 'studentsPerBench',
    val: number
  ) => {
    setRooms(
      rooms.map((r) => {
        if (r.id !== roomId) return r;
        const currentCols = getEffectiveRoomColumns(r);
        const updatedCols = currentCols.map((c) =>
          c.columnIndex === colIndex ? { ...c, [field]: Math.max(1, val) } : c
        );
        const newTotalBenches = updatedCols.reduce((sum, c) => sum + c.benchCount, 0);

        return {
          ...r,
          columnConfigs: updatedCols,
          benchCount: newTotalBenches,
        };
      })
    );
  };

  // Toggle class / section filter for a room
  const toggleRoomAllowed = (roomId: string, key: string) => {
    setRooms(
      rooms.map((r) => {
        if (r.id !== roomId) return r;
        const current = r.allowedClasses || [];
        const isSelected = current.includes(key);
        const updated = isSelected ? current.filter((k) => k !== key) : [...current, key];
        return {
          ...r,
          allowedClasses: updated.length > 0 ? updated : undefined,
        };
      })
    );
  };

  // Quick select all classes for a room
  const selectAllClassesForRoom = (roomId: string) => {
    setRooms(
      rooms.map((r) => (r.id === roomId ? { ...r, allowedClasses: undefined } : r))
    );
  };

  // Apply batch generator
  const handleApplyBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoomsList: RoomConfig[] = [];
    const countCols = Math.max(1, Math.min(4, batchColumns));
    const baseColBenches = Math.floor(batchBenches / countCols);
    const remainder = batchBenches % countCols;

    for (let i = 0; i < batchCount; i++) {
      const colConfigs: ColumnConfig[] = [];
      const colNames = ['বাম সারি (১)', 'ডান সারি (২)', 'মাঝের সারি (৩)', 'চতুর্থ সারি (৪)'];
      if (countCols === 3) {
        colNames[0] = 'বাম সারি (১)';
        colNames[1] = 'মাঝের সারি (২)';
        colNames[2] = 'ডান সারি (৩)';
      }

      for (let c = 1; c <= countCols; c++) {
        const extra = c <= remainder ? 1 : 0;
        colConfigs.push({
          columnIndex: c,
          columnName: colNames[c - 1] || `সারি ${c}`,
          benchCount: Math.max(1, baseColBenches + extra),
          studentsPerBench: Math.max(1, Math.min(6, batchStudentsPerBench)),
        });
      }

      newRoomsList.push({
        id: `room-batch-${i}-${Date.now()}`,
        name: `কক্ষ নং ${batchStartNum + i}`,
        benchCount: Math.max(1, batchBenches),
        studentsPerBench: Math.max(1, Math.min(6, batchStudentsPerBench)),
        columnsCount: countCols,
        columnConfigs: colConfigs,
        benchOrder: 'column_wise',
      });
    }
    setRooms(newRoomsList);
    setShowBatchModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Capacity Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-600" />
              কক্ষ, বেঞ্চ ও কলামভিত্তিক আসন কনফিগারেশন
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              কোন কলামে কতটি বেঞ্চ ও প্রতি বেঞ্চে কতজন (১, ২, ৩) শিক্ষার্থী বসবে এবং কোন কক্ষ কোন শ্রেণীর জন্য তা নির্ধারণ করুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              একসাথে একাধিক রুম জেনারেট করুন
            </button>
            <button
              onClick={handleAddRoom}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন কক্ষ যোগ
            </button>
          </div>
        </div>

        {/* Live Capacity Meter */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            totalStudents === 0
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : seatDeficit > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {seatDeficit > 0 ? (
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="font-bold text-sm">
                {totalStudents === 0
                  ? 'এখনও কোনো শিক্ষার্থী আপলোড করা হয়নি।'
                  : seatDeficit > 0
                  ? `আসন সংকট! আরো ${seatDeficit} টি সিট প্রয়োজন`
                  : `পর্যাপ্ত আসন রয়েছে! (উদ্বৃত্ত খালি সিট: ${Math.abs(seatDeficit)} টি)`}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                মোট শিক্ষার্থী: <strong className="font-semibold">{totalStudents} জন</strong> · মোট
                প্রস্তুত আসন: <strong className="font-semibold">{totalSeats} টি</strong> ({rooms.length} টি কক্ষে)
              </div>
            </div>
          </div>

          <button
            onClick={onGeneratePlan}
            disabled={totalStudents === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <span>স্বয়ংক্রিয় সিট প্ল্যান তৈরি করুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Strategy Selector (Anti-Cheating / Interleaving) */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
            সিট বরাদ্দ ও বসার বিন্যাস পদ্ধতি (Seating Arrangement Pattern)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                strategy === 'interleave_classes'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="strategy"
                value="interleave_classes"
                checked={strategy === 'interleave_classes'}
                onChange={() => setStrategy('interleave_classes')}
                className="sr-only"
              />
              <div className="font-semibold text-slate-900 text-xs flex items-center justify-between">
                <span>মিশ্রণ / অল্টারনেট শ্রেণী ও শাখা (Anti-Cheat)</span>
                <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                  সেরা পছন্দ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                একই বেঞ্চের পাশাপাশি সিটে আলাদা শ্রেণী বা শাখার শিক্ষার্থী বসবে (যেমন: ৯ম বিজ্ঞান ও ১০ম বিজ্ঞান)। নকল বন্ধে আদর্শ।
              </p>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                strategy === 'interleave_sections'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="strategy"
                value="interleave_sections"
                checked={strategy === 'interleave_sections'}
                onChange={() => setStrategy('interleave_sections')}
                className="sr-only"
              />
              <div className="font-semibold text-slate-900 text-xs">শাখা মিশ্রণ (Cross-Section)</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                একই শ্রেণীর বিভিন্ন শাখার শিক্ষার্থী পাশাপাশি বসবে (যেমন: ক শাখা ও খ শাখা অল্টারনেট) এবং প্রতি শাখার রোল ১ এর পর ২ এভাবে সম্পূর্ণ ধারাবাহিক থাকবে।
              </p>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                strategy === 'sequential'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="strategy"
                value="sequential"
                checked={strategy === 'sequential'}
                onChange={() => setStrategy('sequential')}
                className="sr-only"
              />
              <div className="font-semibold text-slate-900 text-xs">ধারাবাহিক (Sequential)</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                একটি শ্রেণীর সব রোল শেষ হলে পরবর্তী শ্রেণী শুরু হবে। সাধারণ ও সোজা সাজানো।
              </p>
            </label>
          </div>
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {rooms.map((room, idx) => {
          const effectiveCols = getEffectiveRoomColumns(room);
          const roomCapacity = getRoomCapacity(room);
          const roomTotalBenches = getRoomTotalBenches(room);

          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all overflow-hidden flex flex-col"
            >
              {/* Room Card Header */}
              <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                    className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:border-indigo-600 focus:outline-none px-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 mr-1">
                    মোট আসন: {roomCapacity} টি
                  </div>
                  <button
                    onClick={() => handleDuplicateRoom(room)}
                    title="অনুরূপ আরেকটি কক্ষ তৈরি"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveRoom(room.id)}
                    title="কক্ষটি মুছুন"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Room Card Body */}
              <div className="p-5 space-y-4 flex-1">
                {/* Column Count Selector & Bench Order Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-0.5">
                      বেঞ্চের সারি / কলাম সংখ্যা
                    </label>
                    <span className="text-[11px] text-slate-500 block mb-1">
                      কক্ষে কয়টি কলাম থাকবে
                    </span>
                    <select
                      value={room.columnsCount || 2}
                      onChange={(e) =>
                        handleColumnsCountChange(room, parseInt(e.target.value, 10) || 2)
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value={1}>১ কলাম (একটি লম্বা সারি)</option>
                      <option value={2}>২ কলাম (বাম ও ডান সারি)</option>
                      <option value={3}>৩ কলাম (বাম, মাঝ, ডান সারি)</option>
                      <option value={4}>৪ কলাম (বড় পরীক্ষার হল)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-0.5">
                      বেঞ্চের ক্রমিক নম্বর বিন্যাস
                    </label>
                    <span className="text-[11px] text-slate-500 block mb-1">
                      বেঞ্চ নম্বর দেওয়ার ধারা
                    </span>
                    <select
                      value={room.benchOrder || 'column_wise'}
                      onChange={(e) =>
                        updateRoom(room.id, 'benchOrder', e.target.value as 'column_wise' | 'row_wise')
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value="column_wise">কলাম অনুযায়ী (১, ২, ৩... ধারাবাহিক)</option>
                      <option value="row_wise">সারি অনুযায়ী (১, ২... পাশাপাশি)</option>
                    </select>
                  </div>
                </div>

                {/* Per-Column Custom Benches and Capacity (১, ২, ৩ জন বসার অপশন) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      কলামভিত্তিক বেঞ্চ সংখ্যা ও আসন ক্ষমতা (১, ২, ৩ জন):
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      মোট বেঞ্চ: {roomTotalBenches} টি
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {effectiveCols.map((col) => {
                      const colCapacity = col.benchCount * col.studentsPerBench;
                      return (
                        <div
                          key={col.columnIndex}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                            <span className="font-bold text-xs text-indigo-900">
                              {col.columnName || `কলাম ${col.columnIndex}`}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {colCapacity} সিট
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                বেঞ্চ সংখ্যা
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={col.benchCount}
                                onChange={(e) =>
                                  handleUpdateColumn(
                                    room.id,
                                    col.columnIndex,
                                    'benchCount',
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                প্রতি বেঞ্চে
                              </label>
                              <select
                                value={col.studentsPerBench}
                                onChange={(e) =>
                                  handleUpdateColumn(
                                    room.id,
                                    col.columnIndex,
                                    'studentsPerBench',
                                    parseInt(e.target.value, 10) || 2
                                  )
                                }
                                className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value={1}>১ জন</option>
                                <option value={2}>২ জন</option>
                                <option value={3}>৩ জন</option>
                                <option value={4}>৪ জন</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Class Allocation (ঐচ্ছিক শিক্ষার্থী বরাদ্দ: ষষ্ঠ-অষ্টম ক,খ ও নবম-দশম বিজ্ঞান,মানবিক,ব্যবসায় শিক্ষা) */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        নির্দিষ্ট শ্রেণীর শিক্ষার্থী বরাদ্দ (ঐচ্ছিক):
                      </label>
                      <p className="text-[10px] text-slate-500">
                        এই কক্ষে শুধু নির্বাচিত শ্রেণী/শাখা/বিভাগের শিক্ষার্থীরা বসবে
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectAllClassesForRoom(room.id)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                        !room.allowedClasses || room.allowedClasses.length === 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      সকল শ্রেণী সমন্বিত
                    </button>
                  </div>

                  {/* Standard Class Sections Groups */}
                  {STANDARD_CLASS_OPTIONS.map((grp) => (
                    <div key={grp.group} className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                        <span>{grp.group}:</span>
                        <div className="flex gap-1">
                          {grp.wholeClasses.map((clsName) => {
                            const isWholeSelected = room.allowedClasses?.includes(clsName);
                            return (
                              <button
                                type="button"
                                key={clsName}
                                onClick={() => toggleRoomAllowed(room.id, clsName)}
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold transition-colors ${
                                  isWholeSelected
                                    ? 'bg-indigo-700 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                পুরো {clsName}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {grp.options.map((opt) => {
                          const isSelected = room.allowedClasses?.includes(opt.key) ?? false;
                          return (
                            <button
                              type="button"
                              key={opt.key}
                              onClick={() => toggleRoomAllowed(room.id, opt.key)}
                              className={`px-2 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Any custom uploaded classes not matching standard list */}
                  {uploadedClassSections.some(
                    (cs) =>
                      !STANDARD_CLASS_OPTIONS.some((g) => g.options.some((o) => o.key === cs))
                  ) && (
                    <div className="pt-1">
                      <div className="text-[10px] font-bold text-slate-500 mb-1">
                        অন্যান্য আপলোডকৃত শ্রেণী ও শাখা:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {uploadedClassSections
                          .filter(
                            (cs) =>
                              !STANDARD_CLASS_OPTIONS.some((g) =>
                                g.options.some((o) => o.key === cs)
                              )
                          )
                          .map((cs) => {
                            const isSelected = room.allowedClasses?.includes(cs) ?? false;
                            return (
                              <button
                                type="button"
                                key={cs}
                                onClick={() => toggleRoomAllowed(room.id, cs)}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {cs}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">একসাথে একাধিক কক্ষ তৈরি করুন</h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyBatch} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কক্ষের সংখ্যা (Rooms)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    শুরুর কক্ষ নম্বর
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={batchStartNum}
                    onChange={(e) => setBatchStartNum(parseInt(e.target.value, 10) || 101)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্রতি কক্ষে বেঞ্চ সংখ্যা
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchBenches}
                    onChange={(e) => setBatchBenches(parseInt(e.target.value, 10) || 15)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্রতি বেঞ্চে শিক্ষার্থী
                  </label>
                  <select
                    value={batchStudentsPerBench}
                    onChange={(e) => setBatchStudentsPerBench(parseInt(e.target.value, 10) || 2)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value={1}>১ জন</option>
                    <option value={2}>২ জন</option>
                    <option value={3}>৩ জন</option>
                    <option value={4}>৪ জন</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বেঞ্চের সারি / কলাম
                </label>
                <select
                  value={batchColumns}
                  onChange={(e) => setBatchColumns(parseInt(e.target.value, 10) || 2)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={1}>১ কলাম (একটি লম্বা সারি)</option>
                  <option value={2}>২ কলাম (সাধারণ ক্লাসরুম: বাম ও ডান)</option>
                  <option value={3}>৩ কলাম (বড় হলরুম: বাম, মাঝ, ডান)</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 font-medium">
                তৈরি হবে: {batchCount} টি কক্ষ (কক্ষ {batchStartNum} থেকে{' '}
                {batchStartNum + batchCount - 1}), মোট সিট: {batchCount * batchBenches * batchStudentsPerBench} টি।
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                >
                  কক্ষসমূহ তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

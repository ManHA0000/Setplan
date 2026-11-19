import React, { useState, useMemo } from 'react';
import { SeatAllocation } from '../types/seatPlan';
import { Search, X, MapPin, User, Hash, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allAllocations: SeatAllocation[];
}

export const StudentSearchModal: React.FC<Props> = ({ isOpen, onClose, allAllocations }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAllocations = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return allAllocations.filter((a) => {
      const matchRoll = String(a.student.roll).toLowerCase().includes(term);
      const matchName = a.student.name.toLowerCase().includes(term);
      const matchClass = a.student.className.toLowerCase().includes(term);
      const matchSection = a.student.section.toLowerCase().includes(term);
      return matchRoll || matchName || matchClass || matchSection;
    });
  }, [searchTerm, allAllocations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">পরীক্ষার্থী সিট অনুসন্ধান</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="রোল নম্বর, নাম, বা শ্রেণী লিখে খুঁজুন (যেমন: ১, তানভীর, নবম)..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded"
              >
                মুছুন
              </button>
            )}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {!searchTerm.trim() ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              শিক্ষার্থীর রোল বা নাম লিখে সিটের অবস্থান জানুন।
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              "{searchTerm}" এর জন্য কোনো সিট বরাদ্দ পাওয়া যায়নি।
            </div>
          ) : (
            filteredAllocations.map((alloc) => (
              <div
                key={alloc.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/30 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-base">{alloc.student.name}</span>
                    <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      রোল: {alloc.student.roll}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>শ্রেণী: {alloc.student.className}</span>
                    <span>•</span>
                    <span>শাখা: {alloc.student.section}</span>
                  </div>
                </div>

                <div className="text-right bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs text-indigo-700 font-bold flex items-center gap-1 justify-end">
                    <MapPin className="w-3.5 h-3.5" />
                    {alloc.roomName}{alloc.variantLabel ? ` · ${alloc.variantLabel}` : ''}
                  </div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">
                    বেঞ্চ নং {alloc.benchNumber} · {alloc.seatLabel}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>মোট বরাদ্দকৃত শিক্ষার্থী: {allAllocations.length} জন</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

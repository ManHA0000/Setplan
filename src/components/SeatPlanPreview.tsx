import React, { useState } from 'react';
import { RoomPlan, Student, ExamSettings } from '../types/seatPlan';
import { exportSeatPlanToExcel } from '../utils/excelParser';
import {
  School,
  Printer,
  Download,
  AlertTriangle,
  User,
  Users,
  Grid3X3,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Props {
  roomPlans: RoomPlan[];
  unallocatedStudents: Student[];
  examSettings: ExamSettings;
  onProceedToPrint: () => void;
}

// Color coding helper for different classes so interleaving is immediately obvious
const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'অষ্টম': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  'নবম': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300' },
  'দশম': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  'একাদশ': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  'দ্বাদশ': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  'সপ্তম': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300' },
  'ষষ্ঠ': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
};

const getClassStyle = (className: string) => {
  if (CLASS_COLORS[className]) return CLASS_COLORS[className];
  // Fallback for custom names
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
    { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-300' },
    { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
    { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  ];
  let hash = 0;
  for (let i = 0; i < className.length; i++) hash += className.charCodeAt(i);
  return colors[hash % colors.length];
};

export const SeatPlanPreview: React.FC<Props> = ({
  roomPlans,
  unallocatedStudents,
  examSettings,
  onProceedToPrint,
}) => {
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  if (!roomPlans.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 text-lg">সিট প্ল্যান তৈরি হয়নি</h3>
        <p className="text-xs text-slate-500 mt-1">
          অনুগ্রহ করে প্রথমে শিক্ষার্থী তালিকা ও কক্ষ সংখ্যা নির্ধারণ করে "স্বয়ংক্রিয় সিট প্ল্যান তৈরি করুন" চাপুন।
        </p>
      </div>
    );
  }

  const currentPlan = roomPlans[activeRoomIndex] || roomPlans[0];
  const columnsCount = currentPlan.room.columnsCount || 2;

  // Group benches by columns (e.g. Column 1: Left row, Column 2: Right row)
  const benchesByColumn: Record<number, typeof currentPlan.benches> = {};
  for (let c = 1; c <= columnsCount; c++) {
    benchesByColumn[c] = [];
  }
  currentPlan.benches.forEach((bench) => {
    const col = bench.benchColumn || 1;
    if (!benchesByColumn[col]) benchesByColumn[col] = [];
    benchesByColumn[col].push(bench);
  });

  return (
    <div className="space-y-6">
      {/* Unallocated Students Warning if any */}
      {unallocatedStudents.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">
              সতর্কতা: কক্ষের ধারণক্ষমতা কম হওয়ায় {unallocatedStudents.length} জন শিক্ষার্থী আসন পায়নি!
            </div>
            <p className="text-xs text-amber-800">
              অনুগ্রহ করে ২য় ধাপে গিয়ে আরো কিছু কক্ষ বা বেঞ্চ যোগ করুন যাতে সকল শিক্ষার্থীর সিট বরাদ্দ সম্পন্ন হয়।
            </p>
            <div className="text-xs font-mono bg-white/70 p-2 rounded border border-amber-200 max-h-20 overflow-y-auto">
              {unallocatedStudents.map((s) => `${s.name} (${s.className}, রোল: ${s.roll})`).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              স্বয়ংক্রিয় সিট প্ল্যান ফলাফল (Visual Layout)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              পরীক্ষার হলের বাস্তব বেঞ্চ বিন্যাস এবং কোন সিটে কোন শিক্ষার্থী বসেছে তা নিচে দেখুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSeatPlanToExcel(roomPlans, examSettings)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>এক্সেল ডাউনলোড</span>
            </button>
            <button
              onClick={onProceedToPrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট ও নোটিশ ভিউ</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* Room Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {roomPlans.map((plan, idx) => (
            <button
              key={plan.room.id}
              onClick={() => setActiveRoomIndex(idx)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-2 ${
                activeRoomIndex === idx
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{plan.room.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  activeRoomIndex === idx ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {plan.allocatedCount}/{plan.totalSeats}
              </span>
            </button>
          ))}
        </div>

        {/* Room Summary Notice Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{currentPlan.room.name} : সারসংক্ষেপ</span>
              <span className="text-xs text-slate-500">
                (মোট বেঞ্চ: {currentPlan.benches.length} টি | সিট বরাদ্দ: {currentPlan.allocatedCount} টি | খালি:{' '}
                {currentPlan.totalSeats - currentPlan.allocatedCount} টি)
              </span>
            </div>
          </div>

          {/* Assigned Invigilators for this room */}
          <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 bg-indigo-50/80 rounded-lg border border-indigo-100 text-xs">
            <span className="font-bold text-indigo-900">দায়িত্বপ্রাপ্ত প্রত্যবেক্ষক (২ জন):</span>
            {currentPlan.invigilators.length > 0 ? (
              currentPlan.invigilators.map((inv, i) => (
                <span
                  key={inv.id}
                  className="bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-slate-800 font-semibold shadow-2xs"
                >
                  {i + 1}. {inv.name} <span className="text-slate-500 font-normal">({inv.designation})</span>
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">কোনো প্রত্যবেক্ষক বরাদ্দ নেই</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200 overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">শ্রেণী</th>
                  <th className="py-2 px-3">শাখা / বিভাগ</th>
                  <th className="py-2 px-3">রোল নম্বর তালিকা</th>
                  <th className="py-2 px-3 text-right">মোট পরীক্ষার্থী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPlan.classSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400">
                      এই কক্ষে কোনো শিক্ষার্থী বরাদ্দ নেই।
                    </td>
                  </tr>
                ) : (
                  currentPlan.classSummaries.map((sum, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{sum.className}</td>
                      <td className="py-2 px-3 text-slate-600">{sum.section}</td>
                      <td className="py-2 px-3 font-mono font-medium text-indigo-700">{sum.rollRangeDisplay}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{sum.count} জন</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visual Classroom Layout */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Grid3X3 className="w-4 h-4 text-indigo-600" />
              কক্ষের বাস্তব বেঞ্চ মানচিত্র (Floor Layout)
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden md:inline">
                * পাশাপাশি সিটের ভিন্ন রঙ ভিন্ন শ্রেণী নির্দেশ করে (নকল-রোধী বিন্যাস)
              </span>
              <button
                onClick={onProceedToPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                title="বেঞ্চ মানচিত্র প্রিন্ট অপশনে যান"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>মানচিত্র প্রিন্ট ভিউ</span>
              </button>
            </div>
          </div>

          {/* Blackboard / Teacher Podium Indicator */}
          <div className="w-full py-2 bg-slate-800 text-slate-200 text-center font-bold text-xs rounded-lg shadow-inner tracking-wider border border-slate-700">
            [ সম্মুখভাগ: ব্ল্যাকবোর্ড / শিক্ষকের ডায়াস ]
          </div>

          {/* Classroom Columns Grid */}
          <div
            className={`grid gap-4 pt-2 ${
              columnsCount === 1
                ? 'grid-cols-1'
                : columnsCount === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : columnsCount === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
            }`}
          >
            {Object.keys(benchesByColumn).map((colKey) => {
              const colNum = parseInt(colKey, 10);
              const benches = benchesByColumn[colNum];
              const colConfig = currentPlan.room.columnConfigs?.find((c) => c.columnIndex === colNum);
              const colLabel =
                colConfig?.columnName ||
                (colNum === 1 && columnsCount === 2
                  ? 'বাম সারি (Column 1)'
                  : colNum === 2 && columnsCount === 2
                  ? 'ডান সারি (Column 2)'
                  : `সারি ${colNum}`);

              return (
                <div key={colNum} className="space-y-3">
                  <div className="text-xs font-bold text-slate-600 px-1 flex items-center justify-between border-b border-slate-200 pb-1">
                    <span>{colLabel}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{benches.length} টি বেঞ্চ</span>
                  </div>

                  <div className="space-y-3">
                    {benches.map((bench) => (
                      <div
                        key={bench.benchNumber}
                        className="p-3 bg-slate-50/70 border border-slate-300 rounded-xl hover:border-indigo-400 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-700">বেঞ্চ নং {bench.benchNumber}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ধারণক্ষমতা: {bench.seats.length} জন
                          </span>
                        </div>

                        {/* Seats on this bench */}
                        <div
                          className={`grid gap-2 ${
                            bench.seats.length === 1
                              ? 'grid-cols-1'
                              : bench.seats.length === 2
                              ? 'grid-cols-2'
                              : bench.seats.length === 3
                              ? 'grid-cols-3'
                              : 'grid-cols-2'
                          }`}
                        >
                          {bench.seats.map((seat, seatIdx) => {
                            if (!seat) {
                              return (
                                <div
                                  key={seatIdx}
                                  className="p-2 border border-dashed border-slate-300 rounded-lg text-center bg-white/40"
                                >
                                  <span className="text-[10px] font-medium text-slate-400">খালি আসন</span>
                                </div>
                              );
                            }

                            const clsStyle = getClassStyle(seat.student.className);

                            return (
                              <div
                                key={seat.id}
                                className={`p-2 rounded-lg border ${clsStyle.border} ${clsStyle.bg} flex flex-col justify-between`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${clsStyle.text} bg-white/80 border border-black/5`}
                                    >
                                      {seat.student.className}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-800 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                      রোল: {seat.student.roll}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-xs text-slate-900 truncate">
                                    {seat.student.name}
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-black/5 flex items-center justify-between">
                                  <span>শাখা: {seat.student.section}</span>
                                  <span className="text-slate-400">{seat.seatLabel}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ExamSession, ExamSettings } from '../types/seatPlan';
import {
  RoutineDay,
  DEFAULT_CLASS_SESSIONS,
  DEFAULT_MORNING_SHIFT,
  DEFAULT_AFTERNOON_SHIFT,
  compareClassNames,
  normalizeClassName,
  periodsFromRoutineDays,
  routineDaysFromPeriods,
  shortClass,
  toBnDigits,
} from '../utils/examSchedule';
import { DEFAULT_ROUTINE_DAYS } from '../data/defaultExamRoutine';
import { Calendar, Plus, Trash2, RotateCcw, Sun, Sunset, Info } from 'lucide-react';

interface Props {
  examSettings: ExamSettings;
  setExamSettings: React.Dispatch<React.SetStateAction<ExamSettings>>;
  extraClasses?: string[]; // শিক্ষার্থী তালিকা থেকে পাওয়া শ্রেণী
}

const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

export const RoutineMatrixEditor: React.FC<Props> = ({ examSettings, setExamSettings, extraClasses = [] }) => {
  const initialDays = (): RoutineDay[] => {
    const subjects = examSettings.subjects || [];
    if (subjects.some((s) => s.classSubjects)) return routineDaysFromPeriods(subjects);
    return DEFAULT_ROUTINE_DAYS.map((d) => ({ ...d, subjects: { ...d.subjects } }));
  };

  const [days, setDays] = useState<RoutineDay[]>(initialDays);

  const classSessions: Record<string, ExamSession> = {
    ...DEFAULT_CLASS_SESSIONS,
    ...(examSettings.classSessions || {}),
  };

  // কলামে দেখানো শ্রেণী = রুটিনে থাকা + শিক্ষার্থী তালিকার শ্রেণী (পরীক্ষার আওতাভুক্ত ডিফল্ট ৬-৯)
  const classSet = new Set<string>(['ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম']);
  days.forEach((d) => Object.keys(d.subjects).forEach((c) => classSet.add(normalizeClassName(c))));
  extraClasses.forEach((c) => {
    const n = normalizeClassName(c);
    if (n && Object.keys(classSessions).includes(n)) classSet.add(n);
  });
  const classes = Array.from(classSet).sort(compareClassNames);

  const commit = (nextDays: RoutineDay[], nextSessions: Record<string, ExamSession> = classSessions) => {
    setDays(nextDays);
    setExamSettings((prev) => ({
      ...prev,
      classSessions: nextSessions,
      subjects: periodsFromRoutineDays(nextDays, nextSessions),
    }));
  };

  const updateDay = (idx: number, patch: Partial<RoutineDay>) => {
    commit(days.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const updateSubject = (idx: number, cls: string, value: string) => {
    commit(days.map((d, i) => (i === idx ? { ...d, subjects: { ...d.subjects, [cls]: value } } : d)));
  };

  const addDay = () => {
    const last = days[days.length - 1];
    const nextNo = (last?.dayNo || 0) + 1;
    commit([...days, { dayNo: nextNo, date: '', day: '', subjects: {} }]);
  };

  const removeDay = (idx: number) => {
    if (!confirm('এই দিনের রুটিন মুছে ফেলবেন?')) return;
    const next = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNo: i + 1 }));
    commit(next);
  };

  const setSession = (cls: string, session: ExamSession) => {
    commit(days, { ...classSessions, [cls]: session });
  };

  const resetDefault = () => {
    if (!confirm('ডিফল্ট রুটিন (নাঙ্গলকোট বার্ষিক পরীক্ষা-২০২৬) লোড করবেন? বর্তমান রুটিন বদলে যাবে।')) return;
    const fresh = DEFAULT_ROUTINE_DAYS.map((d) => ({ ...d, subjects: { ...d.subjects } }));
    commit(fresh, { ...DEFAULT_CLASS_SESSIONS });
  };

  const morningClasses = classes.filter((c) => classSessions[c] === 'morning');
  const afternoonClasses = classes.filter((c) => classSessions[c] !== 'morning');
  const periodCount = (examSettings.subjects || []).length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              পরীক্ষার রুটিন (সকাল / বিকাল শিফটসহ)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              প্রতি দিনের জন্য প্রতিটি শ্রেণীর বিষয় লিখুন। ঘর খালি রাখলে ঐ দিন ঐ শ্রেণীর পরীক্ষা নেই (✕)।
              সফটওয়্যার স্বয়ংক্রিয়ভাবে সকাল ও বিকাল শিফট আলাদা করে ডিউটি রোস্টার, সিট প্ল্যান ও হাজিরা তৈরি করবে।
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetDefault}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              ডিফল্ট রুটিন লোড
            </button>
            <button
              onClick={addDay}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন দিন যোগ
            </button>
          </div>
        </div>

        {/* শিফট সময় */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-900 shrink-0">সকাল শিফট সময়:</span>
            <input
              value={examSettings.morningShift ?? DEFAULT_MORNING_SHIFT}
              onChange={(e) => setExamSettings((p) => ({ ...p, morningShift: e.target.value }))}
              className="flex-1 text-xs px-2 py-1.5 border border-amber-300 rounded bg-white min-w-0"
            />
          </label>
          <label className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/60 flex items-center gap-2">
            <Sunset className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-indigo-900 shrink-0">বিকাল শিফট সময়:</span>
            <input
              value={examSettings.afternoonShift ?? DEFAULT_AFTERNOON_SHIFT}
              onChange={(e) => setExamSettings((p) => ({ ...p, afternoonShift: e.target.value }))}
              className="flex-1 text-xs px-2 py-1.5 border border-indigo-300 rounded bg-white min-w-0"
            />
          </label>
        </div>

        {/* শ্রেণী → শিফট */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-xs font-bold text-slate-700 mb-2">কোন শ্রেণী কোন শিফটে পরীক্ষা দেবে:</div>
          <div className="flex flex-wrap gap-3">
            {classes.map((c) => (
              <div key={c} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-bold text-slate-800">{shortClass(c)} শ্রেণী</span>
                <select
                  value={classSessions[c] || 'morning'}
                  onChange={(e) => setSession(c, e.target.value as ExamSession)}
                  className="text-xs px-1.5 py-1 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="morning">সকাল</option>
                  <option value="afternoon">বিকাল</option>
                </select>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            সকাল: {morningClasses.map(shortClass).join(', ') || '—'} &nbsp;|&nbsp; বিকাল:{' '}
            {afternoonClasses.map(shortClass).join(', ') || '—'} &nbsp;|&nbsp; মোট পরীক্ষা-বেলা (পিরিয়ড): {periodCount} টি
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold">
              <tr>
                <th className="py-2.5 px-2 w-14 border-r border-slate-200">দিন</th>
                <th className="py-2.5 px-2 w-32 border-r border-slate-200">তারিখ</th>
                <th className="py-2.5 px-2 w-28 border-r border-slate-200">বার</th>
                {classes.map((c) => (
                  <th key={c} className="py-2.5 px-2 min-w-[150px] border-r border-slate-200">
                    <div>{shortClass(c)} শ্রেণী</div>
                    <div
                      className={`text-[10px] font-bold mt-0.5 inline-block px-2 py-0.5 rounded ${
                        classSessions[c] === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {classSessions[c] === 'morning' ? 'সকাল' : 'বিকাল'}
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((d, idx) => (
                <tr key={idx} className="align-top hover:bg-slate-50/60">
                  <td className="py-2 px-2 text-center font-bold text-indigo-700 border-r border-slate-100">
                    {toBnDigits(d.dayNo)}
                  </td>
                  <td className="py-1.5 px-1.5 border-r border-slate-100">
                    <input
                      value={d.date}
                      placeholder="১৯-১১-২০২৬"
                      onChange={(e) => updateDay(idx, { date: e.target.value })}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </td>
                  <td className="py-1.5 px-1.5 border-r border-slate-100">
                    <input
                      list="weekday-list"
                      value={d.day}
                      placeholder="বার"
                      onChange={(e) => updateDay(idx, { day: e.target.value })}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </td>
                  {classes.map((c) => (
                    <td key={c} className="py-1.5 px-1.5 border-r border-slate-100">
                      <textarea
                        rows={2}
                        value={d.subjects[c] || ''}
                        placeholder="✕ (পরীক্ষা নেই)"
                        onChange={(e) => updateSubject(idx, c, e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded resize-none leading-snug ${
                          d.subjects[c]?.trim() ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50'
                        }`}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-1 text-center">
                    <button
                      onClick={() => removeDay(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                      title="দিন মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="weekday-list">
            {WEEKDAYS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          রুটিন বদলালে সিট প্ল্যান ভ্যারিয়েন্ট (যেমন "বিকাল: শুধু ৯ম শ্রেণী") ও ডিউটি রোস্টার নিজে নিজে হালনাগাদ হয়।
          একই শিফটে একই শ্রেণী-সেটের পরীক্ষার জন্য একটি সিট প্ল্যান ব্যবহার হয় — "সিট নিয়ম" ট্যাবে সেটি সাজান।
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  RoomPlan,
  ExamSettings,
  Invigilator,
  ExamSubject,
  SeatAllocation,
  Student,
  StaffMember,
  ExamExpenses,
  CommitteeMember,
  DutyOverride,
  RoomConfig,
  FullDutyRoster,
  ExamSession,
} from '../types/seatPlan';
import {
  getShiftText,
  getSubjectForClass,
  routineDaysFromPeriods,
  compareClassNames,
  shortClass,
  getClassSession,
  toBnDigits,
} from '../utils/examSchedule';
import { exportSeatPlanToExcel } from '../utils/excelParser';
import { DEFAULT_EXAM_ROUTINE } from '../data/defaultExamRoutine';
import { DEFAULT_EXAM_EXPENSES, SAMPLE_STAFF, SAMPLE_COMMITTEE } from '../data/sampleStaff';
import { generateCyclicDutyRoster } from '../utils/dutyRosterGenerator';
import { formatRollRanges, compareRolls } from '../utils/seatAllocator';
import {
  Printer,
  FileText,
  Tag,
  ClipboardList,
  Download,
  School,
  UserCheck,
  Calendar,
  Layers,
  RotateCw,
  Filter,
  CheckCircle2,
  Users,
  Receipt,
  DollarSign,
  Crown,
  Award,
  Grid3X3,
} from 'lucide-react';

interface Props {
  roomPlans: RoomPlan[];
  examSettings: ExamSettings;
  teachers?: Invigilator[];
  staff?: StaffMember[];
  expenses?: ExamExpenses;
  committee?: CommitteeMember[];
  dutyOverrides?: DutyOverride[];
  // --- শিফট / ভ্যারিয়েন্ট ভিত্তিক ---
  variantLabel?: string;
  variantSession?: ExamSession;
  variantPeriods?: ExamSubject[]; // এই সিট প্ল্যানের আওতাভুক্ত পরীক্ষার পিরিয়ড
  cyclicRoster?: FullDutyRoster; // App থেকে আসা চূড়ান্ত রোস্টার (শিফটভিত্তিক)
  allRooms?: RoomConfig[];
}

export type PrintMode =
  | 'attendance'
  | 'duties'
  | 'notices'
  | 'floor_layout'
  | 'routine'
  | 'stickers'
  | 'master'
  | 'expenses';

// Helper to determine clean Bengali group/department descriptor
export const getStudentGroupInfo = (student: Student) => {
  const sec = (student.section || '').trim();
  const grp = (student.group || '').trim();
  const raw = grp || sec || 'সাধারণ';

  let department = raw;
  if (raw === 'বিজ্ঞান' || raw.includes('বিজ্ঞান')) department = 'বিজ্ঞান বিভাগ';
  else if (raw === 'মানবিক' || raw.includes('মানবিক')) department = 'মানবিক বিভাগ';
  else if (raw === 'ব্যবসায়' || raw.includes('ব্যবসায়') || raw.includes('বাণিজ্য'))
    department = 'ব্যবসায় শিক্ষা বিভাগ';
  else if (raw === 'ক' || raw.toLowerCase() === 'a') department = 'ক শাখা';
  else if (raw === 'খ' || raw.toLowerCase() === 'b') department = 'খ শাখা';

  const groupKey = `${student.className} - ${department}`;
  return {
    groupKey,
    className: student.className,
    department,
    raw,
  };
};

export const PrintTemplates: React.FC<Props> = ({
  roomPlans,
  examSettings,
  teachers = [],
  staff = SAMPLE_STAFF,
  expenses = DEFAULT_EXAM_EXPENSES,
  committee = SAMPLE_COMMITTEE,
  dutyOverrides = [],
  variantLabel,
  variantSession,
  variantPeriods,
  cyclicRoster: cyclicRosterProp,
  allRooms,
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>('attendance');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');

  // Attendance Sheet Configuration
  const [attendanceLayout, setAttendanceLayout] = useState<'multi_subject' | 'single_subject'>(
    'multi_subject'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [attendanceGroupFilter, setAttendanceGroupFilter] = useState<string>('GROUPED_PAGES');

  // Duty Roster Print Configuration
  const [dutyPrintFormat, setDutyPrintFormat] = useState<
    'routine_matrix' | 'daily_sheets' | 'teacher_slips' | 'single_day'
  >('routine_matrix');
  const [selectedDutyDate, setSelectedDutyDate] = useState<string>('ALL');

  // Expense & Remuneration Print Configuration
  const [expensePrintFilter, setExpensePrintFilter] = useState<
    'all' | 'committee' | 'teachers' | 'staff' | 'budget_statement'
  >('all');

  // Room Notice Sheet Configuration (৩. কক্ষ নোটিশ শিট - ফন্ট বড় ও পেজ ল্যান্ডস্কেপ অপশন)
  const [noticeFontSize, setNoticeFontSize] = useState<'normal' | 'large' | 'extra_large'>('large');
  const [noticeOrientation, setNoticeOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Floor Layout Configuration (বাস্তব বেঞ্চ মানচিত্র)
  const [floorLayoutOrientation, setFloorLayoutOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [floorLayoutDensity, setFloorLayoutDensity] = useState<'spacious' | 'compact'>('spacious');

  const examSubjects: ExamSubject[] =
    examSettings.subjects && examSettings.subjects.length > 0
      ? examSettings.subjects
      : DEFAULT_EXAM_ROUTINE;

  // Generate Cyclic Duty Roster across the entire exam routine
  const localRoster = useMemo(() => {
    const rooms = roomPlans.map((p) => p.room);
    return generateCyclicDutyRoster(rooms, teachers, examSubjects, dutyOverrides || []);
  }, [roomPlans, teachers, examSubjects, dutyOverrides]);
  const cyclicRoster: FullDutyRoster = cyclicRosterProp || localRoster;
  const matrixRooms: RoomConfig[] = allRooms && allRooms.length ? allRooms : roomPlans.map((p) => p.room);

  // এই সিট প্ল্যানের পিরিয়ডসমূহ (হাজিরা শিটে শুধু এগুলোই আসবে)
  const attendanceSubjects: ExamSubject[] =
    variantPeriods && variantPeriods.length > 0 ? variantPeriods : examSubjects;
  const shiftText = getShiftText(examSettings, variantSession);
  const [invPeriodId, setInvPeriodId] = useState<string>('');

  // Extract all distinct groups across student allocations for the filter dropdown
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    roomPlans.forEach((plan) => {
      plan.allocations.forEach((alloc) => {
        const info = getStudentGroupInfo(alloc.student);
        set.add(info.department);
      });
    });
    return Array.from(set).sort();
  }, [roomPlans]);

  if (!roomPlans.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center no-print">
        <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 text-lg">সিট প্ল্যান তৈরি হয়নি</h3>
        <p className="text-xs text-slate-500 mt-1">প্রিন্ট করার জন্য প্রথমে সিট প্ল্যান জেনারেট করুন।</p>
      </div>
    );
  }

  const filteredPlans =
    selectedRoomId === 'ALL'
      ? roomPlans
      : roomPlans.filter((p) => p.room.id === selectedRoomId);

  const handlePrint = () => {
    window.print();
  };

  const activeSingleSubject =
    attendanceSubjects.find((s) => s.id === selectedSubjectId) || attendanceSubjects[0];
  const invPeriod = attendanceSubjects.find((s) => s.id === invPeriodId) || attendanceSubjects[0];

  // নির্দিষ্ট পিরিয়ডে কক্ষের প্রত্যবেক্ষক (রোস্টার থেকে); পিরিয়ড না থাকলে fallback
  const getRoomInvs = (roomId: string, periodId: string | undefined, fallback: Invigilator[]): Invigilator[] => {
    if (!periodId) return fallback;
    const day = cyclicRoster.daySchedules.find((d) => d.dateId === periodId);
    if (!day) return fallback;
    const rd = day.roomDuties.find((r) => r.room.id === roomId);
    return rd ? rd.invigilators : [];
  };

  const dateRangeText = (() => {
    if (!attendanceSubjects.length) return examSettings.examDate || '';
    const f = attendanceSubjects[0].date;
    const l = attendanceSubjects[attendanceSubjects.length - 1].date;
    return f === l ? f : `${f} – ${l}`;
  })();

  const activePageOrientation: 'portrait' | 'landscape' =
    printMode === 'notices'
      ? noticeOrientation
      : printMode === 'floor_layout'
      ? floorLayoutOrientation
      : 'portrait';

  const noticeStyles = useMemo(() => {
    switch (noticeFontSize) {
      case 'extra_large':
        return {
          cardWidth: noticeOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl',
          cardPadding: 'p-8 md:p-12',
          schoolName: 'text-3xl md:text-4xl font-black text-slate-900',
          examName: 'text-lg md:text-xl font-bold text-slate-700 mt-1',
          metaText: 'text-sm font-semibold text-slate-600 mt-2',
          noticeBadge:
            'mt-3 inline-block px-8 py-2.5 bg-slate-900 text-white font-black text-lg md:text-xl tracking-wider rounded uppercase print:bg-slate-900 print:text-white',
          teachersBox: 'mb-6 p-4 border-2 border-slate-800 rounded bg-slate-50/80 text-sm text-slate-800',
          teachersTitle:
            'font-black text-sm uppercase border-b border-slate-300 pb-1.5 mb-2 flex justify-between',
          teacherName: 'text-base md:text-lg font-black text-slate-900',
          teacherDesig: 'text-slate-600 block text-xs md:text-sm font-medium',
          summaryTitle: 'text-sm md:text-base font-black text-slate-900 mb-2.5 flex justify-between',
          tableHead: 'border border-slate-800 py-3 px-3 md:px-4 text-xs md:text-sm font-black',
          tableCell: 'border border-slate-800 py-3 px-3 md:px-4 text-xs md:text-base font-bold',
          rollRange:
            'border border-slate-800 py-3 px-3 md:px-4 font-mono font-black text-base md:text-xl text-indigo-950 tracking-wide',
          signatures:
            'pt-10 flex justify-between items-end text-sm md:text-base font-bold text-slate-800 avoid-break',
          signatureLine: 'w-48 border-t-2 border-slate-800 pt-1.5',
        };
      case 'large':
        return {
          cardWidth: noticeOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-3xl',
          cardPadding: 'p-8 md:p-10',
          schoolName: 'text-2xl md:text-3xl font-black text-slate-900',
          examName: 'text-base md:text-lg font-bold text-slate-700 mt-1',
          metaText: 'text-xs md:text-sm font-medium text-slate-600 mt-2',
          noticeBadge:
            'mt-3 inline-block px-7 py-2 bg-slate-900 text-white font-black text-base md:text-lg tracking-wide rounded uppercase print:bg-slate-900 print:text-white',
          teachersBox: 'mb-5 p-3.5 border-2 border-slate-800 rounded bg-slate-50/70 text-xs md:text-sm text-slate-800',
          teachersTitle:
            'font-bold text-xs md:text-sm uppercase border-b border-slate-300 pb-1 mb-2 flex justify-between',
          teacherName: 'text-sm md:text-base font-black text-slate-900',
          teacherDesig: 'text-slate-600 block text-xs font-medium',
          summaryTitle: 'text-xs md:text-sm font-bold text-slate-800 mb-2 flex justify-between',
          tableHead: 'border border-slate-800 py-2.5 px-3 md:px-3.5 text-xs md:text-sm font-bold',
          tableCell: 'border border-slate-800 py-2.5 px-3 md:px-3.5 text-xs md:text-sm font-semibold',
          rollRange:
            'border border-slate-800 py-2.5 px-3 md:px-3.5 font-mono font-black text-sm md:text-lg text-indigo-950 tracking-wide',
          signatures:
            'pt-8 flex justify-between items-end text-xs md:text-sm font-bold text-slate-800 avoid-break',
          signatureLine: 'w-40 border-t border-slate-800 pt-1',
        };
      case 'normal':
      default:
        return {
          cardWidth: noticeOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-3xl',
          cardPadding: 'p-8 md:p-10',
          schoolName: 'text-2xl font-bold tracking-tight text-slate-900',
          examName: 'text-base font-semibold text-slate-700 mt-1',
          metaText: 'text-xs text-slate-600 mt-2 font-medium',
          noticeBadge:
            'mt-3 inline-block px-6 py-1.5 bg-slate-900 text-white font-bold text-sm tracking-wide rounded uppercase print:bg-slate-900 print:text-white',
          teachersBox: 'mb-4 p-3 border-2 border-slate-800 rounded bg-slate-50/70 text-xs text-slate-800',
          teachersTitle:
            'font-bold text-xs uppercase border-b border-slate-300 pb-1 mb-1.5 flex justify-between',
          teacherName: 'text-xs md:text-sm font-bold',
          teacherDesig: 'text-slate-600 block text-[11px]',
          summaryTitle: 'text-xs font-bold text-slate-800 mb-2 flex justify-between',
          tableHead: 'border border-slate-800 py-2 px-3 text-xs font-bold',
          tableCell: 'border border-slate-800 py-2 px-3 text-xs',
          rollRange:
            'border border-slate-800 py-2 px-3 font-mono font-bold text-xs md:text-sm text-indigo-900',
          signatures: 'pt-8 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break',
          signatureLine: 'w-36 border-t border-slate-800 pt-1',
        };
    }
  }, [noticeFontSize, noticeOrientation]);

  return (
    <div className="space-y-6">
      {/* Dynamic Print Page Media Query for Orientation */}
      <style>{`
        @media print {
          @page {
            size: ${activePageOrientation};
            margin: 10mm;
          }
        }
      `}</style>
      {/* On-Screen Print Configuration Bar (Hidden during actual print) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              প্রিন্ট ও রিপোর্ট সেন্টার (Print & Export Hub)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              একই কক্ষের গ্রুপভিত্তিক শিক্ষার্থী হাজিরা শিট এবং পরিক্ষাসূচীর পূর্ণাঙ্গ সাইক্লিক ডিউটি রোস্টার প্রিন্ট করুন
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
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (Print / PDF)</span>
            </button>
          </div>
        </div>

        {/* Print Category Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => setPrintMode('attendance')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'attendance'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">১. স্বাক্ষর ও হাজিরা শিট</div>
            <div className="text-[10px] text-slate-500">গ্রুপ ফিল্টার ও বিষয়</div>
          </button>

          <button
            onClick={() => setPrintMode('duties')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'duties'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">২. প্রত্যবেক্ষক রোস্টার</div>
            <div className="text-[10px] text-slate-500">সাইক্লিক ডিউটি তালিকা</div>
          </button>

          <button
            onClick={() => setPrintMode('notices')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'notices'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৩. কক্ষ নোটিশ শিট</div>
            <div className="text-[10px] text-slate-500">ফন্ট বড় ও ল্যান্ডস্কেপ</div>
          </button>

          <button
            onClick={() => setPrintMode('floor_layout')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'floor_layout'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৪. বাস্তব বেঞ্চ মানচিত্র</div>
            <div className="text-[10px] text-slate-500">ফ্লোর লেআউট ও সিট ম্যাপ</div>
          </button>

          <button
            onClick={() => setPrintMode('routine')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'routine'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৫. পরীক্ষার সময়সূচী</div>
            <div className="text-[10px] text-slate-500">পূর্ণাঙ্গ পরীক্ষা রুটিন</div>
          </button>

          <button
            onClick={() => setPrintMode('stickers')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'stickers'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৬. বেঞ্চ স্টিকার / স্লিপ</div>
            <div className="text-[10px] text-slate-500">ডেস্কের কাটিং কার্ড</div>
          </button>

          <button
            onClick={() => setPrintMode('master')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'master'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <School className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৭. মাস্টার সারসংক্ষেপ</div>
            <div className="text-[10px] text-slate-500">কেন্দ্রীয় নোটিশ বোর্ড</div>
          </button>

          <button
            onClick={() => setPrintMode('expenses')}
            className={`p-3 rounded-lg border text-left transition-all ${
              printMode === 'expenses'
                ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 text-emerald-900 font-bold'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4 mb-1 text-emerald-600" />
            <div className="text-xs font-bold">৮. পরীক্ষার ব্যয় ও সম্মানী</div>
            <div className="text-[10px] text-slate-500">ভাতা ও খরচ রেজিস্টার</div>
          </button>
        </div>

        {/* ---------------- ATTENDANCE CONTROLS & GROUP FILTER ---------------- */}
        {printMode === 'attendance' && (
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Group / Department Filter Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-700" />
                  শিক্ষার্থী হাজিরা গ্রুপ ফিল্টার:
                </span>
                <select
                  value={attendanceGroupFilter}
                  onChange={(e) => setAttendanceGroupFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 border border-emerald-300 rounded-lg bg-white font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                >
                  <option value="GROUPED_PAGES">
                    ✓ একই কক্ষে প্রতি গ্রুপের পৃথক পৃষ্ঠা (স্বয়ংক্রিয় আলাদা শিট)
                  </option>
                  <option value="ALL_MERGED">
                    একই কক্ষে সকল শিক্ষার্থী এক সাথে (একীভূত তালিকা)
                  </option>
                  <optgroup label="নির্দিষ্ট বিভাগ / গ্রুপ ফিল্টার">
                    {availableGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        শুধুমাত্র: {grp}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Multi-subject vs Single-subject format */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">হাজিরা ফরম্যাট:</span>
                <button
                  type="button"
                  onClick={() => setAttendanceLayout('multi_subject')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attendanceLayout === 'multi_subject'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  সব বিষয় একীভূত
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceLayout('single_subject')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attendanceLayout === 'single_subject'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  একক বিষয়
                </button>
              </div>
            </div>

            {/* Single Subject Selector */}
            {attendanceLayout === 'single_subject' && (
              <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                <label className="text-xs font-semibold text-emerald-900">বিষয় নির্বাচন:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white"
                >
                  {attendanceSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.date} ({sub.day}) - {sub.subjectName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ---------------- সিট প্ল্যান (শিফট) তথ্য ও প্রত্যবেক্ষক তারিখ ---------------- */}
        {(printMode === 'attendance' ||
          printMode === 'notices' ||
          printMode === 'floor_layout' ||
          printMode === 'stickers' ||
          printMode === 'master') && (
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-indigo-900">
              সিট প্ল্যান: {variantLabel || 'সকল শ্রেণী'}
              {variantSession ? ` · সময়: ${shiftText}` : ''}
            </span>
            {(printMode === 'notices' || printMode === 'floor_layout') && attendanceSubjects.length > 0 && (
              <label className="flex items-center gap-2 ml-auto">
                <span className="font-semibold text-indigo-900">প্রত্যবেক্ষক দেখাতে তারিখ:</span>
                <select
                  value={invPeriod?.id || ''}
                  onChange={(e) => setInvPeriodId(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white"
                >
                  {attendanceSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.date} ({sub.day}) - {sub.subjectName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {/* ---------------- DUTY ROSTER PRINT CONTROLS ---------------- */}
        {printMode === 'duties' && (
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-700" />
                  রোস্টার প্রিন্ট ফরম্যাট:
                </span>
                <button
                  type="button"
                  onClick={() => setDutyPrintFormat('routine_matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dutyPrintFormat === 'routine_matrix'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ✓ পরিক্ষাসূচীর পূর্ণাঙ্গ মাস্টার রোস্টার ({examSubjects.length} দিন)
                </button>
                <button
                  type="button"
                  onClick={() => setDutyPrintFormat('daily_sheets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dutyPrintFormat === 'daily_sheets'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  দিনভিত্তিক আলাদা ডিউটি শিট
                </button>
                <button
                  type="button"
                  onClick={() => setDutyPrintFormat('teacher_slips')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dutyPrintFormat === 'teacher_slips'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  শিক্ষকদের ব্যক্তিগত ডিউটি স্লিপ
                </button>
              </div>

              {dutyPrintFormat === 'daily_sheets' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">তারিখ নির্বাচন:</label>
                  <select
                    value={selectedDutyDate}
                    onChange={(e) => setSelectedDutyDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">সকল পরীক্ষা দিবস (প্রতি দিনে পেজ ব্রেক)</option>
                    {examSubjects.map((sub, sIdx) => (
                      <option key={sub.id} value={sub.id}>
                        দিন {sIdx + 1}: {sub.date} ({sub.day}) - {sub.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="text-[11px] text-indigo-900 bg-white/70 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
              <span>
                * সাইক্লিক রোটেশনের মাধ্যমে মোট <strong>{cyclicRoster.totalDutySlots} টি স্লট</strong>{' '}
                সকল <strong>{teachers.length} জন শিক্ষকের</strong> মধ্যে সমভাবে বণ্টিত হয়েছে (শিক্ষক প্রতি{' '}
                <strong>
                  {cyclicRoster.minDuty === cyclicRoster.maxDuty
                    ? `${cyclicRoster.minDuty} টি`
                    : `${cyclicRoster.minDuty} – ${cyclicRoster.maxDuty} টি`}
                </strong>
                )।
              </span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> সমতা নিশ্চিত
              </span>
            </div>
          </div>
        )}

        {/* ---------------- EXPENSE & REMUNERATION PRINT CONTROLS ---------------- */}
        {printMode === 'expenses' && (
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-700" />
                  সম্মানী বিল ও খরচ ফিল্টার:
                </span>
                <button
                  type="button"
                  onClick={() => setExpensePrintFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expensePrintFilter === 'all'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ✓ প্রশাসন, শিক্ষক ও কর্মচারী একীভূত বিল
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePrintFilter('committee')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expensePrintFilter === 'committee'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  প্রশাসন ও কমিটি সম্মানী
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePrintFilter('teachers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expensePrintFilter === 'teachers'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  শুধুমাত্র প্রত্যবেক্ষক শিক্ষক ভাতা
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePrintFilter('staff')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expensePrintFilter === 'staff'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  শুধুমাত্র পরীক্ষা কর্মচারী সম্মানী
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePrintFilter('budget_statement')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expensePrintFilter === 'budget_statement'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  পরীক্ষার পূর্ণাঙ্গ আর্থিক ব্যয় বিবরণী
                </button>
              </div>
            </div>

            <div className="text-[11px] text-amber-900 bg-white/70 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
              <span>
                * শিক্ষকদের ডিউটি সংখ্যা সাইক্লিক রোস্টার থেকে এবং কর্মচারীদের ডিউটি দিন থেকে স্বয়ংক্রিয়ভাবে হিসাবকৃত।
              </span>
              <span className="font-bold text-amber-800">
                ভাতা হার: শিক্ষক ৳{expenses.invigilationRatePerDuty}/ডিউটি
              </span>
            </div>
          </div>
        )}

        {/* ---------------- ROOM NOTICE SHEET PRINT CONTROLS (৩. কক্ষ নোটিশ শিট) ---------------- */}
        {printMode === 'notices' && (
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Font Size Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                    A
                  </span>
                  নোটিশের ফন্ট সাইজ (লেখা বড় করার অপশন):
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setNoticeFontSize('normal')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      noticeFontSize === 'normal'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    স্বাভাবিক ফন্ট (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeFontSize('large')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      noticeFontSize === 'large'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    বড় ফন্ট (দরজায় সাঁটানো) ★
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeFontSize('extra_large')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      noticeFontSize === 'extra_large'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    অনেক বড় ফন্ট (দূর থেকে পড়ার জন্য)
                  </button>
                </div>
              </div>

              {/* Page Orientation Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-950">
                  পৃষ্ঠার বিন্যাস (Orientation):
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setNoticeOrientation('portrait')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      noticeOrientation === 'portrait'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    পোর্ট্রেট (লম্বালম্বি)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeOrientation('landscape')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      noticeOrientation === 'landscape'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ল্যান্ডস্কেপ (আড়াআড়ি) ★
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-indigo-900 bg-white/70 p-2.5 rounded-lg border border-indigo-100 flex flex-wrap items-center justify-between gap-2">
              <span>
                * <strong>বড় ফন্ট</strong> ও <strong>ল্যান্ডস্কেপ</strong> নির্বাচন করলে রোল নম্বর ও শ্রেণী তালিকা অনেক দূর থেকে স্পষ্ট ও সহজে পড়া যায়।
              </span>
              <span className="text-indigo-800 font-semibold bg-indigo-100/60 px-2 py-0.5 rounded">
                স্বয়ংক্রিয় প্রিন্ট মিডিয়া সাইজ অ্যাডজাস্টেড
              </span>
            </div>
          </div>
        )}

        {/* ---------------- FLOOR LAYOUT PRINT CONTROLS (বাস্তব বেঞ্চ মানচিত্র) ---------------- */}
        {printMode === 'floor_layout' && (
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Orientation Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  পৃষ্ঠার বিন্যাস (Floor Plan Orientation):
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFloorLayoutOrientation('landscape')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      floorLayoutOrientation === 'landscape'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    আড়াআড়ি (Landscape) ★ সেরা পছন্দ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloorLayoutOrientation('portrait')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      floorLayoutOrientation === 'portrait'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    লম্বালম্বি (Portrait)
                  </button>
                </div>
              </div>

              {/* Density Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  বেঞ্চ কার্ডের মাপ (Layout Density):
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFloorLayoutDensity('spacious')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      floorLayoutDensity === 'spacious'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    প্রশস্ত ও বড় (Spacious)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloorLayoutDensity('compact')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      floorLayoutDensity === 'compact'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    কম্প্যাক্ট (১ পাতায় বেশি বেঞ্চ)
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-900 bg-white/70 p-2.5 rounded-lg border border-emerald-100 flex flex-wrap items-center justify-between gap-2">
              <span>
                * পরীক্ষার হলের দরজায় বা দেয়ালে টানানোর জন্য আসল বেঞ্চ মানচিত্র প্রিন্ট করুন। ২, ৩ বা ৪ কলামের হলের জন্য <strong>ল্যান্ডস্কেপ</strong> ফরম্যাট সবচেয়ে কার্যকর।
              </span>
              <span className="text-emerald-800 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
                কক্ষভিত্তিক পৃথক পাতায় প্রিন্ট
              </span>
            </div>
          </div>
        )}

        {/* Room Filter Selector (Only for notices and stickers or optional attendance) */}
        {printMode !== 'master' &&
          printMode !== 'duties' &&
          printMode !== 'routine' &&
          printMode !== 'expenses' && (
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-semibold text-slate-700">কক্ষ নির্বাচন করুন:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">সকল কক্ষ (এক সাথে প্রতি রুমে পেজ ব্রেক হবে)</option>
              {roomPlans.map((p) => (
                <option key={p.room.id} value={p.room.id}>
                  {p.room.name} ({p.allocatedCount} জন পরীক্ষার্থী)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================
          PRINTABLE DOCUMENT TEMPLATES
         ======================================================== */}
      <div className="print-area space-y-8 bg-transparent">
        {/* ========================================================
            TEMPLATE 1: ATTENDANCE SHEET (স্বাক্ষর ও হাজিরা শিট)
            WITH GROUP FILTER AND AUTO-SEPARATE SHEETS PER GROUP
           ======================================================== */}
        {printMode === 'attendance' && (
          <>
            {filteredPlans.flatMap((plan) => {
              const roomInvs = getRoomInvs(plan.room.id, attendanceLayout === 'single_subject' ? activeSingleSubject?.id : undefined, []);
              const inv1 = roomInvs[0];
              const inv2 = roomInvs[1];

              // Group allocations based on attendanceGroupFilter
              let sheetGroups: {
                groupKey: string;
                className: string;
                department: string;
                allocations: SeatAllocation[];
              }[] = [];

              if (attendanceGroupFilter === 'ALL_MERGED') {
                // All students in the room together
                sheetGroups = [
                  {
                    groupKey: 'all',
                    className: 'সকল শ্রেণী',
                    department: 'সকল বিভাগ/শাখা',
                    allocations: plan.allocations,
                  },
                ];
              } else if (attendanceGroupFilter === 'GROUPED_PAGES') {
                // Group by department/group within this room
                const map = new Map<
                  string,
                  { className: string; department: string; allocations: SeatAllocation[] }
                >();

                plan.allocations.forEach((alloc) => {
                  const info = getStudentGroupInfo(alloc.student);
                  const key = info.groupKey;
                  if (!map.has(key)) {
                    map.set(key, {
                      className: info.className,
                      department: info.department,
                      allocations: [],
                    });
                  }
                  map.get(key)!.allocations.push(alloc);
                });

                sheetGroups = Array.from(map.entries()).map(([groupKey, data]) => ({
                  groupKey,
                  className: data.className,
                  department: data.department,
                  allocations: data.allocations,
                }));
              } else {
                // Filter by specific department/group
                const matched = plan.allocations.filter((alloc) => {
                  const info = getStudentGroupInfo(alloc.student);
                  return (
                    info.department === attendanceGroupFilter ||
                    info.raw === attendanceGroupFilter
                  );
                });

                if (matched.length > 0) {
                  const firstInfo = getStudentGroupInfo(matched[0].student);
                  sheetGroups = [
                    {
                      groupKey: attendanceGroupFilter,
                      className: firstInfo.className,
                      department: firstInfo.department,
                      allocations: matched,
                    },
                  ];
                }
              }

              return sheetGroups.map((grp) => {
                const rolls = grp.allocations.map((a) => a.student.roll);
                const sortedRolls = [...rolls].sort(compareRolls);
                const rollRangeDisplay = formatRollRanges(sortedRolls);

                return (
                  <div
                    key={`${plan.room.id}-${grp.groupKey}`}
                    className="bg-white p-6 md:p-8 border border-slate-300 shadow-sm mx-auto max-w-5xl page-break-after rounded-lg print:border-none print:shadow-none print:p-0 print:m-0"
                  >
                    {/* Official Institute Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                        {examSettings.schoolName}
                      </h1>
                      <h2 className="text-base font-bold text-slate-800 mt-0.5">
                        {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
                      </h2>
                      <div className="text-sm font-black text-slate-900 mt-1 uppercase underline tracking-wide">
                        {attendanceLayout === 'multi_subject'
                          ? 'পরীক্ষার্থীর বিষয়ভিত্তিক উপস্থিতি ও স্বাক্ষর তালিকা (Multi-Subject Attendance Register)' + (variantLabel ? ` — ${variantLabel}` : '')
                          : `পরীক্ষার্থীর উপস্থিতি ও স্বাক্ষর তালিকা - বিষয়: ${activeSingleSubject.subjectName}`}
                      </div>

                      {/* Prominent Room & Group Details Bar */}
                      <div className="mt-2.5 flex flex-wrap justify-between text-xs text-slate-800 px-2 font-semibold bg-slate-50 py-1.5 border border-slate-300 rounded">
                        <span>
                          পরীক্ষা কক্ষ: <strong className="font-black text-black">{plan.room.name}</strong>
                        </span>
                        <span>
                          শ্রেণী: <strong>{grp.className}</strong>
                        </span>
                        <span>
                          শাখা / বিভাগ:{' '}
                          <strong className="text-indigo-900 font-black">{grp.department}</strong>
                        </span>
                        <span>
                          রোল নম্বর: <strong>{rollRangeDisplay}</strong>
                        </span>
                        <span>
                          পরীক্ষার্থী: <strong>{grp.allocations.length} জন</strong>
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap justify-between text-xs text-slate-700 px-2 font-medium">
                        <span>
                          তারিখ:{' '}
                          <strong>
                            {attendanceLayout === 'multi_subject'
                              ? dateRangeText
                              : `${activeSingleSubject.date} (${activeSingleSubject.day})`}
                          </strong>
                        </span>
                        <span>
                          সময়: <strong>{shiftText}</strong>
                        </span>
                      </div>

                      {/* Invigilators header */}
                      <div className="mt-2 text-xs bg-slate-100 p-1.5 rounded border border-slate-400 flex justify-between px-3 font-semibold text-slate-800">
                        <span>
                          ১ম প্রত্যবেক্ষক:{' '}
                          {inv1 ? `${inv1.name} (${inv1.designation})` : '...............................................'}
                        </span>
                        <span>
                          ২য় প্রত্যবেক্ষক:{' '}
                          {inv2 ? `${inv2.name} (${inv2.designation})` : '...............................................'}
                        </span>
                      </div>
                    </div>

                    {/* LAYOUT 1: MULTI-SUBJECT (সব বিষয় একীভূত) */}
                    {attendanceLayout === 'multi_subject' ? (
                      <table className="w-full text-left text-xs border-collapse border border-slate-800 mb-6">
                        <thead className="bg-slate-100 font-bold border-b-2 border-slate-800 text-[11px] text-slate-900 sticky top-0">
                          <tr>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-8">ক্র:</th>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-14">রোল</th>
                            <th className="border border-slate-800 py-2 px-2 w-36">শিক্ষার্থীর নাম</th>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-20">শ্রেণী/বিভাগ</th>
                            <th className="border border-slate-800 py-2 px-1 text-center w-10">বেঞ্চ</th>
                            <th className="border border-slate-800 py-2 px-2 w-28">তারিখ ও বার</th>
                            <th className="border border-slate-800 py-2 px-2">পরীক্ষার বিষয়</th>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-20">
                              উত্তরপত্র নং
                            </th>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-28">
                              শিক্ষার্থীর স্বাক্ষর
                            </th>
                            <th className="border border-slate-800 py-2 px-1.5 text-center w-24">
                              পরিদর্শক স্বাক্ষর
                            </th>
                            <th className="border border-slate-800 py-2 px-1 text-center w-12">
                              উপস্থিতি
                            </th>
                          </tr>
                        </thead>

                        {grp.allocations.map((alloc, idx) => {
                          const studentSubs = attendanceSubjects.filter(
                            (sub) => getSubjectForClass(sub, alloc.student.className) !== null
                          );
                          if (!studentSubs.length) return null;
                          return (
                          <tbody
                            key={alloc.id}
                            className="avoid-break border-b-2 border-slate-900 divide-y divide-slate-300"
                          >
                            {studentSubs.map((sub, sIdx) => (
                              <tr
                                key={`${alloc.id}-${sub.id}`}
                                className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                              >
                                {sIdx === 0 && (
                                  <>
                                    <td
                                      rowSpan={studentSubs.length}
                                      className="border-r border-slate-800 py-2 px-1 text-center font-mono font-bold align-top bg-slate-50/80"
                                    >
                                      {idx + 1}
                                    </td>
                                    <td
                                      rowSpan={studentSubs.length}
                                      className="border-r border-slate-800 py-2 px-1.5 text-center font-black font-mono text-sm align-top bg-slate-50/80"
                                    >
                                      {alloc.student.roll}
                                    </td>
                                    <td
                                      rowSpan={studentSubs.length}
                                      className="border-r border-slate-800 py-2 px-2 font-bold text-xs align-top leading-tight"
                                    >
                                      <div className="text-slate-900">{alloc.student.name}</div>
                                    </td>
                                    <td
                                      rowSpan={studentSubs.length}
                                      className="border-r border-slate-800 py-2 px-1.5 text-center text-[11px] align-top font-semibold"
                                    >
                                      <div>{alloc.student.className}</div>
                                      <div className="text-slate-600 font-normal">
                                        ({alloc.student.section})
                                      </div>
                                    </td>
                                    <td
                                      rowSpan={studentSubs.length}
                                      className="border-r border-slate-800 py-2 px-1 text-center font-mono font-bold align-top bg-slate-50/80"
                                    >
                                      {alloc.benchNumber}
                                    </td>
                                  </>
                                )}

                                <td className="border-r border-slate-800 py-1.5 px-2 text-[10px] font-mono whitespace-nowrap text-slate-700">
                                  <div>{sub.date}</div>
                                  <div className="text-[9px] text-slate-500 font-sans">{sub.day}</div>
                                </td>
                                <td className="border-r border-slate-800 py-1.5 px-2 text-[11px] font-medium text-slate-800">
                                  {getSubjectForClass(sub, alloc.student.className)}
                                </td>
                                <td className="border-r border-slate-800 py-1.5 px-1.5 text-center font-mono"></td>
                                <td className="border-r border-slate-800 py-1.5 px-1.5 text-center"></td>
                                <td className="border-r border-slate-800 py-1.5 px-1.5 text-center"></td>
                                <td className="py-1.5 px-1 text-center text-[10px] text-slate-400"></td>
                              </tr>
                            ))}
                          </tbody>
                          );
                        })}
                      </table>
                    ) : (
                      /* LAYOUT 2: SINGLE SUBJECT REGISTER */
                      <table className="w-full text-left text-xs border-collapse border border-slate-800 mb-6">
                        <thead className="bg-slate-100 font-bold border-b-2 border-slate-800 text-[11px] text-slate-900">
                          <tr>
                            <th className="border border-slate-800 py-2 px-2 text-center w-10">ক্র:</th>
                            <th className="border border-slate-800 py-2 px-2 text-center w-16">রোল নম্বর</th>
                            <th className="border border-slate-800 py-2 px-3">শিক্ষার্থীর নাম</th>
                            <th className="border border-slate-800 py-2 px-2 text-center w-24">বিভাগ/শাখা</th>
                            <th className="border border-slate-800 py-2 px-2 text-center w-16">বেঞ্চ নং</th>
                            <th className="border border-slate-800 py-2 px-3 text-center w-28">মূল খাতা নং</th>
                            <th className="border border-slate-800 py-2 px-3 text-center w-24">অতিরিক্ত খাতা</th>
                            <th className="border border-slate-800 py-2 px-4 text-center w-36">
                              শিক্ষার্থীর স্বাক্ষর
                            </th>
                            <th className="border border-slate-800 py-2 px-2 text-center w-20">মন্তব্য</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {grp.allocations.map((alloc, idx) => (
                            <tr key={alloc.id} className="avoid-break hover:bg-slate-50/50">
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-black font-mono text-sm bg-slate-50/50">
                                {alloc.student.roll}
                              </td>
                              <td className="border border-slate-800 py-2.5 px-3 font-bold text-slate-900">
                                {alloc.student.name}
                              </td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-medium">
                                {alloc.student.className} ({alloc.student.section})
                              </td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-mono font-bold">
                                {alloc.benchNumber}
                              </td>
                              <td className="border border-slate-800 py-2.5 px-3"></td>
                              <td className="border border-slate-800 py-2.5 px-3"></td>
                              <td className="border border-slate-800 py-2.5 px-4 text-center"></td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-bold text-emerald-800 text-[10px]"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Attendance Summary and Signatures Box */}
                    <div className="pt-4 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs font-semibold text-slate-800 avoid-break border-t border-slate-300">
                      <div className="space-y-1">
                        <div>
                          মোট পরীক্ষার্থী: <strong>{grp.allocations.length} জন</strong> · উপস্থিত:{' '}
                          <strong>......... জন</strong> · অনুপস্থিত: <strong>......... জন</strong>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          * পরীক্ষা কক্ষের শৃঙ্খলা ও উত্তরপত্র গণনান্তে প্রত্যবেক্ষক স্বাক্ষর প্রদান করবেন।
                        </div>
                      </div>

                      <div className="flex gap-8">
                        <div className="text-center">
                          <div className="w-36 border-t border-slate-800 pt-1">
                            ১ম পরিদর্শকের স্বাক্ষর
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-36 border-t border-slate-800 pt-1">
                            ২য় পরিদর্শকের স্বাক্ষর
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-36 border-t border-slate-800 pt-1">
                            {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </>
        )}

        {/* ========================================================
            TEMPLATE 2: INVIGILATOR DUTY ROSTER (প্রত্যবেক্ষক ডিউটি রোস্টার)
            CYCLIC EQUAL DUTY ACROSS ENTIRE EXAM SCHEDULE
           ======================================================== */}
        {printMode === 'duties' && (
          <>
            {/* FORMAT A: FULL ROUTINE MASTER MATRIX (পরিক্ষাসূচীর পূর্ণাঙ্গ মাস্টার রোস্টার) */}
            {dutyPrintFormat === 'routine_matrix' && (
              <div className="bg-white p-8 md:p-10 border border-slate-300 shadow-sm mx-auto max-w-5xl rounded-lg print:border-none print:shadow-none print:p-0">
                {/* Official School Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {examSettings.schoolName}
                  </h1>
                  <h2 className="text-base font-semibold text-slate-700 mt-1">
                    {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
                  </h2>
                  <div className="mt-3 inline-block px-6 py-1.5 bg-slate-900 text-white font-bold text-sm tracking-wide rounded uppercase">
                    কক্ষ প্রত্যবেক্ষক ডিউটি বণ্টন ও রোস্টার তালিকা (পরিক্ষাসূচীর আলোকে সাইক্লিক সম-ডিউটি)
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-slate-700 mt-2 font-medium">
                    <span>সময় / শিফট: <strong>{shiftText}</strong></span>
                    <span>·</span>
                    <span>পরীক্ষার সময়কাল: <strong>{examSettings.examDate}</strong></span>
                    <span>·</span>
                    <span>মোট কক্ষ: <strong>{roomPlans.length} টি (প্রতি কক্ষে ২ জন)</strong></span>
                  </div>
                </div>

                {/* Date-by-Date Cyclic Duty Table */}
                <div className="mb-8">
                  <div className="text-xs font-bold text-slate-900 mb-2 flex justify-between items-center">
                    <span>১. প্রতিদিনের কক্ষভিত্তিক দায়িত্ব বিবরণী (সাইক্লিক রোটেশন সম-ডিউটি):</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      মোট পরীক্ষা দিবস: {cyclicRoster.totalDays} দিন · মোট ডিউটি স্লট: {cyclicRoster.totalDutySlots} টি
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse border-2 border-slate-900">
                    <thead className="bg-slate-100 font-bold border-b-2 border-slate-900 text-[11px]">
                      <tr>
                        <th className="border border-slate-900 py-2 px-2 text-center w-10">ক্র:</th>
                        <th className="border border-slate-900 py-2 px-3 w-28">তারিখ ও বার</th>
                        <th className="border border-slate-900 py-2 px-3">পরীক্ষার বিষয়</th>
                        {matrixRooms.map((r) => (
                          <th key={r.id} className="border border-slate-900 py-2 px-3">
                            {r.name} (২ জন)
                          </th>
                        ))}
                        <th className="border border-slate-900 py-2 px-2 text-center w-20">
                          মোট শিক্ষক
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cyclicRoster.daySchedules.map((dayItem, dIdx) => {
                        const totalAssignedToday = dayItem.roomDuties.reduce(
                          (acc, r) => acc + r.invigilators.length,
                          0
                        );

                        return (
                          <tr
                            key={dayItem.dateId}
                            className={`avoid-break ${dIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                          >
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold">
                              {dIdx + 1}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                              <div>{dayItem.date}</div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                {dayItem.day}
                                {dayItem.session ? ` · ${dayItem.session === 'morning' ? 'সকাল' : 'বিকাল'}` : ''}
                              </div>
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 font-semibold text-slate-900">
                              {dayItem.subjectName}
                            </td>
                            {matrixRooms.map((mRoom) => {
                              const rd = dayItem.roomDuties.find((x) => x.room.id === mRoom.id);
                              if (!rd) {
                                return (
                                  <td
                                    key={mRoom.id}
                                    className="border border-slate-900 py-2 px-3 text-center text-slate-400 align-middle"
                                  >
                                    —
                                  </td>
                                );
                              }
                              const inv1 = rd.invigilators[0];
                              const inv2 = rd.invigilators[1];

                              return (
                                <td
                                  key={rd.room.id}
                                  className="border border-slate-900 py-2 px-3 align-top text-[11px]"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">১. {inv1?.name || '—'}</span>
                                    <span className="text-[10px] text-slate-500 block">
                                      ({inv1?.designation || ''})
                                    </span>
                                  </div>
                                  <div className="mt-1 pt-1 border-t border-slate-200">
                                    <span className="font-bold text-slate-900">২. {inv2?.name || '—'}</span>
                                    <span className="text-[10px] text-slate-500 block">
                                      ({inv2?.designation || ''})
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-bold font-mono">
                              {totalAssignedToday} জন
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Teacher Equality Summary & Signature Verification Table */}
                <div className="mb-8 avoid-break">
                  <div className="text-xs font-bold text-slate-900 mb-2 flex justify-between">
                    <span>২. সকল শিক্ষকের সম-ডিউটি সারসংক্ষেপ ও শিক্ষক প্রাপ্তি স্বীকার স্বাক্ষর:</span>
                    <span className="text-[11px] font-semibold text-emerald-800">
                      ✓ সাইক্লিক সম-ডিউটি: শিক্ষক প্রতি {cyclicRoster.minDuty === cyclicRoster.maxDuty ? `${cyclicRoster.minDuty} টি` : `${cyclicRoster.minDuty} – ${cyclicRoster.maxDuty} টি`}
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse border border-slate-800">
                    <thead className="bg-slate-100 font-bold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="border border-slate-800 py-1.5 px-2 text-center w-10">ক্র:</th>
                        <th className="border border-slate-800 py-1.5 px-3">শিক্ষকের নাম</th>
                        <th className="border border-slate-800 py-1.5 px-2">পদবী ও বিষয়</th>
                        <th className="border border-slate-800 py-1.5 px-2 text-center w-24">
                          ডিউটি সংখ্যা
                        </th>
                        <th className="border border-slate-800 py-1.5 px-3">বরাদ্দকৃত পরীক্ষার তারিখ ও কক্ষ</th>
                        <th className="border border-slate-800 py-1.5 px-2 text-center w-28">স্বাক্ষর</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cyclicRoster.teacherStats.map((stat, idx) => (
                        <tr key={stat.teacher.id} className="avoid-break">
                          <td className="border border-slate-800 py-2 px-2 text-center font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-800 py-2 px-3 font-bold text-slate-900">
                            {stat.teacher.name}
                          </td>
                          <td className="border border-slate-800 py-2 px-2 text-slate-600">
                            <div>{stat.teacher.designation}</div>
                            <div className="text-[10px] text-slate-500">
                              {stat.teacher.subject} · {stat.teacher.phone || ''}
                            </div>
                          </td>
                          <td className="border border-slate-800 py-2 px-2 text-center font-mono font-black text-slate-900">
                            {stat.totalDuties} টি
                          </td>
                          <td className="border border-slate-800 py-2 px-3 text-[10px]">
                            {stat.duties.map((d, dIdx) => (
                              <span key={dIdx} className="inline-block mr-2 text-slate-700">
                                <strong>{d.date}:</strong> {d.roomName} ({d.role === '১ম পরিদর্শক' ? '১ম' : '২য়'})
                                {dIdx < stat.duties.length - 1 ? ';' : ''}
                              </span>
                            ))}
                          </td>
                          <td className="border border-slate-800 py-2 px-2"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures */}
                <div className="pt-6 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break border-t border-slate-300">
                  <div className="text-center">
                    <div className="w-44 border-t border-slate-800 pt-1">
                      {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক / কেন্দ্র সচিব'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-44 border-t border-slate-800 pt-1">
                      {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT B: DAILY DUTY REGISTER SHEETS (দিনভিত্তিক পৃথক ডিউটি শিট) */}
            {dutyPrintFormat === 'daily_sheets' && (
              <>
                {(selectedDutyDate === 'ALL'
                  ? cyclicRoster.daySchedules
                  : cyclicRoster.daySchedules.filter((d) => d.dateId === selectedDutyDate)
                ).map((dayItem) => (
                  <div
                    key={dayItem.dateId}
                    className="bg-white p-8 md:p-10 border border-slate-300 shadow-sm mx-auto max-w-4xl page-break-after rounded-lg print:border-none print:shadow-none print:p-0 print:m-0"
                  >
                    <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {examSettings.schoolName}
                      </h1>
                      <h2 className="text-base font-semibold text-slate-700 mt-0.5">
                        {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
                      </h2>
                      <div className="mt-2 inline-block px-5 py-1 bg-slate-900 text-white font-bold text-xs tracking-wide rounded uppercase">
                        দৈনিক কক্ষ প্রত্যবেক্ষক উপস্থিতি ও দায়িত্ব খাতা
                      </div>
                      <div className="mt-3 flex justify-between text-xs font-semibold text-slate-800 px-2 bg-slate-50 py-1.5 border border-slate-300 rounded">
                        <span>
                          তারিখ: <strong>{dayItem.date} ({dayItem.day})</strong>
                        </span>
                        <span>
                          বিষয়: <strong className="text-indigo-900 font-bold">{dayItem.subjectName}</strong>
                        </span>
                        <span>
                          সময়: <strong>{shiftText}</strong>
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs border-collapse border border-slate-800 mb-6">
                      <thead className="bg-slate-100 font-bold border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="border border-slate-800 py-2 px-2 text-center w-10">ক্র:</th>
                          <th className="border border-slate-800 py-2 px-3 w-32">কক্ষ নম্বর</th>
                          <th className="border border-slate-800 py-2 px-3">প্রত্যবেক্ষকের নাম ও পদবী</th>
                          <th className="border border-slate-800 py-2 px-2 text-center w-28">দায়িত্বের ধরণ</th>
                          <th className="border border-slate-800 py-2 px-2 text-center w-24">আগমনের সময়</th>
                          <th className="border border-slate-800 py-2 px-3 text-center w-36">শিক্ষকের স্বাক্ষর</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {dayItem.roomDuties.flatMap((rd, rIdx) =>
                          rd.invigilators.map((inv, iIdx) => (
                            <tr key={`${rd.room.id}-${inv.id}`} className="avoid-break">
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-mono">
                                {rIdx * 2 + iIdx + 1}
                              </td>
                              {iIdx === 0 && (
                                <td
                                  rowSpan={rd.invigilators.length}
                                  className="border-r border-slate-800 py-2.5 px-3 font-bold bg-slate-50 align-top"
                                >
                                  {rd.room.name}
                                </td>
                              )}
                              <td className="border border-slate-800 py-2.5 px-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{inv.name}</span>
                                  {rd.overrides && rd.overrides[iIdx] && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      বদলি
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal">
                                  {inv.designation} ({inv.subject || 'সাধারণ'})
                                  {rd.overrides && rd.overrides[iIdx]?.originalTeacherName && (
                                    <span className="text-amber-800 ml-1.5 font-medium">
                                      [মূল: {rd.overrides[iIdx]?.originalTeacherName}]
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-bold text-indigo-700">
                                {iIdx === 0 ? '১ম পরিদর্শক' : '২য় পরিদর্শক'}
                              </td>
                              <td className="border border-slate-800 py-2.5 px-2 text-center font-mono"></td>
                              <td className="border border-slate-800 py-2.5 px-3"></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div className="pt-6 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break border-t border-slate-300">
                      <div className="text-center">
                        <div className="w-40 border-t border-slate-800 pt-1">
                          {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="w-40 border-t border-slate-800 pt-1">
                          {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* FORMAT C: TEACHER INDIVIDUAL DUTY SLIPS (শিক্ষকদের ব্যক্তিগত ডিউটি স্লিপ) */}
            {dutyPrintFormat === 'teacher_slips' && (
              <div className="bg-white p-6 md:p-8 border border-slate-300 shadow-sm mx-auto max-w-5xl rounded-lg print:border-none print:shadow-none print:p-0">
                <div className="text-center border-b border-slate-300 pb-3 mb-6 no-print">
                  <h2 className="text-base font-bold text-slate-800">
                    শিক্ষকদের ব্যক্তিগত ডিউটি স্লিপ (Teacher Duty Slips)
                  </h2>
                  <p className="text-xs text-slate-500">
                    এই স্লিপগুলো কেটে সংশ্লিষ্ট প্রত্যবেক্ষক শিক্ষকদের কাছে নোটিশ হিসেবে বিতরণ করা যাবে।
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cyclicRoster.teacherStats.map((stat) => (
                    <div
                      key={stat.teacher.id}
                      className="p-4 border-2 border-dashed border-slate-600 rounded-lg avoid-break bg-white text-slate-900 flex flex-col justify-between"
                    >
                      <div className="border-b border-slate-300 pb-2 mb-2">
                        <div className="text-[11px] font-bold text-slate-600 uppercase">
                          {examSettings.schoolName}
                        </div>
                        <div className="text-xs font-black text-slate-900">
                          {examSettings.examName} · প্রত্যবেক্ষক ডিউটি স্লিপ
                        </div>
                        <div className="mt-1.5 flex justify-between items-center bg-slate-100 p-1.5 rounded">
                          <div>
                            <div className="font-bold text-sm text-indigo-900">{stat.teacher.name}</div>
                            <div className="text-[10px] text-slate-600">
                              {stat.teacher.designation} ({stat.teacher.subject})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold text-[10px] rounded">
                              মোট ডিউটি: {stat.totalDuties} টি
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] space-y-1 mb-3">
                        <div className="font-bold text-slate-800 border-b border-slate-200 pb-0.5">
                          আপনার নির্ধারিত পরীক্ষার তারিখ ও কক্ষসমূহ:
                        </div>
                        <table className="w-full text-left text-[10px]">
                          <thead>
                            <tr className="border-b border-slate-200 font-bold text-slate-600">
                              <th className="py-1">তারিখ</th>
                              <th className="py-1">বিষয়</th>
                              <th className="py-1">কক্ষ</th>
                              <th className="py-1">দায়িত্ব</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stat.duties.map((d, dIdx) => (
                              <tr key={dIdx}>
                                <td className="py-1 font-mono font-bold whitespace-nowrap">{d.date}</td>
                                <td className="py-1 font-medium">{d.subjectName}</td>
                                <td className="py-1 font-bold text-indigo-700">{d.roomName}</td>
                                <td className="py-1 font-semibold">{d.role}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2 border-t border-slate-300 flex justify-between items-end text-[9px] text-slate-600">
                        <span>সময়: {shiftText}</span>
                        <span className="border-t border-slate-600 pt-0.5 px-3">অনুমোদনকারী স্বাক্ষর</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================
            TEMPLATE 3: EXAM ROUTINE (১০ম শ্রেণীর নির্বাচনী পরীক্ষার সময়সূচী-২০২৬)
           ======================================================== */}
        {printMode === 'routine' && (
          <div className="bg-white p-8 md:p-10 border border-slate-300 shadow-sm mx-auto max-w-4xl rounded-lg print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {examSettings.schoolName}
              </h1>
              <h2 className="text-base font-semibold text-slate-700 mt-1">
                {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
              </h2>
              <div className="mt-3 inline-block px-6 py-1.5 bg-slate-900 text-white font-bold text-sm tracking-wide rounded uppercase">
                পরীক্ষার পূর্ণাঙ্গ সময়সূচী / রুটিন
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-600 mt-2 font-medium">
                <span>সকাল: {getShiftText(examSettings, 'morning')} · বিকাল: {getShiftText(examSettings, 'afternoon')}</span>
              </div>
            </div>

            <div className="mb-8">
              {examSubjects.some((x) => x.classSubjects) ? (() => {
                const days = routineDaysFromPeriods(examSubjects);
                const clsSet = new Set<string>();
                examSubjects.forEach((x) => Object.keys(x.classSubjects || {}).forEach((c) => clsSet.add(c)));
                const classes = Array.from(clsSet).sort(compareClassNames);
                return (
                  <table className="w-full text-center text-[11px] border-collapse border-2 border-slate-900">
                    <thead className="bg-slate-100 font-bold border-b-2 border-slate-900">
                      <tr>
                        <th className="border border-slate-900 py-2 px-2 w-16">দিন</th>
                        <th className="border border-slate-900 py-2 px-2 w-28">তারিখ ও বার</th>
                        {classes.map((c) => {
                          const sess = getClassSession(examSettings, c);
                          return (
                            <th key={c} className="border border-slate-900 py-2 px-2">
                              <div>{shortClass(c)} শ্রেণী</div>
                              <div className="text-[10px] font-semibold text-slate-600">
                                ({sess === 'morning' ? 'সকাল' : 'বিকাল'} · {getShiftText(examSettings, sess)})
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d, idx) => (
                        <tr key={d.dayNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="border border-slate-900 py-2 px-2 font-bold">{toBnDigits(d.dayNo)}</td>
                          <td className="border border-slate-900 py-2 px-2 font-mono font-bold">
                            <div>{d.date}</div>
                            <div className="text-[10px] text-slate-500 font-sans font-normal">{d.day}</div>
                          </td>
                          {classes.map((c) => {
                            const subj = d.subjects[c];
                            return (
                              <td key={c} className="border border-slate-900 py-2 px-2 font-semibold text-slate-900">
                                {subj && subj.trim() ? subj : <span className="text-slate-400 text-lg">✕</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })() : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse border-2 border-slate-900">
                  <thead className="bg-slate-100 font-bold border-b-2 border-slate-900">
                    <tr>
                      <th className="border border-slate-900 py-2.5 px-4 text-center w-36">তারিখ</th>
                      <th className="border border-slate-900 py-2.5 px-4 text-center w-32">বার</th>
                      <th className="border border-slate-900 py-2.5 px-4">বিষয়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {examSubjects.map((sub, idx) => (
                      <tr key={sub.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-900 py-2.5 px-4 text-center font-mono font-bold">{sub.date}</td>
                        <td className="border border-slate-900 py-2.5 px-4 text-center font-medium">{sub.day}</td>
                        <td className="border border-slate-900 py-2.5 px-4 font-semibold text-slate-900">{sub.subjectName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 border border-slate-400 rounded text-xs text-slate-700 mb-8 bg-slate-50/60 leading-relaxed avoid-break">
              <div className="font-bold text-slate-900 mb-1">পরীক্ষার্থীদের জন্য বিশেষ নির্দেশনাবলী:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>পরীক্ষা শুরুর অন্তত ১৫ মিনিট পূর্বে পরীক্ষার্থীদের নিজ নিজ আসন গ্রহণ করতে হবে।</li>
                <li>পরীক্ষার হলে মোবাইল ফোন বা কোনো প্রকার ইলেকট্রনিক ডিভাইস সাথে রাখা সম্পূর্ণ নিষিদ্ধ।</li>
                <li>প্রবেশপত্র (Admit Card) ব্যতিরেকে পরীক্ষায় অংশগ্রহণ করা যাবে না।</li>
                <li>উত্তরপত্রের কভার পৃষ্ঠায় রোল নম্বর ও অন্যান্য তথ্য সতর্কতার সাথে পূরণ করতে হবে।</li>
              </ol>
            </div>

            <div className="pt-8 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break">
              <div className="text-center">
                <div className="w-40 border-t border-slate-800 pt-1">
                  {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                </div>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-slate-800 pt-1">
                  {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TEMPLATE 3: ROOM DOOR NOTICE (কক্ষ নোটিশ শিট)
            WITH FONT SIZE SCALING & LANDSCAPE ORIENTATION
           ======================================================== */}
        {printMode === 'notices' && (
          <>
            {filteredPlans.map((plan) => {
              const roomInvs = getRoomInvs(plan.room.id, invPeriod?.id, plan.invigilators);
              const inv1 = roomInvs[0];
              const inv2 = roomInvs[1];

              return (
                <div
                  key={plan.room.id}
                  className={`bg-white border border-slate-300 shadow-sm mx-auto page-break-after rounded-lg print:border-none print:shadow-none print:p-0 print:m-0 ${noticeStyles.cardWidth} ${noticeStyles.cardPadding}`}
                >
                  <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
                    <h1 className={noticeStyles.schoolName}>
                      {examSettings.schoolName}
                    </h1>
                    <h2 className={noticeStyles.examName}>
                      {examSettings.examName} · {examSettings.academicYear}
                    </h2>
                    <div className={`flex items-center justify-center gap-4 text-slate-600 ${noticeStyles.metaText}`}>
                      {shiftText && <span>শিফট: {shiftText}</span>}
                      {shiftText && examSettings.examDate && <span>·</span>}
                      {examSettings.examDate && <span>তারিখ: {examSettings.examDate}</span>}
                    </div>

                    <div className={noticeStyles.noticeBadge}>
                      সিট প্ল্যান নোটিশ - {plan.room.name}
                    </div>
                  </div>

                  <div className={noticeStyles.teachersBox}>
                    <div className={noticeStyles.teachersTitle}>
                      <span>দায়িত্বপ্রাপ্ত কক্ষ প্রত্যবেক্ষকগণ:</span>
                      <span className="font-normal text-slate-600">কক্ষ নং: {plan.room.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        ১. <strong className={noticeStyles.teacherName}>{inv1 ? inv1.name : '................................................'}</strong>
                        {inv1 && (
                          <span className={noticeStyles.teacherDesig}>
                            {inv1.designation} ({inv1.subject || 'সাধারণ'})
                          </span>
                        )}
                      </div>
                      <div>
                        ২. <strong className={noticeStyles.teacherName}>{inv2 ? inv2.name : '................................................'}</strong>
                        {inv2 && (
                          <span className={noticeStyles.teacherDesig}>
                            {inv2.designation} ({inv2.subject || 'সাধারণ'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className={noticeStyles.summaryTitle}>
                      <span>কক্ষের পরীক্ষার্থী সারসংক্ষেপ তালিকা:</span>
                      <span>মোট পরীক্ষার্থী: {plan.allocatedCount} জন</span>
                    </div>

                    <table className="w-full text-left border-collapse border border-slate-800">
                      <thead className="bg-slate-100 font-bold border-b border-slate-800">
                        <tr>
                          <th className={`${noticeStyles.tableHead} text-center w-12`}>ক্রমিক</th>
                          <th className={noticeStyles.tableHead}>শ্রেণী</th>
                          <th className={noticeStyles.tableHead}>শাখা / বিভাগ</th>
                          <th className={`${noticeStyles.tableHead} text-center`}>পরীক্ষার্থী সংখ্যা</th>
                          <th className={noticeStyles.tableHead}>রোল নম্বর ব্যাপ্তি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {plan.classSummaries.map((summary, sIdx) => (
                          <tr key={`${summary.className}-${summary.section}`} className="avoid-break">
                            <td className={`${noticeStyles.tableCell} text-center font-mono`}>
                              {sIdx + 1}
                            </td>
                            <td className={noticeStyles.tableCell}>
                              {summary.className}
                            </td>
                            <td className={noticeStyles.tableCell}>
                              {summary.section || '—'}
                            </td>
                            <td className={`${noticeStyles.tableCell} text-center font-mono font-black`}>
                              {summary.count} জন
                            </td>
                            <td className={noticeStyles.rollRange}>
                              {summary.rollRangeDisplay}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={noticeStyles.signatures}>
                    <div className="text-center">
                      <div className={noticeStyles.signatureLine}>
                        {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                      </div>
                      <span className="text-[10px] text-slate-500">প্রস্তুতকারীর স্বাক্ষর</span>
                    </div>

                    <div className="text-center">
                      <div className={noticeStyles.signatureLine}>
                        {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                      </div>
                      <span className="text-[10px] text-slate-500">অনুমোদনকারীর স্বাক্ষর</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ========================================================
            TEMPLATE 4: ROOM FLOOR LAYOUT (বাস্তব বেঞ্চ মানচিত্র)
            PRINTABLE DETAILED DESK & SEAT MAP
           ======================================================== */}
        {printMode === 'floor_layout' && (
          <>
            {filteredPlans.map((plan) => {
              const roomInvs = getRoomInvs(plan.room.id, invPeriod?.id, plan.invigilators);
              const inv1 = roomInvs[0];
              const inv2 = roomInvs[1];
              const columnsCount = Math.max(1, Math.min(4, plan.room.columnsCount || 2));

              // Group benches by column
              const benchesByColumn: Record<number, typeof plan.benches> = {};
              for (let c = 1; c <= columnsCount; c++) benchesByColumn[c] = [];
              plan.benches.forEach((bench) => {
                const col = bench.benchColumn || 1;
                if (!benchesByColumn[col]) benchesByColumn[col] = [];
                benchesByColumn[col].push(bench);
              });

              return (
                <div
                  key={plan.room.id}
                  className={`bg-white border border-slate-300 shadow-sm mx-auto page-break-after rounded-lg print:border-none print:shadow-none print:p-0 print:m-0 ${
                    floorLayoutOrientation === 'landscape'
                      ? 'max-w-6xl p-6 md:p-8'
                      : 'max-w-4xl p-6 md:p-8'
                  }`}
                >
                  {/* School & Exam Header */}
                  <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                      {examSettings.schoolName}
                    </h1>
                    <h2 className="text-sm md:text-base font-bold text-slate-700 mt-0.5">
                      {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
                    </h2>
                    <div className="flex items-center justify-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                      {shiftText && <span>শিফট: {shiftText}</span>}
                      {shiftText && examSettings.examDate && <span>·</span>}
                      {examSettings.examDate && <span>তারিখ: {examSettings.examDate}</span>}
                    </div>

                    <div className="mt-2 inline-block px-5 py-1.5 bg-slate-900 text-white font-black text-xs md:text-sm tracking-wide rounded uppercase print:bg-slate-900 print:text-white">
                      বাস্তব বেঞ্চ মানচিত্র ও আসন বিন্যাস (Floor Layout) — {plan.room.name}
                    </div>
                  </div>

                  {/* Room Meta Information Banner */}
                  <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs flex flex-wrap items-center justify-between gap-2 text-slate-800 avoid-break">
                    <div className="flex items-center gap-3 font-semibold">
                      <span>
                        মোট বেঞ্চ: <strong>{plan.benches.length} টি</strong>
                      </span>
                      <span>·</span>
                      <span>
                        মোট আসন: <strong>{plan.totalSeats} টি</strong>
                      </span>
                      <span>·</span>
                      <span>
                        বরাদ্দকৃত পরীক্ষার্থী: <strong className="text-indigo-900">{plan.allocatedCount} জন</strong>
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      দায়িত্বপ্রাপ্ত পরিদর্শক: <strong>{inv1?.name || '—'}</strong> ও{' '}
                      <strong>{inv2?.name || '—'}</strong>
                    </div>
                  </div>

                  {/* Podium / Blackboard Banner */}
                  <div className="w-full py-1.5 bg-slate-800 text-slate-100 text-center font-bold text-xs rounded shadow-xs tracking-wider mb-3.5 border border-slate-700 print:bg-slate-800 print:text-white avoid-break">
                    [ সম্মুখভাগ: ব্ল্যাকবোর্ড / শিক্ষকের ডায়াস ]
                  </div>

                  {/* Columns Grid with inline gridTemplateColumns to preserve side-by-side printing */}
                  <div
                    className="gap-3 md:gap-4 mb-6"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                    }}
                  >
                    {Object.keys(benchesByColumn).map((colKey) => {
                      const colNum = parseInt(colKey, 10);
                      const benches = benchesByColumn[colNum];
                      const colConfig = plan.room.columnConfigs?.find((c) => c.columnIndex === colNum);
                      const colLabel =
                        colConfig?.columnName ||
                        (colNum === 1 && columnsCount === 2
                          ? 'বাম সারি (কলাম ১)'
                          : colNum === 2 && columnsCount === 2
                          ? 'ডান সারি (কলাম ২)'
                          : `সারি ${colNum}`);

                      return (
                        <div key={colNum} className="space-y-2">
                          <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-300 flex items-center justify-between">
                            <span>{colLabel}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {benches.length} টি বেঞ্চ
                            </span>
                          </div>

                          <div className="space-y-2">
                            {benches.map((bench) => (
                              <div
                                key={bench.benchNumber}
                                className={`border-2 border-slate-700 rounded-lg bg-white text-slate-900 avoid-break shadow-2xs ${
                                  floorLayoutDensity === 'compact' ? 'p-1.5' : 'p-2'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200 text-[11px] font-bold text-slate-800">
                                  <span>বেঞ্চ নং {bench.benchNumber}</span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {bench.seats.length} জন
                                  </span>
                                </div>

                                {/* Seats on this bench */}
                                <div
                                  className="gap-1.5"
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${bench.seats.length}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {bench.seats.map((seat, sIdx) => {
                                    if (!seat) {
                                      return (
                                        <div
                                          key={sIdx}
                                          className="p-1 border border-dashed border-slate-300 rounded text-center bg-slate-50 text-[10px] text-slate-400 italic"
                                        >
                                          আসন {sIdx + 1}: খালি
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={seat.id}
                                        className="p-1.5 border border-slate-400 rounded bg-slate-50/70 flex flex-col justify-between"
                                      >
                                        <div>
                                          <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <span className="text-[10px] font-bold text-indigo-900 truncate">
                                              {seat.student.className}
                                            </span>
                                            <span className="text-[10px] font-black font-mono px-1 py-0.2 bg-white border border-slate-400 rounded text-slate-950">
                                              রোল: {seat.student.roll}
                                            </span>
                                          </div>
                                          <div className="text-[11px] font-bold text-slate-900 truncate">
                                            {seat.student.name}
                                          </div>
                                        </div>
                                        <div className="text-[9px] text-slate-600 mt-1 pt-0.5 border-t border-slate-200 flex justify-between items-center">
                                          <span className="truncate">শাখা: {seat.student.section}</span>
                                          <span className="text-slate-400 shrink-0 font-mono">
                                            {seat.seatLabel}
                                          </span>
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

                  {/* Footer Signatures */}
                  <div className="pt-6 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break border-t border-slate-300">
                    <div className="text-center">
                      <div className="w-40 border-t border-slate-800 pt-1">
                        {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                      </div>
                      <span className="text-[10px] text-slate-500">প্রস্তুতকারীর স্বাক্ষর</span>
                    </div>

                    <div className="text-center">
                      <div className="w-40 border-t border-slate-800 pt-1">
                        {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                      </div>
                      <span className="text-[10px] text-slate-500">অনুমোদনকারীর স্বাক্ষর</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ========================================================
            TEMPLATE 5: BENCH STICKERS / DESK SLIPS
           ======================================================== */}
        {printMode === 'stickers' && (
          <div className="bg-white p-6 md:p-8 border border-slate-300 shadow-sm mx-auto max-w-4xl rounded-lg print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b border-slate-300 pb-3 mb-6 no-print">
              <h2 className="text-base font-bold text-slate-800">বেঞ্চ স্টিকার / ডেস্ক স্লিপ (Printable Desk Cards)</h2>
              <p className="text-xs text-slate-500">
                এই স্লিপগুলো কেটে প্রতিটি বেঞ্চে আঠা বা স্কচটেপ দিয়ে লাগিয়ে দেওয়া যাবে।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPlans.flatMap((plan) =>
                plan.benches.map((bench) => (
                  <div
                    key={`${plan.room.id}-${bench.benchNumber}`}
                    className="p-3.5 border-2 border-dashed border-slate-600 rounded-lg avoid-break bg-white text-slate-900 flex flex-col justify-between"
                  >
                    <div className="border-b border-slate-300 pb-1.5 mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">
                          {examSettings.schoolName}
                        </div>
                        <div className="text-xs font-bold text-indigo-900">
                          {plan.room.name} · বেঞ্চ নং: {bench.benchNumber}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono font-semibold">
                        সারি {bench.benchColumn}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {bench.seats.map((seat, sIdx) => {
                        if (!seat) {
                          return (
                            <div
                              key={sIdx}
                              className="p-2 border border-slate-200 rounded bg-slate-50 text-center text-[10px] text-slate-400 italic"
                            >
                              আসন {sIdx + 1}: খালি
                            </div>
                          );
                        }

                        return (
                          <div
                            key={seat.id}
                            className="p-2 border border-slate-300 rounded flex items-center justify-between bg-slate-50/50"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">{seat.student.name}</div>
                              <div className="text-[10px] text-slate-600">
                                {seat.student.className} · {seat.student.section}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-slate-500 block">রোল নং</span>
                              <span className="text-base font-black font-mono text-slate-950 px-2 py-0.5 bg-white border border-slate-300 rounded inline-block">
                                {seat.student.roll}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500">
                      <span>{examSettings.examName}</span>
                      <span>কাটিং লাইন ✂</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TEMPLATE 6: MASTER SUMMARY (কেন্দ্রীয় নোটিশ বোর্ড)
           ======================================================== */}
        {printMode === 'master' && (
          <div className="bg-white p-8 md:p-10 border border-slate-300 shadow-sm mx-auto max-w-4xl rounded-lg print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {examSettings.schoolName}
              </h1>
              <h2 className="text-base font-semibold text-slate-700 mt-1">
                {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
              </h2>
              <div className="mt-3 inline-block px-6 py-1.5 bg-slate-900 text-white font-bold text-sm tracking-wide rounded uppercase">
                কেন্দ্রীয় সিট প্ল্যান সারসংক্ষেপ নোটিশ (Master Room Summary)
              </div>
            </div>

            <div className="mb-8">
              <table className="w-full text-left text-xs border-collapse border-2 border-slate-900">
                <thead className="bg-slate-100 font-bold border-b-2 border-slate-900">
                  <tr>
                    <th className="border border-slate-900 py-2.5 px-3 text-center w-12">ক্র:</th>
                    <th className="border border-slate-900 py-2.5 px-3">পরীক্ষা কক্ষ</th>
                    <th className="border border-slate-900 py-2.5 px-3">শ্রেণী ও শাখা/বিভাগ</th>
                    <th className="border border-slate-900 py-2.5 px-3 text-center">পরীক্ষার্থী</th>
                    <th className="border border-slate-900 py-2.5 px-3">রোল নম্বর তালিকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {roomPlans.map((plan, idx) => (
                    <tr key={plan.room.id} className="avoid-break">
                      <td className="border border-slate-900 py-3 px-3 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 py-3 px-3 font-bold text-slate-900 bg-slate-50/50">
                        <div>{plan.room.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          মোট আসন: {plan.totalSeats} টি
                        </div>
                      </td>
                      <td className="border border-slate-900 py-3 px-3">
                        <div className="space-y-1">
                          {plan.classSummaries.map((s) => (
                            <div key={`${s.className}-${s.section}`} className="text-xs">
                              <span className="font-bold">{s.className}</span> ({s.section})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-slate-900 py-3 px-3 text-center font-bold font-mono">
                        {plan.allocatedCount} জন
                      </td>
                      <td className="border border-slate-900 py-3 px-3 font-mono font-bold text-indigo-900">
                        <div className="space-y-1">
                          {plan.classSummaries.map((s) => (
                            <div key={`${s.className}-${s.section}`}>{s.rollRangeDisplay}</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-8 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break">
              <div className="text-center">
                <div className="w-40 border-t border-slate-800 pt-1">
                  {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                </div>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-slate-800 pt-1">
                  {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TEMPLATE 7: EXAM EXPENSES & REMUNERATION BILL
            (পরীক্ষার ব্যয় ও প্রত্যবেক্ষক/কর্মচারী সম্মানী বিল)
           ======================================================== */}
        {printMode === 'expenses' && (
          <div className="bg-white p-8 md:p-10 border border-slate-300 shadow-sm mx-auto max-w-5xl rounded-lg print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {examSettings.schoolName}
              </h1>
              <h2 className="text-base font-semibold text-slate-700 mt-1">
                {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear}
              </h2>
              <div className="mt-3 inline-block px-6 py-1.5 bg-slate-900 text-white font-bold text-sm tracking-wide rounded uppercase">
                {expensePrintFilter === 'budget_statement'
                  ? 'পরীক্ষার পূর্ণাঙ্গ আর্থিক ব্যয় ও ভাউচার বিবরণী'
                  : expensePrintFilter === 'committee'
                  ? 'পরীক্ষা কমিটি ও প্রশাসন সম্মানী বিল এবং প্রাপ্তি স্বীকার রেজিস্টার'
                  : expensePrintFilter === 'teachers'
                  ? 'কক্ষ প্রত্যবেক্ষক শিক্ষক সম্মানী বিল ও প্রাপ্তি স্বীকার রেজিস্টার'
                  : expensePrintFilter === 'staff'
                  ? 'পরীক্ষা কর্মচারী সম্মানী বিল ও প্রাপ্তি স্বীকার রেজিস্টার'
                  : 'প্রশাসন, পরীক্ষা কমিটি, শিক্ষক ও কর্মচারী একীভূত সম্মানী বিল এবং প্রাপ্তি স্বীকার রেজিস্টার'}
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-700 mt-2 font-medium">
                <span>পরীক্ষার সময়কাল: <strong>{examSettings.examDate}</strong></span>
                <span>·</span>
                <span>সময়: <strong>{shiftText}</strong></span>
                <span>·</span>
                <span>মোট কক্ষ: <strong>{roomPlans.length} টি</strong></span>
              </div>
            </div>

            {/* CASE 1: REMUNERATION PAY SHEET (প্রশাসন, কমিটি, শিক্ষক ও কর্মচারী সম্মানী বিল) */}
            {expensePrintFilter !== 'budget_statement' && (
              <div className="space-y-6">
                <div className="text-xs font-bold text-slate-900 mb-2 flex justify-between items-center">
                  <span>
                    {expensePrintFilter === 'committee'
                      ? 'পরীক্ষা কমিটি ও প্রশাসন সদস্যদের সম্মানী বিবরণী:'
                      : expensePrintFilter === 'teachers'
                      ? 'কক্ষ প্রত্যবেক্ষক শিক্ষকদের ডিউটি ও সম্মানী বিবরণী:'
                      : expensePrintFilter === 'staff'
                      ? 'পরীক্ষা কর্মচারীদের ডিউটি ও সম্মানী বিবরণী:'
                      : 'প্রশাসন, পরীক্ষা কমিটি, শিক্ষক ও কর্মচারীদের সম্মানী ও প্রাপ্তি স্বীকার তালিকা:'}
                  </span>
                  <span className="text-[11px] text-slate-600 font-normal">
                    অর্থবছর / শিক্ষাবর্ষ: {examSettings.academicYear} · পরীক্ষা দিবস: {cyclicRoster.totalDays} দিন
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse border-2 border-slate-900 mb-6">
                  <thead className="bg-slate-100 font-bold border-b-2 border-slate-900 text-[11px]">
                    <tr>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-10">ক্র:</th>
                      <th className="border border-slate-900 py-2.5 px-3 w-40">নাম</th>
                      <th className="border border-slate-900 py-2.5 px-3">পদবী ও বিষয়</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-28">দায়িত্ব</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-24">ডিউটি/দিন</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-right w-24">হার (টাকা)</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-right w-32">মোট প্রাপ্য (৳)</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-center w-36">
                        রাজস্ব স্ট্যাম্প ও স্বাক্ষর
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {/* Committee Members */}
                    {(expensePrintFilter === 'all' || expensePrintFilter === 'committee') &&
                      committee.map((member, idx) => (
                        <tr key={member.id} className="avoid-break hover:bg-slate-50/50">
                          <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 font-bold text-slate-900">
                            {member.name}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-slate-800 font-medium">
                            {member.designation}
                          </td>
                          <td className="border border-slate-900 py-2 px-2 text-center font-semibold text-[11px] text-purple-900">
                            প্রশাসন ও কমিটি
                          </td>
                          <td className="border border-slate-900 py-2 px-2 text-center font-semibold text-[11px]">
                            সার্বিক তদারকি
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-right font-mono text-[11px] text-slate-500">
                            এককালীন
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-right font-mono font-black text-slate-950 bg-slate-50">
                            ৳ {member.honorarium.toLocaleString('bn-BD')}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-center">
                            <div className="w-16 h-8 mx-auto border border-dashed border-slate-300 rounded text-[9px] text-slate-400 flex items-center justify-center">
                              স্ট্যাম্প
                            </div>
                          </td>
                        </tr>
                      ))}

                    {/* Teachers */}
                    {(expensePrintFilter === 'all' || expensePrintFilter === 'teachers') &&
                      cyclicRoster.teacherStats.map((stat, idx) => {
                        const total = stat.totalDuties * expenses.invigilationRatePerDuty;
                        const offset = expensePrintFilter === 'all' ? committee.length : 0;
                        return (
                          <tr key={stat.teacher.id} className="avoid-break hover:bg-slate-50/50">
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                              {offset + idx + 1}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 font-bold text-slate-900">
                              {stat.teacher.name}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-slate-700">
                              {stat.teacher.designation} ({stat.teacher.subject || 'সাধারণ'})
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-medium">
                              কক্ষ প্রত্যবেক্ষক
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                              {stat.totalDuties} টি
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-right font-mono">
                              ৳ {expenses.invigilationRatePerDuty}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-right font-mono font-black text-slate-950 bg-slate-50">
                              ৳ {total.toLocaleString('bn-BD')}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-center">
                              <div className="w-16 h-8 mx-auto border border-dashed border-slate-300 rounded text-[9px] text-slate-400 flex items-center justify-center">
                                স্ট্যাম্প
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {/* Staff */}
                    {(expensePrintFilter === 'all' || expensePrintFilter === 'staff') &&
                      staff.map((member, idx) => {
                        const total = member.dutyDays * member.ratePerDay;
                        const offset =
                          expensePrintFilter === 'all'
                            ? committee.length + cyclicRoster.teacherStats.length
                            : 0;
                        return (
                          <tr key={member.id} className="avoid-break hover:bg-slate-50/50">
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                              {offset + idx + 1}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 font-bold text-slate-900">
                              {member.name}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-slate-700">
                              {member.designation}
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-medium">
                              পরীক্ষা কর্মচারী
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                              {member.dutyDays} দিন
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-right font-mono">
                              ৳ {member.ratePerDay}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-right font-mono font-black text-slate-950 bg-slate-50">
                              ৳ {total.toLocaleString('bn-BD')}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 text-center">
                              <div className="w-16 h-8 mx-auto border border-dashed border-slate-300 rounded text-[9px] text-slate-400 flex items-center justify-center">
                                স্ট্যাম্প
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
                    <tr>
                      <td colSpan={6} className="border border-slate-900 py-2.5 px-3 text-right text-slate-900 font-black">
                        সর্বমোট প্রদেয় সম্মানী ও ভাতা বিল ({expensePrintFilter === 'all' ? 'সকল খাত' : expensePrintFilter === 'committee' ? 'প্রশাসন ও কমিটি' : expensePrintFilter === 'teachers' ? 'প্রত্যবেক্ষক শিক্ষক' : 'কর্মচারী'}):
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-sm text-slate-950">
                        ৳{' '}
                        {(
                          (expensePrintFilter === 'all' || expensePrintFilter === 'committee'
                            ? committee.reduce((s, m) => s + (Number(m.honorarium) || 0), 0)
                            : 0) +
                          (expensePrintFilter === 'all' || expensePrintFilter === 'teachers'
                            ? cyclicRoster.totalDutySlots * expenses.invigilationRatePerDuty
                            : 0) +
                          (expensePrintFilter === 'all' || expensePrintFilter === 'staff'
                            ? staff.reduce((s, m) => s + m.dutyDays * m.ratePerDay, 0)
                            : 0)
                        ).toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in words & Certification note */}
                <div className="p-3 bg-slate-50 border border-slate-400 rounded text-xs text-slate-800 avoid-break leading-relaxed">
                  <div>
                    <strong>প্রত্যয়ন করা যাচ্ছে যে,</strong> উপরোক্ত তালিকায় বর্ণিত প্রশাসন, পরীক্ষা কমিটির সদস্য, শিক্ষক ও কর্মচারীবৃন্দ উল্লিখিত তারিখে সুষ্ঠু ও শান্তিপূর্ণভাবে পরীক্ষা পরিচালনায় স্বশরীরে উপস্থিত থেকে নিজ নিজ দায়িত্ব পালন করেছেন এবং তাঁদের নামে ধার্যকৃত সম্মানী প্রদান করা হলো।
                  </div>
                </div>

                {/* 4 Signatures */}
                <div className="pt-10 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break">
                  <div className="text-center">
                    <div className="w-36 border-t border-slate-800 pt-1">প্রস্তুতকারীর স্বাক্ষর</div>
                  </div>
                  <div className="text-center">
                    <div className="w-36 border-t border-slate-800 pt-1">হিসাব সহকারী / কোষাধ্যক্ষ</div>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-t border-slate-800 pt-1">
                      {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-t border-slate-800 pt-1">
                      {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CASE 2: MASTER EXAM EXPENDITURE STATEMENT (পরীক্ষার পূর্ণাঙ্গ আর্থিক ব্যয় বিবরণী) */}
            {expensePrintFilter === 'budget_statement' && (
              <div className="space-y-6">
                <div className="text-xs font-bold text-slate-900 mb-2 flex justify-between items-center">
                  <span>পরীক্ষার সমুদয় ব্যয় ও খরচের খাতভিত্তিক চূড়ান্ত বিবরণী:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    অর্থবছর / শিক্ষাবর্ষ: {examSettings.academicYear}
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse border-2 border-slate-900 mb-6">
                  <thead className="bg-slate-100 font-bold border-b-2 border-slate-900 text-[11px]">
                    <tr>
                      <th className="border border-slate-900 py-2.5 px-3 text-center w-12">ক্র:</th>
                      <th className="border border-slate-900 py-2.5 px-4 w-72">ব্যয়ের খাত</th>
                      <th className="border border-slate-900 py-2.5 px-4">পরিমাণ / বিবরণ</th>
                      <th className="border border-slate-900 py-2.5 px-4 text-right w-36">মোট টাকা (৳)</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-center w-28">মন্তব্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {/* Item 1: Invigilation */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">১</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        শিক্ষকের কক্ষ প্রত্যবেক্ষণ ভাতা
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        {cyclicRoster.totalDutySlots} টি স্লট × ৳{expenses.invigilationRatePerDuty} (সকল পরীক্ষা দিবস)
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳{' '}
                        {(cyclicRoster.totalDutySlots * expenses.invigilationRatePerDuty).toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        সাইক্লিক রোটেশন
                      </td>
                    </tr>

                    {/* Item 2: Committee & Administration */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">২</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        পরীক্ষা কমিটি ও প্রশাসন সম্মাননা
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        প্রধান শিক্ষক, সহকারী প্রধান, আহ্বায়ক ও সদস্যবৃন্দ (মোট {committee.length} জন)
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳{' '}
                        {committee
                          .reduce((sum, m) => sum + (Number(m.honorarium) || 0), 0)
                          .toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        অনুমোদিত বিল
                      </td>
                    </tr>

                    {/* Item 3: Staff */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৩</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        পরীক্ষা কর্মচারী সম্মানী বিল
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        মোট {staff.length} জন কর্মচারী ({cyclicRoster.totalDays} দিনের পরীক্ষা)
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳{' '}
                        {staff
                          .reduce((sum, m) => sum + m.dutyDays * m.ratePerDay, 0)
                          .toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        অফিস ও হল ডিউটি
                      </td>
                    </tr>

                    {/* Item 4: Script Evaluation */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৪</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        খাতা / উত্তরপত্র মূল্যায়ন ভাতা
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        মোট {expenses.scriptCount} টি খাতা × ৳{expenses.scriptEvaluationRatePerScript}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳{' '}
                        {(
                          expenses.scriptCount * expenses.scriptEvaluationRatePerScript
                        ).toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        পরীক্ষকগণ
                      </td>
                    </tr>

                    {/* Item 5: Question Setting */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৫</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        প্রশ্নপত্র প্রণয়ন ও মডারেটিং ভাতা
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        সকল বিষয়ের প্রশ্ন প্রণয়ন, কম্পোজ ও মডারেশন
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳ {expenses.questionSettingAndModerationCost.toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        গোপনীয়
                      </td>
                    </tr>

                    {/* Item 6: Paper Cost */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৬</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        কাগজের দাম (Paper Cost)
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        {expenses.paperReams} রিম × ৳{expenses.paperRatePerReam}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳ {expenses.paperCost.toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        উত্তরপত্র ও প্রশ্ন
                      </td>
                    </tr>

                    {/* Item 7: Pen & Stationery */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৭</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        কলম ও আনুষঙ্গিক স্টেশনারি
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        লাল/কালো বলপেন, পেন্সিল, জেমক্লিপ, স্কেল
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳ {expenses.penCost.toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500"></td>
                    </tr>

                    {/* Item 8: OMR Sheet */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৮</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        OMR শিট মুদ্রণ ব্যয়
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        {expenses.omrSheetCount} টি ওএমআর শিট × ৳{expenses.omrSheetRate}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳ {expenses.omrSheetCost.toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500">
                        এমসিকিউ
                      </td>
                    </tr>

                    {/* Item 9: Refreshment */}
                    <tr className="avoid-break">
                      <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">৯</td>
                      <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                        আপ্যায়ন ব্যয় (Refreshment)
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                        পরীক্ষা চলাকালীন শিক্ষক, কর্মকর্তা ও কর্মচারীদের চা, বিস্কুট ও নাস্তা
                      </td>
                      <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                        ৳ {expenses.refreshmentCost.toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500"></td>
                    </tr>

                    {/* Custom items */}
                    {expenses.customExpenses.map((cItem, cIdx) => (
                      <tr key={cItem.id} className="avoid-break">
                        <td className="border border-slate-900 py-2.5 px-3 text-center font-mono font-bold">
                          {10 + cIdx}
                        </td>
                        <td className="border border-slate-900 py-2.5 px-4 font-bold text-slate-900">
                          {cItem.title}
                        </td>
                        <td className="border border-slate-900 py-2.5 px-4 text-slate-700">
                          {cItem.note || 'আনুষঙ্গিক পরীক্ষা ব্যয়'}
                        </td>
                        <td className="border border-slate-900 py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                          ৳ {cItem.amount.toLocaleString('bn-BD')}
                        </td>
                        <td className="border border-slate-900 py-2.5 px-3 text-center text-[10px] text-slate-500"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-sm">
                    <tr>
                      <td colSpan={3} className="border border-slate-900 py-3 px-4 text-right text-slate-900 font-black">
                        সর্বমোট পরীক্ষা সংক্রান্ত ব্যয়:
                      </td>
                      <td className="border border-slate-900 py-3 px-4 text-right font-mono font-black text-base text-slate-950">
                        ৳{' '}
                        {(
                          cyclicRoster.totalDutySlots * expenses.invigilationRatePerDuty +
                          committee.reduce((s, m) => s + (Number(m.honorarium) || 0), 0) +
                          staff.reduce((s, m) => s + m.dutyDays * m.ratePerDay, 0) +
                          expenses.paperCost +
                          expenses.penCost +
                          expenses.scriptCount * expenses.scriptEvaluationRatePerScript +
                          expenses.questionSettingAndModerationCost +
                          expenses.omrSheetCost +
                          expenses.refreshmentCost +
                          expenses.customExpenses.reduce((s, i) => s + i.amount, 0)
                        ).toLocaleString('bn-BD')}
                      </td>
                      <td className="border border-slate-900"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Voucher Note */}
                <div className="p-3 bg-slate-50 border border-slate-400 rounded text-xs text-slate-800 avoid-break leading-relaxed">
                  <div>
                    <strong>অফিস ভাউচার নোট:</strong> {examSettings.examName} সুচারুরূপে পরিচালনার জন্য উপর্যুক্ত ব্যয়সমূহ অনুমোদিত বরাদ্দ থেকে নির্বাহ করা হলো। যাবতীয় ভাউচার ও রশিদ নথিভুক্ত আছে।
                  </div>
                </div>

                {/* 3 Signatures */}
                <div className="pt-10 flex justify-between items-end text-xs font-semibold text-slate-800 avoid-break">
                  <div className="text-center">
                    <div className="w-40 border-t border-slate-800 pt-1">হিসাব সহকারী / কোষাধ্যক্ষ</div>
                  </div>
                  <div className="text-center">
                    <div className="w-44 border-t border-slate-800 pt-1">
                      {examSettings.examControllerTitle || 'পরীক্ষা আহ্বায়ক / কেন্দ্র সচিব'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-44 border-t border-slate-800 pt-1">
                      {examSettings.headmasterTitle || 'প্রধান শিক্ষক'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


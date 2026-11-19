import React, { useState, useMemo, useEffect } from 'react';
import {
  Student,
  RoomConfig,
  AllocationStrategy,
  ExamSettings,
  Invigilator,
  ExamExpenses,
  StaffMember,
  CommitteeMember,
  DutyOverride,
  SeatVariant,
  VariantSeatConfig,
  SeatAllocation,
  RoomConfig as RoomCfg,
} from './types/seatPlan';
import { SAMPLE_STUDENTS } from './data/sampleStudents';
import { SAMPLE_TEACHERS } from './data/sampleTeachers';
import { DEFAULT_EXAM_ROUTINE } from './data/defaultExamRoutine';
import { SAMPLE_STAFF, DEFAULT_EXAM_EXPENSES, SAMPLE_COMMITTEE } from './data/sampleStaff';
import { getRoomCapacity as roomCapacity } from './utils/seatAllocator';
import { buildVariantPlan, SegmentReport } from './utils/seatRules';
import { SeatRulesStep } from './components/SeatRulesStep';
import {
  describeVariants,
  normalizeClassName,
  DEFAULT_CLASS_SESSIONS,
  DEFAULT_MORNING_SHIFT,
  DEFAULT_AFTERNOON_SHIFT,
  getShiftText,
} from './utils/examSchedule';
import { generateCyclicDutyRoster } from './utils/dutyRosterGenerator';
import { downloadSampleExcel } from './utils/excelParser';
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  clearAllStoredData,
  downloadBackupFile,
  readBackupFile,
  FullExamBackup,
} from './utils/storage';
import { Header } from './components/Header';
import { StudentUploadStep } from './components/StudentUploadStep';
import { RoomConfigStep } from './components/RoomConfigStep';
import { TeacherDutyStep } from './components/TeacherDutyStep';
import { ExpenseStep } from './components/ExpenseStep';
import { SeatPlanPreview } from './components/SeatPlanPreview';
import { PrintTemplates } from './components/PrintTemplates';
import { ExamSettingsModal } from './components/ExamSettingsModal';
import { StudentSearchModal } from './components/StudentSearchModal';
import { DownloadModal } from './components/DownloadModal';

const DEFAULT_ROOMS: RoomConfig[] = [
  {
    id: 'room-101',
    name: 'কক্ষ নং ১০১',
    benchCount: 15,
    studentsPerBench: 2,
    columnsCount: 2,
    columnConfigs: [
      { columnIndex: 1, columnName: 'কলাম ১ (বাম সারি)', benchCount: 8, studentsPerBench: 2 },
      { columnIndex: 2, columnName: 'কলাম ২ (ডান সারি)', benchCount: 7, studentsPerBench: 2 },
    ],
    benchOrder: 'column_wise',
  },
  {
    id: 'room-102',
    name: 'কক্ষ নং ১০২',
    benchCount: 15,
    studentsPerBench: 2,
    columnsCount: 2,
    columnConfigs: [
      { columnIndex: 1, columnName: 'কলাম ১ (বাম সারি)', benchCount: 8, studentsPerBench: 2 },
      { columnIndex: 2, columnName: 'কলাম ২ (ডান সারি)', benchCount: 7, studentsPerBench: 2 },
    ],
    benchOrder: 'column_wise',
  },
];

const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  schoolName: 'হেসাখাল বাজার উচ্চ বিদ্যালয়',
  examName: 'বার্ষিক পরীক্ষা-২০২৬ (৬ষ্ঠ – ৯ম শ্রেণী)',
  academicYear: '২০২৬',
  examDate: '১৯-১১-২০২৬ থেকে ০৬-১২-২০২৬',
  shift: DEFAULT_MORNING_SHIFT,
  morningShift: DEFAULT_MORNING_SHIFT,
  afternoonShift: DEFAULT_AFTERNOON_SHIFT,
  classSessions: { ...DEFAULT_CLASS_SESSIONS },
  headmasterTitle: 'প্রধান শিক্ষক / পরীক্ষা আহ্বায়ক',
  examControllerTitle: 'কক্ষ প্রত্যবেক্ষক',
  headmasterName: 'মো: আবুল খায়ের',
  assistantHeadName: 'মো: আলমগীর হোসাইন চৌধুরী',
  examConvenerName: 'মো: মায়েন উদ্দিন',
  subjects: DEFAULT_EXAM_ROUTINE,
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'students' | 'rooms' | 'teachers' | 'expenses' | 'seats' | 'preview' | 'print'>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, 'students')
  );

  // Core Data loaded persistently from localStorage
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage(STORAGE_KEYS.STUDENTS, SAMPLE_STUDENTS)
  );
  const [teachers, setTeachers] = useState<Invigilator[]>(() =>
    loadFromStorage(STORAGE_KEYS.TEACHERS, SAMPLE_TEACHERS)
  );
  const [staff, setStaff] = useState<StaffMember[]>(() =>
    loadFromStorage(STORAGE_KEYS.STAFF, SAMPLE_STAFF)
  );
  const [committee, setCommittee] = useState<CommitteeMember[]>(() =>
    loadFromStorage(STORAGE_KEYS.COMMITTEE, SAMPLE_COMMITTEE)
  );
  const [dutyOverrides, setDutyOverrides] = useState<DutyOverride[]>(() =>
    loadFromStorage(STORAGE_KEYS.DUTY_OVERRIDES, [])
  );
  const [expenses, setExpenses] = useState<ExamExpenses>(() =>
    loadFromStorage(STORAGE_KEYS.EXPENSES, DEFAULT_EXAM_EXPENSES)
  );
  const [rooms, setRooms] = useState<RoomConfig[]>(() =>
    loadFromStorage(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS)
  );
  const [strategy, setStrategy] = useState<AllocationStrategy>(() =>
    loadFromStorage(STORAGE_KEYS.STRATEGY, 'interleave_classes')
  );
  const [examSettings, setExamSettings] = useState<ExamSettings>(() => {
    const saved = loadFromStorage<ExamSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_EXAM_SETTINGS);
    // পুরনো (শিফটবিহীন) রুটিন হলে নতুন সকাল/বিকাল রুটিনে আপগ্রেড
    if (!saved.subjects || !saved.subjects.some((x) => x.classSubjects)) {
      return {
        ...saved,
        subjects: DEFAULT_EXAM_ROUTINE,
        classSessions: saved.classSessions || { ...DEFAULT_CLASS_SESSIONS },
        morningShift: saved.morningShift || DEFAULT_MORNING_SHIFT,
        afternoonShift: saved.afternoonShift || DEFAULT_AFTERNOON_SHIFT,
        examName: DEFAULT_EXAM_SETTINGS.examName,
        examDate: DEFAULT_EXAM_SETTINGS.examDate,
      };
    }
    return saved;
  });
  const [seatConfigs, setSeatConfigs] = useState<Record<string, VariantSeatConfig>>(() =>
    loadFromStorage('manha_seatplan_seatconfigs_v2', {})
  );
  const [selectedVariantKey, setSelectedVariantKey] = useState<string>('');
  useEffect(() => {
    saveToStorage('manha_seatplan_seatconfigs_v2', seatConfigs);
  }, [seatConfigs]);

  // Auto-save effects to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STUDENTS, students);
  }, [students]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TEACHERS, teachers);
  }, [teachers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STAFF, staff);
  }, [staff]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.COMMITTEE, committee);
  }, [committee]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DUTY_OVERRIDES, dutyOverrides);
  }, [dutyOverrides]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ROOMS, rooms);
  }, [rooms]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STRATEGY, strategy);
  }, [strategy]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, examSettings);
  }, [examSettings]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // PWA Install Prompt Handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const periods = useMemo(
    () => (examSettings.subjects && examSettings.subjects.length > 0 ? examSettings.subjects : DEFAULT_EXAM_ROUTINE),
    [examSettings.subjects]
  );

  // শিফট + শ্রেণী-সেট অনুযায়ী সিট প্ল্যান ভ্যারিয়েন্ট
  const { variants, reportsByVariant } = useMemo(() => {
    let descs = describeVariants(periods, students, examSettings);
    if (!descs.length && students.length) {
      const classes = Array.from(new Set(students.map((x) => normalizeClassName(x.className))));
      descs = [{ key: 'morning|all', session: 'morning', classes, label: 'সকল শ্রেণী', periodIds: [] }];
    }
    const reports: Record<string, SegmentReport[]> = {};
    const list: SeatVariant[] = descs.map((d) => {
      const vs = students.filter((x) => d.classes.includes(normalizeClassName(x.className)));
      const res = buildVariantPlan(vs, rooms, strategy, teachers, seatConfigs[d.key]);
      reports[d.key] = res.reports;
      return {
        key: d.key,
        session: d.session,
        classes: d.classes,
        label: d.label,
        periodIds: d.periodIds,
        roomPlans: res.roomPlans,
        unallocatedStudents: res.unallocatedStudents,
        totalSeats: res.totalSeats,
        totalStudents: res.totalStudents,
      };
    });
    return { variants: list, reportsByVariant: reports };
  }, [periods, students, rooms, strategy, teachers, seatConfigs, examSettings]);

  const selectedVariant: SeatVariant | undefined =
    variants.find((v) => v.key === selectedVariantKey) || variants[0];
  const roomPlans = selectedVariant ? selectedVariant.roomPlans : [];
  const unallocatedStudents = selectedVariant ? selectedVariant.unallocatedStudents : [];
  const totalSeats = useMemo(
    () => rooms.reduce((acc, r) => acc + (r.benchCount ? roomCapacity(r) : 0), 0),
    [rooms]
  );

  // প্রতি পরীক্ষা-বেলায় যে কক্ষগুলো আসলে ব্যবহৃত হয়
  const periodRooms = useMemo(() => {
    const map: Record<string, RoomCfg[]> = {};
    periods.forEach((p) => {
      const v = variants.find((x) => x.periodIds.includes(p.id)) || variants[0];
      map[p.id] = v ? v.roomPlans.filter((rp) => rp.allocatedCount > 0).map((rp) => rp.room) : [];
    });
    return map;
  }, [periods, variants]);

  const cyclicRoster = useMemo(
    () => generateCyclicDutyRoster(rooms, teachers, periods, dutyOverrides, periodRooms),
    [rooms, teachers, periods, dutyOverrides, periodRooms]
  );

  const allAllocations = useMemo(() => {
    const out: SeatAllocation[] = [];
    variants.forEach((v) =>
      v.roomPlans.forEach((p) => p.allocations.forEach((a) => out.push({ ...a, variantLabel: v.label })))
    );
    return out;
  }, [variants]);

  const variantPeriods = useMemo(
    () => (selectedVariant ? periods.filter((p) => selectedVariant.periodIds.includes(p.id)) : periods),
    [periods, selectedVariant]
  );
  const studentClasses = useMemo(
    () => Array.from(new Set(students.map((x) => x.className))),
    [students]
  );

  // Backup & Restore Handlers
  const handleExportBackup = () => {
    const backup: FullExamBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      students,
      rooms,
      teachers,
      staff,
      committee,
      dutyOverrides,
      expenses,
      strategy,
      examSettings,
      seatConfigs,
    };
    downloadBackupFile(backup);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const data = await readBackupFile(file);
      if (data.students && Array.isArray(data.students)) setStudents(data.students);
      if (data.rooms && Array.isArray(data.rooms)) setRooms(data.rooms);
      if (data.teachers && Array.isArray(data.teachers)) setTeachers(data.teachers);
      if (data.staff && Array.isArray(data.staff)) setStaff(data.staff);
      if (data.committee && Array.isArray(data.committee)) setCommittee(data.committee);
      if (data.dutyOverrides && Array.isArray(data.dutyOverrides)) setDutyOverrides(data.dutyOverrides);
      if (data.expenses && typeof data.expenses === 'object') setExpenses(data.expenses);
      if (data.strategy) setStrategy(data.strategy);
      if ((data as any).seatConfigs) setSeatConfigs((data as any).seatConfigs);
      if (data.examSettings && typeof data.examSettings === 'object') setExamSettings(data.examSettings);
      alert('অভিনন্দন! ব্যাকআপ ফাইল থেকে সকল শিক্ষার্থী ও পরীক্ষার ডেটা সফলভাবে রিস্টোর হয়েছে।');
      setIsSettingsOpen(false);
    } catch (err: any) {
      alert(`ত্রুটি: ${err?.message || 'ব্যাকআপ ফাইলটি লোড করা যায়নি'}`);
    }
  };

  const handleResetAllData = () => {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত সংরক্ষিত ডেটা মুছে প্রারম্ভিক ডেমো ডাটায় রিসেট করতে চান?')) {
      clearAllStoredData();
      setStudents(SAMPLE_STUDENTS);
      setRooms(DEFAULT_ROOMS);
      setTeachers(SAMPLE_TEACHERS);
      setStaff(SAMPLE_STAFF);
      setCommittee(SAMPLE_COMMITTEE);
      setDutyOverrides([]);
      setSeatConfigs({});
      setExpenses(DEFAULT_EXAM_EXPENSES);
      setStrategy('interleave_classes');
      setExamSettings(DEFAULT_EXAM_SETTINGS);
      setActiveTab('students');
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Hind_Siliguri','Inter',sans-serif]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        examSettings={examSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onDownloadSample={downloadSampleExcel}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        studentCount={students.length}
        roomCount={rooms.length}
        totalSeats={totalSeats}
        teacherCount={teachers.length}
        isSaved={true}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'students' && (
          <StudentUploadStep
            students={students}
            setStudents={setStudents}
            onProceedToRooms={() => setActiveTab('rooms')}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomConfigStep
            rooms={rooms}
            setRooms={setRooms}
            strategy={strategy}
            setStrategy={setStrategy}
            students={students}
            onGeneratePlan={() => setActiveTab('teachers')}
          />
        )}

        {activeTab === 'teachers' && (
          <TeacherDutyStep
            teachers={teachers}
            setTeachers={setTeachers}
            rooms={rooms}
            setRooms={setRooms}
            roomPlans={roomPlans}
            examSettings={examSettings}
            setExamSettings={setExamSettings}
            dutyOverrides={dutyOverrides}
            setDutyOverrides={setDutyOverrides}
            cyclicRoster={cyclicRoster}
            studentClasses={studentClasses}
            onProceedToPreview={() => setActiveTab('preview')}
            onProceedToPrint={() => setActiveTab('print')}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseStep
            expenses={expenses}
            setExpenses={setExpenses}
            staff={staff}
            setStaff={setStaff}
            committee={committee}
            setCommittee={setCommittee}
            teachers={teachers}
            cyclicRoster={cyclicRoster}
            examSettings={examSettings}
            onProceedToPrint={() => setActiveTab('print')}
          />
        )}

        {activeTab === 'seats' && (
          <SeatRulesStep
            variants={variants}
            reportsByVariant={reportsByVariant}
            selectedVariantKey={selectedVariant?.key || ''}
            setSelectedVariantKey={setSelectedVariantKey}
            seatConfigs={seatConfigs}
            setSeatConfigs={setSeatConfigs}
            students={students}
            rooms={rooms}
            onProceedToPreview={() => setActiveTab('preview')}
          />
        )}

        {(activeTab === 'preview' || activeTab === 'print') && variants.length > 0 && (
          <div className="no-print mb-4 bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">সিট প্ল্যান নির্বাচন:</span>
            {variants.map((v) => (
              <button
                key={v.key}
                onClick={() => setSelectedVariantKey(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  v.key === selectedVariant?.key
                    ? v.session === 'morning'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'preview' && (
          <SeatPlanPreview
            roomPlans={roomPlans}
            unallocatedStudents={unallocatedStudents}
            examSettings={examSettings}
            onProceedToPrint={() => setActiveTab('print')}
          />
        )}

        {activeTab === 'print' && (
          <PrintTemplates
            roomPlans={roomPlans}
            examSettings={examSettings}
            teachers={teachers}
            staff={staff}
            committee={committee}
            dutyOverrides={dutyOverrides}
            expenses={expenses}
            variantLabel={selectedVariant?.label}
            variantSession={selectedVariant?.session}
            variantPeriods={variantPeriods}
            cyclicRoster={cyclicRoster}
            allRooms={rooms}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            {examSettings.schoolName} · স্বয়ংক্রিয় পরীক্ষা সিট প্ল্যান ও এডমিট ম্যানেজমেন্ট সিস্টেম
          </p>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span>কারিগরি সহায়তায়:</span>
            <span className="font-bold text-indigo-600 tracking-wide hover:text-indigo-800 transition-colors">
              ManHa IT
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExamSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={examSettings}
        onSave={setExamSettings}
        committee={committee}
        onSaveCommittee={setCommittee}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetAllData={handleResetAllData}
      />

      <StudentSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        allAllocations={allAllocations}
      />

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
      />
    </div>
  );
}

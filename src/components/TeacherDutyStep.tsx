import React, { useState, useMemo, useRef } from 'react';
import {
  Invigilator,
  RoomConfig,
  RoomPlan,
  ExamSettings,
  ExamSubject,
  DutyOverride,
  DayDutySchedule,
  FullDutyRoster,
} from '../types/seatPlan';
import { RoutineMatrixEditor } from './RoutineMatrixEditor';
import { SAMPLE_TEACHERS } from '../data/sampleTeachers';
import { DEFAULT_EXAM_ROUTINE } from '../data/defaultExamRoutine';
import { generateCyclicDutyRoster } from '../utils/dutyRosterGenerator';
import {
  downloadSampleTeacherExcel,
  parseTeacherExcel,
  downloadSampleRoutineExcel,
  parseRoutineExcel,
} from '../utils/excelParser';
import {
  Users,
  UserCheck,
  Plus,
  Trash2,
  RefreshCw,
  School,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Phone,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Printer,
  RotateCw,
  Edit2,
  Save,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Clock,
  RotateCcw,
  ArrowLeftRight,
  UserPlus,
  History,
} from 'lucide-react';

interface Props {
  teachers: Invigilator[];
  setTeachers: React.Dispatch<React.SetStateAction<Invigilator[]>>;
  rooms: RoomConfig[];
  setRooms: React.Dispatch<React.SetStateAction<RoomConfig[]>>;
  roomPlans: RoomPlan[];
  examSettings?: ExamSettings;
  setExamSettings?: React.Dispatch<React.SetStateAction<ExamSettings>>;
  dutyOverrides?: DutyOverride[];
  setDutyOverrides?: React.Dispatch<React.SetStateAction<DutyOverride[]>>;
  cyclicRoster?: FullDutyRoster; // App থেকে শিফটভিত্তিক রোস্টার
  studentClasses?: string[];
  onProceedToPreview: () => void;
  onProceedToPrint?: () => void;
}

interface SubstituteModalState {
  dateId: string;
  date: string;
  day: string;
  subjectName: string;
  roomId: string;
  roomName: string;
  slotIndex: number;
  currentTeacher: Invigilator;
  overrideInfo?: DutyOverride | null;
}

export const TeacherDutyStep: React.FC<Props> = ({
  teachers,
  setTeachers,
  rooms,
  setRooms,
  roomPlans,
  examSettings,
  setExamSettings,
  dutyOverrides = [],
  setDutyOverrides,
  cyclicRoster: cyclicRosterProp,
  studentClasses = [],
  onProceedToPreview,
  onProceedToPrint,
}) => {
  // Main view switcher
  const [activeView, setActiveView] = useState<'teachers' | 'routine' | 'cyclic_roster' | 'substitutions' | 'room_view'>(
    'teachers'
  );

  // Teacher Management States
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherMessage, setTeacherMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    designation: 'সহকারী শিক্ষক',
    subject: '',
    phone: '',
  });

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({
    name: '',
    designation: '',
    subject: '',
    phone: '',
  });

  // Routine Management States
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [routineMessage, setRoutineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRoutineItem, setNewRoutineItem] = useState({
    date: '',
    day: '',
    subjectName: '',
  });

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({
    date: '',
    day: '',
    subjectName: '',
  });

  // Date filter for cyclic roster
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');

  // Duty Substitution & Swap States
  const [substituteModal, setSubstituteModal] = useState<SubstituteModalState | null>(null);
  const [substituteMode, setSubstituteMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingTeacherId, setSelectedExistingTeacherId] = useState<string>('');
  const [newSubTeacherName, setNewSubTeacherName] = useState<string>('');
  const [newSubTeacherDesignation, setNewSubTeacherDesignation] = useState<string>('সহকারী শিক্ষক (বদলি)');
  const [newSubTeacherSubject, setNewSubTeacherSubject] = useState<string>('');
  const [newSubTeacherPhone, setNewSubTeacherPhone] = useState<string>('');
  const [saveToPermanentTeachers, setSaveToPermanentTeachers] = useState<boolean>(true);
  const [substituteReason, setSubstituteReason] = useState<string>('ছুটিজনিত কারণে বদলি');
  const [multiSelectedDateIds, setMultiSelectedDateIds] = useState<string[]>([]);

  // File upload refs
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const routineFileInputRef = useRef<HTMLInputElement>(null);

  // Active routine subjects
  const subjects: ExamSubject[] = useMemo(() => {
    return examSettings?.subjects && examSettings.subjects.length > 0
      ? examSettings.subjects
      : DEFAULT_EXAM_ROUTINE;
  }, [examSettings?.subjects]);

  // Generate full cyclic duty roster based on current rooms, teachers, subjects and manual duty overrides
  const localRoster = useMemo(() => {
    return generateCyclicDutyRoster(rooms, teachers, subjects, dutyOverrides);
  }, [rooms, teachers, subjects, dutyOverrides]);
  const cyclicRoster: FullDutyRoster = cyclicRosterProp || localRoster;

  const totalSlotsPerDay = rooms.length * 2;
  const totalExamDays = subjects.length;
  const totalExamDutySlots = cyclicRoster.totalDutySlots;
  const teacherCount = teachers.length;

  // ---------------- Teacher Actions ----------------
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name.trim()) return;

    const teacherObj: Invigilator = {
      id: `tch-${Date.now()}`,
      name: newTeacher.name.trim(),
      designation: newTeacher.designation.trim() || 'সহকারী শিক্ষক',
      subject: newTeacher.subject.trim() || 'সাধারণ',
      phone: newTeacher.phone.trim() || '—',
    };

    setTeachers((prev) => [...prev, teacherObj]);
    setNewTeacher({ name: '', designation: 'সহকারী শিক্ষক', subject: '', phone: '' });
    setShowAddTeacherModal(false);
    setTeacherMessage({ type: 'success', text: `শিক্ষক "${teacherObj.name}" সফলভাবে যুক্ত হয়েছেন!` });
    setTimeout(() => setTeacherMessage(null), 3000);
  };

  const startEditTeacher = (teacher: Invigilator) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherForm({
      name: teacher.name,
      designation: teacher.designation || 'সহকারী শিক্ষক',
      subject: teacher.subject || '',
      phone: teacher.phone || '',
    });
  };

  const handleSaveEditTeacher = (id: string) => {
    if (!editTeacherForm.name.trim()) return;
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              name: editTeacherForm.name.trim(),
              designation: editTeacherForm.designation.trim() || 'সহকারী শিক্ষক',
              subject: editTeacherForm.subject.trim() || 'সাধারণ',
              phone: editTeacherForm.phone.trim() || '—',
            }
          : t
      )
    );
    setEditingTeacherId(null);
    setTeacherMessage({ type: 'success', text: 'শিক্ষকের তথ্য সফলভাবে আপডেট হয়েছে।' });
    setTimeout(() => setTeacherMessage(null), 3000);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}"-কে তালিকা থেকে মুছে ফেলতে চান?`)) {
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          invigilatorIds: r.invigilatorIds ? r.invigilatorIds.filter((tid) => tid !== id) : undefined,
        }))
      );
      setTeacherMessage({ type: 'success', text: `"${name}" সফলভাবে তালিকা থেকে অপসারিত হয়েছেন।` });
      setTimeout(() => setTeacherMessage(null), 3000);
    }
  };

  const handleResetSampleTeachers = () => {
    if (confirm('আপনি কি পূর্বনির্ধারিত ডামি শিক্ষক তালিকা লোড করতে চান?')) {
      setTeachers([...SAMPLE_TEACHERS]);
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          invigilatorIds: undefined,
        }))
      );
      setTeacherMessage({ type: 'success', text: 'নমুনা শিক্ষক তালিকা সফলভাবে লোড হয়েছে।' });
      setTimeout(() => setTeacherMessage(null), 3000);
    }
  };

  const handleClearAllTeachers = () => {
    if (confirm('আপনি কি নিশ্চিত যে সকল শিক্ষকের তালিকা মুছে ফেলতে চান?')) {
      setTeachers([]);
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          invigilatorIds: undefined,
        }))
      );
      setTeacherMessage({ type: 'success', text: 'সকল শিক্ষকের তালিকা মুছে ফেলা হয়েছে।' });
      setTimeout(() => setTeacherMessage(null), 3000);
    }
  };

  const handleUploadTeacherExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseTeacherExcel(file);
      if (result.error) {
        setTeacherMessage({ type: 'error', text: result.error });
        return;
      }
      if (result.teachers.length > 0) {
        setTeachers(result.teachers);
        setTeacherMessage({
          type: 'success',
          text: `এক্সেল থেকে মোট ${result.teachers.length} জন শিক্ষকের তালিকা সফলভাবে যুক্ত হয়েছে!`,
        });
        setTimeout(() => setTeacherMessage(null), 4000);
      }
    } catch (err: any) {
      setTeacherMessage({ type: 'error', text: err?.message || 'ফাইল আপলোড ব্যর্থ হয়েছে' });
    } finally {
      if (teacherFileInputRef.current) teacherFileInputRef.current.value = '';
    }
  };

  // ---------------- Routine Actions ----------------
  const updateSubjectsList = (newSubjects: ExamSubject[]) => {
    if (setExamSettings) {
      setExamSettings((prev) => ({
        ...prev,
        subjects: newSubjects,
      }));
    }
  };

  const handleAddRoutineSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineItem.subjectName.trim()) return;

    const newItem: ExamSubject = {
      id: `sub-${Date.now()}`,
      date: newRoutineItem.date.trim() || '—',
      day: newRoutineItem.day.trim() || '—',
      subjectName: newRoutineItem.subjectName.trim(),
    };

    updateSubjectsList([...subjects, newItem]);
    setNewRoutineItem({ date: '', day: '', subjectName: '' });
    setShowAddRoutineModal(false);
    setRoutineMessage({ type: 'success', text: `বিষয় "${newItem.subjectName}" রুটিনে যুক্ত হয়েছে!` });
    setTimeout(() => setRoutineMessage(null), 3000);
  };

  const startEditSubject = (sub: ExamSubject) => {
    setEditingSubjectId(sub.id);
    setEditSubjectForm({
      date: sub.date,
      day: sub.day,
      subjectName: sub.subjectName,
    });
  };

  const handleSaveEditSubject = (id: string) => {
    if (!editSubjectForm.subjectName.trim()) return;
    const updated = subjects.map((s) =>
      s.id === id
        ? {
            ...s,
            date: editSubjectForm.date.trim() || '—',
            day: editSubjectForm.day.trim() || '—',
            subjectName: editSubjectForm.subjectName.trim(),
          }
        : s
    );
    updateSubjectsList(updated);
    setEditingSubjectId(null);
    setRoutineMessage({ type: 'success', text: 'রুটিনের তথ্য সফলভাবে আপডেট হয়েছে।' });
    setTimeout(() => setRoutineMessage(null), 3000);
  };

  const handleDeleteSubject = (id: string, subjectName: string) => {
    if (confirm(`আপনি কি রুটিন থেকে "${subjectName}" মুছে ফেলতে চান?`)) {
      const updated = subjects.filter((s) => s.id !== id);
      updateSubjectsList(updated);
      setRoutineMessage({ type: 'success', text: `"${subjectName}" রুটিন থেকে অপসারিত হয়েছে।` });
      setTimeout(() => setRoutineMessage(null), 3000);
    }
  };

  const handleResetDefaultRoutine = () => {
    if (confirm('আপনি কি পূর্বনির্ধারিত মূল পরীক্ষার রুটিন ফিরিয়ে আনতে চান?')) {
      updateSubjectsList([...DEFAULT_EXAM_ROUTINE]);
      setRoutineMessage({ type: 'success', text: 'মূল পরীক্ষার রুটিন সফলভাবে রিস্টোর হয়েছে।' });
      setTimeout(() => setRoutineMessage(null), 3000);
    }
  };

  const handleClearAllRoutine = () => {
    if (confirm('আপনি কি সম্পূর্ণ পরীক্ষার রুটিন মুছে ফেলতে চান?')) {
      updateSubjectsList([]);
      setRoutineMessage({ type: 'success', text: 'সম্পূর্ণ পরীক্ষার রুটিন মুছে ফেলা হয়েছে।' });
      setTimeout(() => setRoutineMessage(null), 3000);
    }
  };

  const handleUploadRoutineExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseRoutineExcel(file);
      if (result.error) {
        setRoutineMessage({ type: 'error', text: result.error });
        return;
      }
      if (result.subjects.length > 0) {
        updateSubjectsList(result.subjects);
        setRoutineMessage({
          type: 'success',
          text: `এক্সেল থেকে মোট ${result.subjects.length} টি পরীক্ষার রুটিন সফলভাবে লোড হয়েছে!`,
        });
        setTimeout(() => setRoutineMessage(null), 4000);
      }
    } catch (err: any) {
      setRoutineMessage({ type: 'error', text: err?.message || 'রুটিন ফাইল আপলোড ব্যর্থ হয়েছে' });
    } finally {
      if (routineFileInputRef.current) routineFileInputRef.current.value = '';
    }
  };

  // ---------------- Room Slot Actions ----------------
  const handleAssignTeacherToRoomSlot = (
    roomId: string,
    slotIndex: 0 | 1,
    selectedTeacherId: string
  ) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const currentPlan = roomPlans.find((p) => p.room.id === roomId);
        const currentInvIds = r.invigilatorIds
          ? [...r.invigilatorIds]
          : currentPlan
          ? currentPlan.invigilators.map((i) => i.id)
          : [];

        currentInvIds[slotIndex] = selectedTeacherId;
        return {
          ...r,
          invigilatorIds: currentInvIds.filter(Boolean),
        };
      })
    );
  };

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const query = teacherSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.designation || '').toLowerCase().includes(query) ||
        (t.subject || '').toLowerCase().includes(query) ||
        (t.phone || '').includes(query)
    );
  }, [teachers, teacherSearch]);

  const filteredDaySchedules =
    selectedDateFilter === 'ALL'
      ? cyclicRoster.daySchedules
      : cyclicRoster.daySchedules.filter((d) => d.dateId === selectedDateFilter);

  // ---------------- Duty Substitution Handlers ----------------
  const handleOpenSubstituteModal = (
    daySchedule: DayDutySchedule,
    room: RoomConfig,
    slotIndex: number,
    currentTeacher: Invigilator,
    overrideInfo?: DutyOverride | null
  ) => {
    setSubstituteModal({
      dateId: daySchedule.dateId,
      date: daySchedule.date,
      day: daySchedule.day,
      subjectName: daySchedule.subjectName,
      roomId: room.id,
      roomName: room.name,
      slotIndex,
      currentTeacher,
      overrideInfo: overrideInfo || null,
    });
    setSubstituteMode(overrideInfo?.isSubstitute ? 'new' : 'existing');
    setSelectedExistingTeacherId(overrideInfo?.assignedTeacher?.id || '');
    setNewSubTeacherName(overrideInfo?.isSubstitute ? overrideInfo.assignedTeacher.name : '');
    setNewSubTeacherDesignation(
      overrideInfo?.isSubstitute ? overrideInfo.assignedTeacher.designation : 'সহকারী শিক্ষক (বদলি)'
    );
    setNewSubTeacherSubject(overrideInfo?.isSubstitute ? overrideInfo.assignedTeacher.subject || '' : '');
    setNewSubTeacherPhone(overrideInfo?.isSubstitute ? overrideInfo.assignedTeacher.phone || '' : '');
    setSubstituteReason(overrideInfo?.reason || 'ছুটিজনিত কারণে বদলি');
    setMultiSelectedDateIds([daySchedule.dateId]);
  };

  const handleSaveSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!substituteModal || !setDutyOverrides) return;

    let targetTeacher: Invigilator;
    let isSub = false;

    if (substituteMode === 'existing') {
      const found = teachers.find((t) => t.id === selectedExistingTeacherId);
      if (!found) {
        alert('অনুগ্রহ করে একজন শিক্ষক নির্বাচন করুন');
        return;
      }
      targetTeacher = found;
    } else {
      if (!newSubTeacherName.trim()) {
        alert('অনুগ্রহ করে নতুন বদলি শিক্ষকের নাম লিখুন');
        return;
      }
      const newId = `sub-${Date.now()}`;
      targetTeacher = {
        id: newId,
        name: newSubTeacherName.trim(),
        designation: newSubTeacherDesignation.trim() || 'সহকারী শিক্ষক (বদলি)',
        subject: newSubTeacherSubject.trim() || 'সাধারণ',
        phone: newSubTeacherPhone.trim() || '—',
      };
      isSub = true;

      // Add to permanent teachers list if opted
      if (saveToPermanentTeachers) {
        setTeachers((prev) => {
          if (prev.some((t) => t.name === targetTeacher.name)) return prev;
          return [...prev, targetTeacher];
        });
      }
    }

    const datesToApply =
      multiSelectedDateIds.length > 0 ? multiSelectedDateIds : [substituteModal.dateId];

    setDutyOverrides((prev) => {
      const filtered = prev.filter(
        (ov) =>
          !(
            datesToApply.includes(ov.dateId) &&
            ov.roomId === substituteModal.roomId &&
            ov.slotIndex === substituteModal.slotIndex
          )
      );

      const newOverrides: DutyOverride[] = datesToApply.map((dId) => {
        const subObj = subjects.find((s) => s.id === dId);
        return {
          id: `${dId}_${substituteModal.roomId}_${substituteModal.slotIndex}`,
          dateId: dId,
          date: subObj?.date || substituteModal.date,
          day: subObj?.day || substituteModal.day,
          subjectName: subObj?.subjectName || substituteModal.subjectName,
          roomId: substituteModal.roomId,
          roomName: substituteModal.roomName,
          slotIndex: substituteModal.slotIndex,
          originalTeacherId: substituteModal.currentTeacher.id,
          originalTeacherName: substituteModal.currentTeacher.name,
          assignedTeacher: targetTeacher,
          reason: substituteReason.trim() || 'বদলি ডিউটি',
          isSubstitute: isSub,
          updatedAt: new Date().toISOString(),
        };
      });

      return [...filtered, ...newOverrides];
    });

    setSubstituteModal(null);
    setTeacherMessage({
      type: 'success',
      text: `"${targetTeacher.name}"-কে সফলভাবে ${datesToApply.length} দিনের জন্য প্রত্যবেক্ষক হিসেবে প্রতিস্থাপন করা হয়েছে!`,
    });
    setTimeout(() => setTeacherMessage(null), 4000);
  };

  const handleRevertOverride = (overrideId: string) => {
    if (!setDutyOverrides) return;
    setDutyOverrides((prev) => prev.filter((ov) => ov.id !== overrideId));
    setSubstituteModal(null);
    setTeacherMessage({
      type: 'success',
      text: 'ডিউটি সফলভাবে মূল স্বয়ংক্রিয় সাইক্লিক রোস্টারে ফিরিয়ে নেওয়া হয়েছে।',
    });
    setTimeout(() => setTeacherMessage(null), 3000);
  };

  const handleClearAllOverrides = () => {
    if (!setDutyOverrides) return;
    if (confirm('আপনি কি নিশ্চিত যে সকল ম্যানুয়াল পরিবর্তন ও বদলি তালিকা মুছে মূল সাইক্লিক রোস্টারে ফেরত যেতে চান?')) {
      setDutyOverrides([]);
      setTeacherMessage({
        type: 'success',
        text: 'সকল বদলি ও পরিবর্তন মুছে সাইক্লিক রোস্টার পুনর্বহাল করা হয়েছে।',
      });
      setTimeout(() => setTeacherMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              কক্ষ প্রত্যবেক্ষক ব্যবস্থাপনা ও সাইক্লিক সম-ডিউটি রোস্টার
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              শিক্ষকদের নাম যুক্ত ও এডিট করুন, পরীক্ষার রুটিন আপলোড বা এন্ট্রি করুন এবং স্বয়ংক্রিয় সাইক্লিক রোস্টার পান
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onProceedToPreview}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <span>সিট প্ল্যান ও রিপোর্ট দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onProceedToPrint && (
              <button
                onClick={onProceedToPrint}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              >
                <Printer className="w-3.5 h-3.5" />
                পূর্ণ রোস্টার প্রিন্ট করুন
              </button>
            )}
          </div>
        </div>

        {/* Live Cyclic Equality Banner */}
        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>সাইক্লিক সম-ডিউটি রোটেশন সক্রিয় (Cyclic Equal Duty Active)</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  ✓ সমবণ্টন
                </span>
              </div>
              <div className="text-xs text-slate-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  রুটিনের দিন: <strong>{totalExamDays} দিন</strong>
                </span>
                <span>
                  কক্ষ: <strong>{rooms.length} টি</strong>
                </span>
                <span>
                  প্রতি কক্ষে: <strong>২ জন প্রত্যবেক্ষক</strong>
                </span>
                <span>
                  মোট স্লট: <strong>{totalExamDutySlots} টি</strong>
                </span>
                <span>
                  নিবন্ধিত শিক্ষক: <strong>{teacherCount} জন</strong>
                </span>
                <span>
                  শিক্ষক প্রতি ডিউটি:{' '}
                  <strong className="text-indigo-800 font-black">
                    {teacherCount === 0
                      ? '০ টি'
                      : cyclicRoster.minDuty === cyclicRoster.maxDuty
                      ? `${cyclicRoster.minDuty} টি (সবার সমান)`
                      : `${cyclicRoster.minDuty} – ${cyclicRoster.maxDuty} টি (সুষম বণ্টন)`}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Switcher: 5 Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveView('teachers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'teachers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>১. কক্ষ প্রত্যবেক্ষক / শিক্ষক তালিকা ({teachers.length} জন)</span>
          </button>

          <button
            onClick={() => setActiveView('routine')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'routine'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>২. পরীক্ষার রুটিন (শিফটসহ) ({subjects.length} বেলা)</span>
          </button>

          <button
            onClick={() => setActiveView('cyclic_roster')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'cyclic_roster'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>৩. সাইক্লিক সম-ডিউটি রোস্টার</span>
          </button>

          <button
            onClick={() => setActiveView('substitutions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'substitutions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>
              ৪. প্রত্যবেক্ষক পরিবর্তন ও বদলি তালিকা{' '}
              {dutyOverrides.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-800 font-black">
                  {dutyOverrides.length}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveView('room_view')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeView === 'room_view'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <School className="w-4 h-4" />
            <span>৫. কক্ষভিত্তিক ভিউ</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: TEACHER / INVIGILATOR MANAGEMENT (তালিকা, যুক্ত, এডিট, মুছুন) */}
      {/* ========================================================= */}
      {activeView === 'teachers' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                কক্ষ প্রত্যবেক্ষক / শিক্ষকদের তালিকা ও ব্যবস্থাপনা
              </h3>
              <p className="text-xs text-slate-500">
                এখানে শিক্ষক যোগ করতে পারেন, ডামি নাম এডিট করে প্রকৃত শিক্ষকের নাম দিতে পারেন অথবা এক্সেল থেকে তালিকা আপলোড করতে পারেন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Add Teacher button */}
              <button
                onClick={() => setShowAddTeacherModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন শিক্ষক যুক্ত করুন</span>
              </button>

              {/* Upload Excel Button */}
              <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>এক্সেল থেকে শিক্ষক আপলোড</span>
                <input
                  type="file"
                  ref={teacherFileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleUploadTeacherExcel}
                  className="hidden"
                />
              </label>

              {/* Sample Excel Button */}
              <button
                onClick={downloadSampleTeacherExcel}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                title="নমুনা এক্সেল ফাইল ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>নমুনা এক্সেল</span>
              </button>

              {/* Load Sample / Dummy Teachers */}
              <button
                onClick={handleResetSampleTeachers}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                title="৮ জন নমুনা ডামি শিক্ষক তালিকা লোড করুন"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>নমুনা তালিকা লোড</span>
              </button>

              {/* Clear All */}
              {teachers.length > 0 && (
                <button
                  onClick={handleClearAllTeachers}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>সব মুছুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Flash Message */}
          {teacherMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                teacherMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {teacherMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{teacherMessage.text}</span>
            </div>
          )}

          {/* Inline Add Teacher Form */}
          {showAddTeacherModal && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  নতুন কক্ষ প্রত্যবেক্ষকের বিবরণ এন্ট্রি করুন
                </span>
                <button
                  onClick={() => setShowAddTeacherModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTeacher} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    শিক্ষকের পুরো নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    placeholder="যেমন: মো: আব্দুল্লাহ আল মামুন"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">পদবী</label>
                  <input
                    type="text"
                    value={newTeacher.designation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                    placeholder="যেমন: সহকারী শিক্ষক / সিনিয়র শিক্ষক"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">পাঠদানের বিষয়</label>
                  <input
                    type="text"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    placeholder="যেমন: গণিত / ইংরেজি / বিজ্ঞান"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTeacher.phone}
                      onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                      placeholder="০১৭১১-XXXXXX"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>যুক্ত করুন</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 font-medium">
              মোট নিবন্ধিত প্রত্যবেক্ষক:{' '}
              <span className="font-bold text-slate-900">{teachers.length} জন</span> (প্রতি কক্ষে ২ জন করে সাইক্লিক ডিউটি
              পাবেন)
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="শিক্ষক খুঁজুন (নাম, বিষয়, পদবী)..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Teacher Table */}
          {teachers.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">কোনো প্রত্যবেক্ষক শিক্ষক পাওয়া যায়নি</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আপনি <strong>"+ নতুন শিক্ষক যুক্ত করুন"</strong> বাটনে ক্লিক করে শিক্ষক যোগ করতে পারেন অথবা{' '}
                <strong>"নমুনা শিক্ষক তালিকা লোড"</strong> বাটনে ক্লিক করে ডামি শিক্ষকদের তালিকা আনতে পারেন।
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowAddTeacherModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  শিক্ষক যোগ করুন
                </button>
                <button
                  onClick={handleResetSampleTeachers}
                  className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg hover:bg-indigo-100"
                >
                  নমুনা ডামি তালিকা লোড
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">ক্র:</th>
                      <th className="py-2.5 px-4">শিক্ষকের নাম</th>
                      <th className="py-2.5 px-3">পদবী</th>
                      <th className="py-2.5 px-3">পাঠদানের বিষয়</th>
                      <th className="py-2.5 px-3">মোবাইল নম্বর</th>
                      <th className="py-2.5 px-3 text-center">বরাদ্দকৃত সম-ডিউটি</th>
                      <th className="py-2.5 px-4 text-center w-36">অ্যাকশন (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.map((teacher, idx) => {
                      const isEditing = editingTeacherId === teacher.id;
                      const stat = cyclicRoster.teacherStats.find((s) => s.teacher.id === teacher.id);
                      const dutyCount = stat ? stat.totalDuties : 0;

                      if (isEditing) {
                        return (
                          <tr key={teacher.id} className="bg-amber-50/80">
                            <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">{idx + 1}</td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editTeacherForm.name}
                                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-bold"
                                placeholder="শিক্ষকের নাম"
                                autoFocus
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editTeacherForm.designation}
                                onChange={(e) =>
                                  setEditTeacherForm({ ...editTeacherForm, designation: e.target.value })
                                }
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white"
                                placeholder="পদবী"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editTeacherForm.subject}
                                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, subject: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white"
                                placeholder="বিষয়"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editTeacherForm.phone}
                                onChange={(e) => setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-mono"
                                placeholder="মোবাইল"
                              />
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-500">—</td>
                            <td className="py-2 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveEditTeacher(teacher.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="সংরক্ষণ করুন"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>সেভ</span>
                                </button>
                                <button
                                  onClick={() => setEditingTeacherId(null)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition-colors"
                                  title="বাতিল করুন"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span>{teacher.name}</span>
                            {/* Dummy indicator badge if from sample data */}
                            {teacher.id.startsWith('t-') && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-normal bg-slate-100 text-slate-500 border border-slate-200">
                                ডামি
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {teacher.designation || 'সহকারী শিক্ষক'}
                          </td>
                          <td className="py-2.5 px-3 text-indigo-700 font-medium">
                            {teacher.subject || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{teacher.phone || '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {dutyCount} টি ডিউটি
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => startEditTeacher(teacher)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                title="নাম ও তথ্য এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="শিক্ষক তালিকা থেকে মুছুন"
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
          )}

          {/* Quick Guidance Box */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div>
              <strong>পরামর্শ:</strong> ডামি নামগুলোর ডানে থাকা <strong>এডিট (পেন্সিল)</strong> আইকনে চাপ দিয়ে আপনার প্রতিষ্ঠানের শিক্ষকদের আসল নাম লিখে সেভ করে নিন। অথবা আপনার শিক্ষকদের তালিকা এক্সেল ফাইলে থাকলে <strong>"এক্সেল থেকে শিক্ষক আপলোড"</strong> বাটনে ক্লিক করে এক ক্লিকে সম্পূর্ণ তালিকা যুক্ত করতে পারেন।
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: EXAM ROUTINE & SCHEDULE (রুটিন আপলোড ও এন্ট্রি) */}
      {/* ========================================================= */}
      {activeView === 'routine' && examSettings && setExamSettings && (
        <div className="space-y-4">
          <RoutineMatrixEditor
            examSettings={examSettings}
            setExamSettings={setExamSettings}
            extraClasses={studentClasses}
          />
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
            <div className="text-xs text-emerald-800">
              রুটিন থেকে স্বয়ংক্রিয়ভাবে <strong>সকাল ও বিকাল শিফটের</strong> আলাদা সাইক্লিক ডিউটি রোস্টার তৈরি হয়েছে
              (মোট {subjects.length} টি পরীক্ষা-বেলা)।
            </div>
            <button
              onClick={() => setActiveView('cyclic_roster')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs flex items-center gap-1"
            >
              <span>রোস্টার দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: FULL CYCLIC DUTY ROSTER (সাইক্লিক সম-ডিউটি রোস্টার) */}
      {/* ========================================================= */}
      {activeView === 'cyclic_roster' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">তারিখ ফিল্টার:</span>
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">সকল পরীক্ষা দিবস ({subjects.length} দিন)</option>
                {subjects.map((sub, idx) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.date} ({sub.day}) - {sub.subjectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('teachers')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
              >
                <Users className="w-3.5 h-3.5" />
                <span>শিক্ষক তালিকা এডিট করুন</span>
              </button>
              <button
                onClick={() => setActiveView('routine')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>রুটিন পরিবর্তন করুন</span>
              </button>
              {onProceedToPrint && (
                <button
                  onClick={onProceedToPrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট মোড</span>
                </button>
              )}
            </div>
          </div>

          {/* Master Roster Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                পরিক্ষাসূচী অনুযায়ী কক্ষ প্রত্যবেক্ষক মাস্টার রোস্টার
              </h3>
              <span className="text-xs text-slate-500">
                প্রতিটি কক্ষে ২ জন করে শিক্ষক সাইক্লিক রোটেশনে ডিউটি পালন করবেন
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">ক্র:</th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200">তারিখ ও বার</th>
                    <th className="py-3 px-4 w-48 border-r border-slate-200">পরীক্ষার বিষয়</th>
                    {rooms.map((room) => (
                      <th key={room.id} className="py-3 px-4 border-r border-slate-200 text-center">
                        <div>{room.name}</div>
                        <div className="text-[10px] font-normal text-slate-500">(২ জন প্রত্যবেক্ষক)</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDaySchedules.map((daySchedule, dayIdx) => (
                    <tr key={daySchedule.dateId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                        {dayIdx + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200">
                        <div className="font-mono font-bold text-slate-900">{daySchedule.date}</div>
                        <div className="text-[11px] text-slate-500">{daySchedule.day}</div>
                        {daySchedule.session && (
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              daySchedule.session === 'morning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {daySchedule.session === 'morning' ? 'সকাল' : 'বিকাল'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-900 border-r border-slate-200">
                        {daySchedule.subjectName}
                      </td>

                      {/* Room Duty Columns */}
                      {rooms.map((room) => {
                        const roomDuty = daySchedule.roomDuties.find((rd) => rd.room.id === room.id);
                        const assignedTeachers = roomDuty?.invigilators || [];

                        return (
                          <td
                            key={room.id}
                            className="py-2.5 px-3 border-r border-slate-200 align-top bg-slate-50/40"
                          >
                            {!roomDuty ? (
                              <span className="text-slate-300 text-center block">—</span>
                            ) : assignedTeachers.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">শিক্ষক বরাদ্দ হয়নি</span>
                            ) : (
                              <div className="space-y-1.5">
                                {assignedTeachers.map((teacher, tIdx) => {
                                  const overrideInfo = roomDuty?.overrides ? roomDuty.overrides[tIdx] : null;
                                  const isOverridden = Boolean(overrideInfo);

                                  return (
                                    <div
                                      key={teacher.id || tIdx}
                                      onClick={() =>
                                        handleOpenSubstituteModal(
                                          daySchedule,
                                          room,
                                          tIdx,
                                          teacher,
                                          overrideInfo
                                        )
                                      }
                                      className={`p-1.5 rounded border text-[11px] cursor-pointer transition-all hover:shadow-xs group ${
                                        isOverridden
                                          ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/70 hover:border-amber-400'
                                          : 'bg-white border-slate-200 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/30'
                                      }`}
                                      title="শিক্ষক পরিবর্তন বা বদলি করতে ক্লিক করুন"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="font-semibold truncate flex items-center gap-1">
                                          <span
                                            className={`text-[10px] font-bold ${
                                              isOverridden ? 'text-amber-700' : 'text-indigo-600'
                                            }`}
                                          >
                                            [{tIdx + 1}]
                                          </span>
                                          <span className="truncate">{teacher.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {isOverridden ? (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                              বদলি
                                            </span>
                                          ) : (
                                            <span className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 transition-opacity">
                                              <ArrowLeftRight className="w-3 h-3" />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {isOverridden && overrideInfo ? (
                                        <div className="mt-1 pt-1 border-t border-amber-200/80 text-[10px] text-amber-800 flex items-center justify-between gap-1">
                                          <span className="truncate">
                                            মূল: {overrideInfo.originalTeacherName || 'পূর্বের শিক্ষক'}
                                          </span>
                                          {overrideInfo.reason && (
                                            <span className="text-[9px] text-amber-700 truncate">
                                              ({overrideInfo.reason})
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                          {teacher.subject
                                            ? teacher.subject
                                            : teacher.designation || 'সহকারী শিক্ষক'}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher Equal Duty Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                শিক্ষকদের সম-ডিউটি সংখ্যা ও বণ্টনের সারসংক্ষেপ
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                সকলের দায়িত্ব প্রায় সমান
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {cyclicRoster.teacherStats.map((stat, idx) => (
                <div
                  key={stat.teacher.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                      {stat.totalDuties} টি ডিউটি
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">{stat.teacher.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{stat.teacher.designation}</div>
                  <div className="text-[10px] text-indigo-600 truncate">বিষয়: {stat.teacher.subject || 'সাধারণ'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: DUTY SUBSTITUTIONS LOG (প্রত্যবেক্ষক পরিবর্তন ও বদলি তালিকা) */}
      {/* ========================================================= */}
      {activeView === 'substitutions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                প্রত্যবেক্ষক পরিবর্তন, প্রতিস্থাপন ও বদলি ডিউটি রেজিস্টার
              </h3>
              <p className="text-xs text-slate-500">
                পরীক্ষার দিনগুলোতে কোনো শিক্ষকের অনুপস্থিতিজনিত কারণে বদলি অথবা নতুন কোনো শিক্ষকের ২-৩ দিন দায়িত্ব পালনের তালিকা
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveView('cyclic_roster')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <RotateCw className="w-4 h-4" />
                <span>মাস্টার রোস্টার থেকে বদলি করুন</span>
              </button>

              {dutyOverrides.length > 0 && (
                <button
                  onClick={handleClearAllOverrides}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                  title="সকল পরিবর্তন মুছে মূল সাইক্লিক রোস্টারে ফিরে যান"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>সকল বদলি রিসেট</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <span className="text-base leading-none">💡</span>
            <div>
              <strong>পদ্ধতি:</strong> পরীক্ষার কোনো নির্দিষ্ট তারিখে কোনো শিক্ষকের ডিউটি পরিবর্তন করতে চাইলে{' '}
              <strong>"৩. সাইক্লিক সম-ডিউটি রোস্টার"</strong> ট্যাবে গিয়ে যেকোনো শিক্ষকের নামের কার্ডে ক্লিক করুন। সেখানে বিদ্যমান শিক্ষক তালিকা থেকে অন্য কাউকে নির্বাচন করতে পারেন অথবা <strong>নতুন বদলি শিক্ষক</strong> এন্ট্রি দিয়ে ১ দিন বা একসাথে একাধিক দিনের জন্য দায়িত্ব বরাদ্দ করতে পারেন।
            </div>
          </div>

          {/* Overrides Table */}
          {dutyOverrides.length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
              <ArrowLeftRight className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">বর্তমানে কোনো বদলি বা পরিবর্তিত ডিউটি নেই</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                সকল শিক্ষক স্বয়ংক্রিয় সাইক্লিক রোস্টার অনুযায়ী সমবণ্টন প্রক্রিয়ায় দায়িত্ব পালন করছেন। প্রয়োজন অনুযায়ী যেকোনো দিন বা কক্ষের শিক্ষক পরিবর্তন করতে পারেন।
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveView('cyclic_roster')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  রোস্টার থেকে শিক্ষক পরিবর্তন করুন
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">ক্র:</th>
                        <th className="py-2.5 px-4 w-36">পরীক্ষার তারিখ ও বার</th>
                        <th className="py-2.5 px-3 w-32">বিষয়</th>
                        <th className="py-2.5 px-3 w-28">কক্ষ নং</th>
                        <th className="py-2.5 px-2 text-center w-24">দায়িত্ব</th>
                        <th className="py-2.5 px-4 w-44">মূল নির্ধারিত শিক্ষক</th>
                        <th className="py-2.5 px-4">নতুন দায়িত্বপ্রাপ্ত / বদলি শিক্ষক</th>
                        <th className="py-2.5 px-3">কারণ / বিবরণ</th>
                        <th className="py-2.5 px-3 text-center w-28">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dutyOverrides.map((ov, idx) => (
                        <tr key={ov.id || idx} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-slate-900">{ov.date}</div>
                            {ov.day && <div className="text-[11px] text-slate-500">{ov.day}</div>}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {ov.subjectName || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">
                            {ov.roomName}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {ov.slotIndex === 0 ? '১ম পরিদর্শক' : '২য় পরিদর্শক'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 line-through">
                            {ov.originalTeacherName || 'পূর্বের শিক্ষক'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{ov.assignedTeacher.name}</span>
                              {ov.isSubstitute && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  নতুন বদলি
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {ov.assignedTeacher.designation} ({ov.assignedTeacher.subject || 'সাধারণ'})
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-amber-800 font-medium">
                            {ov.reason || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRevertOverride(ov.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                              title="পরিবর্তন বাতিল করে মূল সাইক্লিক শিক্ষক ফিরিয়ে আনুন"
                            >
                              রিসেট
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 5: ROOM VIEW (কক্ষভিত্তিক রিয়েল-টাইম দৃশ্য) */}
      {/* ========================================================= */}
      {activeView === 'room_view' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600" />
                কক্ষভিত্তিক প্রত্যবেক্ষক নিয়োগ ও তাৎক্ষণিক পরিবর্তন
              </h3>
              <p className="text-xs text-slate-500">
                প্রতিটি কক্ষের জন্য নির্ধারিত শিক্ষকদ্বয় নির্বাচন বা পরিবর্তন করুন
              </p>
            </div>
            <button
              onClick={() => {
                setRooms((prev) =>
                  prev.map((r) => ({
                    ...r,
                    invigilatorIds: undefined,
                  }))
                );
              }}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              স্বয়ংক্রিয় রোটেশনে ফেরত
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const currentPlan = roomPlans.find((p) => p.room.id === room.id);
              const assignedTeachers = currentPlan?.invigilators || [];

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-indigo-300 transition-all flex flex-col"
                >
                  <div className="p-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <School className="w-4 h-4 text-indigo-600" />
                        {room.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        আসন সংখ্যা: {room.benchCount * room.studentsPerBench} টি · প্রত্যবেক্ষক: ২ জন
                      </p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>

                  <div className="p-4 space-y-4 flex-1">
                    {/* Slot 1 */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        ১ম কক্ষ প্রত্যবেক্ষক (Invigilator 1):
                      </label>
                      <select
                        value={assignedTeachers[0]?.id || ''}
                        onChange={(e) => handleAssignTeacherToRoomSlot(room.id, 0, e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">-- শিক্ষক নির্বাচন করুন --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.designation} - {t.subject || 'সাধারণ'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Slot 2 */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        ২য় কক্ষ প্রত্যবেক্ষক (Invigilator 2):
                      </label>
                      <select
                        value={assignedTeachers[1]?.id || ''}
                        onChange={(e) => handleAssignTeacherToRoomSlot(room.id, 1, e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">-- শিক্ষক নির্বাচন করুন --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.designation} - {t.subject || 'সাধারণ'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Summary in this room */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="text-slate-500 font-medium text-[11px]">বর্তমান বরাদ্দকৃত প্রত্যবেক্ষক:</div>
                      {assignedTeachers.length > 0 ? (
                        assignedTeachers.map((tch, idx) => (
                          <div key={tch.id} className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-indigo-600">{idx + 1}.</span>
                            <span>{tch.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({tch.designation})</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 italic">এখনো শিক্ষক নির্ধারণ করা হয়নি</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL: SUBSTITUTE / CHANGE INVIGILATOR */}
      {/* ========================================================= */}
      {substituteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    কক্ষ প্রত্যবেক্ষক পরিবর্তন ও বদলি ডিউটি এন্ট্রি
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    নির্দিষ্ট পরীক্ষা দিবসে শিক্ষক পরিবর্তন বা নতুন বদলি শিক্ষক নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubstituteModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Badge Box */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">তারিখ ও বার:</span>
                <span className="font-bold text-slate-900">{substituteModal.date}</span>
                <span className="text-[10px] text-slate-500 ml-1">({substituteModal.day})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">পরীক্ষার বিষয়:</span>
                <span className="font-bold text-indigo-900">{substituteModal.subjectName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">পরীক্ষা কক্ষ:</span>
                <span className="font-bold text-slate-900">{substituteModal.roomName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">দায়িত্ব:</span>
                <span className="font-bold text-emerald-800">
                  {substituteModal.slotIndex === 0 ? '১ম পরিদর্শক' : '২য় পরিদর্শক'}
                </span>
              </div>
            </div>

            {/* Current Teacher Notice */}
            <div className="px-6 py-2.5 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">পূর্বের নির্ধারিত শিক্ষক:</span>
                <span className="font-bold text-slate-900">{substituteModal.currentTeacher.name}</span>
                <span className="text-[11px] text-slate-500">
                  ({substituteModal.currentTeacher.subject || substituteModal.currentTeacher.designation})
                </span>
              </div>
              {substituteModal.overrideInfo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  বর্তমানে পরিবর্তিত
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSubstitute} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Mode Selection Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">পরিবর্তনের ধরণ নির্বাচন করুন:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubstituteMode('existing')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      substituteMode === 'existing'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>১. প্রতিষ্ঠানের বিদ্যমান শিক্ষক থেকে বদলি</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubstituteMode('new')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      substituteMode === 'new'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>২. নতুন শিক্ষক এন্ট্রি (২-৩ দিন বদলি ডিউটি)</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Select from existing teachers */}
              {substituteMode === 'existing' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    দায়িত্বপ্রাপ্ত নতুন শিক্ষক নির্বাচন করুন: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedExistingTeacherId}
                    onChange={(e) => setSelectedExistingTeacherId(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- শিক্ষক বেছে নিন --</option>
                    {teachers.map((t) => {
                      const stat = cyclicRoster.teacherStats.find((s) => s.teacher.id === t.id);
                      const duties = stat ? stat.totalDuties : 0;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.designation} - {t.subject || 'সাধারণ'}) — বর্তমান ডিউটি: {duties} টি
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    তালিকা থেকে যেকোনো শিক্ষক নির্বাচন করলে স্বয়ংক্রিয়ভাবে তার নামে এই ডিউটি যোগ হবে এবং মূল শিক্ষকের থেকে কর্তন হবে।
                  </p>
                </div>
              )}

              {/* Mode 2: Enter new substitute teacher */}
              {substituteMode === 'new' && (
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5 pb-1 border-b border-purple-100">
                    <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                    <span>নতুন বদলি শিক্ষকের বিবরণ (যেমন ২-৩ দিন দায়িত্ব পালনকারী):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        শিক্ষকের নাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newSubTeacherName}
                        onChange={(e) => setNewSubTeacherName(e.target.value)}
                        placeholder="যেমন: জনাব মো: রফিকুল ইসলাম"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">পদবী</label>
                      <input
                        type="text"
                        value={newSubTeacherDesignation}
                        onChange={(e) => setNewSubTeacherDesignation(e.target.value)}
                        placeholder="যেমন: সহকারী শিক্ষক (খন্ডকালীন/বদলি)"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">বিষয়</label>
                      <input
                        type="text"
                        value={newSubTeacherSubject}
                        onChange={(e) => setNewSubTeacherSubject(e.target.value)}
                        placeholder="যেমন: ইংরেজি / বিজ্ঞান / গণিত"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={newSubTeacherPhone}
                        onChange={(e) => setNewSubTeacherPhone(e.target.value)}
                        placeholder="যেমন: ০১৭XXXXXXXX"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-purple-950 font-medium pt-1">
                    <input
                      type="checkbox"
                      checked={saveToPermanentTeachers}
                      onChange={(e) => setSaveToPermanentTeachers(e.target.checked)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>এই শিক্ষককে প্রতিষ্ঠানের মূল শিক্ষক তালিকাতেও স্থায়ীভাবে যুক্ত করুন</span>
                  </label>
                </div>
              )}

              {/* Multi-date assignment: "যেমন নতুন কেউ ২-৩ দিন ডিউটি করলে" */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <label className="block text-xs font-bold text-slate-800">
                    একাধিক দিনের জন্য এই বদলি প্রযোজ্য করুন ({multiSelectedDateIds.length} দিন নির্বাচিত):
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMultiSelectedDateIds(subjects.map((s) => s.id))}
                      className="text-indigo-600 hover:underline"
                    >
                      সব দিন
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setMultiSelectedDateIds([substituteModal.dateId])}
                      className="text-slate-500 hover:underline"
                    >
                      শুধু আজকের দিন
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                  {subjects.map((sub) => {
                    const isChecked = multiSelectedDateIds.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-start gap-1.5 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMultiSelectedDateIds((prev) => [...prev, sub.id]);
                            } else {
                              if (multiSelectedDateIds.length > 1) {
                                setMultiSelectedDateIds((prev) => prev.filter((id) => id !== sub.id));
                              }
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="truncate leading-tight">
                          <span className="block truncate font-mono text-[10px]">{sub.date}</span>
                          <span className="block truncate text-[10px] text-slate-500">{sub.subjectName}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reason / Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">পরিবর্তন বা বদলির কারণ / মন্তব্য:</label>
                <input
                  type="text"
                  value={substituteReason}
                  onChange={(e) => setSubstituteReason(e.target.value)}
                  placeholder="যেমন: ছুটিজনিত বদলি / অসুস্থতা / ২ দিন প্রশিক্ষণ"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['ছুটিজনিত কারণে বদলি', 'অসুস্থতাজনিত বদলি', 'প্রশিক্ষণে থাকায় বদলি', 'জরুরি বদলি ডিউটি', '২-৩ দিনের বিশেষ দায়িত্ব'].map(
                    (chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSubstituteReason(chip)}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                      >
                        {chip}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {substituteModal.overrideInfo ? (
                  <button
                    type="button"
                    onClick={() => handleRevertOverride(substituteModal.overrideInfo!.id)}
                    className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>পরিবর্তন বাতিল (মূল সাইক্লিকে ফেরত)</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubstituteModal(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>পরিবর্তন সংরক্ষণ করুন</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

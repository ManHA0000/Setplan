import React, { useState } from 'react';
import {
  ExamExpenses,
  StaffMember,
  Invigilator,
  FullDutyRoster,
  ExamSettings,
  CustomExpenseItem,
  CommitteeMember,
} from '../types/seatPlan';
import { SAMPLE_COMMITTEE } from '../data/sampleStaff';
import {
  Receipt,
  DollarSign,
  Users,
  UserCheck,
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  HelpCircle,
  Coffee,
  PenTool,
  Printer as PrintIcon,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Award,
  Crown,
  School,
  RotateCcw,
  X,
} from 'lucide-react';

interface Props {
  expenses: ExamExpenses;
  setExpenses: React.Dispatch<React.SetStateAction<ExamExpenses>>;
  staff: StaffMember[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  committee: CommitteeMember[];
  setCommittee: React.Dispatch<React.SetStateAction<CommitteeMember[]>>;
  teachers: Invigilator[];
  cyclicRoster: FullDutyRoster;
  examSettings: ExamSettings;
  onProceedToPrint: () => void;
}

export const ExpenseStep: React.FC<Props> = ({
  expenses,
  setExpenses,
  staff,
  setStaff,
  committee,
  setCommittee,
  teachers,
  cyclicRoster,
  examSettings,
  onProceedToPrint,
}) => {
  const [remunerationFilter, setRemunerationFilter] = useState<'all' | 'committee' | 'teachers' | 'staff'>('all');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddCommitteeModal, setShowAddCommitteeModal] = useState(false);
  const [showAddCustomExpense, setShowAddCustomExpense] = useState(false);

  // New committee member form state
  const [newCommittee, setNewCommittee] = useState<Omit<CommitteeMember, 'id'>>({
    name: '',
    designation: 'সদস্য, পরীক্ষা পরিচালনা কমিটি',
    role: 'member',
    honorarium: 1500,
    phone: '',
    note: '',
  });

  // New staff form state
  const [newStaff, setNewStaff] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    designation: 'অফিস সহায়ক',
    dutyDays: cyclicRoster.totalDays || 12,
    ratePerDay: 300,
    phone: '',
    note: '',
  });

  // New custom expense form state
  const [newCustomItem, setNewCustomItem] = useState<{
    title: string;
    amount: number;
    note: string;
  }>({
    title: '',
    amount: 500,
    note: '',
  });

  // Calculate totals
  const totalInvigilationCost = cyclicRoster.totalDutySlots * expenses.invigilationRatePerDuty;

  const totalStaffCost = staff.reduce(
    (sum, member) => sum + member.dutyDays * member.ratePerDay,
    0
  );

  const totalCommitteeCost = committee.reduce(
    (sum, member) => sum + (Number(member.honorarium) || 0),
    0
  );

  const totalPaperCost = expenses.paperCost;
  const totalPenCost = expenses.penCost;
  const totalScriptCost =
    expenses.scriptEvaluationRatePerScript * expenses.scriptCount;
  const totalQuestionCost = expenses.questionSettingAndModerationCost;
  const totalOmrCost = expenses.omrSheetCost;
  const totalRefreshmentCost = expenses.refreshmentCost;

  const totalCustomExpenses = expenses.customExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const grandTotalExpense =
    totalInvigilationCost +
    totalStaffCost +
    totalCommitteeCost +
    totalPaperCost +
    totalPenCost +
    totalScriptCost +
    totalQuestionCost +
    totalOmrCost +
    totalRefreshmentCost +
    totalCustomExpenses;

  // Add committee handler
  const handleAddCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommittee.name.trim()) return;

    const member: CommitteeMember = {
      id: `comm-${Date.now()}`,
      ...newCommittee,
      name: newCommittee.name.trim(),
      honorarium: Number(newCommittee.honorarium) || 0,
    };

    setCommittee((prev) => [...prev, member]);
    setNewCommittee({
      name: '',
      designation: 'সদস্য, পরীক্ষা পরিচালনা কমিটি',
      role: 'member',
      honorarium: 1500,
      phone: '',
      note: '',
    });
    setShowAddCommitteeModal(false);
  };

  const handleDeleteCommittee = (id: string) => {
    setCommittee((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateCommitteeHonorarium = (id: string, honorarium: number) => {
    setCommittee((prev) =>
      prev.map((m) => (m.id === id ? { ...m, honorarium: Math.max(0, honorarium) } : m))
    );
  };

  const handleResetCommittee = () => {
    if (confirm('আপনি কি পরীক্ষা কমিটি ও প্রশাসন তালিকা প্রারম্ভিক ডেমো তালিকায় রিসেট করতে চান?')) {
      setCommittee(SAMPLE_COMMITTEE);
    }
  };

  // Committee edit state and handlers
  const [editingCommitteeId, setEditingCommitteeId] = useState<string | null>(null);
  const [editCommitteeForm, setEditCommitteeForm] = useState<{
    name: string;
    designation: string;
    role: 'headmaster' | 'assistant_head' | 'controller' | 'member' | 'other';
    honorarium: number;
    note: string;
  }>({
    name: '',
    designation: '',
    role: 'member',
    honorarium: 1500,
    note: '',
  });

  const startEditCommittee = (member: CommitteeMember) => {
    setEditingCommitteeId(member.id);
    setEditCommitteeForm({
      name: member.name,
      designation: member.designation,
      role: member.role,
      honorarium: member.honorarium,
      note: member.note || '',
    });
  };

  const handleSaveEditCommittee = (id: string) => {
    if (!editCommitteeForm.name.trim()) return;
    setCommittee((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: editCommitteeForm.name.trim(),
              designation: editCommitteeForm.designation.trim() || 'কমিটি সদস্য',
              role: editCommitteeForm.role,
              honorarium: Math.max(0, Number(editCommitteeForm.honorarium) || 0),
              note: editCommitteeForm.note.trim(),
            }
          : m
      )
    );
    setEditingCommitteeId(null);
  };

  // Add staff handler
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim()) return;

    const staffObj: StaffMember = {
      id: `staff-${Date.now()}`,
      ...newStaff,
      name: newStaff.name.trim(),
    };

    setStaff((prev) => [...prev, staffObj]);
    setNewStaff({
      name: '',
      designation: 'অফিস সহায়ক',
      dutyDays: cyclicRoster.totalDays || 12,
      ratePerDay: 300,
      phone: '',
      note: '',
    });
    setShowAddStaffModal(false);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  // Staff edit state and handlers
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffForm, setEditStaffForm] = useState<{
    name: string;
    designation: string;
    dutyDays: number;
    ratePerDay: number;
    note: string;
  }>({
    name: '',
    designation: '',
    dutyDays: 12,
    ratePerDay: 300,
    note: '',
  });

  const startEditStaff = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setEditStaffForm({
      name: member.name,
      designation: member.designation,
      dutyDays: member.dutyDays,
      ratePerDay: member.ratePerDay,
      note: member.note || '',
    });
  };

  const handleSaveEditStaff = (id: string) => {
    if (!editStaffForm.name.trim()) return;
    setStaff((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: editStaffForm.name.trim(),
              designation: editStaffForm.designation.trim() || 'অফিস সহায়ক',
              dutyDays: Math.max(1, Number(editStaffForm.dutyDays) || 1),
              ratePerDay: Math.max(0, Number(editStaffForm.ratePerDay) || 0),
              note: editStaffForm.note.trim(),
            }
          : s
      )
    );
    setEditingStaffId(null);
  };

  // Add custom expense handler
  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomItem.title.trim() || !newCustomItem.amount) return;

    const item: CustomExpenseItem = {
      id: `cust-${Date.now()}`,
      title: newCustomItem.title.trim(),
      amount: Number(newCustomItem.amount),
      note: newCustomItem.note.trim(),
    };

    setExpenses((prev) => ({
      ...prev,
      customExpenses: [...prev.customExpenses, item],
    }));

    setNewCustomItem({ title: '', amount: 500, note: '' });
    setShowAddCustomExpense(false);
  };

  const handleDeleteCustomExpense = (id: string) => {
    setExpenses((prev) => ({
      ...prev,
      customExpenses: prev.customExpenses.filter((item) => item.id !== id),
    }));
  };

  // Update paper cost automatically if reams or rate changes
  const handlePaperReamsChange = (reams: number) => {
    const cost = reams * expenses.paperRatePerReam;
    setExpenses((prev) => ({ ...prev, paperReams: reams, paperCost: cost }));
  };

  const handlePaperRateChange = (rate: number) => {
    const cost = expenses.paperReams * rate;
    setExpenses((prev) => ({ ...prev, paperRatePerReam: rate, paperCost: cost }));
  };

  // Update OMR cost automatically
  const handleOmrCountChange = (count: number) => {
    const cost = count * expenses.omrSheetRate;
    setExpenses((prev) => ({ ...prev, omrSheetCount: count, omrSheetCost: cost }));
  };

  const handleOmrRateChange = (rate: number) => {
    const cost = expenses.omrSheetCount * rate;
    setExpenses((prev) => ({ ...prev, omrSheetRate: rate, omrSheetCost: cost }));
  };

  return (
    <div className="space-y-6">
      {/* Overview & Quick Balance Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              পরীক্ষার ব্যয় ব্যবস্থাপনা ও সম্মানী বিল (Exam Budget & Remuneration)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              প্রত্যবেক্ষণ ভাতা, খাতা মূল্যায়ন, প্রশ্ন প্রণয়ন, কাগজ, কলম, OMR, আপ্যায়ন ও কর্মচারীদের সম্মানী হিসাব করুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onProceedToPrint}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>সম্মানী বিল ও খরচ প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

        {/* Grand Total Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white p-4 rounded-xl shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wide">
              সর্বমোট পরীক্ষা ব্যয়
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono">
              ৳ {grandTotalExpense.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-indigo-200/80 pt-0.5">
              কমিটি, শিক্ষক, কর্মচারী ও সামগ্রী
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-xs space-y-1">
            <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
              <span>কমিটি ও প্রশাসন সম্মানী</span>
              <Award className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-950">
              ৳ {totalCommitteeCost.toLocaleString('bn-BD')}
            </div>
            <div className="text-[11px] text-purple-700">
              {committee.length} জন (প্রধান, সহকারী ও কমিটি)
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-xs space-y-1">
            <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
              <span>মোট প্রত্যবেক্ষণ ভাতা</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
              ৳ {totalInvigilationCost.toLocaleString('bn-BD')}
            </div>
            <div className="text-[11px] text-emerald-700">
              {cyclicRoster.totalDutySlots} টি স্লট × ৳{expenses.invigilationRatePerDuty}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-xs space-y-1">
            <div className="text-xs font-bold text-amber-800 flex items-center justify-between">
              <span>কর্মচারী সম্মানী বিল</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-950">
              ৳ {totalStaffCost.toLocaleString('bn-BD')}
            </div>
            <div className="text-[11px] text-amber-700">
              {staff.length} জন কর্মচারী ({cyclicRoster.totalDays} দিনের পরীক্ষা)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>মুদ্রণ, খাতা ও আপ্যায়ন</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              ৳{' '}
              {(
                totalPaperCost +
                totalPenCost +
                totalScriptCost +
                totalQuestionCost +
                totalOmrCost +
                totalRefreshmentCost +
                totalCustomExpenses
              ).toLocaleString('bn-BD')}
            </div>
            <div className="text-[11px] text-slate-500">
              কাগজ, কলম, খাতা, OMR ও আপ্যায়ন
            </div>
          </div>
        </div>
      </div>

      {/* Main Expense Items Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: Remuneration Rates (প্রত্যবেক্ষণ ও খাতা/প্রশ্ন মূল্যায়ন) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            ১. শিক্ষক প্রত্যবেক্ষণ ও প্রশ্ন/খাতা মূল্যায়ন ভাতা
          </h3>

          <div className="space-y-4">
            {/* Invigilation Rate */}
            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-indigo-950 block">
                    শিক্ষকের কক্ষ প্রত্যবেক্ষণ ভাতা (প্রতি ডিউটি) *
                  </label>
                  <p className="text-[11px] text-indigo-700">
                    সাইক্লিক রোস্টার অনুযায়ী মোট স্লট: <strong>{cyclicRoster.totalDutySlots} টি</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={expenses.invigilationRatePerDuty}
                    onChange={(e) =>
                      setExpenses({
                        ...expenses,
                        invigilationRatePerDuty: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-indigo-900 border-t border-indigo-100 pt-1.5">
                মোট প্রত্যবেক্ষণ ব্যয়: <strong>৳ {totalInvigilationCost.toLocaleString('bn-BD')}</strong>
              </div>
            </div>

            {/* Script Evaluation */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    খাতা মূল্যায়ন ভাতা (প্রতি খাতা)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500">মোট খাতার সংখ্যা:</span>
                    <input
                      type="number"
                      min="0"
                      value={expenses.scriptCount}
                      onChange={(e) =>
                        setExpenses({
                          ...expenses,
                          scriptCount: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 font-mono text-xs px-2 py-0.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={expenses.scriptEvaluationRatePerScript}
                    onChange={(e) =>
                      setExpenses({
                        ...expenses,
                        scriptEvaluationRatePerScript: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
                মোট খাতা মূল্যায়ন ব্যয়: <strong>৳ {totalScriptCost.toLocaleString('bn-BD')}</strong>
              </div>
            </div>

            {/* Question Setting & Moderation */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  প্রশ্নপত্র প্রণয়ন ও মডারেটিং ভাতা
                </label>
                <p className="text-[11px] text-slate-500">
                  সকল বিষয়ের প্রশ্ন প্রণয়ন ও মডারেশন এককালীন
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">৳</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={expenses.questionSettingAndModerationCost}
                  onChange={(e) =>
                    setExpenses({
                      ...expenses,
                      questionSettingAndModerationCost: Number(e.target.value) || 0,
                    })
                  }
                  className="w-28 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Printing & Stationery Costs (কাগজ, কলম, OMR, আপ্যায়ন) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            ২. কাগজ, কলম, OMR শিট মুদ্রণ ও আপ্যায়ন ব্যয়
          </h3>

          <div className="space-y-3">
            {/* Paper Cost */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    কাগজের দাম (Paper Cost)
                  </label>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                    <span>রিম:</span>
                    <input
                      type="number"
                      min="1"
                      value={expenses.paperReams}
                      onChange={(e) => handlePaperReamsChange(Number(e.target.value) || 0)}
                      className="w-14 font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center"
                    />
                    <span>× দর:</span>
                    <input
                      type="number"
                      min="100"
                      step="10"
                      value={expenses.paperRatePerReam}
                      onChange={(e) => handlePaperRateChange(Number(e.target.value) || 0)}
                      className="w-16 font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={expenses.paperCost}
                    onChange={(e) =>
                      setExpenses({ ...expenses, paperCost: Number(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Pen & Stationery */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  কলম, পেন্সিল ও স্টেশনারি
                </label>
                <p className="text-[11px] text-slate-500">
                  পরিদর্শক ও পরীক্ষা অফিস ব্যবহারের জন্য
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">৳</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={expenses.penCost}
                  onChange={(e) =>
                    setExpenses({ ...expenses, penCost: Number(e.target.value) || 0 })
                  }
                  className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* OMR Sheet Printing */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    OMR শিট মুদ্রণ ব্যয়
                  </label>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                    <span>শিট:</span>
                    <input
                      type="number"
                      min="0"
                      value={expenses.omrSheetCount}
                      onChange={(e) => handleOmrCountChange(Number(e.target.value) || 0)}
                      className="w-16 font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center"
                    />
                    <span>× প্রতি শিট:</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={expenses.omrSheetRate}
                      onChange={(e) => handleOmrRateChange(Number(e.target.value) || 0)}
                      className="w-14 font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={expenses.omrSheetCost}
                    onChange={(e) =>
                      setExpenses({ ...expenses, omrSheetCost: Number(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Refreshment */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  আপ্যায়ন ব্যয় (চা, বিস্কুট ও নাস্তা)
                </label>
                <p className="text-[11px] text-slate-500">
                  পরীক্ষা চলাকালীন শিক্ষক ও কর্মকর্তা আপ্যায়ন
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">৳</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={expenses.refreshmentCost}
                  onChange={(e) =>
                    setExpenses({
                      ...expenses,
                      refreshmentCost: Number(e.target.value) || 0,
                    })
                  }
                  className="w-24 text-right font-mono font-bold text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Committee & Administration Honorarium (পরীক্ষা কমিটি ও প্রশাসন সম্মাননা) */}
      <div className="bg-white rounded-xl border border-purple-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-purple-100 bg-purple-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                <Crown className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                ৩. পরীক্ষা কমিটি ও প্রশাসন সম্মাননা তালিকা ({committee.length} জন)
              </h3>
            </div>
            <p className="text-xs text-purple-800/80 mt-1">
              প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক, পরীক্ষা কমিটি আহ্বায়ক, সদস্য সচিব ও অন্যান্য সদস্যদের সম্মাননা ভাতা নির্ধারণ (পরীক্ষার মোট ব্যয়ে যুক্ত)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCommittee}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-50 transition-colors shadow-xs"
              title="ডেমো কমিটি তালিকা ফিরিয়ে আনুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডেমো কমিটি</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddCommitteeModal(!showAddCommitteeModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন সদস্য যোগ করুন</span>
            </button>
          </div>
        </div>

        {/* Add Committee Member Form */}
        {showAddCommitteeModal && (
          <form
            onSubmit={handleAddCommittee}
            className="p-4 bg-purple-50/70 border-b border-purple-200 space-y-3 animate-in fade-in duration-150"
          >
            <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
              <span>কমিটি ও প্রশাসন সদস্য নিবন্ধন ফরম</span>
              {/* Quick Role Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-purple-700 font-normal">দ্রুত নির্বাচন:</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewCommittee({
                      ...newCommittee,
                      designation: 'প্রধান শিক্ষক ও সভাপতি (পরীক্ষা কমিটি)',
                      role: 'headmaster',
                      honorarium: 3000,
                      note: 'সার্বিক পরিচালনা ও অনুমোদন',
                    })
                  }
                  className="px-2 py-0.5 bg-white border border-purple-300 text-purple-800 text-[10px] rounded hover:bg-purple-100 font-medium"
                >
                  + প্রধান শিক্ষক
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCommittee({
                      ...newCommittee,
                      designation: 'সহকারী প্রধান শিক্ষক ও সহ-সভাপতি',
                      role: 'assistant_head',
                      honorarium: 2500,
                      note: 'পরীক্ষা সমন্বয় ও তদারকি',
                    })
                  }
                  className="px-2 py-0.5 bg-white border border-purple-300 text-purple-800 text-[10px] rounded hover:bg-purple-100 font-medium"
                >
                  + সহকারী প্রধান
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCommittee({
                      ...newCommittee,
                      designation: 'আহ্বায়ক, পরীক্ষা পরিচালনা কমিটি',
                      role: 'controller',
                      honorarium: 2200,
                      note: 'পরীক্ষা পরিচালনা ও প্রশ্ন তদারকি',
                    })
                  }
                  className="px-2 py-0.5 bg-white border border-purple-300 text-purple-800 text-[10px] rounded hover:bg-purple-100 font-medium"
                >
                  + আহ্বায়ক
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCommittee({
                      ...newCommittee,
                      designation: 'সদস্য সচিব, পরীক্ষা পরিচালনা কমিটি',
                      role: 'member',
                      honorarium: 1800,
                      note: 'সিটপ্ল্যান ও কার্যবিবরণী',
                    })
                  }
                  className="px-2 py-0.5 bg-white border border-purple-300 text-purple-800 text-[10px] rounded hover:bg-purple-100 font-medium"
                >
                  + সদস্য সচিব
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCommittee({
                      ...newCommittee,
                      designation: 'সদস্য, পরীক্ষা পরিচালনা কমিটি',
                      role: 'member',
                      honorarium: 1500,
                      note: 'হল পরিদর্শন ও শৃঙ্খলা',
                    })
                  }
                  className="px-2 py-0.5 bg-white border border-purple-300 text-purple-800 text-[10px] rounded hover:bg-purple-100 font-medium"
                >
                  + সদস্য
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  শিক্ষক / কর্মকর্তার নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: জনাব মো: আবুল খায়ের"
                  value={newCommittee.name}
                  onChange={(e) => setNewCommittee({ ...newCommittee, name: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  পদবী ও ভূমিকা *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: প্রধান শিক্ষক ও সভাপতি / আহ্বায়ক"
                  value={newCommittee.designation}
                  onChange={(e) =>
                    setNewCommittee({ ...newCommittee, designation: e.target.value })
                  }
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="w-40">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ক্যাটাগরি
                </label>
                <select
                  value={newCommittee.role}
                  onChange={(e) =>
                    setNewCommittee({
                      ...newCommittee,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="headmaster">প্রধান শিক্ষক (সভাপতি)</option>
                  <option value="assistant_head">সহকারী প্রধান শিক্ষক</option>
                  <option value="controller">আহ্বায়ক (পরীক্ষা কমিটি)</option>
                  <option value="member">কমিটি সদস্য / সচিব</option>
                  <option value="other">অন্যান্য কর্মকর্তা</option>
                </select>
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  সম্মানী ভাতা (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={newCommittee.honorarium}
                  onChange={(e) =>
                    setNewCommittee({
                      ...newCommittee,
                      honorarium: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-right font-mono font-bold"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  দায়িত্ব / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="যেমন: সার্বিক পরিচালনা ও ফলাফল"
                  value={newCommittee.note}
                  onChange={(e) => setNewCommittee({ ...newCommittee, note: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 text-white text-xs font-semibold rounded-lg hover:bg-purple-800"
                >
                  যুক্ত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCommitteeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Committee Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-200 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-center w-12">ক্র:</th>
                <th className="py-2.5 px-4">নাম</th>
                <th className="py-2.5 px-4">পদবী ও ভূমিকা</th>
                <th className="py-2.5 px-4 text-center w-36">ক্যাটাগরি</th>
                <th className="py-2.5 px-4 text-right w-44">সম্মানী ভাতা (টাকা)</th>
                <th className="py-2.5 px-4">দায়িত্ব / মন্তব্য</th>
                <th className="py-2.5 px-4 text-center w-24">মুছুন / এডিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              {committee.map((member, idx) => {
                const isEditing = editingCommitteeId === member.id;

                if (isEditing) {
                  return (
                    <tr key={member.id} className="bg-purple-100/70">
                      <td className="py-2 px-3 text-center font-mono font-bold text-purple-900">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editCommitteeForm.name}
                          onChange={(e) => setEditCommitteeForm({ ...editCommitteeForm, name: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white font-bold"
                          placeholder="নাম"
                          autoFocus
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editCommitteeForm.designation}
                          onChange={(e) => setEditCommitteeForm({ ...editCommitteeForm, designation: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white"
                          placeholder="পদবী"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <select
                          value={editCommitteeForm.role}
                          onChange={(e) => setEditCommitteeForm({ ...editCommitteeForm, role: e.target.value as any })}
                          className="w-full text-xs px-1.5 py-1 border border-purple-300 rounded bg-white font-medium"
                        >
                          <option value="headmaster">প্রধান শিক্ষক</option>
                          <option value="assistant_head">সহকারী প্রধান</option>
                          <option value="controller">পরীক্ষা আহ্বায়ক</option>
                          <option value="member">কমিটি সদস্য</option>
                          <option value="other">অন্যান্য</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span className="text-purple-600 text-xs font-bold">৳</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={editCommitteeForm.honorarium}
                            onChange={(e) => setEditCommitteeForm({ ...editCommitteeForm, honorarium: Number(e.target.value) || 0 })}
                            className="w-24 text-right font-mono font-bold text-xs p-1 bg-white border border-purple-300 rounded"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editCommitteeForm.note}
                          onChange={(e) => setEditCommitteeForm({ ...editCommitteeForm, note: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white"
                          placeholder="দায়িত্ব / মন্তব্য"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditCommittee(member.id)}
                            className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="সংরক্ষণ করুন"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>সেভ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommitteeId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition-colors"
                            title="বাতিল করুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const getRoleBadge = () => {
                  if (member.role === 'headmaster') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                        <Crown className="w-3 h-3 text-purple-600" />
                        প্রধান শিক্ষক
                      </span>
                    );
                  }
                  if (member.role === 'assistant_head') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        <Award className="w-3 h-3 text-indigo-600" />
                        সহকারী প্রধান
                      </span>
                    );
                  }
                  if (member.role === 'controller') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        পরীক্ষা আহ্বায়ক
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      কমিটি সদস্য
                    </span>
                  );
                };

                return (
                  <tr key={member.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{member.name}</td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      {member.designation}
                    </td>
                    <td className="py-2.5 px-4 text-center">{getRoleBadge()}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <span className="text-slate-400 text-xs font-bold">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={member.honorarium}
                          onChange={(e) =>
                            handleUpdateCommitteeHonorarium(
                              member.id,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-24 text-right font-mono font-black text-xs p-1 bg-white border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 text-purple-950"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {member.note || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Pencil Button */}
                        <button
                          type="button"
                          onClick={() => startEditCommittee(member)}
                          className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                          title="তথ্য এডিট করুন (পেন্সিল)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCommittee(member.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-purple-50/80 font-bold border-t-2 border-purple-200">
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right text-purple-900">
                  সর্বমোট পরীক্ষা কমিটি ও প্রশাসন সম্মাননা:
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-purple-950">
                  ৳ {totalCommitteeCost.toLocaleString('bn-BD')}
                </td>
                <td colSpan={2} className="py-2.5 px-4 text-[11px] text-purple-700 font-medium">
                  (স্বয়ংক্রিয়ভাবে মোট পরীক্ষা ব্যয়ে অন্তর্ভুক্ত)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 4: Staff Honorarium Management (কর্মচারী সম্মানী ও তালিকা) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              ৪. পরীক্ষা কর্মচারী সম্মানী তালিকা ({staff.length} জন)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              অফিস সহকারী, দপ্তরী, এমএলএসএস, পিয়ন ও নৈশপ্রহরীদের ডিউটি দিন ও সম্মানী নির্ধারণ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddStaffModal(!showAddStaffModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কর্মচারী যোগ করুন</span>
            </button>
          </div>
        </div>

        {/* Add Staff Form */}
        {showAddStaffModal && (
          <form
            onSubmit={handleAddStaff}
            className="p-4 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
          >
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                কর্মচারীর নাম *
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: মো: দেলোয়ার হোসেন"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="w-36">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">পদবী</label>
              <input
                type="text"
                placeholder="যেমন: দপ্তরী / পিয়ন"
                value={newStaff.designation}
                onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="w-24">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ডিউটি দিন
              </label>
              <input
                type="number"
                min="1"
                value={newStaff.dutyDays}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, dutyDays: Number(e.target.value) || 1 })
                }
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-mono"
              />
            </div>

            <div className="w-28">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                দৈনিক সম্মানী (৳)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={newStaff.ratePerDay}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, ratePerDay: Number(e.target.value) || 0 })
                }
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                দায়িত্বের বিবরণ / নোট
              </label>
              <input
                type="text"
                placeholder="ঘণ্টা বাজানো ও হল প্রস্তুত"
                value={newStaff.note}
                onChange={(e) => setNewStaff({ ...newStaff, note: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700"
              >
                যোগ করুন
              </button>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                বাতিল
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 text-center w-12">ক্র:</th>
                <th className="py-2.5 px-4">কর্মচারীর নাম</th>
                <th className="py-2.5 px-4">পদবী</th>
                <th className="py-2.5 px-4 text-center w-24">ডিউটি দিন</th>
                <th className="py-2.5 px-4 text-right w-32">দৈনিক হার (৳)</th>
                <th className="py-2.5 px-4 text-right w-36">মোট প্রাপ্য সম্মানী</th>
                <th className="py-2.5 px-4">দায়িত্ব ও মন্তব্য</th>
                <th className="py-2.5 px-4 text-center w-24">মুছুন / এডিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member, idx) => {
                const isEditing = editingStaffId === member.id;

                if (isEditing) {
                  return (
                    <tr key={member.id} className="bg-amber-50/80">
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editStaffForm.name}
                          onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-bold text-slate-900"
                          placeholder="কর্মচারীর নাম"
                          autoFocus
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editStaffForm.designation}
                          onChange={(e) => setEditStaffForm({ ...editStaffForm, designation: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white"
                          placeholder="পদবী"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={editStaffForm.dutyDays}
                          onChange={(e) => setEditStaffForm({ ...editStaffForm, dutyDays: Number(e.target.value) || 1 })}
                          className="w-16 text-center font-mono font-bold text-xs p-1 bg-white border border-amber-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={editStaffForm.ratePerDay}
                          onChange={(e) => setEditStaffForm({ ...editStaffForm, ratePerDay: Number(e.target.value) || 0 })}
                          className="w-20 text-right font-mono font-bold text-xs p-1 bg-white border border-amber-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-amber-900">
                        ৳ {((editStaffForm.dutyDays || 0) * (editStaffForm.ratePerDay || 0)).toLocaleString('bn-BD')}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editStaffForm.note}
                          onChange={(e) => setEditStaffForm({ ...editStaffForm, note: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white"
                          placeholder="দায়িত্ব / মন্তব্য"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditStaff(member.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                            title="সংরক্ষণ করুন"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>সেভ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStaffId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition-colors"
                            title="বাতিল করুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const total = member.dutyDays * member.ratePerDay;
                return (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{member.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{member.designation}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                      {member.dutyDays} দিন
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      ৳ {member.ratePerDay}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-amber-900 bg-amber-50/40">
                      ৳ {total.toLocaleString('bn-BD')}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {member.note || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Pencil Button */}
                        <button
                          type="button"
                          onClick={() => startEditStaff(member)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                          title="কর্মচারীর তথ্য এডিট করুন (পেন্সিল)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(member.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={5} className="py-2.5 px-4 text-right text-slate-700">
                  সর্বমোট কর্মচারী সম্মানী:
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-amber-950">
                  ৳ {totalStaffCost.toLocaleString('bn-BD')}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 5: Remuneration & Duty Summary with Filter (কমিটি, শিক্ষক ও কর্মচারী একীভূত পে-শিট) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              ৫. প্রশাসন, কমিটি, প্রত্যবেক্ষক ও কর্মচারী একীভূত সামারি পে-শিট
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              নাম, পদবী, ভূমিকা, ডিউটি ও প্রাপ্য টাকার পরিমাণ অনুযায়ী প্রিন্ট-উপযোগী বিল
            </p>
          </div>

          {/* Filter Radio/Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setRemunerationFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                remunerationFilter === 'all'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল ({cyclicRoster.teacherStats.length + staff.length + committee.length} জন)
            </button>
            <button
              onClick={() => setRemunerationFilter('committee')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                remunerationFilter === 'committee'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              প্রশাসন ও কমিটি ({committee.length} জন)
            </button>
            <button
              onClick={() => setRemunerationFilter('teachers')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                remunerationFilter === 'teachers'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              প্রত্যবেক্ষক শিক্ষক ({cyclicRoster.teacherStats.length} জন)
            </button>
            <button
              onClick={() => setRemunerationFilter('staff')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                remunerationFilter === 'staff'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              কর্মচারী ({staff.length} জন)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">ক্র:</th>
                <th className="py-2.5 px-3">নাম</th>
                <th className="py-2.5 px-3">পদবী ও দায়িত্ব</th>
                <th className="py-2.5 px-3 text-center w-40">ক্যাটাগরি</th>
                <th className="py-2.5 px-3 text-center w-32">ডিউটি / দিন / ভূমিকা</th>
                <th className="py-2.5 px-3 text-right w-28">হার / ভিত্তি (টাকা)</th>
                <th className="py-2.5 px-3 text-right w-36">মোট প্রাপ্য ভাতা (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Committee Members */}
              {(remunerationFilter === 'all' || remunerationFilter === 'committee') &&
                committee.map((member, idx) => {
                  return (
                    <tr key={member.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-purple-900 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {member.name}
                      </td>
                      <td className="py-2.5 px-3 text-purple-950 font-medium">
                        {member.designation}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          প্রশাসন ও পরীক্ষা কমিটি
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-purple-900 text-[11px]">
                        সার্বিক পরিচালনা
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        এককালীন
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-purple-950 bg-purple-50/40">
                        ৳ {member.honorarium.toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  );
                })}

              {/* Teachers */}
              {(remunerationFilter === 'all' || remunerationFilter === 'teachers') &&
                cyclicRoster.teacherStats.map((stat, idx) => {
                  const total = stat.totalDuties * expenses.invigilationRatePerDuty;
                  const offset = remunerationFilter === 'all' ? committee.length : 0;
                  return (
                    <tr key={stat.teacher.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                        {offset + idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{stat.teacher.name}</span>
                          {stat.isSubstitute && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              বদলি শিক্ষক
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {stat.teacher.designation} ({stat.teacher.subject || 'সাধারণ'})
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          কক্ষ প্রত্যবেক্ষক
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-900">
                        {stat.totalDuties} টি ডিউটি
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ৳ {expenses.invigilationRatePerDuty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/50">
                        ৳ {total.toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  );
                })}

              {/* Staff */}
              {(remunerationFilter === 'all' || remunerationFilter === 'staff') &&
                staff.map((member, idx) => {
                  const total = member.dutyDays * member.ratePerDay;
                  const offset =
                    remunerationFilter === 'all'
                      ? committee.length + cyclicRoster.teacherStats.length
                      : 0;
                  return (
                    <tr key={member.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                        {offset + idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{member.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{member.designation}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          পরীক্ষা কর্মচারী
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-900">
                        {member.dutyDays} দিন
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ৳ {member.ratePerDay}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 bg-amber-50/50">
                        ৳ {total.toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="py-3 px-3 text-right text-slate-800">
                  সর্বমোট সম্মানী ও ভাতা বিল ({remunerationFilter === 'all' ? 'সকল খাত' : remunerationFilter === 'committee' ? 'প্রশাসন ও কমিটি' : remunerationFilter === 'teachers' ? 'প্রত্যবেক্ষক শিক্ষক' : 'কর্মচারী'}):
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-base text-indigo-950">
                  ৳{' '}
                  {(
                    (remunerationFilter === 'all' || remunerationFilter === 'committee' ? totalCommitteeCost : 0) +
                    (remunerationFilter === 'all' || remunerationFilter === 'teachers' ? totalInvigilationCost : 0) +
                    (remunerationFilter === 'all' || remunerationFilter === 'staff' ? totalStaffCost : 0)
                  ).toLocaleString('bn-BD')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 6: Additional Custom Expenses */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              ৬. অন্যান্য আনুষঙ্গিক পরীক্ষা ব্যয় ({expenses.customExpenses.length} টি খাত)
            </h3>
            <p className="text-xs text-slate-500">
              সিলিং সামগ্রী, সুতলি, ফাইল কভার বা পরিবহন খরচ
            </p>
          </div>

          <button
            onClick={() => setShowAddCustomExpense(!showAddCustomExpense)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন খাত যোগ করুন</span>
          </button>
        </div>

        {showAddCustomExpense && (
          <form
            onSubmit={handleAddCustomExpense}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 animate-in fade-in"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ব্যয়ের খাতের নাম *
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: সাউন্ড সিস্টেম ভাড়া"
                value={newCustomItem.title}
                onChange={(e) => setNewCustomItem({ ...newCustomItem, title: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="w-28">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                টাকা (৳) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={newCustomItem.amount}
                onChange={(e) =>
                  setNewCustomItem({ ...newCustomItem, amount: Number(e.target.value) || 0 })
                }
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">নোট</label>
              <input
                type="text"
                placeholder="বিবরণ"
                value={newCustomItem.note}
                onChange={(e) => setNewCustomItem({ ...newCustomItem, note: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
              >
                যোগ করুন
              </button>
              <button
                type="button"
                onClick={() => setShowAddCustomExpense(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                বাতিল
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {expenses.customExpenses.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{item.title}</div>
                {item.note && <div className="text-[11px] text-slate-500">{item.note}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xs text-slate-800">
                  ৳ {item.amount.toLocaleString('bn-BD')}
                </span>
                <button
                  onClick={() => handleDeleteCustomExpense(item.id)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ExamSettings, ExamSubject, CommitteeMember } from '../types/seatPlan';
import { DEFAULT_EXAM_ROUTINE } from '../data/defaultExamRoutine';
import { SAMPLE_COMMITTEE } from '../data/sampleStaff';
import {
  X,
  School,
  Check,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Crown,
  Award,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ExamSettings;
  onSave: (newSettings: ExamSettings) => void;
  committee?: CommitteeMember[];
  onSaveCommittee?: (newCommittee: CommitteeMember[]) => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onResetAllData?: () => void;
  lastSavedTime?: string;
}

export const ExamSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  committee = SAMPLE_COMMITTEE,
  onSaveCommittee,
  onExportBackup,
  onImportBackup,
  onResetAllData,
  lastSavedTime,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'routine' | 'committee' | 'backup'>('info');
  const [formData, setFormData] = useState<ExamSettings>({
    ...settings,
    subjects: settings.subjects || DEFAULT_EXAM_ROUTINE,
  });

  const [localCommittee, setLocalCommittee] = useState<CommitteeMember[]>(committee);

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        subjects: settings.subjects || DEFAULT_EXAM_ROUTINE,
      });
      setLocalCommittee(committee && committee.length > 0 ? committee : SAMPLE_COMMITTEE);
    }
  }, [isOpen, settings, committee]);

  const [newSubDate, setNewSubDate] = useState('');
  const [newSubDay, setNewSubDay] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // New committee member inside modal
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesignation, setNewCommDesignation] = useState('সদস্য, পরীক্ষা পরিচালনা কমিটি');
  const [newCommRole, setNewCommRole] = useState<'headmaster' | 'assistant_head' | 'controller' | 'member' | 'other'>('member');
  const [newCommHonorarium, setNewCommHonorarium] = useState<number>(1500);
  const [newCommNote, setNewCommNote] = useState('');

  // Subject inline edit state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ date: '', day: '', subjectName: '' });

  // Committee edit state
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommForm, setEditCommForm] = useState<{
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    if (onSaveCommittee) {
      onSaveCommittee(localCommittee);
    }
    onClose();
  };

  const handleAddSubject = () => {
    if (!newSubName.trim()) return;
    const newSubject: ExamSubject = {
      id: `sub-${Date.now()}`,
      date: newSubDate.trim() || '—',
      day: newSubDay.trim() || '—',
      subjectName: newSubName.trim(),
    };
    setFormData({
      ...formData,
      subjects: [...(formData.subjects || []), newSubject],
    });
    setNewSubDate('');
    setNewSubDay('');
    setNewSubName('');
  };

  const startEditSubject = (sub: ExamSubject) => {
    setEditingSubjectId(sub.id);
    setEditSubjectForm({ date: sub.date, day: sub.day, subjectName: sub.subjectName });
  };

  const handleSaveEditSubject = (id: string) => {
    if (!editSubjectForm.subjectName.trim()) return;
    setFormData({
      ...formData,
      subjects: (formData.subjects || []).map((s) =>
        s.id === id
          ? {
              ...s,
              date: editSubjectForm.date.trim() || '—',
              day: editSubjectForm.day.trim() || '—',
              subjectName: editSubjectForm.subjectName.trim(),
            }
          : s
      ),
    });
    setEditingSubjectId(null);
  };

  const handleDeleteSubject = (id: string) => {
    setFormData({
      ...formData,
      subjects: (formData.subjects || []).filter((s) => s.id !== id),
    });
    if (editingSubjectId === id) {
      setEditingSubjectId(null);
    }
  };

  const handleResetDefaultRoutine = () => {
    setFormData({
      ...formData,
      subjects: [...DEFAULT_EXAM_ROUTINE],
    });
  };

  const startEditComm = (m: CommitteeMember) => {
    setEditingCommId(m.id);
    setEditCommForm({
      name: m.name,
      designation: m.designation,
      role: m.role,
      honorarium: m.honorarium,
      note: m.note || '',
    });
  };

  const handleSaveEditComm = (id: string) => {
    if (!editCommForm.name.trim()) return;
    setLocalCommittee((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: editCommForm.name.trim(),
              designation: editCommForm.designation.trim() || 'কমিটি সদস্য',
              role: editCommForm.role,
              honorarium: Math.max(0, Number(editCommForm.honorarium) || 0),
              note: editCommForm.note.trim(),
            }
          : m
      )
    );
    setEditingCommId(null);
  };

  // Committee handlers
  const handleAddModalCommittee = () => {
    if (!newCommName.trim()) return;
    const item: CommitteeMember = {
      id: `comm-${Date.now()}`,
      name: newCommName.trim(),
      designation: newCommDesignation.trim(),
      role: newCommRole,
      honorarium: Number(newCommHonorarium) || 0,
      note: newCommNote.trim(),
    };
    setLocalCommittee((prev) => [...prev, item]);
    setNewCommName('');
    setNewCommDesignation('সদস্য, পরীক্ষা পরিচালনা কমিটি');
    setNewCommRole('member');
    setNewCommHonorarium(1500);
    setNewCommNote('');
  };

  const handleDeleteModalCommittee = (id: string) => {
    setLocalCommittee((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateModalCommitteeHonorarium = (id: string, val: number) => {
    setLocalCommittee((prev) =>
      prev.map((m) => (m.id === id ? { ...m, honorarium: Math.max(0, val) } : m))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">প্রতিষ্ঠান, প্রশাসন ও পরীক্ষার তথ্য</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            সাধারণ তথ্য
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('committee')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'committee'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>পরীক্ষা কমিটি ও প্রশাসন ({localCommittee.length} জন)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routine')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'routine'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>বিষয় ও সময়সূচী ({formData.subjects?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ডাটা ব্যাকআপ ও রিস্টোর</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  প্রতিষ্ঠানের নাম (School / College Name)
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="যেমন: হেসাখাল বাজার উচ্চ বিদ্যালয়"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  পরীক্ষার নাম (Exam Name)
                </label>
                <input
                  type="text"
                  required
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  placeholder="যেমন: ১০ম শ্রেণীর নির্বাচনী পরীক্ষা-২০২৬"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    শিক্ষাবর্ষ / সাল (Academic Year)
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="২০২৬"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    শিফট / সময় (Shift)
                  </label>
                  <input
                    type="text"
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    placeholder="যেমন: সকাল ১০:০০ - ১:০০"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  পরীক্ষার তারিখ (Exam Date)
                </label>
                <input
                  type="text"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  placeholder="যেমন: ২৭-১০-২০২৬ থেকে ১২-১১-২০২৬"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span>প্রশাসন ও পরীক্ষা কমিটির প্রধান ব্যক্তিবর্গ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      প্রধান শিক্ষকের নাম
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: জনাব মো: আবুল খায়ের"
                      value={formData.headmasterName || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, headmasterName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      সহকারী প্রধান শিক্ষকের নাম
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: জনাব মো: আলমগীর হোসাইন চৌধুরী"
                      value={formData.assistantHeadName || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, assistantHeadName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    পরীক্ষা আহ্বায়ক / পরীক্ষা নিয়ন্ত্রকের নাম
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: জনাব মো: মায়েন উদ্দিন"
                    value={formData.examConvenerName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, examConvenerName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    প্রথম স্বাক্ষরের পদবী
                  </label>
                  <input
                    type="text"
                    value={formData.examControllerTitle}
                    onChange={(e) => setFormData({ ...formData, examControllerTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    দ্বিতীয় স্বাক্ষরের পদবী
                  </label>
                  <input
                    type="text"
                    value={formData.headmasterTitle}
                    onChange={(e) => setFormData({ ...formData, headmasterTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'routine' && (
            <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50 text-sm text-indigo-900 space-y-2">
              <div className="font-bold">পরীক্ষার রুটিন (সকাল / বিকাল শিফটসহ)</div>
              <p className="text-xs leading-relaxed">
                রুটিন এখন শ্রেণীভিত্তিক ও শিফটভিত্তিক। রুটিন এডিট করতে{' '}
                <strong>"৩. প্রত্যবেক্ষক ও রোস্টার" ট্যাবে → "পরীক্ষার রুটিন (শিফটসহ)"</strong> অংশে যান। সেখানে প্রতি দিনের
                জন্য ৬ষ্ঠ / ৭ম / ৮ম / ৯ম শ্রেণীর বিষয়, সকাল-বিকাল শিফট ও সময় ঠিক করা যায়।
              </p>
              <p className="text-xs">
                বর্তমান রুটিনে মোট <strong>{formData.subjects?.length || 0}</strong> টি পরীক্ষা-বেলা (পিরিয়ড) আছে।
              </p>
            </div>
          )}

          {activeTab === 'committee' && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 leading-relaxed">
                  <strong>পরীক্ষা কমিটি ও প্রশাসন সম্মাননা:</strong> প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক, আহ্বায়ক ও কমিটির সদস্যদের নাম এবং সম্মাননা ভাতা এখানে সংরক্ষণ করুন। এই সম্মানী পরীক্ষার মূল বাজেট ও <strong>'পরীক্ষার ব্যয়' (Exam Expenses)</strong> ট্যাবে স্বয়ংক্রিয়ভাবে যোগ হবে।
                </div>
              </div>

              {/* Add form */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">নতুন সদস্য নিবন্ধন:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommName(formData.headmasterName || 'জনাব মো: আবুল খায়ের');
                        setNewCommDesignation('প্রধান শিক্ষক ও সভাপতি (পরীক্ষা কমিটি)');
                        setNewCommRole('headmaster');
                        setNewCommHonorarium(3000);
                        setNewCommNote('সার্বিক পরিচালনা ও অনুমোদন');
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-300 text-purple-800 rounded hover:bg-purple-50 font-medium"
                    >
                      + প্রধান শিক্ষক
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommName(formData.assistantHeadName || 'জনাব মো: আলমগীর হোসাইন চৌধুরী');
                        setNewCommDesignation('সহকারী প্রধান শিক্ষক ও সহ-সভাপতি');
                        setNewCommRole('assistant_head');
                        setNewCommHonorarium(2500);
                        setNewCommNote('পরীক্ষা সমন্বয় ও তদারকি');
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-300 text-purple-800 rounded hover:bg-purple-50 font-medium"
                    >
                      + সহকারী প্রধান
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommName(formData.examConvenerName || 'জনাব মো: মায়েন উদ্দিন');
                        setNewCommDesignation('আহ্বায়ক, পরীক্ষা পরিচালনা কমিটি');
                        setNewCommRole('controller');
                        setNewCommHonorarium(2200);
                        setNewCommNote('পরীক্ষা পরিচালনা ও প্রশ্ন তদারকি');
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-300 text-purple-800 rounded hover:bg-purple-50 font-medium"
                    >
                      + আহ্বায়ক
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommDesignation('সদস্য সচিব, পরীক্ষা পরিচালনা কমিটি');
                        setNewCommRole('member');
                        setNewCommHonorarium(1800);
                        setNewCommNote('সিটপ্ল্যান ও কার্যবিবরণী');
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-300 text-purple-800 rounded hover:bg-purple-50 font-medium"
                    >
                      + সদস্য সচিব
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommDesignation('সদস্য, পরীক্ষা পরিচালনা কমিটি');
                        setNewCommRole('member');
                        setNewCommHonorarium(1500);
                        setNewCommNote('হল পরিদর্শন ও শৃঙ্খলা');
                      }}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-300 text-purple-800 rounded hover:bg-purple-50 font-medium"
                    >
                      + সদস্য
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">নাম *</label>
                    <input
                      type="text"
                      placeholder="সদস্যের নাম"
                      value={newCommName}
                      onChange={(e) => setNewCommName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">পদবী ও ভূমিকা *</label>
                    <input
                      type="text"
                      placeholder="যেমন: প্রধান শিক্ষক ও সভাপতি"
                      value={newCommDesignation}
                      onChange={(e) => setNewCommDesignation(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">সম্মানী (৳)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newCommHonorarium}
                      onChange={(e) => setNewCommHonorarium(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs bg-white border border-purple-300 rounded text-right font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddModalCommittee}
                      disabled={!newCommName.trim()}
                      className="w-full px-3 py-1 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>যোগ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">ক্র:</th>
                      <th className="py-2 px-3">নাম</th>
                      <th className="py-2 px-3">পদবী ও ভূমিকা</th>
                      <th className="py-2 px-3 text-right w-32">সম্মানী (৳)</th>
                      <th className="py-2 px-3">মন্তব্য</th>
                      <th className="py-2 px-3 text-center w-20">মুছুন / এডিট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {localCommittee.map((member, idx) => {
                      const isEditing = editingCommId === member.id;

                      if (isEditing) {
                        return (
                          <tr key={member.id} className="bg-purple-100/70">
                            <td className="py-1.5 px-3 text-center font-mono text-purple-900 font-bold">{idx + 1}</td>
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={editCommForm.name}
                                onChange={(e) => setEditCommForm({ ...editCommForm, name: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white font-bold"
                                placeholder="নাম"
                                autoFocus
                              />
                            </td>
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={editCommForm.designation}
                                onChange={(e) => setEditCommForm({ ...editCommForm, designation: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white"
                                placeholder="পদবী"
                              />
                            </td>
                            <td className="py-1 px-1 text-right">
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={editCommForm.honorarium}
                                onChange={(e) => setEditCommForm({ ...editCommForm, honorarium: Number(e.target.value) || 0 })}
                                className="w-20 text-right font-mono font-bold text-xs p-1 bg-white border border-purple-300 rounded"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={editCommForm.note}
                                onChange={(e) => setEditCommForm({ ...editCommForm, note: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-purple-300 rounded bg-white"
                                placeholder="মন্তব্য"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditComm(member.id)}
                                  className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-200 rounded"
                                  title="সংরক্ষণ করুন"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCommId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                  title="বাতিল করুন"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={member.id} className="hover:bg-purple-50/30">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{member.name}</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            {member.designation}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={member.honorarium}
                              onChange={(e) =>
                                handleUpdateModalCommitteeHonorarium(
                                  member.id,
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-20 text-right font-mono font-bold text-xs p-1 bg-white border border-purple-200 rounded text-purple-950"
                            />
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {member.note || '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit Pencil Button */}
                              <button
                                type="button"
                                onClick={() => startEditComm(member)}
                                className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded transition-colors"
                                title="এডিট করুন (পেন্সিল)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteModalCommittee(member.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                  <tfoot className="bg-purple-50/80 font-bold border-t border-purple-200">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-purple-950">
                        সর্বমোট কমিটি সম্মাননা:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-purple-950 text-xs">
                        ৳{' '}
                        {localCommittee
                          .reduce((sum, m) => sum + (Number(m.honorarium) || 0), 0)
                          .toLocaleString('bn-BD')}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-[10px] text-purple-700">
                        (ব্যয় তালিকায় স্বয়ংক্রিয়ভাবে যোগ হবে)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Auto Save Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-sm mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>স্বয়ংক্রিয় স্টোরেজ সক্রিয় আছে</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  আপনার আপলোড করা সকল শিক্ষার্থী, কক্ষের পরিমাপ, শিক্ষক ডিউটি রোস্টার ও খরচের হিসাব ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে। পেজ রিফ্রেশ (F5 / Reload) দিলেও আপনার কোনো ডেটা মুছে যাবে না।
                </p>
                {lastSavedTime && (
                  <p className="text-[11px] text-emerald-600 mt-2 font-mono">
                    সর্বশেষ সংরক্ষণ: {new Date(lastSavedTime).toLocaleTimeString('bn-BD')}
                  </p>
                )}
              </div>

              {/* Export and Import Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download Backup */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>ব্যাকআপ ফাইল ডাউনলোড</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    আপনার সম্পূর্ণ ডেটা একটি নিরাপদ ব্যাকআপ ফাইলে ডাউনলোড করে রাখুন। এটি পেনড্রাইভ বা মেইলে অন্য কম্পিউটারে নিতে পারবেন।
                  </p>
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>সম্পূর্ণ ব্যাকআপ ফাইল নামান</span>
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>ব্যাকআপ ফাইল রিস্টোর</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    অন্য ডিভাইস বা পূর্বের ব্যাকআপ করা JSON ফাইল আপলোড করে এক ক্লিকে সম্পূর্ণ ডেটা ফিরিয়ে আনুন।
                  </p>
                  <label className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>ব্যাকআপ ফাইল নির্বাচন করুন</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportBackup) {
                          onImportBackup(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Reset to Default */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>প্রাথমিক ডেমো ডাটায় রিসেট করুন</span>
                  </div>
                  <p className="text-[11px] text-rose-600">
                    সকল আপলোড করা ডেটা মুছে সিস্টেমকে একেবারে প্রারম্ভিক ডেমো অবস্থায় ফিরিয়ে নেবে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetAllData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
                >
                  সব রিসেট করুন
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

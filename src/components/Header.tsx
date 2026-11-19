import React from 'react';
import { ExamSettings } from '../types/seatPlan';
import {
  School,
  Settings,
  Search,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  DownloadCloud,
  UserCheck,
  Receipt,
  FolderArchive,
  Wand2,
} from 'lucide-react';
import { getShiftText } from '../utils/examSchedule';

interface Props {
  activeTab: 'students' | 'rooms' | 'teachers' | 'expenses' | 'seats' | 'preview' | 'print';
  setActiveTab: (tab: 'students' | 'rooms' | 'teachers' | 'expenses' | 'seats' | 'preview' | 'print') => void;
  examSettings: ExamSettings;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onDownloadSample: () => void;
  onOpenDownloadModal: () => void;
  studentCount: number;
  roomCount: number;
  totalSeats: number;
  teacherCount: number;
  isSaved?: boolean;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  examSettings,
  onOpenSettings,
  onOpenSearch,
  onDownloadSample,
  onOpenDownloadModal,
  studentCount,
  roomCount,
  totalSeats,
  teacherCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      {/* Top institution bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {examSettings.schoolName || 'প্রতিষ্ঠানের নাম নির্ধারণ করুন'}
                </h1>
                <button
                  onClick={onOpenSettings}
                  title="প্রতিষ্ঠানের তথ্য এডিট করুন"
                  className="text-xs text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 inline" />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {examSettings.examName} · শিক্ষাবর্ষ {examSettings.academicYear} · সকাল: {getShiftText(examSettings, 'morning')} · বিকাল: {getShiftText(examSettings, 'afternoon')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-save Status indicator */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg shadow-2xs"
              title="আপনার আপলোড করা শিক্ষার্থী ও পরীক্ষার সমস্ত ডাটা ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত রয়েছে। পেজ রিফ্রেশ (Refresh) করলেও হারাবে না।"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>স্বয়ংক্রিয় সেভ চালু</span>
            </div>

            {/* Direct Full Source ZIP Download Button */}
            <a
              href="/manha-exam-management-system.zip"
              download="manha-exam-management-system.zip"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-2xs"
              title="সম্পূর্ণ সোর্স কোড ও প্রজেক্টের জিপ (.zip) ফাইল ডাউনলোড করুন"
            >
              <FolderArchive className="w-3.5 h-3.5 text-amber-700" />
              <span>জিপ ডাউনলোড</span>
            </a>

            {/* Download App Button */}
            <button
              onClick={onOpenDownloadModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              title="কম্পিউটার বা মোবাইলে ইনস্টল ও ডাউনলোড করুন"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>অ্যাপ ডাউনলোড</span>
            </button>

            <button
              onClick={onDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="নমুনা এক্সেল ফাইল ডাউনলোড করে ফরম্যাটটি দেখুন"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>নমুনা এক্সেল</span>
            </button>

            <button
              onClick={onOpenSearch}
              disabled={studentCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors border border-indigo-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>সিট খুঁজুন</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>সেটিংস</span>
            </button>
          </div>
        </div>

        {/* Navigation Step Tabs */}
        <div className="flex items-center justify-between py-2 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>১. শিক্ষার্থী ডাটা ({studentCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'rooms'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <School className="w-4 h-4" />
              <span>২. কক্ষ ও বেঞ্চ ({roomCount} কক্ষ)</span>
            </button>

            <button
              onClick={() => setActiveTab('teachers')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'teachers'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>৩. প্রত্যবেক্ষক ও রোস্টার ({teacherCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>৪. পরীক্ষার ব্যয় ও সম্মানী</span>
            </button>

            <button
              onClick={() => setActiveTab('seats')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'seats'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>সিট নিয়ম ও পরিবর্তন</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>৫. সিট প্ল্যান ভিউ</span>
            </button>

            <button
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'print'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>৬. প্রিন্ট ও রিপোর্ট</span>
            </button>
          </nav>

          {/* Quick status badge */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              মোট শিক্ষার্থী: <strong className="text-slate-800">{studentCount}</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${totalSeats >= studentCount && studentCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              মোট আসন: <strong className="text-slate-800">{totalSeats}</strong>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

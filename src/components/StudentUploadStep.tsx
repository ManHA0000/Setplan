import React, { useState, useRef } from 'react';
import { Student } from '../types/seatPlan';
import { parseExcelFile, downloadSampleExcel, detectColumns } from '../utils/excelParser';
import { SAMPLE_STUDENTS } from '../data/sampleStudents';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface Props {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onProceedToRooms: () => void;
}

export const StudentUploadStep: React.FC<Props> = ({ students, setStudents, onProceedToRooms }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Manual student add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', roll: '', className: 'দশম', section: 'ক' });

  // Student inline edit state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentForm, setEditStudentForm] = useState<{
    name: string;
    roll: string;
    className: string;
    section: string;
  }>({ name: '', roll: '', className: '', section: '' });

  // Column mapper state
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [columnMap, setColumnMap] = useState({
    nameCol: '',
    rollCol: '',
    classCol: '',
    sectionCol: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setLoading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setActiveFile(file);

    try {
      const result = await parseExcelFile(file);
      if (result.error) {
        setUploadError(result.error);
        setLoading(false);
        return;
      }

      setRawHeaders(result.headers);
      setColumnMap({
        nameCol: result.detectedColumns.nameCol || '',
        rollCol: result.detectedColumns.rollCol || '',
        classCol: result.detectedColumns.classCol || '',
        sectionCol: result.detectedColumns.sectionCol || '',
      });

      if (result.students.length > 0) {
        setStudents(result.students);
        setUploadSuccess(
          `অভিনন্দন! মোট ${result.students.length} জন শিক্ষার্থীর তালিকা সফলভাবে লোড হয়েছে।`
        );
      } else {
        setUploadError('ফাইল থেকে শিক্ষার্থী পাওয়া যায়নি। কলামগুলো যাচাই করুন।');
        setShowColumnMapper(true);
      }
    } catch (err: any) {
      setUploadError(`ত্রুটি: ${err?.message || 'ফাইলটি প্রসেস করা যায়নি'}`);
    } finally {
      setLoading(false);
    }
  };

  const applyCustomColumnMap = async () => {
    if (!activeFile) return;
    setLoading(true);
    try {
      const result = await parseExcelFile(activeFile, columnMap);
      if (result.students.length > 0) {
        setStudents(result.students);
        setUploadSuccess(`নতুন কলাম অনুযায়ী ${result.students.length} জন শিক্ষার্থী সফলভাবে লোড হয়েছে।`);
        setShowColumnMapper(false);
      } else {
        setUploadError('নির্ধারিত কলাম দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি।');
      }
    } catch (err: any) {
      setUploadError('কলাম পরিবর্তন করতে ত্রুটি হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setStudents([...SAMPLE_STUDENTS]);
    setUploadSuccess(`নমুনা ডাটা লোড সম্পন্ন! মোট ${SAMPLE_STUDENTS.length} জন শিক্ষার্থী যুক্ত হয়েছে।`);
    setUploadError(null);
  };

  const handleClearAll = () => {
    if (confirm('আপনি কি নিশ্চিত যে সকল শিক্ষার্থীর তালিকা মুছে ফেলতে চান?')) {
      setStudents([]);
      setUploadSuccess(null);
      setUploadError(null);
    }
  };

  const handleAddManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.roll.trim()) return;

    const rollNum = parseInt(newStudent.roll.trim(), 10);
    const studentObj: Student = {
      id: `manual-${Date.now()}`,
      name: newStudent.name.trim(),
      roll: isNaN(rollNum) ? newStudent.roll.trim() : rollNum,
      className: newStudent.className.trim() || 'সাধারণ',
      section: newStudent.section.trim() || 'ক',
    };

    setStudents((prev) => [...prev, studentObj]);
    setNewStudent({ name: '', roll: '', className: newStudent.className, section: newStudent.section });
    setShowAddForm(false);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    if (editingStudentId === id) {
      setEditingStudentId(null);
    }
  };

  const startEditStudent = (std: Student) => {
    setEditingStudentId(std.id);
    setEditStudentForm({
      name: std.name,
      roll: String(std.roll),
      className: std.className,
      section: std.section || '',
    });
  };

  const handleSaveEditStudent = (id: string) => {
    if (!editStudentForm.name.trim() || !editStudentForm.roll.trim()) return;
    const rollNum = parseInt(editStudentForm.roll.trim(), 10);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: editStudentForm.name.trim(),
              roll: isNaN(rollNum) ? editStudentForm.roll.trim() : rollNum,
              className: editStudentForm.className.trim() || s.className,
              section: editStudentForm.section.trim() || s.section,
            }
          : s
      )
    );
    setEditingStudentId(null);
  };

  // Unique classes and sections breakdown
  const classesList = Array.from(new Set(students.map((s) => s.className)));
  const classBreakdown = classesList.map((cls) => {
    const count = students.filter((s) => s.className === cls).length;
    const sections = Array.from(new Set(students.filter((s) => s.className === cls).map((s) => s.section)));
    return { className: cls, count, sections };
  });

  // Filtered students for preview table
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClassFilter === 'ALL' || s.className === selectedClassFilter;
    const matchSearch =
      searchQuery.trim() === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.roll).toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.section.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Upload Zone & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              শিক্ষার্থী তালিকা আপলোড (Excel / CSV)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              এক্সেল ফাইলে অন্তত ৪টি কলাম থাকতে হবে: <span className="font-semibold text-slate-700">নাম, রোল, শ্রেণী, শাখা/বিভাগ</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
            >
              <Download className="w-3.5 h-3.5" />
              নমুনা এক্সেল ফাইল ডাউনলোড
            </button>
            <button
              onClick={loadSampleData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
            >
              <Users className="w-3.5 h-3.5" />
              নমুনা ডাটা লোড (Demo Data)
            </button>
          </div>
        </div>

        {/* Auto Save Persistence Banner */}
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
            <span>
              <strong>স্থায়ী মেমরি চালু:</strong> আপনার আপলোড করা এক্সেল ফাইল ও শিক্ষার্থীর তালিকা সরাসরি ব্রাউজারে সংরক্ষিত থাকে। পেজ রিলোড বা রিফ্রেশ (Refresh / F5) করলেও কোনো তথ্য মুছে যাবে না।
            </span>
          </div>
          {students.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline shrink-0 transition-colors ml-auto flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>তালিকা ক্লিয়ার করুন</span>
            </button>
          )}
        </div>

        {/* Drag and drop upload container */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-white'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>

          <h3 className="font-semibold text-slate-800 text-base mb-1">
            {loading ? 'এক্সেল ফাইল প্রসেস করা হচ্ছে...' : 'এক্সেল ফাইলটি এখানে টেনে আনুন বা ক্লিক করে সিলেক্ট করুন'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            সমর্থিত ফরম্যাট: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">.xlsx</code>,{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">.xls</code>,{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">.csv</code> (হেডার: নাম, রোল, শ্রেণী, শাখা)
          </p>
        </div>

        {/* Feedback Messages */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{uploadSuccess}</span>
            </div>
            {rawHeaders.length > 0 && (
              <button
                onClick={() => setShowColumnMapper(!showColumnMapper)}
                className="text-indigo-600 underline text-xs font-semibold hover:text-indigo-800"
              >
                {showColumnMapper ? 'কলাম ম্যাপিং লুকান' : 'কলাম পরিবর্তন / ম্যাপিং'}
              </button>
            )}
          </div>
        )}

        {/* Custom Column Mapper if needed */}
        {showColumnMapper && rawHeaders.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">কলাম ম্যাপিং নির্ধারণ করুন:</h4>
              <span className="text-xs text-slate-500">আপনার এক্সেল ফাইলের কলাম নির্বাচন করুন</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">শিক্ষার্থীর নাম কলাম</label>
                <select
                  value={columnMap.nameCol}
                  onChange={(e) => setColumnMap({ ...columnMap, nameCol: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="">নির্বাচন করুন</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">রোল নম্বর কলাম</label>
                <select
                  value={columnMap.rollCol}
                  onChange={(e) => setColumnMap({ ...columnMap, rollCol: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="">নির্বাচন করুন</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">শ্রেণী কলাম</label>
                <select
                  value={columnMap.classCol}
                  onChange={(e) => setColumnMap({ ...columnMap, classCol: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="">নির্বাচন করুন</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">শাখা/বিভাগ কলাম</label>
                <select
                  value={columnMap.sectionCol}
                  onChange={(e) => setColumnMap({ ...columnMap, sectionCol: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="">নির্বাচন করুন</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={applyCustomColumnMap}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
              >
                কলাম সংরক্ষণ ও পুনরায় লোড করুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Roster & Stats Section */}
      {students.length > 0 && (
        <div className="space-y-4">
          {/* Class Breakdown Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">মোট শিক্ষার্থী</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{students.length} জন</div>
            </div>

            {classBreakdown.map((item) => (
              <div key={item.className} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">{item.className} শ্রেণী</div>
                <div className="text-xl font-bold text-indigo-700 mt-1">{item.count} জন</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  শাখা: {item.sections.join(', ')}
                </div>
              </div>
            ))}
          </div>

          {/* Student Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="নাম, রোল বা শাখা দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs text-slate-700"
                  >
                    <option value="ALL">সকল শ্রেণী</option>
                    {classesList.map((c) => (
                      <option key={c} value={c}>
                        {c} শ্রেণী
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন শিক্ষার্থী যোগ
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  সব মুছুন
                </button>
              </div>
            </div>

            {/* Manual Add Form Toggle */}
            {showAddForm && (
              <form onSubmit={handleAddManualStudent} className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[150px]">
                  <input
                    type="text"
                    required
                    placeholder="শিক্ষার্থীর নাম"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="text"
                    required
                    placeholder="রোল নং"
                    value={newStudent.roll}
                    onChange={(e) => setNewStudent({ ...newStudent, roll: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="w-28">
                  <input
                    type="text"
                    required
                    placeholder="শ্রেণী"
                    value={newStudent.className}
                    onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="w-28">
                  <input
                    type="text"
                    required
                    placeholder="শাখা/বিভাগ"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                >
                  যোগ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  বাতিল
                </button>
              </form>
            )}

            {/* Table view */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">ক্রমিক</th>
                    <th className="py-2.5 px-4 w-24">রোল নং</th>
                    <th className="py-2.5 px-4">শিক্ষার্থীর নাম</th>
                    <th className="py-2.5 px-4 w-28">শ্রেণী</th>
                    <th className="py-2.5 px-4 w-24">শাখা / বিভাগ</th>
                    <th className="py-2.5 px-4 w-28 text-center">মুছুন / এডিট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        কোনো শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      const isEditing = editingStudentId === std.id;

                      if (isEditing) {
                        return (
                          <tr key={std.id} className="bg-amber-50/80">
                            <td className="py-2 px-4 text-center font-mono font-bold text-amber-700">{idx + 1}</td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editStudentForm.roll}
                                onChange={(e) => setEditStudentForm({ ...editStudentForm, roll: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-bold text-slate-900"
                                placeholder="রোল নং"
                                autoFocus
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editStudentForm.name}
                                onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-bold text-slate-900"
                                placeholder="শিক্ষার্থীর নাম"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editStudentForm.className}
                                onChange={(e) => setEditStudentForm({ ...editStudentForm, className: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-medium text-slate-800"
                                placeholder="শ্রেণী"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editStudentForm.section}
                                onChange={(e) => setEditStudentForm({ ...editStudentForm, section: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-medium text-slate-800"
                                placeholder="শাখা/বিভাগ"
                              />
                            </td>
                            <td className="py-2 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditStudent(std.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="সংরক্ষণ করুন"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>সেভ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(null)}
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

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-4 font-bold text-slate-900">{std.roll}</td>
                          <td className="py-2 px-4 font-semibold text-slate-800">{std.name}</td>
                          <td className="py-2 px-4 text-slate-600">{std.className}</td>
                          <td className="py-2 px-4 text-slate-600">{std.section}</td>
                          <td className="py-2 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Pencil Button */}
                              <button
                                type="button"
                                onClick={() => startEditStudent(std)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                title="শিক্ষার্থীর তথ্য এডিট করুন (পেন্সিল)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(std.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="মুছুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                প্রদর্শিত: {filteredStudents.length} / মোট: {students.length} জন শিক্ষার্থী
              </div>

              <button
                onClick={onProceedToRooms}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <span>পরবর্তী ধাপ: কক্ষ ও বেঞ্চ বিন্যাস</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

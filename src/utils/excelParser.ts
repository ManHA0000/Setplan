import * as XLSX from 'xlsx';
import { Student, RoomPlan, ExamSettings } from '../types/seatPlan';
import { SAMPLE_STUDENTS } from '../data/sampleStudents';

export interface ParseResult {
  students: Student[];
  headers: string[];
  totalRows: number;
  detectedColumns: {
    nameCol: string | null;
    rollCol: string | null;
    classCol: string | null;
    sectionCol: string | null;
  };
  error?: string;
}

// Normalized matching helper
const normalize = (str: any) =>
  String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—/:]+/g, '');

const NAME_KEYWORDS = ['নাম', 'শিক্ষার্থীরনাম', 'ছাত্রছাত্রীরনাম', 'name', 'studentname', 'fullname'];
const ROLL_KEYWORDS = ['রোল', 'রোলনং', 'রোলনম্বর', 'ক্লাসরোল', 'roll', 'rollno', 'rollnumber', 'id', 'studentid'];
const CLASS_KEYWORDS = ['শ্রেণী', 'শ্রেনী', 'শ্রেণি', 'ক্লাস', 'class', 'grade', 'standard'];
const SECTION_KEYWORDS = ['শাখা/বিভাগ', 'শাখা', 'বিভাগ', 'গ্রুপ', 'section', 'group', 'sec', 'dept', 'department', 'শাখাবিভাগ'];

export const detectColumns = (headers: string[]) => {
  let nameCol: string | null = null;
  let rollCol: string | null = null;
  let classCol: string | null = null;
  let sectionCol: string | null = null;

  for (const h of headers) {
    const norm = normalize(h);
    if (!nameCol && NAME_KEYWORDS.some((kw) => norm.includes(normalize(kw)))) {
      nameCol = h;
    } else if (!rollCol && ROLL_KEYWORDS.some((kw) => norm.includes(normalize(kw)))) {
      rollCol = h;
    } else if (!classCol && CLASS_KEYWORDS.some((kw) => norm.includes(normalize(kw)))) {
      classCol = h;
    } else if (!sectionCol && SECTION_KEYWORDS.some((kw) => norm.includes(normalize(kw)))) {
      sectionCol = h;
    }
  }

  return { nameCol, rollCol, classCol, sectionCol };
};

export const parseExcelFile = async (
  file: File,
  columnMapping?: { nameCol?: string; rollCol?: string; classCol?: string; sectionCol?: string }
): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.length) {
          return resolve({
            students: [],
            headers: [],
            totalRows: 0,
            detectedColumns: { nameCol: null, rollCol: null, classCol: null, sectionCol: null },
            error: 'এক্সেলে কোনো শিট খুঁজে পাওয়া যায়নি।',
          });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson.length) {
          return resolve({
            students: [],
            headers: [],
            totalRows: 0,
            detectedColumns: { nameCol: null, rollCol: null, classCol: null, sectionCol: null },
            error: 'এক্সেল ফাইলে কোনো তথ্য নেই।',
          });
        }

        // Get headers from first row keys
        const headers = Object.keys(rawJson[0]);
        const autoDetected = detectColumns(headers);

        const nameCol = columnMapping?.nameCol || autoDetected.nameCol;
        const rollCol = columnMapping?.rollCol || autoDetected.rollCol;
        const classCol = columnMapping?.classCol || autoDetected.classCol;
        const sectionCol = columnMapping?.sectionCol || autoDetected.sectionCol;

        const students: Student[] = rawJson
          .map((row, idx) => {
            const rawName = nameCol ? String(row[nameCol] || '').trim() : '';
            const rawRoll = rollCol ? row[rollCol] : idx + 1;
            const rawClass = classCol ? String(row[classCol] || '').trim() : 'সাধারণ';
            const rawSection = sectionCol ? String(row[sectionCol] || '').trim() : 'ক';

            // Clean roll number (if integer, convert to number, otherwise string)
            let roll: number | string = rawRoll;
            const numericRoll = parseInt(String(rawRoll).trim(), 10);
            if (!isNaN(numericRoll)) {
              roll = numericRoll;
            }

            return {
              id: `std-${idx + 1}-${Date.now()}`,
              name: rawName || `শিক্ষার্থী ${idx + 1}`,
              roll: roll,
              className: rawClass || 'সাধারণ',
              section: rawSection || 'ক',
              originalIndex: idx + 1,
              ...row,
            };
          })
          .filter((s) => s.name.trim().length > 0);

        resolve({
          students,
          headers,
          totalRows: students.length,
          detectedColumns: autoDetected,
        });
      } catch (err: any) {
        resolve({
          students: [],
          headers: [],
          totalRows: 0,
          detectedColumns: { nameCol: null, rollCol: null, classCol: null, sectionCol: null },
          error: `ফাইল পড়তে সমস্যা হয়েছে: ${err?.message || 'ভুল ফরম্যাট'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        students: [],
        headers: [],
        totalRows: 0,
        detectedColumns: { nameCol: null, rollCol: null, classCol: null, sectionCol: null },
        error: 'ফাইল আপলোডে ত্রুটি হয়েছে।',
      });
    };

    reader.readAsArrayBuffer(file);
  });
};

// Generates and downloads a pre-formatted Excel template for schools
export const downloadSampleExcel = () => {
  const sampleData = SAMPLE_STUDENTS.map((s) => ({
    'নাম': s.name,
    'রোল': s.roll,
    'শ্রেণী': s.className,
    'শাখা/বিভাগ': s.section,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // নাম
    { wch: 10 }, // রোল
    { wch: 15 }, // শ্রেণী
    { wch: 18 }, // শাখা/বিভাগ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'শিক্ষার্থী_তালিকা');

  XLSX.writeFile(workbook, 'Student_List_Sample_নমুনা_শিক্ষার্থী.xlsx');
};

// Exports the generated Seat Plan to Excel
export const exportSeatPlanToExcel = (roomPlans: RoomPlan[], examSettings: ExamSettings) => {
  const rows: any[] = [];

  roomPlans.forEach((plan) => {
    plan.allocations.forEach((alloc) => {
      rows.push({
        'কক্ষ নং': alloc.roomName,
        'বেঞ্চ নম্বর': `বেঞ্চ ${alloc.benchNumber}`,
        'আসন': alloc.seatLabel,
        'রোল নং': alloc.student.roll,
        'শিক্ষার্থীর নাম': alloc.student.name,
        'শ্রেণী': alloc.student.className,
        'শাখা/বিভাগ': alloc.student.section,
        'প্রতিষ্ঠানের নাম': examSettings.schoolName,
        'পরীক্ষার নাম': examSettings.examName,
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 16 }, // কক্ষ
    { wch: 14 }, // বেঞ্চ
    { wch: 15 }, // আসন
    { wch: 10 }, // রোল
    { wch: 26 }, // নাম
    { wch: 14 }, // শ্রেণী
    { wch: 16 }, // শাখা/বিভাগ
    { wch: 30 }, // স্কুল
    { wch: 24 }, // পরীক্ষা
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'সিট_প্ল্যান');

  if (examSettings.subjects && examSettings.subjects.length > 0) {
    const routineRows = examSettings.subjects.map((sub, idx) => ({
      'ক্রমিক': idx + 1,
      'তারিখ': sub.date,
      'বার': sub.day,
      'পরীক্ষার বিষয়': sub.subjectName,
    }));
    const routineSheet = XLSX.utils.json_to_sheet(routineRows);
    routineSheet['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, routineSheet, 'পরীক্ষার_সময়সূচী');
  }

  const safeFilename = `${examSettings.examName || 'Exam'}_Seat_Plan_${Date.now()}.xlsx`.replace(
    /[\s/\\?%*:|"<>]/g,
    '_'
  );
  XLSX.writeFile(workbook, safeFilename);
};

/**
 * Download sample Excel template for Teachers / Invigilators
 */
export const downloadSampleTeacherExcel = () => {
  const sampleTeachers = [
    { 'ক্রমিক': 1, 'শিক্ষকের নাম': 'মো: রফিকুল ইসলাম', 'পদবী': 'সহকারী প্রধান শিক্ষক', 'বিষয়': 'গণিত', 'মোবাইল': '০১৭১১-২২৩৩৪৪' },
    { 'ক্রমিক': 2, 'শিক্ষকের নাম': 'মিসেস নাসিমা আক্তার', 'পদবী': 'সিনিয়র শিক্ষক', 'বিষয়': 'ইংরেজি', 'মোবাইল': '০১৮১২-৩৪৫৬৭৮' },
    { 'ক্রমিক': 3, 'শিক্ষকের নাম': 'মো: কামাল হোসেন', 'পদবী': 'সহকারী শিক্ষক', 'বিষয়': 'বাংলা', 'মোবাইল': '০১৯১৩-৪৫৬৭৮৯' },
    { 'ক্রমিক': 4, 'শিক্ষকের নাম': 'মোসা: ফাতেমা বেগম', 'পদবী': 'সহকারী শিক্ষক', 'বিষয়': 'বিজ্ঞান', 'মোবাইল': '০১৭২৪-৫৬৭৮৯০' },
    { 'ক্রমিক': 5, 'শিক্ষকের নাম': 'মো: জহিরুল হক', 'পদবী': 'সহকারী শিক্ষক', 'বিষয়': 'ধর্ম ও নৈতিক শিক্ষা', 'মোবাইল': '০১৬১৫-৬৭৮৯০১' },
    { 'ক্রমিক': 6, 'শিক্ষকের নাম': 'শাহীন আহমেদ', 'পদবী': 'সহকারী শিক্ষক', 'বিষয়': 'সামাজিক বিজ্ঞান', 'মোবাইল': '০১৭২৬-৭৮৯০১-২' },
    { 'ক্রমিক': 7, 'শিক্ষকের নাম': 'মোসা: শিরিন আক্তার', 'পদবী': 'সহকারী শিক্ষিকা', 'বিষয়': 'তথ্য ও যোগাযোগ প্রযুক্তি', 'মোবাইল': '০১৮২৭-৮৯০১২৩' },
    { 'ক্রমিক': 8, 'শিক্ষকের নাম': 'মো: আব্দুল মতিন', 'পদবী': 'সহকারী শিক্ষক', 'বিষয়': 'কৃষি ও গার্হস্থ্য', 'মোবাইল': '০১৯২৮-৯০১২৩৪' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleTeachers);
  worksheet['!cols'] = [
    { wch: 8 },  // ক্র
    { wch: 28 }, // নাম
    { wch: 22 }, // পদবী
    { wch: 24 }, // বিষয়
    { wch: 18 }, // মোবাইল
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'শিক্ষক_তালিকা');
  XLSX.writeFile(workbook, 'নমুনা_কক্ষ_প্রত্যবেক্ষক_তালিকা.xlsx');
};

/**
 * Parse uploaded Excel file of teachers
 */
export const parseTeacherExcel = async (
  file: File
): Promise<{ teachers: { id: string; name: string; designation: string; subject: string; phone: string }[]; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames.length) {
          return resolve({ teachers: [], error: 'এক্সেলে কোনো শিট খুঁজে পাওয়া যায়নি।' });
        }
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (!rawJson.length) {
          return resolve({ teachers: [], error: 'এক্সেল ফাইলে কোনো তথ্য নেই।' });
        }

        const headers = Object.keys(rawJson[0]);
        let nameCol = headers.find((h) => normalize(h).includes('নাম') || normalize(h).includes('name')) || '';
        let desigCol = headers.find((h) => normalize(h).includes('পদবী') || normalize(h).includes('পদবি') || normalize(h).includes('designation')) || '';
        let subjCol = headers.find((h) => normalize(h).includes('বিষয়') || normalize(h).includes('বিষয়') || normalize(h).includes('subject')) || '';
        let phoneCol = headers.find((h) => normalize(h).includes('মোবাইল') || normalize(h).includes('ফোন') || normalize(h).includes('phone')) || '';

        if (!nameCol) {
          return resolve({ teachers: [], error: 'শিক্ষকের নাম (Name) কলামটি শনাক্ত করা যায়নি।' });
        }

        const teachers = rawJson
          .map((row, idx) => {
            const name = String(row[nameCol] || '').trim();
            if (!name) return null;
            const designation = desigCol ? String(row[desigCol] || 'সহকারী শিক্ষক').trim() : 'সহকারী শিক্ষক';
            const subject = subjCol ? String(row[subjCol] || 'সাধারণ').trim() : 'সাধারণ';
            const phone = phoneCol ? String(row[phoneCol] || '—').trim() : '—';
            return {
              id: `tch-upload-${Date.now()}-${idx}`,
              name,
              designation: designation || 'সহকারী শিক্ষক',
              subject: subject || 'সাধারণ',
              phone: phone || '—',
            };
          })
          .filter(Boolean) as any[];

        if (!teachers.length) {
          return resolve({ teachers: [], error: 'ফাইলটিতে কোনো শিক্ষকের নাম পাওয়া যায়নি।' });
        }

        resolve({ teachers });
      } catch (err: any) {
        resolve({ teachers: [], error: err?.message || 'ফাইল প্রসেসিং ব্যর্থ হয়েছে।' });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Download sample Excel template for Exam Routine
 */
export const downloadSampleRoutineExcel = () => {
  const sampleRoutine = [
    { 'ক্রমিক': 1, 'তারিখ': '২৭-১০-২০২৬', 'বার': 'মঙ্গলবার', 'বিষয়ের নাম': 'বাংলা ১ম পত্র' },
    { 'ক্রমিক': 2, 'তারিখ': '২৯-১০-২০২৬', 'বার': 'বৃহস্পতিবার', 'বিষয়ের নাম': 'বাংলা ২য় পত্র' },
    { 'ক্রমিক': 3, 'তারিখ': '৩১-১০-২০২৬', 'বার': 'শনিবার', 'বিষয়ের নাম': 'ইংরেজি ১ম পত্র' },
    { 'ক্রমিক': 4, 'তারিখ': '০২-১১-২০২৬', 'বার': 'সোমবার', 'বিষয়ের নাম': 'ইংরেজি ২য় পত্র' },
    { 'ক্রমিক': 5, 'তারিখ': '০৪-১১-২০২৬', 'বার': 'বুধবার', 'বিষয়ের নাম': 'গণিত' },
    { 'ক্রমিক': 6, 'তারিখ': '০৬-১১-২০২৬', 'বার': 'শুক্রবার', 'বিষয়ের নাম': 'ধর্ম ও নৈতিক শিক্ষা' },
    { 'ক্রমিক': 7, 'তারিখ': '০৮-১১-২০২৬', 'বার': 'রবিবার', 'বিষয়ের নাম': 'তথ্য ও যোগাযোগ প্রযুক্তি' },
    { 'ক্রমিক': 8, 'তারিখ': '১০-১১-২০২৬', 'বার': 'মঙ্গলবার', 'বিষয়ের নাম': 'পদার্থবিজ্ঞান / ইতিহাস / ব্যবসায় উদ্যোগ' },
    { 'ক্রমিক': 9, 'তারিখ': '১১-১১-২০২৬', 'বার': 'বুধবার', 'বিষয়ের নাম': 'রসায়ন / পৌরনীতি / হিসাববিজ্ঞান' },
    { 'ক্রমিক': 10, 'তারিখ': '১২-১১-২০২৬', 'বার': 'বৃহস্পতিবার', 'বিষয়ের নাম': 'উচ্চতর গণিত / জীববিজ্ঞান / অর্থনীতি' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRoutine);
  worksheet['!cols'] = [
    { wch: 8 },  // ক্র
    { wch: 18 }, // তারিখ
    { wch: 16 }, // বার
    { wch: 45 }, // বিষয়ের নাম
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'পরীক্ষার_রুটিন');
  XLSX.writeFile(workbook, 'নমুনা_পরীক্ষার_রুটিন.xlsx');
};

/**
 * Parse uploaded Excel file of Exam Routine
 */
export const parseRoutineExcel = async (
  file: File
): Promise<{ subjects: { id: string; date: string; day: string; subjectName: string }[]; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames.length) {
          return resolve({ subjects: [], error: 'এক্সেলে কোনো শিট খুঁজে পাওয়া যায়নি।' });
        }
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (!rawJson.length) {
          return resolve({ subjects: [], error: 'এক্সেল ফাইলে কোনো তথ্য নেই।' });
        }

        const headers = Object.keys(rawJson[0]);
        let dateCol = headers.find((h) => normalize(h).includes('তারিখ') || normalize(h).includes('date')) || '';
        let dayCol = headers.find((h) => normalize(h).includes('বার') || normalize(h).includes('day')) || '';
        let subjCol = headers.find((h) => normalize(h).includes('বিষয়') || normalize(h).includes('subject')) || '';

        if (!subjCol) {
          return resolve({ subjects: [], error: 'বিষয়ের নাম (Subject Name) কলামটি শনাক্ত করা যায়নি।' });
        }

        const subjects = rawJson
          .map((row, idx) => {
            const subjectName = String(row[subjCol] || '').trim();
            if (!subjectName) return null;
            const date = dateCol ? String(row[dateCol] || '—').trim() : `দিন ${idx + 1}`;
            const day = dayCol ? String(row[dayCol] || '—').trim() : '—';
            return {
              id: `sub-upload-${Date.now()}-${idx}`,
              date: date || '—',
              day: day || '—',
              subjectName,
            };
          })
          .filter(Boolean) as any[];

        if (!subjects.length) {
          return resolve({ subjects: [], error: 'ফাইলটিতে কোনো বিষয়ের তালিকা পাওয়া যায়নি।' });
        }

        resolve({ subjects });
      } catch (err: any) {
        resolve({ subjects: [], error: err?.message || 'রুটিন ফাইল প্রসেসিং ব্যর্থ হয়েছে।' });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

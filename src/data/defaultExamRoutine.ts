import { ExamSubject } from '../types/seatPlan';
import {
  DEFAULT_CLASS_SESSIONS,
  RoutineDay,
  periodsFromRoutineDays,
} from '../utils/examSchedule';

/**
 * নাঙ্গলকোট উপজেলা মাধ্যমিক শিক্ষক সমিতি, নাঙ্গলকোট, কুমিল্লা
 * বার্ষিক পরীক্ষা-২০২৬ (৬ষ্ঠ, ৭ম, ৮ম ও ৯ম শ্রেণী)
 *   সকাল : ৬ষ্ঠ ও ৮ম শ্রেণী      বিকাল : ৭ম ও ৯ম শ্রেণী
 * ৬ষ্ঠ-৮ম শ্রেণীর পরীক্ষা ৯ম দিনে শেষ; ৯ম শ্রেণীর ১২ দিন।
 */
const all = (s: string): Record<string, string> => ({
  'ষষ্ঠ': s,
  'সপ্তম': s,
  'অষ্টম': s,
  'নবম': s,
});

const mid = (s: string, nine: string): Record<string, string> => ({
  'ষষ্ঠ': s,
  'সপ্তম': s,
  'অষ্টম': s,
  'নবম': nine,
});

export const DEFAULT_ROUTINE_DAYS: RoutineDay[] = [
  { dayNo: 1, date: '১৯-১১-২০২৬', day: 'বৃহস্পতিবার', subjects: all('ইংরেজি ১ম পত্র') },
  { dayNo: 2, date: '২২-১১-২০২৬', day: 'রবিবার', subjects: all('গণিত') },
  { dayNo: 3, date: '২৩-১১-২০২৬', day: 'সোমবার', subjects: all('বাংলা ১ম পত্র') },
  { dayNo: 4, date: '২৪-১১-২০২৬', day: 'মঙ্গলবার', subjects: all('বাংলা ২য় পত্র') },
  { dayNo: 5, date: '২৫-১১-২০২৬', day: 'বুধবার', subjects: all('ইংরেজি ২য় পত্র') },
  { dayNo: 6, date: '২৬-১১-২০২৬', day: 'বৃহস্পতিবার', subjects: all('ধর্ম ও নৈতিক শিক্ষা') },
  { dayNo: 7, date: '২৯-১১-২০২৬', day: 'রবিবার', subjects: mid('বিজ্ঞান', 'বিজ্ঞান / বাংলাদেশ ও বিশ্বপরিচয়') },
  {
    dayNo: 8,
    date: '৩০-১১-২০২৬',
    day: 'সোমবার',
    subjects: mid('বাংলাদেশ ও বিশ্বপরিচয়', 'পদার্থ বিজ্ঞান / ইতিহাস ও বিশ্বসভ্যতা / ফিন্যান্স ও ব্যাংকিং'),
  },
  {
    dayNo: 9,
    date: '০১-১২-২০২৬',
    day: 'মঙ্গলবার',
    subjects: mid('তথ্য ও যোগাযোগ প্রযুক্তি', 'রসায়ন / ভূগোল ও পরিবেশ / ব্যবসায় উদ্যোগ'),
  },
  {
    dayNo: 10,
    date: '০২-১২-২০২৬',
    day: 'বুধবার',
    subjects: { 'ষষ্ঠ': '', 'সপ্তম': '', 'অষ্টম': '', 'নবম': 'জীববিজ্ঞান / পৌরনীতি ও নাগরিকতা / অর্থনীতি / হিসাব বিজ্ঞান' },
  },
  {
    dayNo: 11,
    date: '০৩-১২-২০২৬',
    day: 'বৃহস্পতিবার',
    subjects: { 'ষষ্ঠ': '', 'সপ্তম': '', 'অষ্টম': '', 'নবম': 'তথ্য ও যোগাযোগ প্রযুক্তি' },
  },
  {
    dayNo: 12,
    date: '০৬-১২-২০২৬',
    day: 'রবিবার',
    subjects: { 'ষষ্ঠ': '', 'সপ্তম': '', 'অষ্টম': '', 'নবম': 'উচ্চতর গণিত / কৃষি শিক্ষা / গার্হস্থ্য বিজ্ঞান' },
  },
];

export const DEFAULT_EXAM_ROUTINE: ExamSubject[] = periodsFromRoutineDays(
  DEFAULT_ROUTINE_DAYS,
  DEFAULT_CLASS_SESSIONS
);

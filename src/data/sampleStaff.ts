import { StaffMember, ExamExpenses, CommitteeMember } from '../types/seatPlan';

export const SAMPLE_COMMITTEE: CommitteeMember[] = [
  {
    id: 'comm-1',
    name: 'মো: আবুল খায়ের',
    designation: 'প্রধান শিক্ষক ও সভাপতি (পরীক্ষা কমিটি)',
    role: 'headmaster',
    honorarium: 3000,
    phone: '০১৮১২-৯৮৭৬৫৪',
    note: 'সার্বিক পরিচালনা ও ফলাফল অনুমোদন',
  },
  {
    id: 'comm-2',
    name: 'মো: আলমগীর হোসাইন চৌধুরী',
    designation: 'সহকারী প্রধান শিক্ষক ও সহ-সভাপতি',
    role: 'assistant_head',
    honorarium: 2500,
    phone: '০১৭৩৪-৫৬৭৮৯০',
    note: 'পরীক্ষা সমন্বয় ও শৃঙ্খলা বিধান',
  },
  {
    id: 'comm-3',
    name: 'মো: মায়েন উদ্দিন',
    designation: 'আহ্বায়ক, পরীক্ষা পরিচালনা কমিটি',
    role: 'controller',
    honorarium: 2200,
    phone: '০১৭২২-১৬৬৬৬৬',
    note: 'প্রশ্নপত্র সংরক্ষণ ও বিতরণ তত্ত্বাবধান',
  },
  {
    id: 'comm-4',
    name: 'মো: শাহ আলম',
    designation: 'সদস্য সচিব, পরীক্ষা কমিটি',
    role: 'member',
    honorarium: 1800,
    phone: '০১৬৭৮-৯০১২৩৪',
    note: 'সিটপ্ল্যান, হাজিরা ও কার্যবিবরণী',
  },
  {
    id: 'comm-5',
    name: 'মো: শাহিন উদ্দিন',
    designation: 'সদস্য, পরীক্ষা পরিচালনা কমিটি',
    role: 'member',
    honorarium: 1500,
    phone: '০১৫৫৬-৭৮৯০১২',
    note: 'হল পরিদর্শন ও খাতা প্যাকেটকরণ',
  },
];

export const SAMPLE_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'মো: হারুনুর রশিদ',
    designation: 'অফিস সহকারী',
    dutyDays: 12,
    ratePerDay: 150,
    phone: '০১৮১২-৩৩৪৫৫৬',
    note: 'প্রশ্নপত্র বিতরণ ও রেকর্ড সংরক্ষণ',
  },
  {
    id: 'staff-2',
    name: 'মো: ইব্রাহিম খলিল',
    designation: 'দপ্তরী',
    dutyDays: 12,
    ratePerDay: 100,
    phone: '০১৭২৩-৪৫৬৭৮৯',
    note: 'ঘণ্টা বাজানো ও হল প্রস্তুতকরণ',
  },
  {
    id: 'staff-3',
    name: 'লিপি',
    designation: 'অফিস সহায়ক (MLSS)',
    dutyDays: 12,
    ratePerDay: 100,
    phone: '০১৯৩৪-৫৬৭৮৯০',
    note: 'পানি সরবরাহ ও আনুষঙ্গিক ডিউটি',
  },
  {
    id: 'staff-4',
    name: 'মো: ইসমাইল হোসেন',
    designation: 'নিরাপত্তা কর্মী / নৈশপ্রহরী',
    dutyDays: 12,
    ratePerDay: 100,
    phone: '০১৬৪৫-৬৭৮৯০১',
    note: 'গেট ও প্রাঙ্গণ নিরাপত্তা',
  },
];

export const DEFAULT_EXAM_EXPENSES: ExamExpenses = {
  invigilationRatePerDuty: 400, // প্রতি ডিউটি প্রত্যবেক্ষণ ভাতা ৪০০ টাকা
  paperCost: 2700, // কাগজের দাম
  paperReams: 6,
  paperRatePerReam: 450,
  penCost: 1200, // কলম, পেন্সিল, ক্লিপ ও স্টেশনারি
  scriptEvaluationRatePerScript: 20, // খাতা মূল্যায়ন ভাতা প্রতি খাতা ২০ টাকা
  scriptCount: 360, // মোট খাতা
  questionSettingAndModerationCost: 4000, // প্রশ্নপত্র প্রণয়ন ও মডারেটিং ভাতা
  omrSheetCost: 1080, // OMR শিট মুদ্রণ ব্যয়
  omrSheetCount: 360,
  omrSheetRate: 3,
  refreshmentCost: 4500, // আপ্যায়ন ব্যয় (চা, নাস্তা)
  customExpenses: [
    {
      id: 'cust-1',
      title: 'ফাইল কভার, সুতলি ও গালা (সিলিং সামগ্রী)',
      amount: 650,
      note: 'উত্তরপত্র বান্ডিলিং ও সিলকরণ',
    },
    {
      id: 'cust-2',
      title: 'স্ট্যাপলার, পিন ও কার্বন পেপার',
      amount: 450,
      note: 'অফিস ব্যবহারের জন্য',
    },
  ],
};

export interface Student {
  id: string;
  name: string;
  roll: number | string;
  className: string;
  section: string;
  group?: string; // e.g. Science, Commerce, Humanities or Section
  originalIndex?: number;
  [key: string]: any;
}

export interface Invigilator {
  id: string;
  name: string;
  designation: string; // e.g. সহকারী শিক্ষক, সিনিয়র শিক্ষক
  subject?: string; // e.g. গণিত, ইংরেজি, বাংলা
  phone?: string;
}

export type ExamSession = 'morning' | 'afternoon';

export interface ExamSubject {
  id: string;
  date: string;
  day: string;
  subjectName: string; // সংযুক্ত নাম (প্রদর্শনের জন্য) — যেমন "ইংরেজি ১ম পত্র"
  // --- শিফট ভিত্তিক রুটিন (সকাল / বিকাল) ---
  session?: ExamSession; // morning = সকাল, afternoon = বিকাল
  dayNo?: number; // পরীক্ষার ক্রমিক দিন (১ম দিন, ২য় দিন ...)
  classSubjects?: Record<string, string>; // শ্রেণী (নর্মালাইজড) -> বিষয় ; খালি/অনুপস্থিত = ঐ শিফটে ঐ শ্রেণীর পরীক্ষা নেই
}

export interface ColumnConfig {
  columnIndex: number; // 1, 2, 3, 4
  columnName?: string; // e.g. "কলাম ১ (বাম)", "কলাম ২ (ডান)"
  benchCount: number; // how many benches in this specific column
  studentsPerBench: number; // how many students per bench in this column (1, 2, 3, 4)
}

export interface RoomConfig {
  id: string;
  name: string; // e.g. "কক্ষ নং ১০১"
  benchCount: number; // total benches in the room
  studentsPerBench: number; // default capacity per bench
  columnsCount: number; // 1, 2, 3, or 4 columns
  columnConfigs?: ColumnConfig[]; // per-column custom bench count & capacity (1, 2, 3, 4)
  allowedClasses?: string[]; // optional restriction: e.g. ["ষষ্ঠ", "সপ্তম", "নবম - বিজ্ঞান"]
  invigilatorIds?: string[]; // manually assigned teacher IDs
  benchOrder?: 'column_wise' | 'row_wise'; // 'column_wise' (default) or 'row_wise'
}

export interface SeatAllocation {
  id: string;
  student: Student;
  roomId: string;
  roomName: string;
  benchNumber: number;
  benchColumn: number;
  seatPosition: number; // 1, 2, 3...
  seatLabel: string; // "আসন ১ (বাম)", "আসন ২ (ডান)" etc.
  variantLabel?: string;
  source?: 'auto' | 'rule' | 'manual'; // অটো / ম্যানুয়াল নিয়ম / হাতে পরিবর্তন
}

export interface BenchPlan {
  benchNumber: number;
  benchColumn: number;
  seats: (SeatAllocation | null)[];
}

export interface ClassSummary {
  className: string;
  section: string;
  count: number;
  minRoll: number | string;
  maxRoll: number | string;
  rollRangeDisplay: string;
}

export interface RoomPlan {
  room: RoomConfig;
  benches: BenchPlan[];
  totalSeats: number;
  allocatedCount: number;
  allocations: SeatAllocation[];
  classSummaries: ClassSummary[];
  invigilators: Invigilator[]; // Assigned 2 invigilators per room
}

export type AllocationStrategy =
  | 'interleave_classes' // Alternate classes on adjacent seats (anti-cheat)
  | 'interleave_sections' // Alternate sections of same/different class
  | 'sequential'; // Fill Class 1, then Class 2

export interface ExamSettings {
  schoolName: string;
  examName: string;
  academicYear: string;
  examDate: string;
  shift: string;
  headmasterTitle: string;
  examControllerTitle: string;
  headmasterName?: string;
  assistantHeadName?: string;
  examConvenerName?: string;
  subjects?: ExamSubject[];
  // শ্রেণী -> শিফট (সকাল/বিকাল); যেমন { 'ষষ্ঠ': 'morning', 'সপ্তম': 'afternoon' }
  classSessions?: Record<string, ExamSession>;
  morningShift?: string; // যেমন: সকাল ১০:০০ - ১:০০
  afternoonShift?: string; // যেমন: বিকাল ২:০০ - ৫:০০
}

// ---------- ম্যানুয়াল সিট নিয়ম ও পরিবর্তন ----------
/**
 * একটি সেগমেন্ট = কক্ষের একটি "সারি-ট্র্যাক" (বেঞ্চের ১ম/২য়/৩য় আসন) এ বসানোর নিয়ম।
 * যেমন: কক্ষ ১০১, ট্র্যাক ১ → ষষ্ঠ / পদ্মা / রোল ১ থেকে ৩০
 *       কক্ষ ১০১, ট্র্যাক ২ → অষ্টম / তিতাস / রোল ৮৫ থেকে ৫৫ (উল্টো দিক)
 * fromRoll > toRoll হলে রোল উল্টো দিক থেকে (বড় থেকে ছোট) বসবে।
 */
export interface SeatSegment {
  id: string;
  track: number; // বেঞ্চে আসনের অবস্থান: 1 = বাম/১ম, 2 = ডান/২য়, 3 = ৩য় ...
  className: string;
  section: string; // খালি = ঐ শ্রেণীর সব শাখা
  fromRoll: number | '';
  toRoll: number | '';
}

export interface RoomSeatRule {
  roomId: string;
  segments: SeatSegment[];
  autoFillRest: boolean; // নিয়মে যে আসন খালি থাকবে সেখানে বাকি শিক্ষার্থী অটো বসবে কিনা
}

// ম্যানুয়াল সিট পরিবর্তন: একজন শিক্ষার্থীকে নির্দিষ্ট আসনে সরানো (দখল থাকলে অদল-বদল)
export interface SeatOverride {
  studentId: string;
  roomId: string;
  benchNumber: number;
  seatPosition: number;
}

export type AutoSeatMode = 'roll' | 'reverse' | 'shuffle';

export interface VariantSeatConfig {
  rules: RoomSeatRule[];
  overrides: SeatOverride[];
  autoMode?: AutoSeatMode; // অটো অংশে রোল ক্রম: সিরিয়াল / উল্টো / এলোমেলো
  seed?: number; // shuffle এর জন্য
}

// একই শিফটে একই শ্রেণী-সেটের পরীক্ষার জন্য একটি সিট প্ল্যান (ভ্যারিয়েন্ট)
export interface SeatVariant {
  key: string; // `${session}|${class1}+${class2}`
  session: ExamSession;
  classes: string[]; // নর্মালাইজড শ্রেণী নাম
  label: string; // যেমন "সকাল শিফট: ষষ্ঠ + অষ্টম"
  periodIds: string[];
  roomPlans: RoomPlan[];
  unallocatedStudents: Student[];
  totalSeats: number;
  totalStudents: number;
}

export interface DutyOverride {
  id: string; // key: `${dateId}_${roomId}_${slotIndex}`
  dateId: string;
  date: string;
  day?: string;
  subjectName?: string;
  roomId: string;
  roomName: string;
  slotIndex: number; // 0 = ১ম পরিদর্শক, 1 = ২য় পরিদর্শক
  originalTeacherId?: string;
  originalTeacherName?: string;
  assignedTeacher: Invigilator;
  reason?: string; // যেমন: "ছুটি / অসুস্থতার কারণে বদলি", "নতুন ২-৩ দিন দায়িত্ব পালন"
  isSubstitute?: boolean;
  updatedAt?: string;
}

export interface DateRoomDuty {
  dateId: string;
  date: string;
  day: string;
  subjectName: string;
  roomId: string;
  roomName: string;
  invigilators: Invigilator[]; // 2 teachers per room
}

export interface DayDutySchedule {
  dateId: string;
  date: string;
  day: string;
  subjectName: string;
  session?: ExamSession;
  dayNo?: number;
  roomDuties: {
    room: RoomConfig;
    invigilators: Invigilator[];
    overrides?: (DutyOverride | null)[];
  }[];
}

export interface TeacherDutyStat {
  teacher: Invigilator;
  totalDuties: number;
  isSubstitute?: boolean;
  duties: {
    date: string;
    day: string;
    subjectName: string;
    roomName: string;
    role: '১ম পরিদর্শক' | '২য় পরিদর্শক';
    session?: ExamSession;
    isOverridden?: boolean;
    reason?: string;
  }[];
}

export interface FullDutyRoster {
  daySchedules: DayDutySchedule[];
  teacherStats: TeacherDutyStat[];
  totalDays: number;
  totalDutySlots: number;
  averageDuty: number;
  minDuty: number;
  maxDuty: number;
  isBalanced: boolean;
  overrides?: DutyOverride[];
}

export interface StaffMember {
  id: string;
  name: string;
  designation: string; // e.g. দপ্তরী, অফিস সহকারী, এমএলএসএস, পিয়ন, নৈশপ্রহরী
  dutyDays: number;
  ratePerDay: number;
  phone?: string;
  note?: string;
}

export interface CommitteeMember {
  id: string;
  name: string; // যেমন: জনাব মো: খোরশেদ আলম
  designation: string; // যেমন: প্রধান শিক্ষক ও সভাপতি, সহকারী প্রধান শিক্ষক ও সহ-সভাপতি, পরীক্ষা কমিটি আহবায়ক, সদস্য সচিব, সদস্য
  role: 'headmaster' | 'assistant_head' | 'controller' | 'member' | 'other';
  honorarium: number; // সম্মানী ভাতা (টাকা)
  phone?: string;
  note?: string; // দায়িত্ব / মন্তব্য
}

export interface CustomExpenseItem {
  id: string;
  title: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount: number;
  note?: string;
}

export interface ExamExpenses {
  invigilationRatePerDuty: number; // শিক্ষকের কক্ষ প্রত্যবেক্ষণ ভাতা (প্রতি ডিউটি টাকা)
  paperCost: number; // কাগজের দাম
  paperReams: number;
  paperRatePerReam: number;
  penCost: number; // কলম ও সংশ্লিষ্ট স্টেশনারি
  scriptEvaluationRatePerScript: number; // খাতা মূল্যায়ন ভাতা (প্রতি খাতা)
  scriptCount: number; // মোট মূল্যায়িত খাতা
  questionSettingAndModerationCost: number; // প্রশ্নপত্র প্রণয়ন ও মডারেটিং ভাতা
  omrSheetCost: number; // OMR শিট মুদ্রণ
  omrSheetCount: number;
  omrSheetRate: number;
  refreshmentCost: number; // আপ্যায়ন ব্যয়
  customExpenses: CustomExpenseItem[]; // অন্যান্য ব্যয়
}



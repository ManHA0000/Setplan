import { ExamSession, ExamSettings, ExamSubject, Student } from '../types/seatPlan';

// ---------------------------------------------------------------------------
// শ্রেণী নাম নর্মালাইজেশন: "৬ষ্ঠ", "৬", "ষষ্ঠ শ্রেণী", "Six", "6" সব → "ষষ্ঠ"
// ---------------------------------------------------------------------------
export const CLASS_ORDER = ['ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'একাদশ', 'দ্বাদশ'];

const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

const NUMBER_TO_CLASS: Record<string, string> = {
  '6': 'ষষ্ঠ', '7': 'সপ্তম', '8': 'অষ্টম', '9': 'নবম', '10': 'দশম', '11': 'একাদশ', '12': 'দ্বাদশ',
};

const WORD_TO_CLASS: Record<string, string> = {
  six: 'ষষ্ঠ', seven: 'সপ্তম', eight: 'অষ্টম', nine: 'নবম', ten: 'দশম',
  'ষষ্ঠ': 'ষষ্ঠ', 'সপ্তম': 'সপ্তম', 'অষ্টম': 'অষ্টম', 'নবম': 'নবম', 'দশম': 'দশম',
  'একাদশ': 'একাদশ', 'দ্বাদশ': 'দ্বাদশ',
};

export const normalizeClassName = (raw: string | undefined | null): string => {
  if (!raw) return '';
  let t = String(raw).trim().toLowerCase();
  t = t.replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
  t = t.replace(/(শ্রেণী|শ্রেনী|শ্রেণি|class|cls)/g, '').replace(/[-–—_.]/g, ' ').trim();
  // "৬ষ্ঠ" → "6ষ্ঠ" → শুধু সংখ্যা অংশ নিন
  const numMatch = t.match(/^(\d{1,2})/);
  if (numMatch && NUMBER_TO_CLASS[numMatch[1]]) return NUMBER_TO_CLASS[numMatch[1]];
  const first = t.split(/\s+/)[0];
  if (WORD_TO_CLASS[first]) return WORD_TO_CLASS[first];
  for (const key of Object.keys(WORD_TO_CLASS)) {
    if (t.startsWith(key)) return WORD_TO_CLASS[key];
  }
  return String(raw).trim();
};

export const compareClassNames = (a: string, b: string): number => {
  const ia = CLASS_ORDER.indexOf(normalizeClassName(a));
  const ib = CLASS_ORDER.indexOf(normalizeClassName(b));
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return String(a).localeCompare(String(b), 'bn');
};

// সংক্ষিপ্ত নাম: ষষ্ঠ → ৬ষ্ঠ (রুটিন/টেবিল হেডারের জন্য)
export const CLASS_SHORT: Record<string, string> = {
  'ষষ্ঠ': '৬ষ্ঠ', 'সপ্তম': '৭ম', 'অষ্টম': '৮ম', 'নবম': '৯ম', 'দশম': '১০ম', 'একাদশ': '১১শ', 'দ্বাদশ': '১২শ',
};
export const shortClass = (c: string): string => CLASS_SHORT[normalizeClassName(c)] || c;

// ---------------------------------------------------------------------------
// শিফট
// ---------------------------------------------------------------------------
export const SESSION_LABEL: Record<ExamSession, string> = {
  morning: 'সকাল',
  afternoon: 'বিকাল',
};

export const DEFAULT_CLASS_SESSIONS: Record<string, ExamSession> = {
  'ষষ্ঠ': 'morning',
  'অষ্টম': 'morning',
  'সপ্তম': 'afternoon',
  'নবম': 'afternoon',
};

export const DEFAULT_MORNING_SHIFT = 'সকাল ১০:০০ - ১:০০';
export const DEFAULT_AFTERNOON_SHIFT = 'বিকাল ২:০০ - ৫:০০';

export const getClassSession = (settings: ExamSettings | undefined, className: string): ExamSession => {
  const norm = normalizeClassName(className);
  const map = { ...DEFAULT_CLASS_SESSIONS, ...(settings?.classSessions || {}) };
  return map[norm] || map[className] || 'morning';
};

export const getShiftText = (settings: ExamSettings | undefined, session: ExamSession | undefined): string => {
  if (session === 'afternoon') return settings?.afternoonShift || DEFAULT_AFTERNOON_SHIFT;
  if (session === 'morning') return settings?.morningShift || DEFAULT_MORNING_SHIFT;
  return settings?.shift || DEFAULT_MORNING_SHIFT;
};

// ---------------------------------------------------------------------------
// রুটিন ম্যাট্রিক্স (দিন × শ্রেণী) ↔ পিরিয়ড তালিকা (দিন × শিফট)
// ---------------------------------------------------------------------------
export interface RoutineDay {
  dayNo: number;
  date: string;
  day: string;
  subjects: Record<string, string>; // নর্মালাইজড শ্রেণী -> বিষয় ("" = পরীক্ষা নেই)
}

export const buildPeriodSubjectName = (classSubjects: Record<string, string>): string => {
  const entries = Object.entries(classSubjects)
    .filter(([, v]) => v && v.trim())
    .sort(([a], [b]) => compareClassNames(a, b));
  if (!entries.length) return '';
  const distinct = Array.from(new Set(entries.map(([, v]) => v.trim())));
  if (distinct.length === 1) return distinct[0];
  return distinct
    .map((subj) => {
      const cls = entries.filter(([, v]) => v.trim() === subj).map(([c]) => shortClass(c));
      return `${subj} (${cls.join(', ')})`;
    })
    .join(' ; ');
};

export const periodsFromRoutineDays = (
  days: RoutineDay[],
  classSessions: Record<string, ExamSession>
): ExamSubject[] => {
  const result: ExamSubject[] = [];
  const sessions: ExamSession[] = ['morning', 'afternoon'];
  days.forEach((d) => {
    sessions.forEach((session) => {
      const cs: Record<string, string> = {};
      Object.entries(d.subjects).forEach(([cls, subj]) => {
        const norm = normalizeClassName(cls);
        const sess = classSessions[norm] || DEFAULT_CLASS_SESSIONS[norm] || 'morning';
        if (sess === session && subj && subj.trim()) cs[norm] = subj.trim();
      });
      if (Object.keys(cs).length === 0) return;
      result.push({
        id: `d${d.dayNo}-${session}`,
        date: d.date,
        day: d.day,
        dayNo: d.dayNo,
        session,
        classSubjects: cs,
        subjectName: buildPeriodSubjectName(cs),
      });
    });
  });
  return result;
};

export const routineDaysFromPeriods = (periods: ExamSubject[]): RoutineDay[] => {
  const map = new Map<string, RoutineDay>();
  periods.forEach((p, idx) => {
    const key = `${p.dayNo ?? p.date}`;
    if (!map.has(key)) {
      map.set(key, { dayNo: p.dayNo ?? map.size + 1, date: p.date, day: p.day, subjects: {} });
    }
    const entry = map.get(key)!;
    if (p.classSubjects) {
      Object.entries(p.classSubjects).forEach(([c, s]) => {
        entry.subjects[normalizeClassName(c)] = s;
      });
    }
    void idx;
  });
  return Array.from(map.values()).sort((a, b) => a.dayNo - b.dayNo);
};

// পুরনো (শিফটবিহীন) এন্ট্রি হলে সব শ্রেণী ধরা হবে
export const getPeriodClasses = (period: ExamSubject, allClasses: string[]): string[] => {
  if (period.classSubjects) {
    return Object.keys(period.classSubjects)
      .filter((c) => period.classSubjects![c] && period.classSubjects![c].trim())
      .sort(compareClassNames);
  }
  return [...allClasses].sort(compareClassNames);
};

export const getPeriodSession = (period: ExamSubject, settings: ExamSettings | undefined): ExamSession => {
  if (period.session) return period.session;
  return 'morning';
};

export const getSubjectForClass = (period: ExamSubject, className: string): string | null => {
  const norm = normalizeClassName(className);
  if (period.classSubjects) {
    const v = period.classSubjects[norm];
    return v && v.trim() ? v.trim() : null;
  }
  return period.subjectName;
};

// ---------------------------------------------------------------------------
// সিট ভ্যারিয়েন্ট: (শিফট + উপস্থিত শ্রেণীর সেট) একই হলে একই সিট প্ল্যান
// ---------------------------------------------------------------------------
export interface VariantDescriptor {
  key: string;
  session: ExamSession;
  classes: string[];
  label: string;
  periodIds: string[];
}

export const makeVariantKey = (session: ExamSession, classes: string[]): string =>
  `${session}|${[...classes].sort(compareClassNames).join('+')}`;

export const describeVariants = (
  periods: ExamSubject[],
  students: Student[],
  settings: ExamSettings | undefined
): VariantDescriptor[] => {
  const studentClasses = Array.from(new Set(students.map((s) => normalizeClassName(s.className)))).filter(Boolean);
  const map = new Map<string, VariantDescriptor>();

  periods.forEach((p) => {
    const session = getPeriodSession(p, settings);
    let classes = getPeriodClasses(p, studentClasses);
    if (!p.classSubjects) {
      // শিফটবিহীন পুরনো রুটিন: শ্রেণীর নিজস্ব শিফট অনুযায়ী না ভেঙে সবাইকে একসাথে ধরা হলো
      classes = studentClasses;
    }
    classes = classes.filter((c) => studentClasses.includes(c));
    if (!classes.length) return;
    const key = makeVariantKey(session, classes);
    if (!map.has(key)) {
      map.set(key, {
        key,
        session,
        classes,
        label: `${SESSION_LABEL[session]} শিফট: ${classes.map(shortClass).join(' + ')}`,
        periodIds: [],
      });
    }
    map.get(key)!.periodIds.push(p.id);
  });

  const order = (v: VariantDescriptor) => (v.session === 'morning' ? 0 : 1);
  return Array.from(map.values()).sort((a, b) => {
    if (order(a) !== order(b)) return order(a) - order(b);
    // বেশি শ্রেণীর (পূর্ণ) ভ্যারিয়েন্ট আগে
    return b.classes.length - a.classes.length;
  });
};

export const findVariantKeyForPeriod = (
  period: ExamSubject,
  variants: { key: string; periodIds: string[] }[]
): string | null => {
  const v = variants.find((x) => x.periodIds.includes(period.id));
  return v ? v.key : null;
};

export const toBnDigits = (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

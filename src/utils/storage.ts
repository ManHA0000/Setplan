import {
  Student,
  RoomConfig,
  AllocationStrategy,
  ExamSettings,
  Invigilator,
  StaffMember,
  ExamExpenses,
  CommitteeMember,
  DutyOverride,
} from '../types/seatPlan';

export const STORAGE_KEYS = {
  STUDENTS: 'manha_seatplan_students_v1',
  ROOMS: 'manha_seatplan_rooms_v1',
  TEACHERS: 'manha_seatplan_teachers_v1',
  STAFF: 'manha_seatplan_staff_v1',
  COMMITTEE: 'manha_seatplan_committee_v1',
  DUTY_OVERRIDES: 'manha_seatplan_duty_overrides_v1',
  EXPENSES: 'manha_seatplan_expenses_v1',
  STRATEGY: 'manha_seatplan_strategy_v1',
  SETTINGS: 'manha_seatplan_settings_v1',
  ACTIVE_TAB: 'manha_seatplan_active_tab_v1',
  LAST_SAVED: 'manha_seatplan_last_saved_time',
} as const;

export interface FullExamBackup {
  version: string;
  timestamp: string;
  students: Student[];
  rooms: RoomConfig[];
  teachers: Invigilator[];
  staff: StaffMember[];
  committee?: CommitteeMember[];
  dutyOverrides?: DutyOverride[];
  expenses: ExamExpenses;
  strategy: AllocationStrategy;
  examSettings: ExamSettings;
  seatConfigs?: Record<string, any>;
}

/**
 * Safely load from localStorage with fallback
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (err) {
    console.warn(`[Storage] Failed to parse key ${key}:`, err);
    return fallback;
  }
}

/**
 * Safely save to localStorage
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
    return true;
  } catch (err) {
    console.error(`[Storage] Failed to save key ${key}:`, err);
    return false;
  }
}

/**
 * Clear all stored app data
 */
export function clearAllStoredData(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Download complete backup JSON file
 */
export function downloadBackupFile(backup: FullExamBackup): void {
  try {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeSchoolName = (backup.examSettings?.schoolName || 'Exam_Data')
      .replace(/[\s/\\:*?"<>|]/g, '_')
      .slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ManHa_SeatPlan_Backup_${safeSchoolName}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export backup file:', err);
  }
}

/**
 * Read and validate uploaded backup JSON file
 */
export function readBackupFile(file: File): Promise<FullExamBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as FullExamBackup;
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('অবৈধ ব্যাকআপ ফাইল');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err?.message || 'ফাইলটি পড়া সম্ভব হয়নি'));
      }
    };
    reader.onerror = () => reject(new Error('ফাইল রিড করতে ব্যর্থ হয়েছে'));
    reader.readAsText(file);
  });
}

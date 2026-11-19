import {
  Invigilator,
  AllocationStrategy,
  RoomConfig,
  RoomPlan,
  SeatAllocation,
  SeatOverride,
  SeatSegment,
  Student,
  VariantSeatConfig,
  BenchPlan,
} from '../types/seatPlan';
import {
  buildClassSummaries,
  generateSeatPlan,
  listBenchSlots,
  SEAT_POSITION_LABELS,
} from './seatAllocator';
import { normalizeClassName } from './examSchedule';

export interface SegmentReport {
  segmentId: string;
  roomId: string;
  matched: number; // নিয়মে মিলে যাওয়া শিক্ষার্থী
  placed: number; // আসলে বসানো গেছে
  overflow: number; // জায়গা না থাকায় বাদ
  firstRoll?: number | string;
  lastRoll?: number | string;
  message?: string;
}

export interface VariantBuildResult {
  roomPlans: RoomPlan[];
  unallocatedStudents: Student[];
  totalSeats: number;
  totalStudents: number;
  reports: SegmentReport[];
  manualCount: number; // নিয়মে বসানো
  overrideCount: number; // হাতে পরিবর্তন
}

const toNum = (v: number | string | ''): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString()), 10);
  return Number.isNaN(n) ? null : n;
};

const rollNum = (r: number | string): number => {
  if (typeof r === 'number') return r;
  const n = parseInt(String(r).replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString()), 10);
  return Number.isNaN(n) ? NaN : n;
};

const sameSection = (a: string, b: string) => String(a || '').trim() === String(b || '').trim();

// একটি সেগমেন্টে যে শিক্ষার্থীরা মিলে — নির্ধারিত ক্রমে (from > to হলে উল্টো)
export const resolveSegmentStudents = (seg: SeatSegment, pool: Student[]): Student[] => {
  const from = toNum(seg.fromRoll);
  const to = toNum(seg.toRoll);
  const cls = normalizeClassName(seg.className);
  const matched = pool.filter((s) => {
    if (normalizeClassName(s.className) !== cls) return false;
    if (seg.section && !sameSection(s.section, seg.section)) return false;
    const r = rollNum(s.roll);
    if (Number.isNaN(r)) return from === null && to === null;
    const lo = Math.min(from ?? -Infinity, to ?? Infinity);
    const hi = Math.max(from ?? -Infinity, to ?? Infinity);
    if (from === null && to === null) return true;
    if (from === null) return r <= (to as number);
    if (to === null) return r >= (from as number);
    return r >= lo && r <= hi;
  });
  const descending = from !== null && to !== null && from > to;
  matched.sort((a, b) => {
    const diff = rollNum(a.roll) - rollNum(b.roll);
    if (!Number.isNaN(diff) && diff !== 0) return descending ? -diff : diff;
    return String(a.section).localeCompare(String(b.section), 'bn');
  });
  return matched;
};

const makeAlloc = (
  student: Student,
  room: RoomConfig,
  benchNumber: number,
  column: number,
  seatPos: number,
  source: SeatAllocation['source']
): SeatAllocation => ({
  id: `seat-${room.id}-${benchNumber}-${seatPos}`,
  student,
  roomId: room.id,
  roomName: room.name,
  benchNumber,
  benchColumn: column,
  seatPosition: seatPos,
  seatLabel: SEAT_POSITION_LABELS[seatPos - 1] || `আসন ${seatPos}`,
  source,
});

/**
 * নিয়ম (rules) প্রয়োগ করে আগে ম্যানুয়াল আসন বসানো, তারপর বাকিদের অটো বসানো,
 * সবশেষে হাতে করা পরিবর্তন (overrides) প্রয়োগ।
 */
export const buildVariantPlan = (
  students: Student[],
  rooms: RoomConfig[],
  strategy: AllocationStrategy,
  teachers: Invigilator[],
  config?: VariantSeatConfig
): VariantBuildResult => {
  const rules = config?.rules || [];
  const reports: SegmentReport[] = [];
  const placedIds = new Set<string>();
  const pre: SeatAllocation[] = [];
  const noAuto = new Set<string>();

  rules.forEach((rule) => {
    const room = rooms.find((r) => r.id === rule.roomId);
    if (!room) return;
    if (rule.autoFillRest === false) noAuto.add(room.id);
    if (!rule.segments.length) return;

    const slots = listBenchSlots(room);
    // ট্র্যাক অনুযায়ী আসনের তালিকা
    const trackSeats = new Map<number, { bench: number; column: number }[]>();
    slots.forEach((slot) => {
      for (let t = 1; t <= slot.capacity; t++) {
        if (!trackSeats.has(t)) trackSeats.set(t, []);
        trackSeats.get(t)!.push({ bench: slot.benchNumber, column: slot.column });
      }
    });
    const trackCursor = new Map<number, number>();

    rule.segments.forEach((seg) => {
      const seats = trackSeats.get(seg.track) || [];
      const pool = students.filter((s) => !placedIds.has(s.id));
      const matched = resolveSegmentStudents(seg, pool);
      let cursor = trackCursor.get(seg.track) || 0;
      let placed = 0;
      for (const stu of matched) {
        if (cursor >= seats.length) break;
        const seat = seats[cursor++];
        pre.push(makeAlloc(stu, room, seat.bench, seat.column, seg.track, 'rule'));
        placedIds.add(stu.id);
        placed++;
      }
      trackCursor.set(seg.track, cursor);
      const overflow = matched.length - placed;
      reports.push({
        segmentId: seg.id,
        roomId: room.id,
        matched: matched.length,
        placed,
        overflow,
        firstRoll: matched[0]?.roll,
        lastRoll: matched[matched.length - 1]?.roll,
        message: !seats.length
          ? `এই কক্ষে ${seg.track} নং আসন (ট্র্যাক) নেই`
          : matched.length === 0
          ? 'এই শর্তে কোনো শিক্ষার্থী পাওয়া যায়নি'
          : overflow > 0
          ? `${overflow} জনের জায়গা হয়নি (বেঞ্চ কম)`
          : undefined,
      });
    });
  });

  const remaining = students.filter((s) => !placedIds.has(s.id));
  const base = generateSeatPlan(remaining, rooms, strategy, teachers, {
    preAllocated: pre,
    noAutoRoomIds: noAuto,
    autoMode: config?.autoMode,
    seed: config?.seed,
  });

  let roomPlans = base.roomPlans;
  let unallocated = base.unallocatedStudents;
  const overrides = config?.overrides || [];
  if (overrides.length) {
    const applied = applySeatOverrides(roomPlans, overrides, unallocated);
    roomPlans = applied.roomPlans;
    unallocated = applied.unallocated;
  }

  const totalSeats = rooms.length ? base.totalSeats : 0;
  return {
    roomPlans,
    unallocatedStudents: unallocated,
    totalSeats,
    totalStudents: students.length,
    reports,
    manualCount: pre.length,
    overrideCount: overrides.length,
  };
};

/**
 * হাতে করা সিট পরিবর্তন: শিক্ষার্থীকে লক্ষ্য আসনে সরানো, দখল থাকলে অদল-বদল।
 */
export const applySeatOverrides = (
  plans: RoomPlan[],
  overrides: SeatOverride[],
  unallocatedIn: Student[] = []
): { roomPlans: RoomPlan[]; unallocated: Student[] } => {
  let unallocated = [...unallocatedIn];
  // roomId -> (bench|pos) -> alloc
  const grid = new Map<string, Map<string, SeatAllocation | null>>();

  plans.forEach((plan) => {
    const m = new Map<string, SeatAllocation | null>();
    plan.benches.forEach((b) => {
      b.seats.forEach((seat, idx) => {
        m.set(`${b.benchNumber}|${idx + 1}`, seat ? { ...seat } : null);
      });
    });
    grid.set(plan.room.id, m);
  });

  const findStudent = (studentId: string): { roomId: string; key: string } | null => {
    for (const [roomId, m] of grid.entries()) {
      for (const [key, alloc] of m.entries()) {
        if (alloc && alloc.student.id === studentId) return { roomId, key };
      }
    }
    return null;
  };

  overrides.forEach((ov) => {
    const targetGrid = grid.get(ov.roomId);
    if (!targetGrid) return;
    const targetKey = `${ov.benchNumber}|${ov.seatPosition}`;
    if (!targetGrid.has(targetKey)) return;
    const from = findStudent(ov.studentId);
    if (!from) {
      // অবণ্টিত শিক্ষার্থীকে আসনে বসানো; আসন দখল থাকলে দখলকারী অবণ্টিত হবে
      const uIdx = unallocated.findIndex((u) => u.id === ov.studentId);
      if (uIdx === -1) return;
      const stu = unallocated[uIdx];
      const occupant = targetGrid.get(targetKey) || null;
      const [bn, pos] = targetKey.split('|').map(Number);
      const roomPlan = plans.find((p) => p.room.id === ov.roomId)!;
      const benchCol = roomPlan.benches.find((b) => b.benchNumber === bn)?.benchColumn || 1;
      targetGrid.set(targetKey, {
        id: `seat-${ov.roomId}-${bn}-${pos}`,
        student: stu,
        roomId: ov.roomId,
        roomName: roomPlan.room.name,
        benchNumber: bn,
        benchColumn: benchCol,
        seatPosition: pos,
        seatLabel: SEAT_POSITION_LABELS[pos - 1] || `আসন ${pos}`,
        source: 'manual',
      });
      unallocated = unallocated.filter((u) => u.id !== stu.id);
      if (occupant) unallocated.push(occupant.student);
      return;
    }
    if (from.roomId === ov.roomId && from.key === targetKey) return;
    const fromGrid = grid.get(from.roomId)!;
    const moving = fromGrid.get(from.key)!;
    const occupant = targetGrid.get(targetKey) || null;
    targetGrid.set(targetKey, { ...moving, source: 'manual' });
    fromGrid.set(from.key, occupant ? { ...occupant, source: 'manual' } : null);
  });

  // নতুন করে RoomPlan গঠন
  const roomPlans = plans.map((plan) => {
    const m = grid.get(plan.room.id)!;
    const allocations: SeatAllocation[] = [];
    const benches: BenchPlan[] = plan.benches.map((b) => {
      const seats: (SeatAllocation | null)[] = b.seats.map((_, idx) => {
        const a = m.get(`${b.benchNumber}|${idx + 1}`) || null;
        if (!a) return null;
        const fixed: SeatAllocation = {
          ...a,
          roomId: plan.room.id,
          roomName: plan.room.name,
          benchNumber: b.benchNumber,
          benchColumn: b.benchColumn,
          seatPosition: idx + 1,
          seatLabel: SEAT_POSITION_LABELS[idx] || `আসন ${idx + 1}`,
          id: `seat-${plan.room.id}-${b.benchNumber}-${idx + 1}`,
        };
        allocations.push(fixed);
        return fixed;
      });
      return { ...b, seats };
    });
    return {
      ...plan,
      benches,
      allocations,
      allocatedCount: allocations.length,
      classSummaries: buildClassSummaries(allocations),
    };
  });
  return { roomPlans, unallocated };
};

export const emptyVariantConfig = (): VariantSeatConfig => ({ rules: [], overrides: [], autoMode: 'roll' });

export const newSegmentId = () => `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

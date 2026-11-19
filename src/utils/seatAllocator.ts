import {
  Student,
  RoomConfig,
  RoomPlan,
  BenchPlan,
  SeatAllocation,
  AllocationStrategy,
  ClassSummary,
  Invigilator,
  ColumnConfig,
} from '../types/seatPlan';

// Helper to sort rolls naturally (numeric or string)
export const compareRolls = (a: number | string, b: number | string): number => {
  const numA = typeof a === 'number' ? a : parseInt(String(a), 10);
  const numB = typeof b === 'number' ? b : parseInt(String(b), 10);

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return String(a).localeCompare(String(b), 'bn', { numeric: true });
};

// Generates human-friendly roll range display: e.g. "১-১৫, ১৮, ২১-২৫"
export const formatRollRanges = (rolls: (number | string)[]): string => {
  if (!rolls.length) return '';
  const sorted = [...rolls].sort(compareRolls);

  // Check if all are numbers
  const allNumeric = sorted.every((r) => !isNaN(parseInt(String(r), 10)));

  if (!allNumeric) {
    if (sorted.length <= 5) return sorted.join(', ');
    return `${sorted[0]} – ${sorted[sorted.length - 1]} (${sorted.length} জন)`;
  }

  const numRolls = sorted.map((r) => parseInt(String(r), 10));
  const ranges: string[] = [];
  let start = numRolls[0];
  let prev = numRolls[0];

  for (let i = 1; i <= numRolls.length; i++) {
    const curr = numRolls[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      if (start === prev) {
        ranges.push(String(start));
      } else {
        ranges.push(`${start} – ${prev}`);
      }
      start = curr;
      prev = curr;
    }
  }

  return ranges.join(', ');
};

// Helper to get normalized column configs for a room
export const getEffectiveRoomColumns = (room: RoomConfig): ColumnConfig[] => {
  const count = Math.max(1, Math.min(4, room.columnsCount || 2));
  if (room.columnConfigs && room.columnConfigs.length === count) {
    return room.columnConfigs;
  }

  const baseCount = Math.floor(room.benchCount / count);
  const remainder = room.benchCount % count;
  const colNames = ['বাম সারি (১)', 'ডান সারি (২)', 'মাঝের সারি (৩)', 'চতুর্থ সারি (৪)'];
  if (count === 3) {
    colNames[0] = 'বাম সারি (১)';
    colNames[1] = 'মাঝের সারি (২)';
    colNames[2] = 'ডান সারি (৩)';
  }

  const result: ColumnConfig[] = [];
  for (let c = 1; c <= count; c++) {
    const extra = c <= remainder ? 1 : 0;
    result.push({
      columnIndex: c,
      columnName: colNames[c - 1] || `সারি ${c}`,
      benchCount: Math.max(1, baseCount + extra),
      studentsPerBench: room.studentsPerBench || 2,
    });
  }
  return result;
};

export const getRoomCapacity = (room: RoomConfig): number => {
  const cols = getEffectiveRoomColumns(room);
  return cols.reduce((sum, col) => sum + col.benchCount * col.studentsPerBench, 0);
};

export const getRoomTotalBenches = (room: RoomConfig): number => {
  const cols = getEffectiveRoomColumns(room);
  return cols.reduce((sum, col) => sum + col.benchCount, 0);
};

// Fair and balanced invigilator duty allocation algorithm
export const allocateInvigilators = (
  rooms: RoomConfig[],
  invigilators: Invigilator[],
  invigilatorsPerRoom: number = 2
): Map<string, Invigilator[]> => {
  const assignments = new Map<string, Invigilator[]>();
  if (!invigilators.length || !rooms.length) return assignments;

  const dutyCounts = new Map<string, number>();
  invigilators.forEach((t) => dutyCounts.set(t.id, 0));

  rooms.forEach((room) => {
    if (room.invigilatorIds && room.invigilatorIds.length > 0) {
      const manualAssigned = room.invigilatorIds
        .map((id) => invigilators.find((t) => t.id === id))
        .filter((t): t is Invigilator => t !== undefined);
      assignments.set(room.id, [...manualAssigned]);
      manualAssigned.forEach((t) => {
        dutyCounts.set(t.id, (dutyCounts.get(t.id) || 0) + 1);
      });
    } else {
      assignments.set(room.id, []);
    }
  });

  rooms.forEach((room) => {
    const currentAssigned = assignments.get(room.id) || [];
    const needed = Math.max(0, invigilatorsPerRoom - currentAssigned.length);

    for (let slot = 0; slot < needed; slot++) {
      const candidates = invigilators.filter(
        (t) => !currentAssigned.some((assigned) => assigned.id === t.id)
      );

      if (!candidates.length) break;

      candidates.sort((a, b) => {
        const cA = dutyCounts.get(a.id) || 0;
        const cB = dutyCounts.get(b.id) || 0;
        return cA - cB;
      });

      const chosen = candidates[0];
      currentAssigned.push(chosen);
      dutyCounts.set(chosen.id, (dutyCounts.get(chosen.id) || 0) + 1);
    }

    assignments.set(room.id, currentAssigned);
  });

  return assignments;
};

// Check if a student matches room filter
const isStudentAllowedInRoom = (student: Student, allowedClasses?: string[]): boolean => {
  if (!allowedClasses || allowedClasses.length === 0) return true;
  const fullGroup = `${student.className} - ${student.section}`;
  return allowedClasses.some(
    (allowed) =>
      allowed === student.className ||
      allowed === fullGroup ||
      allowed === student.section
  );
};

// Helper to compute bench number based on room.benchOrder ('column_wise' by default)
export const computeBenchNumber = (
  colIndex: number, // 1-based
  rowIndex: number, // 1-based
  effectiveCols: ColumnConfig[],
  order: 'column_wise' | 'row_wise' = 'column_wise'
): number => {
  if (order === 'row_wise') {
    let count = 0;
    // count benches in preceding rows (1 to rowIndex - 1)
    for (let r = 1; r < rowIndex; r++) {
      for (const col of effectiveCols) {
        if (r <= col.benchCount) count++;
      }
    }
    // count benches in current row rowIndex up to colIndex
    for (const col of effectiveCols) {
      if (col.columnIndex < colIndex && rowIndex <= col.benchCount) {
        count++;
      }
    }
    return count + 1;
  } else {
    // column_wise (default): count all benches in preceding columns + rowIndex
    let offset = 0;
    for (const col of effectiveCols) {
      if (col.columnIndex < colIndex) {
        offset += col.benchCount;
      }
    }
    return offset + rowIndex;
  }
};

interface AllocationQueue {
  key: string;
  name: string;
  className: string;
  section: string;
  list: Student[];
}

export interface GenerateOptions {
  preAllocated?: SeatAllocation[]; // ম্যানুয়াল নিয়মে আগেই বসানো আসন
  noAutoRoomIds?: Set<string>; // এই কক্ষগুলোতে অটো শিক্ষার্থী বসবে না
  autoMode?: 'roll' | 'reverse' | 'shuffle';
  seed?: number;
}

// Deterministic seeded shuffle (Mulberry32)
const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let t = seed >>> 0;
  const rnd = () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const buildClassSummaries = (allocations: SeatAllocation[]): ClassSummary[] => {
  const summaryMap = new Map<
    string,
    { rolls: (number | string)[]; count: number; className: string; section: string }
  >();
  allocations.forEach((alloc) => {
    const cls = alloc.student.className;
    const sec = alloc.student.section;
    const key = `${cls}___${sec}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, { rolls: [], count: 0, className: cls, section: sec });
    }
    const entry = summaryMap.get(key)!;
    entry.rolls.push(alloc.student.roll);
    entry.count += 1;
  });
  return Array.from(summaryMap.values()).map((item) => {
    const sortedRolls = [...item.rolls].sort(compareRolls);
    return {
      className: item.className,
      section: item.section,
      count: item.count,
      minRoll: sortedRolls[0] ?? '-',
      maxRoll: sortedRolls[sortedRolls.length - 1] ?? '-',
      rollRangeDisplay: formatRollRanges(sortedRolls),
    };
  });
};

export const SEAT_POSITION_LABELS = ['বাম (১)', 'মাঝ (২)', 'ডান (৩)', 'চতুর্থ (৪)', 'পঞ্চম (৫)', 'ষষ্ঠ (৬)'];

// কক্ষের সব বেঞ্চ — অ্যালোকেশনের ক্রমে (কলাম ধরে ধরে)
export interface BenchSlot {
  benchNumber: number;
  column: number;
  capacity: number;
}
export const listBenchSlots = (room: RoomConfig): BenchSlot[] => {
  const cols = getEffectiveRoomColumns(room);
  const order = room.benchOrder || 'column_wise';
  const out: BenchSlot[] = [];
  cols.forEach((c) => {
    const capacity = Math.max(1, Math.min(6, c.studentsPerBench));
    for (let r = 1; r <= c.benchCount; r++) {
      out.push({ benchNumber: computeBenchNumber(c.columnIndex, r, cols, order), column: c.columnIndex, capacity });
    }
  });
  return out;
};

export const generateSeatPlan = (
  students: Student[],
  rooms: RoomConfig[],
  strategy: AllocationStrategy = 'interleave_classes',
  invigilators: Invigilator[] = [],
  options: GenerateOptions = {}
): {
  roomPlans: RoomPlan[];
  unallocatedStudents: Student[];
  totalSeats: number;
  totalStudents: number;
} => {
  if (!students.length || !rooms.length) {
    return { roomPlans: [], unallocatedStudents: [], totalSeats: 0, totalStudents: students.length };
  }

  // Calculate total capacity across all rooms and custom columns
  const totalSeats = rooms.reduce((acc, r) => acc + getRoomCapacity(r), 0);

  // Compute fair duty assignments for invigilators
  const invigilatorMap = allocateInvigilators(rooms, invigilators, 2);

  // Prepare student queues based on strategy
  const queues: AllocationQueue[] = [];

  if (strategy === 'interleave_sections') {
    // Group by Class + Section so sections of the same class alternate side-by-side
    const secMap = new Map<string, { className: string; section: string; list: Student[] }>();
    students.forEach((s) => {
      const key = `${s.className}___${s.section}`;
      if (!secMap.has(key)) {
        secMap.set(key, { className: s.className, section: s.section, list: [] });
      }
      secMap.get(key)!.list.push(s);
    });

    // Sort rolls strictly ascending inside each section
    secMap.forEach((val) => {
      val.list.sort((a, b) => compareRolls(a.roll, b.roll));
    });

    // Group sections by class so different sections of the same class sit side-by-side
    const sortedKeys = Array.from(secMap.keys()).sort((a, b) => {
      const valA = secMap.get(a)!;
      const valB = secMap.get(b)!;
      if (valA.className !== valB.className) {
        return String(valA.className).localeCompare(String(valB.className), 'bn', { numeric: true });
      }
      return String(valA.section).localeCompare(String(valB.section), 'bn', { numeric: true });
    });

    sortedKeys.forEach((key) => {
      const item = secMap.get(key)!;
      queues.push({
        key,
        name: `${item.className} - ${item.section}`,
        className: item.className,
        section: item.section,
        list: [...item.list],
      });
    });
  } else if (strategy === 'interleave_classes') {
    // Group by class to alternate classes on adjacent seats
    const classMap = new Map<string, Student[]>();
    students.forEach((s) => {
      const cls = s.className;
      if (!classMap.has(cls)) classMap.set(cls, []);
      classMap.get(cls)!.push(s);
    });

    classMap.forEach((list) => {
      list.sort((a, b) => {
        if (a.section !== b.section) return String(a.section).localeCompare(String(b.section), 'bn');
        return compareRolls(a.roll, b.roll);
      });
    });

    const distinctClasses = Array.from(classMap.keys());
    if (distinctClasses.length > 1) {
      distinctClasses.forEach((cls) => {
        queues.push({
          key: cls,
          name: cls,
          className: cls,
          section: '',
          list: [...classMap.get(cls)!],
        });
      });
    } else {
      // Only 1 class present with multiple sections -> fall back to section grouping
      const secMap = new Map<string, { className: string; section: string; list: Student[] }>();
      students.forEach((s) => {
        const key = `${s.className}___${s.section}`;
        if (!secMap.has(key)) {
          secMap.set(key, { className: s.className, section: s.section, list: [] });
        }
        secMap.get(key)!.list.push(s);
      });
      secMap.forEach((val) => {
        val.list.sort((a, b) => compareRolls(a.roll, b.roll));
        queues.push({
          key: `${val.className} - ${val.section}`,
          name: `${val.className} - ${val.section}`,
          className: val.className,
          section: val.section,
          list: [...val.list],
        });
      });
    }
  } else {
    // Sequential
    const sorted = [...students].sort((a, b) => {
      if (a.className !== b.className) return String(a.className).localeCompare(String(b.className), 'bn');
      if (a.section !== b.section) return String(a.section).localeCompare(String(b.section), 'bn');
      return compareRolls(a.roll, b.roll);
    });
    queues.push({
      key: 'all',
      name: 'সকল শিক্ষার্থী',
      className: '',
      section: '',
      list: sorted,
    });
  }

  // অটো অংশের রোল ক্রম পরিবর্তন (উল্টো / এলোমেলো)
  if (options.autoMode === 'reverse') {
    queues.forEach((q) => q.list.reverse());
  } else if (options.autoMode === 'shuffle') {
    queues.forEach((q, i) => {
      q.list = seededShuffle(q.list, (options.seed || 1) + i * 977);
    });
  }

  const preMap = new Map<string, SeatAllocation>();
  (options.preAllocated || []).forEach((a) => {
    preMap.set(`${a.roomId}|${a.benchNumber}|${a.seatPosition}`, a);
  });
  const noAuto = options.noAutoRoomIds || new Set<string>();

  const roomPlans: RoomPlan[] = [];
  const seatPositionsLabels = SEAT_POSITION_LABELS;

  rooms.forEach((room) => {
    const benches: BenchPlan[] = [];
    const allocations: SeatAllocation[] = [];
    const effectiveCols = getEffectiveRoomColumns(room);
    const benchOrder = room.benchOrder || 'column_wise';

    // Maximum capacity in this room across columns
    const maxCapInRoom = Math.max(...effectiveCols.map((c) => c.studentsPerBench), 2);
    // Dedicated track queues per seat index (e.g. seat 0 = Track 0, seat 1 = Track 1)
    const trackQueues: (AllocationQueue | null)[] = new Array(maxCapInRoom).fill(null);

    const isTrackValid = (q: AllocationQueue | null) => {
      return q !== null && q.list.some((stud) => isStudentAllowedInRoom(stud, room.allowedClasses));
    };

    const pickQueueForTrack = (
      trackIdx: number,
      currentTracks: (AllocationQueue | null)[],
      columnCapacity: number
    ): AllocationQueue | null => {
      const eligible = queues.filter((q) =>
        q.list.some((stud) => isStudentAllowedInRoom(stud, room.allowedClasses))
      );
      if (!eligible.length) return null;

      // Queues currently assigned to other active tracks on this bench
      const activeOtherTracks = currentTracks
        .slice(0, columnCapacity)
        .filter((q, idx): q is AllocationQueue => idx !== trackIdx && q !== null);

      // Distinct candidates not currently held by another seat on this bench
      const distinctCandidates = eligible.filter(
        (q) => !activeOtherTracks.some((other) => other.key === q.key)
      );
      const pool = distinctCandidates.length > 0 ? distinctCandidates : eligible;

      if (strategy === 'interleave_sections') {
        const companion = activeOtherTracks[0];
        if (companion) {
          // Prefer same class but different section so ক and খ sit side-by-side
          const sameClassDiffSec = pool.find(
            (q) => q.className === companion.className && q.section !== companion.section
          );
          if (sameClassDiffSec) return sameClassDiffSec;

          // If no different section of same class, prefer different class
          const diffClass = pool.find((q) => q.className !== companion.className);
          if (diffClass) return diffClass;
        }
        return pool[0];
      } else if (strategy === 'interleave_classes') {
        const companion = activeOtherTracks[0];
        if (companion) {
          const diffClass = pool.find((q) => q.className !== companion.className);
          if (diffClass) return diffClass;
        }
        return pool[0];
      } else {
        return pool[0];
      }
    };

    // Traverse and allocate benches column-by-column so students sit down each column sequentially
    effectiveCols.forEach((colConfig) => {
      const capacity = Math.max(1, Math.min(6, colConfig.studentsPerBench));
      const benchCount = colConfig.benchCount;

      for (let r = 1; r <= benchCount; r++) {
        const benchNumber = computeBenchNumber(
          colConfig.columnIndex,
          r,
          effectiveCols,
          benchOrder
        );
        const seats: (SeatAllocation | null)[] = [];

        for (let s = 0; s < capacity; s++) {
          const pre = preMap.get(`${room.id}|${benchNumber}|${s + 1}`);
          if (pre) {
            seats.push(pre);
            allocations.push(pre);
            continue;
          }
          if (noAuto.has(room.id)) {
            seats.push(null);
            continue;
          }
          if (!isTrackValid(trackQueues[s])) {
            trackQueues[s] = pickQueueForTrack(s, trackQueues, capacity);
          }

          let student: Student | null = null;
          if (trackQueues[s]) {
            const q = trackQueues[s]!;
            const studIdx = q.list.findIndex((stud) =>
              isStudentAllowedInRoom(stud, room.allowedClasses)
            );
            if (studIdx !== -1) {
              student = q.list.splice(studIdx, 1)[0];
            }
          }

          if (student) {
            const alloc: SeatAllocation = {
              id: `seat-${room.id}-${benchNumber}-${s + 1}`,
              student,
              roomId: room.id,
              roomName: room.name,
              benchNumber,
              benchColumn: colConfig.columnIndex,
              seatPosition: s + 1,
              seatLabel: seatPositionsLabels[s] || `আসন ${s + 1}`,
              source: 'auto',
            };
            seats.push(alloc);
            allocations.push(alloc);
          } else {
            seats.push(null);
          }
        }

        benches.push({
          benchNumber,
          benchColumn: colConfig.columnIndex,
          seats,
        });
      }
    });

    // Ensure benches are sorted by benchNumber
    benches.sort((a, b) => a.benchNumber - b.benchNumber);

    const classSummaries: ClassSummary[] = buildClassSummaries(allocations);

    const roomInvigilators = invigilatorMap.get(room.id) || [];
    const roomCapacity = effectiveCols.reduce((sum, c) => sum + c.benchCount * c.studentsPerBench, 0);

    roomPlans.push({
      room,
      benches,
      totalSeats: roomCapacity,
      allocatedCount: allocations.length,
      allocations,
      classSummaries,
      invigilators: roomInvigilators,
    });
  });

  // Collect unallocated students if any
  const unallocatedStudents: Student[] = [];
  queues.forEach((q) => {
    unallocatedStudents.push(...q.list);
  });

  return {
    roomPlans,
    unallocatedStudents,
    totalSeats,
    totalStudents: students.length,
  };
};

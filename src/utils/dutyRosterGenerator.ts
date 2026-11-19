import {
  RoomConfig,
  Invigilator,
  ExamSubject,
  FullDutyRoster,
  DayDutySchedule,
  TeacherDutyStat,
  DutyOverride,
} from '../types/seatPlan';

/**
 * সকাল ও বিকাল দুই শিফটের জন্য সমবন্টনভিত্তিক সাইক্লিক ডিউটি রোস্টার।
 *
 * - রুটিনের প্রতিটি এন্ট্রি (তারিখ × শিফট) একটি "পিরিয়ড"। প্রতি পিরিয়ডে ব্যবহৃত প্রতিটি কক্ষে ২ জন শিক্ষক।
 * - periodRooms দিলে প্রতি পিরিয়ডে শুধু সেই শিফটে ব্যবহৃত কক্ষগুলোতে ডিউটি পড়ে
 *   (যেমন ৯ম শ্রেণীর একা পরীক্ষার দিনে কম কক্ষ লাগে)।
 * - একই দিনে সকাল ও বিকাল দুই বেলা যথাসম্ভব একই শিক্ষকের ডিউটি এড়ানো হয়
 *   (শিক্ষক সংখ্যা কম হলে বাধ্য হয়ে দুই বেলাও পড়তে পারে)।
 * - যাদের মোট ডিউটি সবচেয়ে কম তাদের আগে সুযোগ দিয়ে ডিউটি সংখ্যা সর্বোচ্চ সমান রাখা হয়।
 * - ম্যানুয়াল পরিবর্তন / বদলি (dutyOverrides) আগের মতোই কাজ করে।
 */
export const generateCyclicDutyRoster = (
  rooms: RoomConfig[],
  teachers: Invigilator[],
  subjects: ExamSubject[],
  dutyOverrides: DutyOverride[] = [],
  periodRooms?: Record<string, RoomConfig[]>
): FullDutyRoster => {
  const roomsFor = (sub: ExamSubject): RoomConfig[] => {
    const r = periodRooms ? periodRooms[sub.id] : undefined;
    return r && r.length ? r : periodRooms ? [] : rooms;
  };

  const totalDutySlots = subjects.reduce((sum, sub) => sum + roomsFor(sub).length * 2, 0);

  if (!teachers.length || !subjects.length || (!rooms.length && !periodRooms)) {
    return {
      daySchedules: [],
      teacherStats: [],
      totalDays: subjects.length,
      totalDutySlots: 0,
      averageDuty: 0,
      minDuty: 0,
      maxDuty: 0,
      isBalanced: true,
      overrides: dutyOverrides,
    };
  }

  const numTeachers = teachers.length;

  const overrideMap = new Map<string, DutyOverride>();
  dutyOverrides.forEach((ov) => {
    overrideMap.set(`${ov.dateId}_${ov.roomId}_${ov.slotIndex}`, ov);
    if (ov.date) overrideMap.set(`${ov.date}_${ov.roomId}_${ov.slotIndex}`, ov);
    if (ov.id) overrideMap.set(ov.id, ov);
  });

  const teacherStatMap = new Map<string, TeacherDutyStat>();
  teachers.forEach((t) => {
    teacherStatMap.set(t.id, { teacher: t, totalDuties: 0, isSubstitute: false, duties: [] });
  });
  dutyOverrides.forEach((ov) => {
    const subTeacher = ov.assignedTeacher;
    if (subTeacher && !teacherStatMap.has(subTeacher.id)) {
      teacherStatMap.set(subTeacher.id, {
        teacher: subTeacher,
        totalDuties: 0,
        isSubstitute: Boolean(ov.isSubstitute),
        duties: [],
      });
    }
  });

  // বেসলাইন (ওভাররাইড ছাড়া) সমবন্টনের জন্য আলাদা গণনা
  const baseCounts = new Map<string, number>();
  teachers.forEach((t) => baseCounts.set(t.id, 0));
  const dayAssigned = new Map<string, Set<string>>(); // তারিখ -> শিক্ষক আইডি (সব শিফট মিলিয়ে)
  let pointer = 0;

  const pickTeacher = (periodSet: Set<string>, daySet: Set<string>): Invigilator => {
    const tiers: ((t: Invigilator) => boolean)[] = [
      (t) => !daySet.has(t.id) && !periodSet.has(t.id), // সেদিন কোনো শিফটে ডিউটি নেই
      (t) => !periodSet.has(t.id), // এই শিফটে নেই (অন্য শিফটে থাকতে পারে)
      () => true,
    ];
    for (const ok of tiers) {
      let best: Invigilator | null = null;
      let bestCount = Infinity;
      let bestDist = Infinity;
      for (let i = 0; i < numTeachers; i++) {
        const idx = (pointer + i) % numTeachers;
        const t = teachers[idx];
        if (!ok(t)) continue;
        const c = baseCounts.get(t.id) || 0;
        if (c < bestCount || (c === bestCount && i < bestDist)) {
          best = t;
          bestCount = c;
          bestDist = i;
        }
      }
      if (best) {
        pointer = (teachers.findIndex((x) => x.id === best!.id) + 1) % numTeachers;
        return best;
      }
    }
    return teachers[pointer % numTeachers];
  };

  const daySchedules: DayDutySchedule[] = [];

  subjects.forEach((sub) => {
    const periodRoomList = roomsFor(sub);
    const periodSet = new Set<string>();
    if (!dayAssigned.has(sub.date)) dayAssigned.set(sub.date, new Set<string>());
    const daySet = dayAssigned.get(sub.date)!;

    const roomDuties: DayDutySchedule['roomDuties'] = [];

    periodRoomList.forEach((room) => {
      const roomInvigilators: Invigilator[] = [];
      const roomSlotOverrides: (DutyOverride | null)[] = [];

      for (let slot = 0; slot < 2; slot++) {
        const role = slot === 0 ? ('১ম পরিদর্শক' as const) : ('২য় পরিদর্শক' as const);

        const candidate = pickTeacher(periodSet, daySet);
        baseCounts.set(candidate.id, (baseCounts.get(candidate.id) || 0) + 1);
        periodSet.add(candidate.id);
        daySet.add(candidate.id);

        const override =
          overrideMap.get(`${sub.id}_${room.id}_${slot}`) || overrideMap.get(`${sub.date}_${room.id}_${slot}`);

        if (override && override.assignedTeacher) {
          const actualTeacher = override.assignedTeacher;
          if (!teacherStatMap.has(actualTeacher.id)) {
            teacherStatMap.set(actualTeacher.id, {
              teacher: actualTeacher,
              totalDuties: 0,
              isSubstitute: Boolean(override.isSubstitute),
              duties: [],
            });
          }
          const actualStat = teacherStatMap.get(actualTeacher.id)!;
          actualStat.totalDuties += 1;
          actualStat.duties.push({
            date: sub.date,
            day: sub.day,
            subjectName: sub.subjectName,
            roomName: room.name,
            role,
            session: sub.session,
            isOverridden: true,
            reason: override.reason,
          });
          roomInvigilators.push(actualTeacher);
          roomSlotOverrides.push({
            ...override,
            originalTeacherId: candidate.id,
            originalTeacherName: candidate.name,
          });
        } else {
          roomInvigilators.push(candidate);
          roomSlotOverrides.push(null);
          const stat = teacherStatMap.get(candidate.id);
          if (stat) {
            stat.totalDuties += 1;
            stat.duties.push({
              date: sub.date,
              day: sub.day,
              subjectName: sub.subjectName,
              roomName: room.name,
              role,
              session: sub.session,
              isOverridden: false,
            });
          }
        }
      }

      roomDuties.push({ room, invigilators: roomInvigilators, overrides: roomSlotOverrides });
    });

    daySchedules.push({
      dateId: sub.id,
      date: sub.date,
      day: sub.day,
      subjectName: sub.subjectName,
      session: sub.session,
      dayNo: sub.dayNo,
      roomDuties,
    });
  });

  const teacherStats = Array.from(teacherStatMap.values()).sort((a, b) => {
    if (b.totalDuties !== a.totalDuties) return b.totalDuties - a.totalDuties;
    return a.teacher.name.localeCompare(b.teacher.name, 'bn');
  });

  const dutyCounts = teacherStats.map((s) => s.totalDuties);
  const minDuty = dutyCounts.length ? Math.min(...dutyCounts) : 0;
  const maxDuty = dutyCounts.length ? Math.max(...dutyCounts) : 0;
  const averageDuty = numTeachers ? Number((totalDutySlots / numTeachers).toFixed(1)) : 0;
  const isBalanced = maxDuty - minDuty <= 1;

  return {
    daySchedules,
    teacherStats,
    totalDays: subjects.length,
    totalDutySlots,
    averageDuty,
    minDuty,
    maxDuty,
    isBalanced,
    overrides: dutyOverrides,
  };
};

import React, { useMemo, useState } from 'react';
import {
  AutoSeatMode,
  RoomConfig,
  RoomPlan,
  RoomSeatRule,
  SeatAllocation,
  SeatSegment,
  SeatVariant,
  Student,
  VariantSeatConfig,
} from '../types/seatPlan';
import { SegmentReport, emptyVariantConfig, newSegmentId } from '../utils/seatRules';
import { compareClassNames, normalizeClassName, shortClass } from '../utils/examSchedule';
import { compareRolls } from '../utils/seatAllocator';
import {
  Wand2,
  Hand,
  Plus,
  Trash2,
  ArrowUpDown,
  Undo2,
  Shuffle,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  MousePointerClick,
} from 'lucide-react';

interface Props {
  variants: SeatVariant[];
  reportsByVariant: Record<string, SegmentReport[]>;
  selectedVariantKey: string;
  setSelectedVariantKey: (k: string) => void;
  seatConfigs: Record<string, VariantSeatConfig>;
  setSeatConfigs: React.Dispatch<React.SetStateAction<Record<string, VariantSeatConfig>>>;
  students: Student[];
  rooms: RoomConfig[];
  onProceedToPreview: () => void;
}

const CLASS_TONES = [
  'bg-sky-100 border-sky-400 text-sky-900',
  'bg-emerald-100 border-emerald-400 text-emerald-900',
  'bg-amber-100 border-amber-400 text-amber-900',
  'bg-violet-100 border-violet-400 text-violet-900',
  'bg-rose-100 border-rose-400 text-rose-900',
  'bg-teal-100 border-teal-400 text-teal-900',
];

export const SeatRulesStep: React.FC<Props> = ({
  variants,
  reportsByVariant,
  selectedVariantKey,
  setSelectedVariantKey,
  seatConfigs,
  setSeatConfigs,
  students,
  rooms,
  onProceedToPreview,
}) => {
  const variant = variants.find((v) => v.key === selectedVariantKey) || variants[0];
  const [roomId, setRoomId] = useState<string>('');
  const [selSeat, setSelSeat] = useState<{ roomId: string; bench: number; pos: number } | null>(null);
  const [selUnalloc, setSelUnalloc] = useState<string | null>(null);

  const activeRoomId = roomId && rooms.some((r) => r.id === roomId) ? roomId : rooms[0]?.id || '';
  const roomPlan: RoomPlan | undefined = variant?.roomPlans.find((p) => p.room.id === activeRoomId);

  const cfg: VariantSeatConfig = (variant && seatConfigs[variant.key]) || emptyVariantConfig();
  const reports = (variant && reportsByVariant[variant.key]) || [];

  const classTone = useMemo(() => {
    const map = new Map<string, string>();
    (variant?.classes || []).forEach((c, i) => map.set(c, CLASS_TONES[i % CLASS_TONES.length]));
    return map;
  }, [variant]);

  if (!variant) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <div className="font-bold text-slate-700">কোনো সিট প্ল্যান ভ্যারিয়েন্ট পাওয়া যায়নি</div>
        <p className="text-xs text-slate-500 mt-1">
          প্রথমে শিক্ষার্থী তালিকা আপলোড করুন এবং "শিক্ষক ও রুটিন" ট্যাবে পরীক্ষার রুটিন নির্ধারণ করুন।
        </p>
      </div>
    );
  }

  const updateCfg = (fn: (c: VariantSeatConfig) => VariantSeatConfig) => {
    setSeatConfigs((prev) => ({ ...prev, [variant.key]: fn(prev[variant.key] || emptyVariantConfig()) }));
  };

  // ---------------- নিয়ম (rules) ----------------
  const ruleFor = (rid: string): RoomSeatRule =>
    cfg.rules.find((r) => r.roomId === rid) || { roomId: rid, segments: [], autoFillRest: true };

  const updateRule = (rid: string, fn: (r: RoomSeatRule) => RoomSeatRule) => {
    updateCfg((c) => {
      const exists = c.rules.some((r) => r.roomId === rid);
      const current = c.rules.find((r) => r.roomId === rid) || { roomId: rid, segments: [], autoFillRest: true };
      const next = fn(current);
      return {
        ...c,
        rules: exists ? c.rules.map((r) => (r.roomId === rid ? next : r)) : [...c.rules, next],
      };
    });
  };

  const variantStudents = students.filter((s) => variant.classes.includes(normalizeClassName(s.className)));
  const sectionsOf = (cls: string): string[] =>
    Array.from(
      new Set(variantStudents.filter((s) => normalizeClassName(s.className) === cls).map((s) => String(s.section || '').trim()))
    ).sort((a, b) => a.localeCompare(b, 'bn'));
  const rollBounds = (cls: string, section: string): [number, number] | null => {
    const rolls = variantStudents
      .filter((s) => normalizeClassName(s.className) === cls && (!section || String(s.section).trim() === section))
      .map((s) => s.roll)
      .sort(compareRolls)
      .map((r) => parseInt(String(r), 10))
      .filter((n) => !Number.isNaN(n));
    return rolls.length ? [rolls[0], rolls[rolls.length - 1]] : null;
  };

  const roomCapacityTracks = (room: RoomConfig): number => {
    const caps = (roomPlan?.benches || []).map((b) => b.seats.length);
    return Math.max(2, ...caps, room.studentsPerBench || 2);
  };

  const addSegment = (rid: string) => {
    const usedTracks = ruleFor(rid).segments.map((s) => s.track);
    const nextTrack = usedTracks.length ? (Math.max(...usedTracks) % 2) + 1 : 1;
    const cls = variant.classes[Math.min(usedTracks.length, variant.classes.length - 1)] || variant.classes[0] || '';
    const secs = sectionsOf(cls);
    const bounds = rollBounds(cls, secs[0] || '');
    const seg: SeatSegment = {
      id: newSegmentId(),
      track: nextTrack,
      className: cls,
      section: secs[0] || '',
      fromRoll: bounds ? bounds[0] : '',
      toRoll: bounds ? bounds[1] : '',
    };
    updateRule(rid, (r) => ({ ...r, segments: [...r.segments, seg] }));
  };

  const patchSegment = (rid: string, segId: string, patch: Partial<SeatSegment>) => {
    updateRule(rid, (r) => ({ ...r, segments: r.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s)) }));
  };

  const removeSegment = (rid: string, segId: string) => {
    updateRule(rid, (r) => ({ ...r, segments: r.segments.filter((s) => s.id !== segId) }));
  };

  const fillWholeSection = (rid: string, seg: SeatSegment) => {
    const b = rollBounds(seg.className, seg.section);
    if (b) patchSegment(rid, seg.id, { fromRoll: b[0], toRoll: b[1] });
  };

  const swapDirection = (rid: string, seg: SeatSegment) => {
    patchSegment(rid, seg.id, { fromRoll: seg.toRoll, toRoll: seg.fromRoll });
  };

  const copyRulesFrom = (fromKey: string) => {
    const src = seatConfigs[fromKey];
    if (!src) return;
    updateCfg((c) => ({
      ...c,
      rules: src.rules.map((r) => ({
        ...r,
        segments: r.segments
          .filter((s) => variant.classes.includes(normalizeClassName(s.className)))
          .map((s) => ({ ...s, id: newSegmentId() })),
      })),
      overrides: [],
    }));
  };

  // ---------------- সিট পরিবর্তন (ম্যানুয়াল) ----------------
  const allocAt = (plan: RoomPlan, bench: number, pos: number): SeatAllocation | null => {
    const b = plan.benches.find((x) => x.benchNumber === bench);
    return b ? b.seats[pos - 1] || null : null;
  };

  const pushOverride = (studentId: string, rid: string, bench: number, pos: number) => {
    updateCfg((c) => ({ ...c, overrides: [...c.overrides, { studentId, roomId: rid, benchNumber: bench, seatPosition: pos }] }));
  };

  const onSeatClick = (plan: RoomPlan, bench: number, pos: number) => {
    const target = allocAt(plan, bench, pos);
    if (selUnalloc) {
      pushOverride(selUnalloc, plan.room.id, bench, pos);
      setSelUnalloc(null);
      return;
    }
    if (!selSeat) {
      setSelSeat({ roomId: plan.room.id, bench, pos });
      return;
    }
    if (selSeat.roomId === plan.room.id && selSeat.bench === bench && selSeat.pos === pos) {
      setSelSeat(null);
      return;
    }
    const srcPlan = variant.roomPlans.find((p) => p.room.id === selSeat.roomId);
    const source = srcPlan ? allocAt(srcPlan, selSeat.bench, selSeat.pos) : null;
    if (source) {
      pushOverride(source.student.id, plan.room.id, bench, pos);
    } else if (target) {
      pushOverride(target.student.id, selSeat.roomId, selSeat.bench, selSeat.pos);
    }
    setSelSeat(null);
  };

  const undoOverride = () => updateCfg((c) => ({ ...c, overrides: c.overrides.slice(0, -1) }));
  const clearOverrides = () => {
    if (cfg.overrides.length && !confirm('হাতে করা সব সিট পরিবর্তন মুছে ফেলবেন?')) return;
    updateCfg((c) => ({ ...c, overrides: [] }));
    setSelSeat(null);
    setSelUnalloc(null);
  };
  const clearRules = () => {
    if (!confirm('এই সিট প্ল্যানের সব ম্যানুয়াল নিয়ম মুছে সম্পূর্ণ অটো করবেন?')) return;
    updateCfg((c) => ({ ...c, rules: [], overrides: [] }));
  };

  // ---------------- অটো ----------------
  const setAutoMode = (mode: AutoSeatMode) => updateCfg((c) => ({ ...c, autoMode: mode, seed: (c.seed || 1) + 1, overrides: [] }));
  const reshuffle = () => updateCfg((c) => ({ ...c, autoMode: 'shuffle', seed: (c.seed || 1) + 7, overrides: [] }));

  // ---------------- রেন্ডার সহায়ক ----------------
  const columnsOf = (plan: RoomPlan) => {
    const cols = new Map<number, typeof plan.benches>();
    plan.benches.forEach((b) => {
      const c = b.benchColumn || 1;
      if (!cols.has(c)) cols.set(c, []);
      cols.get(c)!.push(b);
    });
    return Array.from(cols.entries()).sort((a, b) => a[0] - b[0]);
  };

  const unallocated = variant.unallocatedStudents;
  const overflowReports = reports.filter((r) => r.overflow > 0 || r.message);
  const rulesCount = cfg.rules.reduce((n, r) => n + r.segments.length, 0);

  return (
    <div className="space-y-5">
      {/* হেডার ও ভ্যারিয়েন্ট নির্বাচন */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              সিট নিয়ম ও সিট পরিবর্তন (ম্যানুয়াল + অটো)
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              প্রতিটি শিফটের (সকাল / বিকাল) আলাদা সিট প্ল্যান। কক্ষের বেঞ্চের ১ম / ২য় আসনে কোন শ্রেণী-শাখার কোন রোল থেকে কোন রোল
              (উল্টো দিকেও) বসবে তা ঠিক করুন; বাকিরা অটো বসবে। চাইলে আসনে ক্লিক করে একজনকে অন্য আসনে সরানো বা অদল-বদল করা যায়।
            </p>
          </div>
          <button
            onClick={onProceedToPreview}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            সিট প্ল্যান প্রিভিউ দেখুন
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                setSelectedVariantKey(v.key);
                setSelSeat(null);
                setSelUnalloc(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all text-left ${
                v.key === variant.key
                  ? v.session === 'morning'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>{v.label}</div>
              <div className="text-[10px] font-medium opacity-90">
                {v.totalStudents} জন · {v.periodIds.length} টি পরীক্ষা-বেলা
              </div>
            </button>
          ))}
        </div>

        {/* অটো / ম্যানুয়াল টুলবার */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700">অটো অংশের ক্রম:</span>
          {(
            [
              ['roll', 'রোল সিরিয়াল'],
              ['reverse', 'উল্টো রোল'],
              ['shuffle', 'এলোমেলো'],
            ] as [AutoSeatMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setAutoMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                (cfg.autoMode || 'roll') === m
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={reshuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-800 border border-violet-300 hover:bg-violet-100"
            title="নতুন করে এলোমেলো করে অটো সাজান"
          >
            <Shuffle className="w-3.5 h-3.5" />
            অটো সিট পরিবর্তন
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={undoOverride}
              disabled={!cfg.overrides.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" />
              শেষ পরিবর্তন ফিরান
            </button>
            <button
              onClick={clearOverrides}
              disabled={!cfg.overrides.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-900 disabled:opacity-40"
            >
              <Hand className="w-3.5 h-3.5" />
              হাতে করা পরিবর্তন মুছুন ({cfg.overrides.length})
            </button>
            <button
              onClick={clearRules}
              disabled={!rulesCount && !cfg.overrides.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-300 text-rose-800 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              সব নিয়ম মুছে অটো
            </button>
            {variants.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value=""
                  onChange={(e) => e.target.value && copyRulesFrom(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">নিয়ম কপি করুন…</option>
                  {variants
                    .filter((v) => v.key !== variant.key)
                    .map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label} থেকে
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {(unallocated.length > 0 || overflowReports.length > 0) && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {unallocated.length > 0 && (
                <div>
                  <strong>{unallocated.length} জন</strong> শিক্ষার্থীর আসন হয়নি — কক্ষ/বেঞ্চ বাড়ান অথবা নিচে "অবণ্টিত" থেকে বেছে খালি আসনে বসান।
                </div>
              )}
              {overflowReports.slice(0, 4).map((r) => {
                const room = rooms.find((x) => x.id === r.roomId);
                return (
                  <div key={r.segmentId}>
                    {room?.name}: {r.message}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* কক্ষ নির্বাচন */}
      <div className="flex flex-wrap gap-2">
        {variant.roomPlans.map((p) => {
          const rule = cfg.rules.find((r) => r.roomId === p.room.id);
          const active = p.room.id === activeRoomId;
          return (
            <button
              key={p.room.id}
              onClick={() => {
                setRoomId(p.room.id);
                setSelSeat(null);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold border text-left ${
                active ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>{p.room.name}</div>
              <div className="text-[10px] font-medium opacity-80">
                {p.allocatedCount}/{p.totalSeats} আসন{rule?.segments.length ? ` · ${rule.segments.length} নিয়ম` : ''}
              </div>
            </button>
          );
        })}
      </div>

      {roomPlan && (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* নিয়ম সম্পাদনা */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{roomPlan.room.name} — ম্যানুয়াল বসানোর নিয়ম</h3>
              <button
                onClick={() => addSegment(roomPlan.room.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                নিয়ম যোগ
              </button>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed">
              উদাহরণ: আসন-১ → <strong>ষষ্ঠ / পদ্মা / ১ থেকে ৩০</strong> এবং আসন-২ → <strong>অষ্টম / তিতাস / ৮৫ থেকে ৫৫</strong>{' '}
              (বড় থেকে ছোট লিখলে উল্টো দিক থেকে বসবে)।
            </div>

            {ruleFor(roomPlan.room.id).segments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                এই কক্ষে কোনো ম্যানুয়াল নিয়ম নেই — পুরো কক্ষ অটো বসানো হচ্ছে।
              </div>
            ) : (
              <div className="space-y-2.5">
                {ruleFor(roomPlan.room.id).segments.map((seg) => {
                  const rep = reports.find((r) => r.segmentId === seg.id);
                  const descending =
                    seg.fromRoll !== '' && seg.toRoll !== '' && Number(seg.fromRoll) > Number(seg.toRoll);
                  const secs = sectionsOf(seg.className);
                  return (
                    <div key={seg.id} className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] font-bold text-slate-600">
                          আসন (ট্র্যাক)
                          <select
                            value={seg.track}
                            onChange={(e) => patchSegment(roomPlan.room.id, seg.id, { track: Number(e.target.value) })}
                            className="mt-0.5 w-full text-xs px-1.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                          >
                            {Array.from({ length: roomCapacityTracks(roomPlan.room) }, (_, i) => i + 1).map((t) => (
                              <option key={t} value={t}>
                                আসন {t}
                                {t === 1 ? ' (বাম)' : t === 2 ? ' (ডান)' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[10px] font-bold text-slate-600">
                          শ্রেণী
                          <select
                            value={seg.className}
                            onChange={(e) => {
                              const cls = e.target.value;
                              const sec = sectionsOf(cls)[0] || '';
                              const b = rollBounds(cls, sec);
                              patchSegment(roomPlan.room.id, seg.id, {
                                className: cls,
                                section: sec,
                                fromRoll: b ? b[0] : '',
                                toRoll: b ? b[1] : '',
                              });
                            }}
                            className="mt-0.5 w-full text-xs px-1.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                          >
                            {[...variant.classes].sort(compareClassNames).map((c) => (
                              <option key={c} value={c}>
                                {shortClass(c)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[10px] font-bold text-slate-600">
                          শাখা
                          <select
                            value={seg.section}
                            onChange={(e) => {
                              const sec = e.target.value;
                              const b = rollBounds(seg.className, sec);
                              patchSegment(roomPlan.room.id, seg.id, {
                                section: sec,
                                fromRoll: b ? b[0] : seg.fromRoll,
                                toRoll: b ? b[1] : seg.toRoll,
                              });
                            }}
                            className="mt-0.5 w-full text-xs px-1.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                          >
                            <option value="">সব শাখা</option>
                            {secs.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="text-[10px] font-bold text-slate-600 flex-1">
                          রোল থেকে
                          <input
                            type="number"
                            value={seg.fromRoll}
                            onChange={(e) =>
                              patchSegment(roomPlan.room.id, seg.id, {
                                fromRoll: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="mt-0.5 w-full text-xs px-2 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold"
                          />
                        </label>
                        <button
                          onClick={() => swapDirection(roomPlan.room.id, seg)}
                          className="p-2 mb-0.5 rounded border border-slate-300 bg-white hover:bg-indigo-50 text-indigo-700"
                          title="দিক উল্টান (থেকে ↔ পর্যন্ত)"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                        <label className="text-[10px] font-bold text-slate-600 flex-1">
                          রোল পর্যন্ত
                          <input
                            type="number"
                            value={seg.toRoll}
                            onChange={(e) =>
                              patchSegment(roomPlan.room.id, seg.id, {
                                toRoll: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="mt-0.5 w-full text-xs px-2 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold"
                          />
                        </label>
                        <button
                          onClick={() => removeSegment(roomPlan.room.id, seg.id)}
                          className="p-2 mb-0.5 rounded border border-rose-200 bg-white hover:bg-rose-50 text-rose-600"
                          title="নিয়ম মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                        <button
                          onClick={() => fillWholeSection(roomPlan.room.id, seg)}
                          className="text-indigo-700 font-bold hover:underline"
                        >
                          পুরো শাখার রোল বসান
                        </button>
                        <div className="flex items-center gap-1.5">
                          {descending && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-bold">উল্টো দিক</span>
                          )}
                          {rep && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                rep.overflow > 0 || rep.matched === 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {rep.placed}/{rep.matched} জন বসেছে
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={ruleFor(roomPlan.room.id).autoFillRest}
                onChange={(e) =>
                  updateRule(roomPlan.room.id, (r) => ({ ...r, autoFillRest: e.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                <strong>বাকি খালি আসনে অটো শিক্ষার্থী বসান</strong>
                <span className="block text-[10px] text-slate-500">
                  বন্ধ রাখলে এই কক্ষে শুধু উপরের নিয়মের শিক্ষার্থীরাই বসবে।
                </span>
              </span>
            </label>
          </div>

          {/* আসন মানচিত্র (ক্লিকে অদল-বদল) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-800">{roomPlan.room.name} — আসন মানচিত্র</h3>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded border-2 border-sky-500 bg-white font-bold text-sky-800">নিয়মে</span>
                <span className="px-1.5 py-0.5 rounded border-2 border-amber-500 bg-white font-bold text-amber-800">হাতে পরিবর্তিত</span>
                <span className="px-1.5 py-0.5 rounded border border-slate-300 bg-white font-bold text-slate-600">অটো</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5" />
              একটি আসনে ক্লিক করে অন্য আসনে ক্লিক করুন — খালি হলে সরবে, ভরা থাকলে অদল-বদল হবে।
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {columnsOf(roomPlan).map(([colIdx, benches]) => (
                <div key={colIdx} className="min-w-[170px] flex-1 space-y-1.5">
                  <div className="text-center text-[10px] font-bold text-slate-500 bg-slate-100 rounded py-1">
                    সারি {colIdx}
                  </div>
                  {benches.map((b) => (
                    <div key={b.benchNumber} className="flex items-stretch gap-1">
                      <div className="w-7 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-500 bg-slate-100 rounded">
                        {b.benchNumber}
                      </div>
                      {b.seats.map((seat, i) => {
                        const pos = i + 1;
                        const selected =
                          selSeat &&
                          selSeat.roomId === roomPlan.room.id &&
                          selSeat.bench === b.benchNumber &&
                          selSeat.pos === pos;
                        const tone = seat ? classTone.get(normalizeClassName(seat.student.className)) : '';
                        const border =
                          seat?.source === 'manual'
                            ? 'border-2 border-amber-500'
                            : seat?.source === 'rule'
                            ? 'border-2 border-sky-500'
                            : 'border border-slate-300';
                        return (
                          <button
                            key={pos}
                            onClick={() => onSeatClick(roomPlan, b.benchNumber, pos)}
                            title={seat ? `${seat.student.name} (${seat.student.className}-${seat.student.section}, রোল ${seat.student.roll})` : 'খালি আসন'}
                            className={`flex-1 min-w-0 px-1 py-1 rounded text-left leading-tight transition-all ${
                              seat ? `${tone} ${border}` : 'bg-white border border-dashed border-slate-300 text-slate-300'
                            } ${selected ? 'ring-2 ring-offset-1 ring-indigo-600 scale-[1.03]' : 'hover:brightness-95'}`}
                          >
                            {seat ? (
                              <>
                                <div className="text-[10px] font-black truncate">
                                  {shortClass(seat.student.className)} · {seat.student.section}
                                </div>
                                <div className="text-[11px] font-mono font-bold">রোল {seat.student.roll}</div>
                              </>
                            ) : (
                              <div className="text-[10px] text-center py-1.5">খালি</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {unallocated.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  অবণ্টিত শিক্ষার্থী ({unallocated.length} জন) — বেছে নিয়ে খালি আসনে ক্লিক করুন:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {unallocated.slice(0, 80).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelSeat(null);
                        setSelUnalloc(selUnalloc === u.id ? null : u.id);
                      }}
                      className={`px-2 py-1 rounded border text-[10px] font-bold ${
                        selUnalloc === u.id
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {shortClass(u.className)}·{u.section}·{u.roll}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

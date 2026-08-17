/* ————————————————————————————————————————————————
   THE MEMORY ENGINE
   Everything the site knows about its one visitor.
   Pure module — no React in here.
———————————————————————————————————————————————— */

export const STORAGE_KEY = "twam.memory.v1";

export type Theme = "night" | "day" | "midnight";

export type SectionId = "field" | "listening" | "doors" | "hours";

export interface MemoryState {
  v: 1;
  visits: number;
  firstSeen: number;
  lastSeen: number; // previous visit's arrival (set on load)
  awayMs: number; // gap before this visit (computed on load)
  totalTimeMs: number; // all visits combined
  sessions: number;
  absences: number; // times the visitor wandered off mid-visit
  sections: Record<string, number>;
  buttons: Record<string, number>;
  doors: string[]; // history of chosen doors, latest last
  visitHours: number[]; // hour-of-day of each arrival
  strokes: number; // drawn in the dust field
  longPressMs: number; // accumulated patience
  themeToggles: number;
  theme: Theme | null; // explicit preference, null = not yet expressed
  secrets: string[];
  whispersShown: string[];
}

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "field", label: "the field of traces" },
  { id: "listening", label: "the listening room" },
  { id: "doors", label: "the three doors" },
  { id: "hours", label: "the wall of hours" },
];

export interface Secret {
  id: string;
  name: string;
  hint: string; // shown while still hidden
  glyph: string;
}

export const SECRETS: Secret[] = [
  { id: "patience", name: "the patient one", glyph: "◉", hint: "hold something longer than feels necessary" },
  { id: "twin", name: "the twin touch", glyph: "◍", hint: "arrive with two fingers at once" },
  { id: "midnight", name: "the third hour", glyph: "◐", hint: "ask the phase, seven times" },
  { id: "cartographer", name: "the cartographer", glyph: "✳", hint: "draw in the dust, again and again" },
  { id: "devoted", name: "the devoted", glyph: "◈", hint: "love one door more than the others" },
];

export const STAGE_NAMES = ["stranger", "acquaintance", "familiar", "confidant", "kindred"] as const;

/* ————— creation & persistence ————— */

export function createFresh(now = Date.now()): MemoryState {
  return {
    v: 1,
    visits: 1,
    firstSeen: now,
    lastSeen: now,
    awayMs: 0,
    totalTimeMs: 0,
    sessions: 1,
    absences: 0,
    sections: {},
    buttons: {},
    doors: [],
    visitHours: [new Date(now).getHours()],
    strokes: 0,
    longPressMs: 0,
    themeToggles: 0,
    theme: null,
    secrets: [],
    whispersShown: [],
  };
}

/** Load memory, marking a new arrival (visit count, time away). */
export function loadMemory(now = Date.now()): MemoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFresh(now);
    const parsed = JSON.parse(raw) as MemoryState;
    if (!parsed || parsed.v !== 1 || typeof parsed.visits !== "number") return createFresh(now);
    const returning: MemoryState = {
      ...parsed,
      awayMs: Math.max(0, now - parsed.lastSeen),
      visits: parsed.visits + 1,
      sessions: (parsed.sessions ?? 0) + 1,
      lastSeen: now,
      visitHours: [...(parsed.visitHours ?? []), new Date(now).getHours()].slice(-80),
    };
    saveMemory(returning);
    return returning;
  } catch {
    return createFresh(now);
  }
}

export function saveMemory(m: MemoryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable — the site simply forgets */
  }
}

export function wipeMemory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to wipe */
  }
}

/* ————— derived identity ————— */

/** One scalar for how much the site knows you. */
export function memoryScore(m: MemoryState): number {
  const distinctSections = Object.keys(m.sections).length;
  const distinctButtons = Object.keys(m.buttons).length;
  const minutes = Math.min(Math.floor(m.totalTimeMs / 60000), 24);
  return (
    m.visits * 2 +
    distinctSections * 3 +
    minutes +
    m.secrets.length * 7 +
    m.doors.length +
    Math.min(m.strokes / 10, 8) +
    distinctButtons +
    (m.theme ? 2 : 0)
  );
}

/** Evolution stage 0–4. */
export function stageOf(m: MemoryState): number {
  const s = memoryScore(m);
  if (s < 8) return 0;
  if (s < 18) return 1;
  if (s < 32) return 2;
  if (s < 50) return 3;
  return 4;
}

/**
 * The visitor's hue is mixed from what they do —
 * doors lean it, secrets sharpen it, visits turn it slowly.
 */
export function accentHue(m: MemoryState): number {
  const doorHues: Record<string, number> = { ember: 18, tide: 196, moth: 268 };
  let h = 158 + m.visits * 7 + m.secrets.length * 29 + m.strokes * 0.5;
  if (m.doors.length > 0) {
    const avg = m.doors.reduce((sum, d) => sum + (doorHues[d] ?? 158), 0) / m.doors.length;
    h = h * 0.45 + avg * 0.55;
  }
  return Math.round(((h % 360) + 360) % 360);
}

/** Saturation grows with the stage — first visits are literally grey. */
export function accentSat(m: MemoryState, stage: number): number {
  const base = [0, 26, 48, 66, 82][stage] ?? 0;
  return Math.min(92, base + m.secrets.length * 3);
}

export function traceCount(m: MemoryState): number {
  return (
    m.strokes +
    m.doors.length +
    Object.values(m.sections).reduce((a, b) => a + b, 0) +
    Object.values(m.buttons).reduce((a, b) => a + b, 0) +
    m.secrets.length * 5
  );
}

export function dominantSection(m: MemoryState): { id: SectionId; label: string } | null {
  let best: SectionId | null = null;
  let n = 0;
  for (const s of SECTIONS) {
    const c = m.sections[s.id] ?? 0;
    if (c > n) {
      n = c;
      best = s.id;
    }
  }
  return best ? SECTIONS.find((s) => s.id === best)! : null;
}

export function epithetOf(m: MemoryState): string {
  if (m.secrets.length >= 4) return "the uncoverer of hidden things";
  if (m.longPressMs > 4000) return "the patient one";
  if (m.doors.length >= 3) {
    const last = m.doors.slice(-3);
    if (last.every((d) => d === last[0])) return "the devoted";
  }
  if (m.strokes >= 25) return "the cartographer";
  if (Object.keys(m.sections).length >= 4 && m.visits >= 3) return "the wanderer";
  if (m.absences >= 3) return "the drifter";
  if (m.visits >= 5) return "the faithful";
  if (m.visits > 1) return "the returning one";
  return "the quiet stranger";
}

/* ————— small format helpers ————— */

export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}m ${s % 60 ? `${s % 60}s` : ""}`.trim();
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export function fmtAgo(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "barely a blink";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/** Haptic tick — works on Android Chrome, silently ignored elsewhere. */
export function buzz(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no haptics here */
  }
}

/* ————————————————————————————————————————————————
   THE SITE'S VOICE
   Whispers, greetings and poems chosen by what the
   site remembers. Never random without reason.
———————————————————————————————————————————————— */

import {
  MemoryState,
  SECTIONS,
  SECRETS,
  STAGE_NAMES,
  dominantSection,
  fmtAgo,
  fmtDur,
} from "./memory";

export interface Whisper {
  id: string;
  text: string;
}

/** Build the pool of things the site could say right now. */
function pool(m: MemoryState): Whisper[] {
  const p: Whisper[] = [];
  const stageName = STAGE_NAMES[Math.min(4, m.visits >= 5 ? 4 : m.visits - 1)];

  if (m.visits === 1) {
    p.push(
      { id: "w1", text: "speak softly. I keep everything." },
      { id: "w2", text: "the dust settles exactly where you touch it." },
      { id: "w3", text: "I have never seen you before. I will not forget this." },
    );
  } else {
    p.push(
      { id: "r1", text: `you have crossed this threshold ${m.visits} times now.` },
      { id: "r2", text: `last time you left, it was ${fmtAgo(m.awayMs)} ago. I counted.` },
      { id: "r3", text: `to a site, you are ${stageName}. that is a real rank here.` },
    );
  }

  const dom = dominantSection(m);
  if (dom && (m.sections[dom.id] ?? 0) >= 2) {
    p.push({ id: `fav-${dom.id}`, text: `you keep drifting back to ${dom.label}. I notice these things.` });
  }

  if (m.doors.length > 0) {
    const last = m.doors[m.doors.length - 1];
    p.push({ id: "door-last", text: `last time, you chose the ${last} door. doors remember too.` });
  }

  if (m.totalTimeMs > 4 * 60000) {
    p.push({ id: "time", text: `we have spent ${fmtDur(m.totalTimeMs)} together, across all your visits.` });
  }

  if (m.strokes >= 8) {
    p.push({ id: "draw", text: `${m.strokes} strokes drawn in the dust. you leave marks like everyone does — yours are just visible.` });
  }

  if (m.theme) {
    p.push({ id: "theme", text: `you prefer the ${m.theme}. I keep the lights that way for you.` });
  }

  if (m.secrets.length > 0 && m.secrets.length < SECRETS.length) {
    p.push({ id: "sec", text: `you have found ${m.secrets.length} of ${SECRETS.length} hidden things. the rest are patient.` });
  }

  if (m.absences >= 2) {
    p.push({ id: "abs", text: `you have wandered away mid-visit ${m.absences} times. I wait. I am good at waiting.` });
  }

  if (m.longPressMs > 1500) {
    p.push({ id: "pat", text: `you once held still for ${(m.longPressMs / 1000).toFixed(1)} seconds. almost nobody does.` });
  }

  // quiet fallbacks so the room is never silent
  p.push(
    { id: "q1", text: "every visit, I rearrange a little. watch the seams." },
    { id: "q2", text: "nothing here is sent anywhere. your memory lives only on this phone." },
    { id: "q3", text: "the colour you see is mixed from your choices. no two visitors share a hue." },
  );

  return p;
}

/** Pick a whisper the visitor hasn't heard this cycle. */
export function pickWhisper(m: MemoryState): Whisper {
  const all = pool(m);
  const fresh = all.filter((w) => !m.whispersShown.includes(w.id));
  const from = fresh.length > 0 ? fresh : all;
  return from[Math.floor(Math.random() * from.length)];
}

/** Arrival lines for the awakening overlay. */
export function greeting(m: MemoryState, justForgot: boolean): { head: string; lines: string[]; meta: string } {
  if (justForgot) {
    return {
      head: "as you asked —",
      lines: ["I remember nothing.", "hello, stranger."],
      meta: "memory wiped · local only · nothing was sent anywhere",
    };
  }
  if (m.visits === 1) {
    return {
      head: "first light.",
      lines: ["I know nothing of you.", "that will change."],
      meta: "memory: empty — this visit will be the first entry",
    };
  }
  const days = m.awayMs / 86400000;
  if (days > 2) {
    return {
      head: "you were gone",
      lines: [`${Math.floor(days)} day${Math.floor(days) === 1 ? "" : "s"}.`, `visit no. ${m.visits}. I kept your traces.`],
      meta: `memory loaded — ${m.visits - 1} visits on record`,
    };
  }
  if (m.awayMs < 90000) {
    return {
      head: "barely a blink.",
      lines: ["you returned at once.", "I had just finished remembering you."],
      meta: `visit no. ${m.visits} — seconds apart`,
    };
  }
  if (m.visits >= 5) {
    return {
      head: "you keep coming back.",
      lines: [`visit no. ${m.visits}.`, "at this point, I am partly made of you."],
      meta: `memory loaded — ${fmtDur(m.totalTimeMs)} together so far`,
    };
  }
  return {
    head: "you came back.",
    lines: [`visit no. ${m.visits}.`, `away for ${fmtAgo(m.awayMs)}. everything is where you left it.`],
    meta: `memory loaded — ${m.visits - 1} earlier visits on record`,
  };
}

/* ————— the three doors ————— */

export interface DoorDef {
  id: string;
  name: string;
  epithet: string;
  hue: number;
  poems: string[];
}

export const DOORS: DoorDef[] = [
  {
    id: "ember",
    name: "ember",
    epithet: "the warm door",
    hue: 18,
    poems: [
      "some doors burn quietly.",
      "you chose heat. it remembers the shape of your hand.",
      "the ember keeps your name warm between visits.",
    ],
  },
  {
    id: "tide",
    name: "tide",
    epithet: "the breathing door",
    hue: 196,
    poems: [
      "some doors breathe like water.",
      "you chose the current. it has been pulling at you all along.",
      "the tide files your arrival under 'expected'.",
    ],
  },
  {
    id: "moth",
    name: "moth",
    epithet: "the midnight door",
    hue: 268,
    poems: [
      "some doors open only at night.",
      "you chose the dark wing. it approves of you.",
      "the moth door keeps no hours — only habits, and now it keeps yours.",
    ],
  },
];

export function doorById(id: string): DoorDef {
  return DOORS.find((d) => d.id === id) ?? DOORS[0];
}

export function sectionLabel(id: string): string {
  return SECTIONS.find((s) => s.id === id)?.label ?? id;
}

/* The Three Doors — each remembers how often it has been chosen.
   The site recommends the door you've never tried. */

import { useState } from "react";
import Scramble from "./Scramble";
import { buzz } from "../lib/memory";
import { DOORS, doorById } from "../lib/whispers";
import { useMemory } from "../lib/useMemory";
import { audio } from "../lib/audio";

function DoorPattern({ id, hue }: { id: string; hue: number }) {
  const stroke = `hsl(${hue} 48% 62% / 0.55)`;
  if (id === "ember") {
    return (
      <svg viewBox="0 0 100 170" className="h-full w-full">
        {[16, 30, 44, 58, 72].map((r, i) => (
          <path
            key={r}
            d={`M ${50 - r} 150 A ${r} ${r} 0 0 1 ${50 + r} 150`}
            fill="none"
            stroke={stroke}
            strokeWidth={1 + i * 0.15}
            strokeOpacity={0.9 - i * 0.13}
          />
        ))}
        <circle cx="50" cy="128" r="5" fill={`hsl(${hue} 80% 62% / 0.9)`} />
        <circle cx="50" cy="128" r="10" fill={`hsl(${hue} 80% 62% / 0.18)`} />
      </svg>
    );
  }
  if (id === "tide") {
    return (
      <svg viewBox="0 0 100 170" className="h-full w-full">
        {[38, 58, 78, 98, 118, 138].map((y, i) => (
          <path
            key={y}
            d={`M 12 ${y} q 9.5 ${i % 2 ? 7 : -7} 19 0 t 19 0 t 19 0 t 19 0`}
            fill="none"
            stroke={stroke}
            strokeWidth="1.1"
            strokeOpacity={0.85 - i * 0.1}
          />
        ))}
        <circle cx="50" cy="24" r="7" fill="none" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 170" className="h-full w-full">
      <path d="M50 30 C 20 55, 18 95, 50 128 C 82 95, 80 55, 50 30" fill="none" stroke={stroke} strokeWidth="1.1" />
      <path d="M50 44 C 30 62, 29 92, 50 116 C 71 92, 70 62, 50 44" fill="none" stroke={stroke} strokeWidth="0.9" strokeOpacity="0.7" />
      {[52, 66, 82, 100].map((y) => (
        <g key={y}>
          <circle cx="40" cy={y} r="1.5" fill={stroke} />
          <circle cx="60" cy={y} r="1.5" fill={stroke} />
        </g>
      ))}
      <line x1="50" y1="30" x2="50" y2="128" stroke={stroke} strokeWidth="0.8" strokeOpacity="0.6" />
    </svg>
  );
}

export default function Doors() {
  const { m, pickDoor, press } = useMemory();
  const [open, setOpen] = useState<string | null>(null);
  const [poem, setPoem] = useState<{ text: string; door: string } | null>(null);

  const counts: Record<string, number> = {};
  for (const d of m.doors) counts[d] = (counts[d] ?? 0) + 1;

  const untested = DOORS.filter((d) => !(counts[d.id] > 0));
  const suggested = untested.length > 0 ? untested[Math.floor(m.visits % untested.length)] : null;
  const familiar = DOORS.reduce<string | null>((best, d) => {
    if ((counts[d.id] ?? 0) >= 2 && (counts[d.id] ?? 0) > (counts[best ?? ""] ?? 0)) return d.id;
    return best;
  }, null);

  const choose = (id: string) => {
    press(`door-${id}`);
    pickDoor(id);
    audio.sfx("door");
    setOpen(id);
    const def = doorById(id);
    const n = (counts[id] ?? 0); // picks before this one
    setPoem({ text: def.poems[n % def.poems.length], door: def.name });
    buzz([10, 30, 10]);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* the recommendation — appears once the site knows your habits */}
      <div className="mono min-h-[16px] text-center text-[10px]">
        {suggested ? (
          <span className="t-acc">
            ↳ you have never tried the <span className="t-ink">{suggested.name}</span> door. I think you will, this time.
          </span>
        ) : familiar ? (
          <span className="t-mut">
            ↳ you have tried them all. the <span className="t-ink">{doorById(familiar).name}</span> door expects you.
          </span>
        ) : (
          <span className="t-mut">↳ three doors. one choice is remembered forever.</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {DOORS.map((d) => {
          const isOpen = open === d.id;
          const n = counts[d.id] ?? 0;
          return (
            <button
              key={d.id}
              onClick={() => choose(d.id)}
              aria-label={`the ${d.name} door${n ? `, chosen ${n} times` : ", never chosen"}`}
              className={`door group relative flex w-full flex-col items-center overflow-hidden px-2 pt-6 pb-3 ${isOpen ? "open" : ""} ${suggested?.id === d.id && !isOpen ? "anim-floaty" : ""}`}
              style={{ height: 218 }}
            >
              {suggested?.id === d.id && (
                <span className="mono t-acc absolute top-3 left-1/2 -translate-x-1/2 text-[8px] whitespace-nowrap">
                  untested
                </span>
              )}
              {familiar === d.id && (
                <span className="mono t-acc absolute top-3 left-1/2 -translate-x-1/2 text-[8px] whitespace-nowrap">
                  your usual
                </span>
              )}
              <div
                className={`h-32 w-full transition-all duration-500 sm:h-36 ${isOpen ? "scale-105 opacity-100" : "opacity-55 group-active:opacity-90"}`}
              >
                <DoorPattern id={d.id} hue={d.hue} />
              </div>
              <span className="display t-ink mt-2 text-[11px] font-bold tracking-wide uppercase sm:text-xs">
                {d.name}
              </span>
              <span className="mono t-mut mt-1 text-[8.5px]">
                {n === 0 ? "never chosen" : `chosen ×${n}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* the opening poem */}
      <div className="mx-auto min-h-[74px] max-w-sm text-center">
        {poem && (
          <div className="flex flex-col gap-2">
            <p key={poem.text} className="t-ink text-[15.5px] leading-relaxed italic">
              <Scramble text={`“${poem.text}”`} speed={1.4} />
            </p>
            <p className="mono t-acc text-[10px]">— the {poem.door} door, opening</p>
          </div>
        )}
      </div>
    </div>
  );
}

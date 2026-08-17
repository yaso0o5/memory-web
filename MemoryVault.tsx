/* The Memory Vault — everything the site knows, laid bare.
   Includes the hold-to-erase "Forget Me" ritual. */

import { useRef, useState } from "react";
import {
  SECTIONS,
  SECRETS,
  STAGE_NAMES,
  buzz,
  epithetOf,
  fmtAgo,
  fmtDur,
  memoryScore,
  traceCount,
} from "../lib/memory";
import { useMemory } from "../lib/useMemory";

interface Props {
  open: boolean;
  onClose: () => void;
  onForgot: () => void;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-raise bd-line flex flex-col gap-1 rounded-lg border p-4">
      <span className="display t-ink text-2xl leading-none font-bold">{value}</span>
      <span className="mono t-mut text-[9px]">{label}</span>
    </div>
  );
}

export default function MemoryVault({ open, onClose, onForgot }: Props) {
  const { m, stage, hue, sat, forget, press } = useMemory();
  const [forgetting, setForgetting] = useState(false);
  const [gone, setGone] = useState(false);
  const [wiggling, setWiggling] = useState<string | null>(null);
  const forgetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startForget = () => {
    if (gone) return;
    setForgetting(true);
    buzz(6);
    forgetTimer.current = setTimeout(() => {
      buzz([20, 60, 30]);
      forget();
      setForgetting(false);
      setGone(true);
      setTimeout(() => {
        setGone(false);
        onForgot();
      }, 1600);
    }, 1600);
  };

  const stopForget = () => {
    if (forgetTimer.current) clearTimeout(forgetTimer.current);
    setForgetting(false);
  };

  const maxSection = Math.max(1, ...SECTIONS.map((s) => m.sections[s.id] ?? 0));
  const doorCounts = m.doors.reduce<Record<string, number>>((acc, d) => {
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const traces = traceCount(m);

  return (
    <div
      className={`vault ${open ? "vault-open" : "pointer-events-none"} bg-app fixed inset-0 z-50 flex flex-col`}
      aria-hidden={!open}
      role="dialog"
      aria-label="what the site remembers"
    >
      {/* header */}
      <div
        className="bd-line flex items-center justify-between border-b px-5 py-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <p className="mono t-acc text-[10px]">the memory vault</p>
        <button
          onClick={() => {
            press("vault-close");
            onClose();
          }}
          aria-label="close the vault"
          className="bd-line t-ink grid h-11 w-11 place-items-center rounded-full border text-lg transition-transform active:scale-90"
        >
          ×
        </button>
      </div>

      {/* scrollable ledger */}
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {gone ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
            <p className="display t-ink text-3xl font-black">…gone.</p>
            <p className="mono t-mut text-[11px]">every trace dissolved. hello, stranger.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10 py-8">
            {/* identity */}
            <div className="flex flex-col gap-3">
              <p className="mono t-mut text-[10px]">to this site, you are</p>
              <h2 className="display t-ink text-[9vw] leading-tight font-black sm:text-5xl">{epithetOf(m)}</h2>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-6 rounded-full transition-colors duration-700"
                      style={{ background: i <= stage ? "var(--acc)" : "var(--line)" }}
                    />
                  ))}
                </div>
                <p className="mono t-acc text-[10px]">
                  {STAGE_NAMES[stage]} · score {memoryScore(m)}
                </p>
              </div>
              <p className="t-mut max-w-md text-[13.5px] leading-relaxed">
                We met on {new Date(m.firstSeen).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.
                Since then: {m.visits} visit{m.visits === 1 ? "" : "s"}, {fmtDur(m.totalTimeMs)} together,
                {traces} traces of you on file.
              </p>
            </div>

            {/* grown colour */}
            <div className="bg-raise bd-line flex items-center gap-5 rounded-lg border p-5">
              <span
                className="h-14 w-14 shrink-0 rounded-full border"
                style={{
                  background: `conic-gradient(from 0deg, hsl(${hue} ${sat}% 60%), hsl(${(hue + 40) % 360} ${sat}% 55%), hsl(${hue} ${sat}% 60%))`,
                  borderColor: "var(--line)",
                }}
              />
              <div className="flex flex-col gap-1">
                <p className="mono t-ink text-[11px]">
                  your hue · {hue}° · {sat}% alive
                </p>
                <p className="t-mut text-[12.5px] leading-relaxed">
                  {sat < 5
                    ? "no colour yet — you haven't done enough. the site is still grey to you."
                    : "this colour is mixed from your doors, your secrets, your visits. no two visitors share a hue."}
                </p>
              </div>
            </div>

            {/* numbers */}
            <div>
              <p className="mono t-mut mb-3 text-[10px]">the ledger</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat value={String(m.visits)} label="visits" />
                <Stat value={fmtDur(m.totalTimeMs)} label="time together" />
                <Stat value={fmtAgo(m.awayMs)} label="away before this visit" />
                <Stat value={String(m.strokes)} label="strokes drawn" />
                <Stat value={`${(m.longPressMs / 1000).toFixed(1)}s`} label="patience, held" />
                <Stat value={String(m.absences)} label="mid-visit wanderings" />
              </div>
            </div>

            {/* section heat */}
            <div>
              <p className="mono t-mut mb-3 text-[10px]">where you drift</p>
              <div className="flex flex-col gap-2.5">
                {SECTIONS.map((s) => {
                  const n = m.sections[s.id] ?? 0;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="mono t-mut w-36 shrink-0 text-[9px]">{s.label}</span>
                      <div className="bg-raise h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(n / maxSection) * 100}%`, background: "var(--acc)" }}
                        />
                      </div>
                      <span className="mono t-ink w-6 text-right text-[10px]">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* doors */}
            <div>
              <p className="mono t-mut mb-3 text-[10px]">the doors you chose</p>
              <div className="flex flex-wrap gap-2">
                {m.doors.length === 0 ? (
                  <p className="t-mut text-[13px] italic">none yet. they wait in the dark below.</p>
                ) : (
                  ["ember", "tide", "moth"].map((d) => (
                    <span key={d} className="mono bd-line t-ink rounded-full border px-4 py-2 text-[10px]">
                      {d} ×{doorCounts[d] ?? 0}
                    </span>
                  ))
                )}
              </div>
              {m.theme && (
                <p className="mono t-mut mt-4 text-[10px]">
                  preferred light: <span className="t-acc">{m.theme}</span> · toggled {m.themeToggles}×
                </p>
              )}
            </div>

            {/* secrets */}
            <div>
              <p className="mono t-mut mb-3 text-[10px]">
                hidden things — {m.secrets.length}/{SECRETS.length} found
              </p>
              <div className="flex flex-col gap-2">
                {SECRETS.map((s) => {
                  const found = m.secrets.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (!found) {
                          setWiggling(s.id);
                          buzz(8);
                          setTimeout(() => setWiggling(null), 320);
                        }
                      }}
                      className={`bd-line flex items-center gap-4 rounded-lg border p-3.5 text-left transition-colors ${found ? "bg-raise" : "bg-app border-dashed"} ${wiggling === s.id ? "anim-wiggle" : ""}`}
                    >
                      <span
                        className={`display grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg ${found ? "t-acc" : "t-mut border-dashed"}`}
                        style={found ? { borderColor: "var(--acc-dim)", background: "var(--acc-soft)" } : undefined}
                      >
                        {found ? s.glyph : "?"}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className={`mono text-[10.5px] ${found ? "t-ink" : "t-mut"}`}>
                          {found ? s.name : "not yet found"}
                        </span>
                        <span className="t-mut text-[11.5px] italic">{found ? "remembered forever, or until you forget me." : s.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* forget me */}
            <div className="bd-line flex flex-col items-center gap-4 border-t pt-8">
              <p className="t-mut max-w-xs text-center text-[12.5px] leading-relaxed">
                If you leave, I keep you. If you ask, I let you go. Hold to erase everything —
                locally, completely, without backup.
              </p>
              <button
                onPointerDown={startForget}
                onPointerUp={stopForget}
                onPointerLeave={stopForget}
                onPointerCancel={stopForget}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="forget me — hold to erase all memory"
                className="relative grid h-32 w-32 place-items-center rounded-full"
                style={{ touchAction: "none" }}
              >
                <svg viewBox="0 0 44 44" className={`absolute inset-0 -rotate-90 ${forgetting ? "" : "opacity-25"}`}>
                  <circle cx="22" cy="22" r="20" fill="none" stroke="var(--line)" strokeWidth="1" />
                  {forgetting && (
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="#e05252"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="hold-arc hold-arc-slow"
                    />
                  )}
                </svg>
                <span
                  className="grid h-24 w-24 place-items-center rounded-full border transition-all"
                  style={{
                    borderColor: forgetting ? "#e05252" : "var(--line)",
                    color: forgetting ? "#e05252" : "var(--ink)",
                    transform: forgetting ? "scale(0.94)" : "scale(1)",
                  }}
                >
                  <span className="mono text-center text-[10px] leading-relaxed">
                    {forgetting ? "dissolving…" : "forget me"}
                  </span>
                </span>
              </button>
              <p className="mono t-mut text-[9px]">hold 1.6 seconds · no confirmation, by design</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

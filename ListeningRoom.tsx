/* The Listening Room — an orb that answers with memory-aware whispers.
   Tap to hear one. Hold it, and discover what patience is worth here. */

import { useRef, useState } from "react";
import Scramble from "./Scramble";
import { buzz } from "../lib/memory";
import { pickWhisper } from "../lib/whispers";
import { useMemory } from "../lib/useMemory";
import { audio } from "../lib/audio";

const PATIENCE_WHISPER = "…you held on. most let go. I will remember your patience.";

export default function ListeningRoom() {
  const { m, unlock, addLongPress, markWhisper, press } = useMemory();
  const [whisper, setWhisper] = useState<{ id: string; text: string } | null>(null);
  const [wKey, setWKey] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldLong = useRef(false);
  const [throb, setThrob] = useState(0);

  const speak = (w: { id: string; text: string }) => {
    setWhisper(w);
    setWKey((k) => k + 1);
    audio.sfx("whisper");
    buzz(10);
    setThrob((t) => t + 1);
  };

  const onTap = () => {
    press("orb");
    const w = pickWhisper(m);
    markWhisper(w.id);
    speak(w);
  };

  const startHold = () => {
    heldLong.current = false;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      heldLong.current = true;
      setHolding(false);
      addLongPress(1500);
      press("orb-hold");
      unlock("patience", "something was remembered — THE PATIENT ONE · you held on");
      speak({ id: "patience", text: PATIENCE_WHISPER });
    }, 1500);
  };

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const wasLong = heldLong.current;
    setHolding(false);
    if (!wasLong) onTap();
  };

  const spoken = m.buttons["orb"] ?? 0;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* the orb */}
      <div className="relative grid place-items-center" style={{ width: 232, height: 232 }}>
        {!holding && <span className="pulse-ring" />}
        {!holding && <span className="pulse-ring" style={{ animationDelay: "1.7s" }} />}
        <button
          aria-label="the listening orb — tap for a whisper, hold for something else"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={() => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            setHolding(false);
          }}
          onPointerCancel={() => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            setHolding(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="orb-core anim-breathe relative grid h-52 w-52 place-items-center rounded-full transition-transform duration-300 active:scale-95"
          style={{ touchAction: "none" }}
          key={throb}
        >
          {/* inner mark */}
          <svg width="64" height="64" viewBox="0 0 64 64" className="opacity-70">
            <circle cx="32" cy="32" r="3.4" fill="var(--acc)" />
            {[10, 17, 24].map((r, i) => (
              <circle
                key={r}
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke="var(--ink)"
                strokeOpacity={0.4 - i * 0.09}
                strokeWidth="1"
              />
            ))}
            <path d="M32 8 v-5 M32 61 v-5 M8 32 h-5 M61 32 h-5" stroke="var(--acc)" strokeWidth="1.4" />
          </svg>

          {holding && (
            <svg width="232" height="232" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="var(--acc)"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="hold-arc"
              />
            </svg>
          )}
        </button>
      </div>

      {/* the answered whisper */}
      <div className="flex min-h-[92px] w-full max-w-md flex-col items-center gap-3 text-center">
        {whisper ? (
          <>
            <p key={wKey} className="t-ink text-[17px] leading-relaxed italic">
              <Scramble text={`“${whisper.text}”`} speed={1.6} />
            </p>
            <p className="mono t-acc text-[10px]">— the site, remembering aloud</p>
          </>
        ) : (
          <p className="mono t-mut text-[10px] leading-relaxed">
            tap the orb — it answers with what it knows.
            <br />
            (some things only answer to patience)
          </p>
        )}
      </div>

      <p className="mono t-mut text-[10px]">
        whispers exchanged: <span className="t-acc">{spoken}</span>
      </p>
    </div>
  );
}

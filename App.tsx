/* ————————————————————————————————————————————————
   THE WEBSITE WITH A MEMORY
   An archive of one visitor. It watches, it keeps,
   it rearranges itself around your habits.
———————————————————————————————————————————————— */

import { useEffect, useMemo, useRef, useState } from "react";
import Awakening from "./components/Awakening";
import Doors from "./components/Doors";
import HoursDial from "./components/HoursDial";
import ListeningRoom from "./components/ListeningRoom";
import MemoryVault from "./components/MemoryVault";
import ParticleField from "./components/ParticleField";
import Reveal from "./components/Reveal";
import Sigil from "./components/Sigil";
import { MemoryProvider, useMemory } from "./lib/useMemory";
import { AudioProvider, useAudio } from "./lib/useAudio";
import { audio } from "./lib/audio";
import { STAGE_NAMES, buzz, fmtDur, traceCount } from "./lib/memory";
import { greeting } from "./lib/whispers";

const INK_RGB: Record<string, string> = {
  night: "231,236,231",
  day: "22,27,24",
  midnight: "223,227,232",
};

/* ————— small header icons, drawn by hand ————— */

const SunMoon = ({ theme }: { theme: string }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
    {theme === "day" ? (
      <>
        <circle cx="10" cy="10" r="3.6" />
        <path d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M4 4l1.6 1.6M14.4 14.4 16 16M16 4l-1.6 1.6M5.6 14.4 4 16" />
      </>
    ) : (
      <path d="M13.5 2.5a7.5 7.5 0 1 0 4 13.9A8.2 8.2 0 0 1 13.5 2.5Z" />
    )}
  </svg>
);

const Speaker = ({ on }: { on: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    className={on ? "anim-breathe" : ""}
  >
    <path d="M3 8h2.5L9 5v10l-3.5-3H3z" fill="currentColor" fillOpacity={on ? 0.9 : 0.45} stroke="none" />
    {on ? (
      <>
        <path d="M12 7.5a3.4 3.4 0 0 1 0 5" strokeLinecap="round" />
        <path d="M14 5.5a6 6 0 0 1 0 9" strokeLinecap="round" />
      </>
    ) : (
      <path d="M12 8l5 4 M17 8l-5 4" strokeLinecap="round" />
    )}
  </svg>
);

/* ————— section scaffolding ————— */

function SectionHead({ index, title, note }: { index: number; title: string; note: string }) {
  return (
    <Reveal className="mb-10">
      <div className="flex items-baseline gap-4">
        <span className="mono t-acc text-[11px]">0{index}</span>
        <h2 className="display t-ink text-[6.4vw] font-bold tracking-wide uppercase sm:text-3xl">{title}</h2>
      </div>
      <p className="mono t-mut mt-3 max-w-sm text-[10px] leading-relaxed">{note}</p>
      <div className="bg-raise2 mt-5 h-px w-full origin-left scale-x-100" />
    </Reveal>
  );
}

/* ————— the site itself ————— */

function Site() {
  const api = useMemory();
  const { m, stage, hue, sat, notice, dismissNotice } = api;
  const { enabled: soundOn, toggle: toggleSound } = useAudio();

  const [awake, setAwake] = useState(true);
  const [justForgot, setJustForgot] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultMounted, setVaultMounted] = useState(false);
  const glyphTaps = useRef<number[]>([]);
  const twinPointers = useRef<Set<number>>(new Set());
  const twinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const theme = m.theme ?? "night";
  const traces = traceCount(m);
  const say = useMemo(() => greeting(m, justForgot), [m, justForgot]);

  /* the field is always "visited" once the visitor is awake */
  useEffect(() => {
    if (!awake) api.trackSection("field");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awake]);

  /* the tab title starts to know you too */
  useEffect(() => {
    document.title = m.visits >= 3 ? "it remembers you — TWAM" : "The Website With a Memory";
  }, [m.visits]);

  /* ambient glow follows the finger (throttled to rAF) */
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty("--gx", `${(e.clientX / window.innerWidth) * 100}%`);
        document.documentElement.style.setProperty("--gy", `${(e.clientY / window.innerHeight) * 100}%`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* secret: the twin touch — two fingers anywhere, held together */
  useEffect(() => {
    const down = (e: PointerEvent) => {
      twinPointers.current.add(e.pointerId);
      if (twinPointers.current.size >= 2 && !m.secrets.includes("twin")) {
        if (twinTimer.current) clearTimeout(twinTimer.current);
        twinTimer.current = setTimeout(() => {
          api.unlock("twin", "something was remembered — THE TWIN TOUCH · you arrived with two fingers");
        }, 900);
      }
    };
    const up = (e: PointerEvent) => {
      twinPointers.current.delete(e.pointerId);
      if (twinPointers.current.size < 2 && twinTimer.current) clearTimeout(twinTimer.current);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [m.secrets, api]);

  /* secret: the third hour — tap the phase glyph seven times */
  const tapGlyph = () => {
    api.press("phase");
    if (m.secrets.includes("midnight")) {
      // already found: the glyph becomes a shortcut to the third hour
      api.setTheme(theme === "midnight" ? "night" : "midnight");
      buzz(10);
      return;
    }
    const now = Date.now();
    glyphTaps.current = [...glyphTaps.current.filter((t) => now - t < 12000), now];
    buzz(5);
    if (glyphTaps.current.length >= 7) {
      glyphTaps.current = [];
      api.unlock("midnight", "something was remembered — THE THIRD HOUR · a light that isn't on the switch");
      api.setTheme("midnight");
    }
  };

  /* rooms, reordered around your habits once the site knows them */
  const reordered = stage >= 2;
  const order = useMemo(() => {
    const ids = ["listening", "doors", "hours"] as const;
    if (!reordered) return [...ids];
    return [...ids].sort((a, b) => (m.sections[b] ?? 0) - (m.sections[a] ?? 0));
  }, [m.sections, reordered, stage]);

  const openVault = () => {
    api.press("vault");
    audio.sfx("open");
    setVaultMounted(true);
    requestAnimationFrame(() => setVaultOpen(true));
  };
  const closeVault = () => {
    audio.sfx("close");
    setVaultOpen(false);
  };
  const onForgot = () => {
    setVaultOpen(false);
    setJustForgot(true);
    setAwake(true);
  };

  const holdSigil = () => {
    api.addLongPress(1500);
    api.unlock("patience", "something was remembered — THE PATIENT ONE · you held the sigil");
  };

  const startExploring = () => {
    api.press("explore");
    audio.sfx("click");
    buzz(8);
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const roomNotes: Record<string, string> = {
    listening:
      m.visits === 1
        ? "it answers with whatever it knows — which, for you, is almost nothing yet."
        : `it has answered you ${m.buttons["orb"] ?? 0} times. its vocabulary grows with your file.`,
    doors:
      m.doors.length === 0
        ? "choose one. the choice is kept, weighed, and gently held against you."
        : `you have chosen ${m.doors.length} times. the doors have begun to expect you.`,
    hours:
      (m.visitHours?.length ?? 0) <= 1
        ? "a dial of your arrivals. one mark so far — the one you are making now."
        : `the dial remembers every hour you ever arrived. yours is a shape now.`,
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="glow-field" aria-hidden />

      {/* ————— header ————— */}
      <header
        className="bg-app-trans bd-line sticky top-0 z-40 flex items-center justify-between border-b px-3 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-1.5">
          <Sigil stage={stage} size={40} onHoldComplete={holdSigil} />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="display t-ink text-[9.5px] font-bold tracking-[0.18em]">THE WEBSITE</span>
            <span className="mono t-mut mt-1 text-[7.5px] tracking-[0.22em]">WITH A MEMORY</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* the phase glyph — secret door to midnight */}
          <button
            onClick={tapGlyph}
            aria-label="the phase"
            className={`grid h-10 w-10 place-items-center rounded-full text-[17px] transition-all active:scale-90 ${m.secrets.includes("midnight") ? "t-acc" : "t-mut"}`}
          >
            ◐
          </button>

          {/* remembered light */}
          <button
            onClick={() => {
              api.press("theme");
              audio.sfx("theme");
              api.toggleTheme();
            }}
            aria-label="toggle the light"
            className="t-ink grid h-10 w-10 place-items-center rounded-full transition-all active:scale-90"
          >
            <SunMoon theme={theme} />
          </button>

          {/* the sound — on by default, remembered between visits */}
          <button
            onClick={() => {
              api.press("sound");
              toggleSound();
            }}
            aria-label={soundOn ? "mute the sound" : "unmute the sound"}
            aria-pressed={soundOn}
            className={`grid h-10 w-10 place-items-center rounded-full transition-all active:scale-90 ${
              soundOn ? "t-acc" : "t-mut"
            }`}
          >
            <Speaker on={soundOn} />
          </button>

          {/* the vault */}
          <button
            onClick={openVault}
            aria-label="open the memory vault"
            className="bd-line t-ink flex h-10 items-center gap-2 rounded-full border px-4 transition-all active:scale-95"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: sat > 4 ? "var(--acc)" : "var(--mut)" }}
            />
            <span className="mono text-[9.5px]">MEMORY</span>
          </button>
        </div>
      </header>

      {/* ————— opener: the field of traces ————— */}
      <section className="relative h-[92svh] min-h-[520px] w-full overflow-hidden">
        <ParticleField stage={stage} sat={sat} hue={hue} inkRgb={INK_RGB[theme]} onStrokes={api.addStrokes} />

        {/* status line */}
        <div className="mono t-mut pointer-events-none absolute top-4 left-5 text-[9.5px]">
          memory:{" "}
          {traces === 0 ? <span className="t-ink">empty</span> : <span className="t-acc">{traces} traces</span>}
          <span className="anim-blink"> ▌</span>
        </div>
        <div className="mono t-mut pointer-events-none absolute top-4 right-5 text-[9.5px]">
          relationship: <span className="t-ink">{STAGE_NAMES[stage]}</span>
        </div>

        {/* the opening words */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 p-5 pb-14">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[var(--bg)] to-transparent" />
          <div className="relative flex flex-col gap-3">
            <p className="mono t-acc text-[10px]">
              {m.visits === 1 ? "an experimental place — it adapts to its visitor" : `recognised on arrival · visit no. ${m.visits}`}
            </p>
            <h1 className="display t-ink max-w-xl text-[9.6vw] leading-[1.02] font-black sm:text-6xl">
              {m.visits === 1 ? (
                <>
                  I will remember <span className="t-acc">everything</span> you do here.
                </>
              ) : (
                <>
                  You again<span className="t-acc">.</span>
                </>
              )}
            </h1>
            <p className="t-mut max-w-sm text-[13.5px] leading-relaxed">
              {m.visits === 1
                ? "Move through it, touch what pulls at you. Each choice quietly reshapes this place — and it remembers you when you return."
                : `I kept ${traces} traces of you while you were away. ${reordered ? "Some rooms have moved." : "The rooms are where you left them — for now."}`}
            </p>

            {/* the invitation in */}
            <div className="mt-1 flex flex-col gap-3">
              <button
                onClick={startExploring}
                className="pointer-events-auto mono t-acc group flex w-max items-center gap-2.5 rounded-full border px-6 py-3.5 text-[11px] tracking-[0.2em] transition-all active:scale-95"
                style={{ borderColor: "var(--acc-dim)", background: "var(--acc-soft)" }}
              >
                Start exploring
                <svg
                  width="11"
                  height="12"
                  viewBox="0 0 11 12"
                  fill="none"
                  className="transition-transform group-active:translate-y-0.5"
                >
                  <path d="M5.5 0v9 M1 6.5 5.5 11 10 6.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
              <div className="mono t-mut flex flex-wrap items-center gap-3 text-[9.5px]">
                <span className="bd-line rounded-full border px-3 py-1.5">touch the dust</span>
                <span className="bd-line rounded-full border px-3 py-1.5">drag to draw</span>
                <span className="bd-line hidden rounded-full border px-3 py-1.5 sm:inline">nothing leaves this phone</span>
              </div>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <span className="mono t-mut text-[8.5px] tracking-[0.3em]">DESCEND</span>
          <svg width="10" height="16" viewBox="0 0 10 16" style={{ animation: "scrollcue 1.8s ease-in-out infinite" }}>
            <path d="M5 0 v12 M1 9 l4 4 4-4" stroke="var(--acc)" strokeWidth="1.4" fill="none" />
          </svg>
        </div>
      </section>

      {/* ————— the rooms ————— */}
      <main
        ref={mainRef}
        className="relative z-10 mx-auto flex max-w-3xl flex-col gap-24 px-5 pt-20 pb-10 sm:gap-32"
        onContextMenu={(e) => e.preventDefault()}
      >
        {reordered && (
          <Reveal className="-mb-14">
            <p className="mono t-acc text-center text-[10px]">
              ↕ these rooms, rearranged around your habits
            </p>
          </Reveal>
        )}

        {order.map((id, i) => {
          if (id === "listening")
            return (
              <section key={id} aria-label="the listening room">
                <SectionHead
                  index={i + 1}
                  title="The Listening Room"
                  note={roomNotes.listening}
                />
                <Reveal delay={120} onIn={() => api.trackSection("listening")}>
                  <ListeningRoom />
                </Reveal>
              </section>
            );
          if (id === "doors")
            return (
              <section key={id} aria-label="the three doors">
                <SectionHead
                  index={i + 1}
                  title="The Three Doors"
                  note={roomNotes.doors}
                />
                <Reveal delay={120} onIn={() => api.trackSection("doors")}>
                  <Doors />
                </Reveal>
              </section>
            );
          return (
            <section key={id} aria-label="the wall of hours">
              <SectionHead index={i + 1} title="The Wall of Hours" note={roomNotes.hours} />
              <Reveal delay={120} onIn={() => api.trackSection("hours")}>
                <HoursDial />
              </Reveal>
            </section>
          );
        })}

        {/* ————— colophon ————— */}
        <footer className="bd-line flex flex-col items-center gap-5 border-t pt-10 pb-8 text-center">
          <Sigil stage={stage} size={30} />
          <div className="mono t-mut flex flex-col gap-1.5 text-[9.5px] leading-relaxed">
            <span>
              visit {m.visits} · stage {stage}/4 · {fmtDur(m.totalTimeMs)} together
            </span>
            <span>
              your hue {hue}° · {m.secrets.length}/5 hidden things found
            </span>
          </div>
          <p className="t-mut max-w-sm text-[12px] leading-relaxed">
            Everything on this page lives in <span className="mono t-ink text-[10.5px]">localStorage</span> on your
            device. No servers, no accounts, no copies. Clear your browser data — or hold{" "}
            <button onClick={openVault} className="t-acc underline underline-offset-2">
              forget me
            </button>{" "}
            — and I become a stranger's site again.
          </p>
          <p className="mono t-mut text-[8.5px] tracking-[0.25em]">SITE 001 · AN ARCHIVE OF ONE VISITOR</p>
        </footer>
      </main>

      {/* ————— the awakening overlay ————— */}
      {awake && (
        <Awakening
          head={say.head}
          lines={say.lines}
          meta={say.meta}
          visits={m.visits}
          onDone={() => {
            setAwake(false);
            setJustForgot(false);
          }}
        />
      )}

      {/* ————— memory vault ————— */}
      {vaultMounted && <MemoryVault open={vaultOpen} onClose={closeVault} onForgot={onForgot} />}

      {/* ————— secret-kept toast ————— */}
      <div
        className={`notice-toast fixed bottom-6 left-1/2 z-[65] -translate-x-1/2 ${notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        role="status"
      >
        {notice && (
          <button
            onClick={dismissNotice}
            className="bg-raise bd-line mono t-ink flex items-center gap-3 rounded-full border px-5 py-3 text-[9.5px] shadow-lg"
          >
            <span className="t-acc anim-blink">●</span>
            {notice}
          </button>
        )}
      </div>

    </div>
  );
}

export default function App() {
  return (
    <MemoryProvider>
      <AudioProvider>
        <Site />
      </AudioProvider>
    </MemoryProvider>
  );
}

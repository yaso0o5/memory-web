/* ————————————————————————————————————————————————
   REACT BRIDGE — the memory provider.
   Holds the living MemoryState, persists every change,
   paints the grown accent colour onto :root, and exposes
   the actions the rooms use to be remembered.
———————————————————————————————————————————————— */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MemoryState,
  Theme,
  accentHue,
  accentSat,
  buzz,
  createFresh,
  loadMemory,
  saveMemory,
  stageOf,
  wipeMemory,
} from "./memory";

interface MemoryApi {
  m: MemoryState;
  stage: number;
  hue: number;
  sat: number;
  notice: string | null;
  dismissNotice: () => void;
  trackSection: (id: string) => void;
  press: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  pickDoor: (id: string) => void;
  addStrokes: (n: number) => void;
  addLongPress: (ms: number) => void;
  unlock: (id: string, announcement: string) => void;
  markWhisper: (id: string) => void;
  noteAbsence: () => void;
  forget: () => MemoryState;
}

const Ctx = createContext<MemoryApi | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [m, setM] = useState<MemoryState>(() => loadMemory());
  const [notice, setNotice] = useState<string | null>(null);
  const seenSections = useRef<Set<string>>(new Set());
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* persist on every change */
  useEffect(() => {
    saveMemory(m);
  }, [m]);

  /* accumulate time together — 5s heartbeat */
  useEffect(() => {
    const id = setInterval(() => {
      setM((prev) => ({ ...prev, totalTimeMs: prev.totalTimeMs + 5000 }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  /* notice the visitor wandering away mid-visit */
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 15000) {
        setM((prev) => ({ ...prev, absences: prev.absences + 1 }));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* grow the accent colour onto the document */
  const stage = useMemo(() => stageOf(m), [m]);
  const hue = useMemo(() => accentHue(m), [m]);
  const sat = useMemo(() => accentSat(m, stage), [m, stage]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = m.theme ?? "night";
    root.style.setProperty("--acc-h", String(hue));
    root.style.setProperty("--acc-s", `${sat}%`);
    root.style.setProperty("--glow-a", String(0.05 + stage * 0.035));
    const meta = document.querySelector('meta[name="theme-color"]');
    const bgs: Record<Theme, string> = { night: "#0a100e", day: "#e9e7dd", midnight: "#050607" };
    meta?.setAttribute("content", bgs[m.theme ?? "night"]);
  }, [m.theme, hue, sat, stage]);

  const announce = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const api = useMemo<MemoryApi>(
    () => {
      const unlockFn = (id: string, announcement: string) => {
        if (m.secrets.includes(id)) return;
        setM((prev) => (prev.secrets.includes(id) ? prev : { ...prev, secrets: [...prev.secrets, id] }));
        buzz([14, 40, 22]);
        announce(announcement);
      };
      return {
      m,
      stage,
      hue,
      sat,
      notice,
      dismissNotice: () => setNotice(null),
      trackSection: (id) => {
        if (seenSections.current.has(id)) return;
        seenSections.current.add(id);
        setM((prev) => ({
          ...prev,
          sections: { ...prev.sections, [id]: (prev.sections[id] ?? 0) + 1 },
        }));
      },
      press: (id) => {
        setM((prev) => ({
          ...prev,
          buttons: { ...prev.buttons, [id]: (prev.buttons[id] ?? 0) + 1 },
        }));
      },
      toggleTheme: () => {
        buzz(8);
        setM((prev) => ({
          ...prev,
          theme: prev.theme === "day" ? "night" : "day",
          themeToggles: prev.themeToggles + 1,
        }));
      },
      setTheme: (t) => {
        setM((prev) => ({ ...prev, theme: t, themeToggles: prev.themeToggles + 1 }));
      },
      pickDoor: (id) => {
        buzz(16);
        let devoted = false;
        setM((prev) => {
          const doors = [...prev.doors, id].slice(-30);
          const tail = doors.slice(-3);
          devoted = tail.length === 3 && tail.every((d) => d === id) && !prev.secrets.includes("devoted");
          return { ...prev, doors };
        });
        setTimeout(() => {
          if (devoted) unlockFn("devoted", "something was remembered — THE DEVOTED · one door, three times");
        }, 400);
      },
      addStrokes: (n) => {
        let crossed = false;
        setM((prev) => {
          const strokes = prev.strokes + n;
          crossed = prev.strokes < 40 && strokes >= 40;
          return { ...prev, strokes };
        });
        setTimeout(() => {
          if (crossed) unlockFn("cartographer", "something was remembered — THE CARTOGRAPHER · forty strokes in the dust");
        }, 400);
      },
      addLongPress: (ms) => {
        setM((prev) => ({ ...prev, longPressMs: prev.longPressMs + ms }));
      },
      unlock: unlockFn,
      markWhisper: (id) => {
        setM((prev) => {
          const shown = [...prev.whispersShown, id].slice(-24);
          // when everything has been said, start the cycle again
          if (shown.length >= 24) return { ...prev, whispersShown: [id] };
          return { ...prev, whispersShown: shown };
        });
      },
      noteAbsence: () => {
        setM((prev) => ({ ...prev, absences: prev.absences + 1 }));
      },
      forget: () => {
        wipeMemory();
        const fresh = createFresh();
        seenSections.current = new Set();
        setM(fresh);
        return fresh;
      },
      };
    },
    [m, stage, hue, sat, notice, announce],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useMemory(): MemoryApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useMemory must be used inside <MemoryProvider>");
  return api;
}

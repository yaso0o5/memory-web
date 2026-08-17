/* ————————————————————————————————————————————————
   THE QUIET LAYER — React bridge
   Owns the audio toggle, starts the ambience on the
   visitor's first real gesture (autoplay-safe), and
   ties the sound to the existing memory system without
   touching how that system works.
———————————————————————————————————————————————— */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { audio } from "./audio";
import { useMemory } from "./useMemory";

interface AudioApi {
  enabled: boolean;
  toggle: () => void;
}

const Ctx = createContext<AudioApi | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { stage, m } = useMemory();
  const [enabled, setEnabled] = useState<boolean>(audio.isEnabled);

  /* start the ambience on the first meaningful touch/key (no autoplay) */
  useEffect(() => {
    if (!audio.isEnabled) return;
    let started = false;
    const boot = () => {
      if (started) return;
      started = true;
      audio.ensureStarted();
      window.removeEventListener("pointerdown", boot);
      window.removeEventListener("keydown", boot);
    };
    window.addEventListener("pointerdown", boot);
    window.addEventListener("keydown", boot);
    return () => {
      window.removeEventListener("pointerdown", boot);
      window.removeEventListener("keydown", boot);
    };
  }, []);

  /* the ambience deepens as the relationship does */
  useEffect(() => {
    audio.setStage(stage);
  }, [stage]);

  /* a secret was discovered → a single, restrained chime */
  const prevSecrets = useRef(m.secrets.length);
  useEffect(() => {
    if (m.secrets.length > prevSecrets.current) audio.sfx("secret");
    prevSecrets.current = m.secrets.length;
  }, [m.secrets.length]);

  /* very subtle hover tone — desktop / mouse only, throttled */
  useEffect(() => {
    let last = 0;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest("button, a")) return;
      const now = performance.now();
      if (now - last < 160) return;
      last = now;
      audio.sfx("hover");
    };
    document.addEventListener("pointerover", over, true);
    return () => document.removeEventListener("pointerover", over, true);
  }, []);

  /* pause when the tab is hidden — battery on mobile */
  useEffect(() => {
    const vis = () => {
      if (document.hidden) audio.suspend();
      else if (audio.isEnabled) audio.resume();
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const toggle = useCallback(() => {
    const next = !audio.isEnabled;
    audio.setEnabled(next);
    if (next) audio.sfx("theme"); // sound returning → a soft swell
    setEnabled(next);
  }, []);

  return <Ctx.Provider value={{ enabled, toggle }}>{children}</Ctx.Provider>;
}

export function useAudio(): AudioApi {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAudio must be used inside <AudioProvider>");
  return a;
}

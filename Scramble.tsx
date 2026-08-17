/* Scramble-decode text — the site's way of "recalling" a sentence. */

import { useEffect, useRef, useState } from "react";

const GLYPHS = "▪▫◦·×+—/\\|◐◑◒◓abcdefghmnorstuwz";

interface Props {
  text: string;
  className?: string;
  delay?: number; // ms before decoding starts
  speed?: number; // chars resolved per frame-ish tick
  onDone?: () => void;
}

export default function Scramble({ text, className, delay = 0, speed = 1, onDone }: Props) {
  const [out, setOut] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text : "",
  );
  const done = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      onDone?.();
      return;
    }
    setOut("");
    done.current = false;
    let frame = 0;
    let raf = 0;
    const start = performance.now() + delay;

    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      frame += speed;
      const resolved = Math.floor(frame);
      if (resolved >= text.length) {
        setOut(text);
        if (!done.current) {
          done.current = true;
          onDone?.();
        }
        return;
      }
      let s = text.slice(0, resolved);
      const tail = Math.min(text.length - resolved, 7);
      for (let i = 0; i < tail; i++) {
        s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay]);

  return (
    <span className={className} aria-label={text}>
      {out || "\u00A0"}
    </span>
  );
}

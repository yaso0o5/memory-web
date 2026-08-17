/* The Awakening — the first thing the visitor sees.
   Its words depend entirely on what the site already knows.
   Tap anywhere to step through faster. */

import { useEffect, useRef, useState } from "react";
import Scramble from "./Scramble";

interface Props {
  head: string;
  lines: string[];
  meta: string;
  visits: number;
  onDone: () => void;
}

export default function Awakening({ head, lines, meta, visits, onDone }: Props) {
  const [out, setOut] = useState(false);
  const gone = useRef(false);

  const finish = () => {
    if (gone.current) return;
    gone.current = true;
    setOut(true);
    setTimeout(onDone, 720);
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(finish, reduced ? 2000 : 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`awaken ${out ? "awaken-out" : ""} bg-app fixed inset-0 z-[70] flex flex-col justify-between p-6 pb-8`}
      style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      onPointerDown={finish}
      role="dialog"
      aria-label="the site awakens"
    >
      {/* top status */}
      <div className="mono t-mut flex items-center justify-between text-[10px]">
        <span>site 001 · an archive of one visitor</span>
        <span className="t-acc anim-blink">●</span>
      </div>

      {/* the recalled words */}
      <div className="flex flex-col gap-4">
        <p className="mono t-acc text-[11px]">
          {visits === 1 ? "arriving: unknown presence" : `recognising: visitor no. ${visits}`}
        </p>
        <h1 className="display t-ink text-[11.5vw] leading-[1.04] font-black sm:text-6xl">
          <Scramble text={head} delay={250} />
        </h1>
        {lines.map((l, i) => (
          <p key={i} className="display t-mut text-[5.6vw] leading-snug font-medium sm:text-2xl">
            <Scramble text={l} delay={1250 + i * 1050} />
          </p>
        ))}
      </div>

      {/* bottom */}
      <div className="flex flex-col gap-4">
        <p className="mono t-mut text-[10px]">{meta}</p>
        <div className="bg-raise2 h-px w-full overflow-hidden">
          <div className="awaken-bar t-acc h-px w-full" style={{ background: "var(--acc)" }} />
        </div>
        <p className="mono t-mut text-center text-[10px] opacity-70">tap anywhere to enter</p>
      </div>
    </div>
  );
}

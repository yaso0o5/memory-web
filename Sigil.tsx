/* The sigil — a small organism that grows a ring for every stage
   of the relationship. Hold it long enough and it yields a secret. */

import { useRef, useState } from "react";
import { buzz } from "../lib/memory";

interface Props {
  stage: number;
  size?: number;
  onHoldComplete?: () => void; // patience secret
  holdMs?: number;
}

export default function Sigil({ stage, size = 46, onHoldComplete, holdMs = 1500 }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);

  const start = () => {
    completed.current = false;
    setHolding(true);
    buzz(6);
    timer.current = setTimeout(() => {
      completed.current = true;
      setHolding(false);
      onHoldComplete?.();
    }, holdMs);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    setHolding(false);
  };

  const rings = [0, 1, 2, 3];

  return (
    <button
      aria-label="the sigil — hold it"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative grid place-items-center rounded-full"
      style={{ width: size + 14, height: size + 14, touchAction: "none" }}
    >
      <svg width={size + 14} height={size + 14} viewBox="0 0 60 60" className="anim-breathe">
        {/* nucleus */}
        <circle cx="30" cy="30" r="4.5" fill="var(--acc)" />
        <circle cx="30" cy="30" r="8" fill="none" stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="1" />
        {/* growth rings, one per stage */}
        {rings.map((i) => {
          const visible = stage > i;
          const r = 13 + i * 5.5;
          return (
            <g key={i} style={{ transition: "opacity 1s ease", opacity: visible ? 1 : 0.09 }}>
              <circle
                cx="30"
                cy="30"
                r={r}
                fill="none"
                stroke={i % 2 === 0 ? "var(--acc)" : "var(--ink)"}
                strokeOpacity={0.75}
                strokeWidth="1"
                strokeDasharray={i === 1 ? "3 5" : i === 3 ? "1 4" : undefined}
                strokeLinecap="round"
              />
              {visible && (
                <circle cx={30 + r} cy="30" r="1.6" fill="var(--acc)">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 30 30`}
                    to={`${i % 2 === 0 ? 360 : -360} 30 30`}
                    dur={`${14 + i * 8}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* hold-progress arc */}
      {holding && (
        <svg
          width={size + 14}
          height={size + 14}
          viewBox="0 0 44 44"
          className="absolute inset-0 -rotate-90"
          style={{ animationDuration: `${holdMs}ms` }}
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--acc)"
            strokeWidth="2"
            strokeLinecap="round"
            className="hold-arc"
            style={{ animationDuration: `${holdMs}ms` }}
          />
        </svg>
      )}
    </button>
  );
}

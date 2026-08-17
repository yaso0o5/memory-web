/* The Wall of Hours — a 24-hour dial that fills with a mark
   for every hour the visitor has ever arrived in. */

import { fmtDur } from "../lib/memory";
import { useMemory } from "../lib/useMemory";

export default function HoursDial() {
  const { m } = useMemory();

  const perHour = new Array<number>(24).fill(0);
  for (const h of m.visitHours ?? []) perHour[((h % 24) + 24) % 24]++;

  let busiest = 0;
  let busiestN = 0;
  perHour.forEach((n, h) => {
    if (n > busiestN) {
      busiestN = n;
      busiest = h;
    }
  });

  const nowHour = new Date().getHours();
  const size = 300;
  const c = size / 2;
  const r = 118;

  return (
    <div className="flex flex-col items-center gap-7">
      <div className="relative" style={{ width: size, maxWidth: "86vw", aspectRatio: "1" }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          {/* faint hour ticks */}
          {perHour.map((_, h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            const x1 = c + Math.cos(a) * (r - 6);
            const y1 = c + Math.sin(a) * (r - 6);
            const x2 = c + Math.cos(a) * (r + 2);
            const y2 = c + Math.sin(a) * (r + 2);
            return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1" />;
          })}

          {/* hour labels, four cardinal points */}
          {[0, 6, 12, 18].map((h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            const x = c + Math.cos(a) * (r + 18);
            const y = c + Math.sin(a) * (r + 18) + 3;
            return (
              <text
                key={h}
                x={x}
                y={y}
                textAnchor="middle"
                fill="var(--mut)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {String(h).padStart(2, "0")}
              </text>
            );
          })}

          {/* arrival marks — one ray per visit hour, longer when busy */}
          {perHour.map((n, h) => {
            if (n === 0) return null;
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            const len = 10 + Math.min(n, 5) * 9;
            const x1 = c + Math.cos(a) * (r - 14);
            const y1 = c + Math.sin(a) * (r - 14);
            const x2 = c + Math.cos(a) * (r - 14 - len);
            const y2 = c + Math.sin(a) * (r - 14 - len);
            return (
              <line
                key={h}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--acc)"
                strokeWidth={h === nowHour ? 3.4 : 2.2}
                strokeLinecap="round"
                strokeOpacity={h === nowHour ? 1 : 0.75}
              />
            );
          })}

          {/* orbiting present-moment dot */}
          <circle r="3" fill="var(--acc)">
            <animateMotion
              dur="60s"
              repeatCount="indefinite"
              path={`M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`}
            />
          </circle>

          {/* centre readout */}
          <text x={c} y={c - 8} textAnchor="middle" fill="var(--ink)" fontSize="26" fontWeight="900" fontFamily="var(--font-display)">
            {fmtDur(m.totalTimeMs)}
          </text>
          <text x={c} y={c + 12} textAnchor="middle" fill="var(--mut)" fontSize="8.5" fontFamily="var(--font-mono)" letterSpacing="2">
            TOGETHER, IN TOTAL
          </text>
          <text x={c} y={c + 30} textAnchor="middle" fill="var(--acc)" fontSize="8.5" fontFamily="var(--font-mono)" letterSpacing="2">
            {(m.visitHours ?? []).length} ARRIVAL{(m.visitHours ?? []).length === 1 ? "" : "S"}
          </text>
        </svg>
      </div>

      <p className="mono t-mut max-w-xs text-center text-[10px] leading-relaxed">
        {busiestN === 0 ? (
          "one mark on the dial. come back at different hours and it fills like a clock remembering you."
        ) : (
          <>
            you usually arrive around <span className="t-acc">{String(busiest).padStart(2, "0")}:00</span>.
            the bright ray is this hour, right now.
          </>
        )}
      </p>
    </div>
  );
}

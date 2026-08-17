/* Scroll reveal — fades elements in as they surface, and tells
   the memory engine when a section has truly been visited. */

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number; // stagger, ms
  as?: "div" | "section" | "header" | "footer";
  onIn?: () => void; // fired once when scrolled into view
  threshold?: number;
}

export default function Reveal({ children, className = "", delay = 0, as = "div", onIn, threshold = 0.25 }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            if (!fired.current && onIn) {
              fired.current = true;
              onIn();
            }
            io.disconnect();
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={{ ["--d" as never]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

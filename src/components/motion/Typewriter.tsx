import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type TypewriterProps = {
  lines: string[];
  speed?: number;
  pause?: number;
  className?: string;
  loop?: boolean;
};

export function Typewriter({
  lines,
  speed = 35,
  pause = 1800,
  className,
  loop = true,
}: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [text, setText] = useState(reduce ? lines[0] ?? "" : "");
  const idx = useRef(0);
  const char = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    if (!inView || reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = lines[idx.current % lines.length];
      if (!deleting.current) {
        char.current += 1;
        setText(current.slice(0, char.current));
        if (char.current >= current.length) {
          if (!loop && idx.current === lines.length - 1) return;
          deleting.current = true;
          timer = setTimeout(tick, pause);
          return;
        }
      } else {
        char.current -= 1;
        setText(current.slice(0, char.current));
        if (char.current === 0) {
          deleting.current = false;
          idx.current += 1;
        }
      }
      timer = setTimeout(tick, deleting.current ? speed / 2 : speed);
    };
    timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [inView, lines, speed, pause, loop, reduce]);

  return (
    <span ref={ref} className={className}>
      {text}
      <span className="inline-block w-[2px] h-[1em] align-[-2px] bg-accent ml-0.5 animate-pulse" />
    </span>
  );
}

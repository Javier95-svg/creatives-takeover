import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Types a list of prompts out one character at a time, holds, deletes, and
 * moves to the next - looping forever. Cadence matches the /build chat card so
 * the two input surfaces feel like the same product.
 *
 * Distinct from useTypingAnimation, which types a single fixed string once and
 * stops; this one rotates a set.
 *
 * `paused` freezes it without unmounting, so it never competes with someone
 * actually typing in the field.
 *
 * Under prefers-reduced-motion the animation never starts and the first prompt
 * is returned as static text - a placeholder that types itself indefinitely is
 * exactly the kind of perpetual motion that setting exists to stop.
 */
export function useTypingCarousel(prompts: readonly string[], paused: boolean): string {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayText, setDisplayText] = useState("");
  const pausedRef = useRef(paused);
  const stateRef = useRef({ ci: 0, pi: 0, del: false });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (prompts.length === 0) return;

    if (prefersReducedMotion) {
      setDisplayText(prompts[0]);
      return;
    }

    // Start clean whenever the prompt set changes: switching hero mode should
    // begin the new list from the top, not resume mid-word from the old one.
    stateRef.current = { ci: 0, pi: 0, del: false };
    setDisplayText("");

    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (pausedRef.current) {
        timerId = setTimeout(tick, 300);
        return;
      }
      const state = stateRef.current;
      const full = prompts[state.pi % prompts.length];

      if (!state.del) {
        state.ci += 1;
        setDisplayText(full.slice(0, state.ci));
        if (state.ci >= full.length) {
          state.del = true;
          timerId = setTimeout(tick, 1800);
        } else {
          timerId = setTimeout(tick, 50 + Math.random() * 35);
        }
        return;
      }

      state.ci -= 1;
      setDisplayText(full.slice(0, state.ci));
      if (state.ci <= 0) {
        state.del = false;
        state.pi += 1;
        timerId = setTimeout(tick, 350);
      } else {
        timerId = setTimeout(tick, 22);
      }
    };

    timerId = setTimeout(tick, 700);
    return () => clearTimeout(timerId);
  }, [prompts, prefersReducedMotion]);

  return displayText;
}

export default useTypingCarousel;

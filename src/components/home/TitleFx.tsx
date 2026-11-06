import { Fragment, useEffect, useRef, useState } from "react";

import "./home-titles.css";

// Each homepage section title gets its own tone and entrance, so no two read
// alike. Rendered inside the section's existing <h2>, which keeps its id,
// classes and text; this only adds a span the colour and motion live on.
//
// sunrise   Journey      amber to coral, colour sweeps across as it rises
// evolve    Cycle        teal to violet, words arrive one by one
// momentum  Programs     green to blue, colour keeps flowing ("moving")
// spectrum  Nutshell     blue to coral, letters tighten into place
// reading   Pedia        indigo to sky, wipes in left to right
// gold      Founder ID   champagne foil, a sheen passes now and then
// underline FAQ          plain text, a tricolour line draws beneath it
export type TitleFxVariant = "sunrise" | "evolve" | "momentum" | "spectrum" | "reading" | "gold" | "underline";

export default function TitleFx({ text, variant }: { text: string; variant: TitleFxVariant }) {
  const ref = useRef<HTMLSpanElement>(null);
  // "idle" until mounted, so without JS the title simply shows in its colour.
  const [state, setState] = useState<"idle" | "ready" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    setState("ready");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setState("in");
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    // Watch the heading, not the span: the wipe variant starts fully clipped,
    // which would keep the span itself from ever counting as visible.
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <span ref={ref} className={`ht ht--${variant}`} data-anim={state}>
      {variant === "evolve"
        ? words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              <span className="ht__word" style={{ transitionDelay: `${index * 0.12}s` }}>{word}</span>
              {index < words.length - 1 ? " " : null}
            </Fragment>
          ))
        : text}
    </span>
  );
}

import { useEffect, type ReactNode } from "react";
import "./home-scenes.css";

export type HomeSceneName =
  | "journey"
  | "orbit"
  | "studio"
  | "network"
  | "data"
  | "tiers"
  | "quote"
  | "library"
  | "calm"
  | "launch";

// Display faces for the scenes, one weight each. Body copy stays Inter
// everywhere, so only headings and labels change from section to section.
// The hero and closing CTA keep Space Grotesk, which index.html already loads.
const SCENE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Sora:wght@600&family=Bricolage+Grotesque:opsz,wght@12..96,600&family=Manrope:wght@700&family=IBM+Plex+Sans:wght@600&family=IBM+Plex+Mono:wght@500&family=Plus+Jakarta+Sans:wght@700&family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&family=Urbanist:wght@600&display=swap";

/**
 * Adds the scene fonts once the page has loaded. A stylesheet added from
 * script never blocks the first paint, and every scene sits below the hero,
 * so the swap happens off screen.
 */
export const useHomeSceneFonts = () => {
  useEffect(() => {
    if (document.querySelector("link[data-home-scene-fonts]")) return;
    const add = () => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SCENE_FONTS_URL;
      link.dataset.homeSceneFonts = "";
      document.head.appendChild(link);
    };
    if (document.readyState === "complete") add();
    else window.addEventListener("load", add, { once: true });
    return () => window.removeEventListener("load", add);
  }, []);
};

type HomeSceneProps = {
  scene: HomeSceneName;
  children: ReactNode;
};

/**
 * One homepage section with its own display face. The wallpaper stays the
 * page-wide HomeWallpaper on purpose (Javier, 2026-10-29).
 */
const HomeScene = ({ scene, children }: HomeSceneProps) => (
  <div className={`hs-scene hs-scene--${scene}`}>{children}</div>
);

export default HomeScene;

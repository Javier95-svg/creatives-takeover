import "./onboarding-wallpaper.css";

/** Backdrop for the onboarding quiz (/start and /onboarding). Decorative only. */
const OnboardingWallpaper = () => (
  <div aria-hidden="true" className="onboarding-wallpaper">
    <div className="onboarding-wallpaper__glow onboarding-wallpaper__glow--teal" />
    <div className="onboarding-wallpaper__glow onboarding-wallpaper__glow--primary" />
    <div className="onboarding-wallpaper__glow onboarding-wallpaper__glow--violet" />
    <div className="onboarding-wallpaper__dots" />
    <div className="onboarding-wallpaper__vignette" />
  </div>
);

export default OnboardingWallpaper;

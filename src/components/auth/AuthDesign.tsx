import "./auth-editorial.css";

// The editorial design of /login and /signup (approved by Javier, 2026-11-07):
// the photo fills the showcase, with this one line over its foot. The page
// roots carry the auth-editorial class that auth-editorial.css styles.

export function AuthShowcaseLine() {
  return (
    <p className="auth-showcase-line">
      Start a project, test it with real people and always know what to do next.
    </p>
  );
}

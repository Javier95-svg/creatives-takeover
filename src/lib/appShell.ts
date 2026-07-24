/**
 * The instant branded shell is static HTML in index.html that paints before
 * any bundle arrives. It must be removed exactly once, as soon as the first
 * real route has mounted — or when the top-level error UI takes over, since
 * the shell is a fixed overlay that would otherwise cover it.
 */
export const removeAppShell = () => {
  if (typeof document === 'undefined') return;
  const shell = document.getElementById('app-shell');
  if (!shell) return;
  // The failsafe in index.html un-hides the plain HTML fallback if the app
  // never mounts; once we're here the app did mount, so keep it suppressed.
  document.documentElement.classList.add('js');
  shell.classList.add('shell-hide');
  window.setTimeout(() => {
    shell.parentNode?.removeChild(shell);
  }, 300);
};

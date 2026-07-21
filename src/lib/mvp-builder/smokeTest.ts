import type { MVPPreviewResult } from './project';

export interface MVPSmokeTestResult {
  passed: boolean;
  primaryActionFound: boolean;
  primaryActionTriggered: boolean;
  runtimeErrors: string[];
  reason: string | null;
}

export async function runMvpBrowserSmokeTest(preview: MVPPreviewResult): Promise<MVPSmokeTestResult> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { passed: false, primaryActionFound: false, primaryActionTriggered: false, runtimeErrors: [], reason: 'Browser smoke testing is unavailable.' };
  }
  if (!preview.canPreview || !preview.html) {
    return { passed: false, primaryActionFound: false, primaryActionTriggered: false, runtimeErrors: preview.errors, reason: 'Open a working preview before publishing.' };
  }

  const token = crypto.randomUUID();
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
  const harness = `<script>(function(){var errors=[];window.addEventListener('error',function(e){errors.push(e.message||'Runtime error')});window.addEventListener('unhandledrejection',function(e){errors.push(String(e.reason||'Unhandled promise rejection'))});function run(){var action=document.querySelector('form button[type="submit"],form input[type="submit"],button:not([disabled]),a[href]');var found=!!action;var triggered=false;try{if(action){if(action.closest&&action.closest('form')){var form=action.closest('form');form.addEventListener('submit',function(e){e.preventDefault()},{once:true});form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));triggered=true}else{action.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));triggered=true}}}catch(e){errors.push(e&&e.message?e.message:String(e))}setTimeout(function(){parent.postMessage({type:'ct-mvp-smoke',token:'${token}',found:found,triggered:triggered,errors:errors},'*')},350)}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run,{once:true})}else{run()}})();</script>`;
  iframe.srcdoc = preview.html.includes('</body>')
    ? preview.html.replace('</body>', `${harness}</body>`)
    : `${preview.html}${harness}`;
  document.body.appendChild(iframe);

  return await new Promise((resolve) => {
    const finish = (result: MVPSmokeTestResult) => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
      iframe.remove();
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; token?: string; found?: boolean; triggered?: boolean; errors?: string[] };
      if (data?.type !== 'ct-mvp-smoke' || data.token !== token) return;
      const errors = Array.isArray(data.errors) ? data.errors.filter(Boolean) : [];
      const passed = Boolean(data.found && data.triggered && errors.length === 0);
      finish({
        passed,
        primaryActionFound: Boolean(data.found),
        primaryActionTriggered: Boolean(data.triggered),
        runtimeErrors: errors,
        reason: passed ? null : errors[0] || (!data.found ? 'No primary customer action was found.' : 'The primary action could not be exercised.'),
      });
    };
    const timeout = window.setTimeout(() => finish({
      passed: false,
      primaryActionFound: false,
      primaryActionTriggered: false,
      runtimeErrors: [],
      reason: 'The browser smoke test timed out.',
    }), 2200);
    window.addEventListener('message', onMessage);
  });
}

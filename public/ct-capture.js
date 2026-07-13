// Creatives Takeover — live click-through capture for published MVP sites.
// Loaded by the analytics snippet only when the page URL carries
// #ct-capture=<sessionId> (the founder starts a session in the Demo Studio
// editor and opens their own published site with that hash). Every click
// captures the page HTML + click position as one demo step; "Finish" sends
// the steps to demo-capture-ingest keyed by the unguessable session id.
(function () {
  'use strict';
  var match = (location.hash || '').match(/ct-capture=([0-9a-fA-F-]{36})/);
  if (!match) return;
  var sessionId = match[1];
  var INGEST_URL = 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/demo-capture-ingest';
  var MAX_STEPS = 10;
  var MAX_HTML_CHARS = 400000;
  var steps = [];
  var finished = false;

  var bar = document.createElement('div');
  bar.id = 'ct-capture-bar';
  bar.setAttribute('style', [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)',
    'z-index:2147483647', 'background:#0f172a', 'color:#f8fafc',
    'font:13px/1.4 system-ui,sans-serif', 'padding:10px 14px', 'border-radius:12px',
    'box-shadow:0 8px 30px rgba(0,0,0,.45)', 'display:flex', 'gap:10px',
    'align-items:center', 'border:1px solid rgba(148,163,184,.35)',
  ].join(';'));

  var counter = document.createElement('span');
  counter.textContent = 'Recording · click through your product (0/' + MAX_STEPS + ' steps)';

  function makeButton(label, background) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.setAttribute('style', 'border:0;border-radius:8px;padding:6px 12px;font:600 12px system-ui,sans-serif;cursor:pointer;color:#fff;background:' + background + ';');
    return btn;
  }

  var finishBtn = makeButton('Finish & send', '#0ea5e9');
  var cancelBtn = makeButton('Cancel', 'rgba(148,163,184,.25)');
  bar.appendChild(counter);
  bar.appendChild(finishBtn);
  bar.appendChild(cancelBtn);
  document.body.appendChild(bar);

  function labelFor(target) {
    var el = target && target.closest ? target.closest('button,a,[role="button"],input,label,h1,h2,h3') : null;
    var text = el ? (el.getAttribute('aria-label') || el.textContent || '') : (target && target.textContent) || '';
    return text.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function snapshotHtml() {
    var html = '<!doctype html>' + document.documentElement.outerHTML;
    // Never ship the capture toolbar inside the snapshot.
    return html.replace(/<div id="ct-capture-bar"[\s\S]*?<\/div>/, '').slice(0, MAX_HTML_CHARS);
  }

  function flash() {
    var overlay = document.createElement('div');
    overlay.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;box-shadow:inset 0 0 0 4px #0ea5e9;transition:opacity .4s;');
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.style.opacity = '0'; }, 80);
    setTimeout(function () { overlay.remove(); }, 500);
  }

  function onClick(event) {
    if (finished) return;
    if (bar.contains(event.target)) return;
    if (steps.length >= MAX_STEPS) return;
    steps.push({
      html: snapshotHtml(),
      clickX: Math.min(1, Math.max(0, event.clientX / window.innerWidth)),
      clickY: Math.min(1, Math.max(0, event.clientY / window.innerHeight)),
      label: labelFor(event.target),
    });
    counter.textContent = 'Recording · ' + steps.length + '/' + MAX_STEPS + ' steps captured';
    flash();
  }

  document.addEventListener('click', onClick, true);

  cancelBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    finished = true;
    document.removeEventListener('click', onClick, true);
    bar.remove();
  });

  finishBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    if (finished) return;
    if (steps.length === 0) {
      counter.textContent = 'Click through your product first — every click becomes a step.';
      return;
    }
    finished = true;
    document.removeEventListener('click', onClick, true);
    counter.textContent = 'Sending ' + steps.length + ' steps…';
    finishBtn.disabled = true;
    fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, sourceUrl: location.origin, steps: steps }),
    }).then(function (res) {
      if (!res.ok) throw new Error('send failed');
      counter.textContent = '✓ ' + steps.length + ' steps sent — return to your Demo Studio tab.';
      finishBtn.remove();
      cancelBtn.textContent = 'Close';
    }).catch(function () {
      finished = false;
      finishBtn.disabled = false;
      document.addEventListener('click', onClick, true);
      counter.textContent = 'Could not send — check your connection and press Finish again.';
    });
  });
})();

// Runs Gemini image jobs one after another in a gemini.google.com tab (paste into the page's console,
// or run it through the browser tool). Jobs come from tools/gemini-grid.mjs: [[name, g, [panel, ...]], ...].
// Add them with __addJobs(jobs) and start with __startLoop(). Each finished image is saved as <name>.png
// into Downloads (grids: gr_<ids>.png, single looks: <id>_avg.png).
// Notes:
//   - Chrome freezes a tab it thinks is hidden: keep the tab in front while it runs.
//   - The full-size image comes from an "rd-gg" fetch after clicking 원본 크기 이미지 다운로드; the fetch is
//     wrapped so that blob is saved directly (Chrome allows the page's own download only once).
//   - A blob size already saved is skipped, so a late response can't be saved under the next job's name.
//   - The queue is mirrored to localStorage (__wtwQueue) so a reload can pick it up again.
(() => {
  window.__gemLog = []; window.__gemDone = []; window.__gemFailed = []; window.__gemQueue = window.__gemQueue || [];
  window.__gemSizes = new Set(JSON.parse(localStorage.getItem('__wtwSizes') || '[]'));
  const log = s => window.__gemLog.push(new Date().toTimeString().slice(0, 8) + ' ' + s);
  window.__origFetch = window.__origFetch || window.fetch;
  window.fetch = async function (...a) {
    const r = await window.__origFetch.apply(this, a);
    try {
      const u = String(a[0] && a[0].url || a[0]);
      if (window.__want && /rd-gg/.test(u)) {
        r.clone().blob().then(b => {
          if (b.size > 300000 && window.__want && !window.__gemSizes.has(b.size)) {
            const name = window.__want; window.__want = null; window.__gemSizes.add(b.size);
            try { localStorage.setItem('__wtwSizes', JSON.stringify([...window.__gemSizes])); } catch (e) {}
            const el = document.createElement('a'); el.href = URL.createObjectURL(b); el.download = name + '.png';
            document.body.appendChild(el); el.click(); el.remove();
            window.__gemDone.push(name); log('saved ' + name + ' ' + b.size);
          }
        });
      }
    } catch (e) {}
    return r;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitFor(fn, ms) { const t = Date.now(); for (;;) { const v = fn(); if (v) return v; if (Date.now() - t > ms) return null; await sleep(1000); } }
  const empty = () => document.querySelectorAll('user-query').length === 0 && document.querySelector('.ql-editor');
  async function newChat() {
    if (empty()) return true;
    for (const sel of ['a[href="/app"][aria-label="새 채팅"]', 'a[href="/"][aria-label="새 채팅"]', 'a[href="/app"][aria-label="새 채팅"]']) {
      document.querySelector(sel)?.click();
      if (await waitFor(empty, 15000)) return true;
    }
    return false;
  }
  // a finished answer with text but no image is a refusal
  const refused = () => { const r = [...document.querySelectorAll('model-response')].pop(); if (!r) return false; return !r.querySelector('img') && /hard time|can't|cannot|unable|할 수 없|어렵|죄송/i.test(r.innerText || ''); };
  // same text as gridText in tools/gemini-grid.mjs
  window.__gridText = (g, panels) => {
    const who = `a matte black faceless ${g === 'm' ? 'male' : 'female'} mannequin with an average, medium build`;
    const look = 'The clothes fit naturally like on a real person, with realistic fabric drape and texture. The mannequin has a smooth featureless black head with no face and no hair, and black hands.';
    if (panels.length === 1) return `Generate one new image, portrait 3:4. Full-body fashion catalog photo of ${who}, styled as a Korean street-style outfit. The mannequin is wearing: ${panels[0]} ${look} Standing straight, front view, the entire figure visible from head to shoes, centered with space around it. Plain light gray seamless studio backdrop, soft even studio lighting, sharp focus.`;
    const SLOT = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
    return 'Generate one new image, portrait 3:4, laid out as a clean 2x2 grid of four equal panels separated by thin white gaps. ' + `Each panel is a separate full-body fashion catalog photo of ${who}, wearing a different Korean street-style outfit. ${look} ` + 'In every panel: standing straight, front view, the entire figure visible from head to shoes with space above the head and below the feet, plain light gray seamless studio backdrop, soft even studio lighting, sharp focus. No text or labels.\n' + panels.map((p, k) => `${SLOT[k]} panel: ${p}`).join('\n');
  };
  window.__addJobs = list => { for (const [n, g, p] of list) window.__gemQueue.push([n, window.__gridText(g, p)]); try { localStorage.setItem('__wtwQueue', JSON.stringify(window.__gemQueue)); } catch (e) {} return window.__gemQueue.length; };
  async function runOne([name, text]) {
    if (!(await newChat())) { log('no empty chat ' + name); return false; }
    await sleep(1500);
    const ed = document.querySelector('.ql-editor'); ed.focus();
    document.execCommand('insertText', false, text);
    await sleep(800);
    const send = await waitFor(() => document.querySelector('button[aria-label*="보내기"]:not([disabled]),button.send-button:not([disabled])'), 10000);
    if (!send) { log('no send ' + name); return false; }
    send.click(); log('sent ' + name);
    const dl = await waitFor(() => document.querySelectorAll('user-query').length === 1 && (document.querySelector('button[aria-label*="원본 크기"]') || (refused() && 'refused')), 600000);
    if (!dl || dl === 'refused') { log((dl ? 'refused ' : 'timeout ') + name); return false; }
    await sleep(2000);
    window.__want = name; dl.click();
    const saved = await waitFor(() => window.__gemDone.includes(name), 90000);
    if (!saved) { window.__want = null; log('no save ' + name); return false; }
    return true;
  }
  // only one loop at a time: a new start makes any older loop stop after its current job
  window.__startLoop = () => {
    const myId = Math.random(); window.__loopId = myId;
    (async () => {
      log('loop start');
      while (window.__loopId === myId && window.__gemQueue.length) {
        const item = window.__gemQueue.shift(); let ok = false;
        try { ok = await runOne(item); } catch (e) { log('err ' + item[0] + ' ' + e.message); }
        if (!ok) window.__gemFailed.push(item);
        try { localStorage.setItem('__wtwQueue', JSON.stringify(window.__gemQueue)); } catch (e) {}
        await sleep(2000);
      }
      if (window.__loopId === myId) log('loop end');
    })();
  };
  return 'runner ready';
})();

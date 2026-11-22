// The phone's lock screen, drawn on a 2D canvas: the real time, and the scam messages
// arriving one after another. scene.js maps it onto the 3D phone; without WebGL the
// canvas is shown flat. No three.js needed here.

const W = 810, H = 1740, PAD = 36, IN = 36, TOP = 540, GAP = 16, SHOWN = 3;
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const C = { text: '#efe9de', text2: '#aaa398', text3: '#8a847a', card: '#262421', line: 'rgba(239,233,222,.10)' };

export async function createScreen(items) {
  try {
    await Promise.all([`500 42px ${SANS}`, `400 180px ${SANS}`, `400 26px ${MONO}`].map(f => document.fonts.load(f)));
  } catch {}

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');

  const wrap = (text, font, maxW) => {
    g.font = font;
    const lines = []; let line = '';
    for (const word of text.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (line && g.measureText(test).width > maxW) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
    return lines;
  };
  const cards = items.map(it => {
    const lines = wrap(it.line, `500 42px ${SANS}`, W - 2 * PAD - 2 * IN);
    return { it, lines, h: IN + 28 + 20 + lines.length * 54 + IN - 8 };
  });

  let next = 0, live = [], t0 = -1, dirty = true, minute = -1;

  function place(animated) {
    let y = TOP;
    live.forEach((l, i) => { l.y0 = l.y; l.a0 = l.a; l.y1 = y; l.a1 = i < SHOWN ? 1 : 0; y += l.card.h + GAP; });
    if (animated) t0 = -2;
    else live.forEach(l => { l.y = l.y1; l.a = l.a1; });
  }
  for (let i = 0; i < SHOWN; i++) live.unshift({ card: cards[next++ % cards.length], y: 0, a: 1 });
  place(false);

  function push() {
    live.unshift({ card: cards[next++ % cards.length], y: TOP - 48, a: 0 });
    place(true);
  }

  function paint() {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1b1917'); bg.addColorStop(1, '#0e0d0c');
    g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H);

    g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, 64, 15, 0, Math.PI * 2); g.fill();

    const now = new Date();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = C.text2; g.font = `400 34px ${SANS}`;
    g.fillText(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }), W / 2, 212);
    g.fillStyle = C.text; g.font = `400 180px ${SANS}`;
    g.fillText(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), W / 2, 392);

    for (const l of live) {
      if (l.a <= 0.01) continue;
      const x = PAD, w = W - 2 * PAD, { h, lines, it } = l.card;
      g.globalAlpha = l.a;
      g.fillStyle = C.card; g.beginPath(); g.roundRect(x, l.y, w, h, 40); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      g.font = `400 26px ${MONO}`; g.fillStyle = C.text3;
      g.textAlign = 'left'; g.fillText(it.channel, x + IN, l.y + IN + 20);
      g.textAlign = 'right'; g.fillText('now', x + w - IN, l.y + IN + 20);
      g.textAlign = 'left'; g.font = `500 42px ${SANS}`; g.fillStyle = C.text;
      lines.forEach((t, i) => g.fillText(t, x + IN, l.y + IN + 28 + 20 + 40 + i * 54));
    }
    g.globalAlpha = 0.4; g.fillStyle = C.text;
    g.beginPath(); g.roundRect(W / 2 - 130, H - 44, 260, 10, 5); g.fill();
    g.globalAlpha = 1;
  }

  // Call every frame; returns true when the canvas was redrawn.
  function tick(now) {
    const m = new Date().getMinutes();
    if (m !== minute) { minute = m; dirty = true; }
    if (t0 === -2) t0 = now;
    if (t0 >= 0) {
      const p = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - p, 5);
      live.forEach(l => { l.y = l.y0 + (l.y1 - l.y0) * e; l.a = l.a0 + (l.a1 - l.a0) * e; });
      if (p === 1) { t0 = -1; live = live.filter(l => l.a1 > 0); }
      dirty = true;
    }
    if (!dirty) return false;
    dirty = false; paint();
    return true;
  }

  tick(0);
  return { canvas, push, tick, ratio: W / H };
}

// The hero phone's screen, drawn on a 2D canvas: the @geeksecurity_ profile with its real
// numbers and post covers (all from data.js). scene.js maps it onto the 3D phone; without
// WebGL the canvas is shown flat. No three.js needed here.

const W = 810, H = 1740;
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
const C = { bg: '#0d0a09', text: '#f5f0ee', text2: '#a89e99', raised: '#2a2220', red: '#eb4425' };

const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

export async function createScreen(site, posts) {
  try { await Promise.all([`800 40px ${SANS}`, `600 28px ${SANS}`, `400 28px ${SANS}`].map(f => document.fonts.load(f))); } catch {}
  const [avatar, ...covers] = await Promise.all([load('assets/avatar.jpg'), ...posts.slice(0, 9).map(p => load(`assets/posts/${p.img}.jpg`))]);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, 64, 15, 0, Math.PI * 2); g.fill();

  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = C.text; g.font = `800 42px ${SANS}`; g.fillText(site.handle, 40, 176);

  // avatar with the brand ring
  const ax = 136, ay = 310, ar = 92;
  g.strokeStyle = C.red; g.lineWidth = 6; g.beginPath(); g.arc(ax, ay, ar + 10, 0, Math.PI * 2); g.stroke();
  if (avatar) { g.save(); g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, ax - ar, ay - ar, ar * 2, ar * 2); g.restore(); }

  g.textAlign = 'center';
  [[site.posts, 'posts', 372], [site.followers, 'followers', 540], [site.following, 'following', 706]].forEach(([n, label, x]) => {
    g.fillStyle = C.text; g.font = `800 40px ${SANS}`; g.fillText(n, x, 302);
    g.fillStyle = C.text2; g.font = `400 26px ${SANS}`; g.fillText(label, x, 344);
  });

  g.textAlign = 'left';
  g.fillStyle = C.text; g.font = `600 28px ${SANS}`; g.fillText(site.name, 40, 474);
  g.font = `400 28px ${SANS}`;
  site.bio.forEach((line, i) => g.fillText(line, 40, 518 + i * 40));

  const by = 636, bw = (W - 80 - 16) / 2;
  g.fillStyle = C.red; g.beginPath(); g.roundRect(40, by, bw, 76, 18); g.fill();
  g.fillStyle = C.raised; g.beginPath(); g.roundRect(40 + bw + 16, by, bw, 76, 18); g.fill();
  g.textAlign = 'center'; g.font = `600 30px ${SANS}`; g.fillStyle = '#fff';
  g.fillText('Follow', 40 + bw / 2, by + 49);
  g.fillStyle = C.text; g.fillText('Message', 40 + bw + 16 + bw / 2, by + 49);

  // the grid, running off the bottom like a feed does
  const gap = 4, tw = (W - 2 * gap) / 3, th = tw * 1.25, gy = 764;
  covers.forEach((im, i) => {
    const x = (i % 3) * (tw + gap), y = gy + Math.floor(i / 3) * (th + gap);
    if (im) g.drawImage(im, x, y, tw, th); else { g.fillStyle = C.raised; g.fillRect(x, y, tw, th); }
  });

  return { canvas, ratio: W / H };
}

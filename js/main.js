import { SCAMS, RESOURCES, CHECKUP, SITE } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); n.innerHTML = html; return n; };
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- scam radar ---------- */
const ext = '<svg class="i" aria-hidden="true"><use href="#i-ext"/></svg>';
const radar = $('#radar-grid');
SCAMS.forEach(s => radar.append(el('li', { class: 'scam' }, `
  <span class="scam-n" aria-hidden="true">${s.n}</span>
  <div class="note"><p class="note-meta"><span>${esc(s.channel)}</span><span>now</span></p><p class="note-line">${esc(s.line)}</p></div>
  <div class="scam-body"><h3>${esc(s.name)}</h3><p>${esc(s.how)}</p><p class="rule"><span>Rule</span>${esc(s.rule)}</p></div>`)));

/* ---------- resources ---------- */
const tabs = $('#res-tabs'), grid = $('#res-grid'), blurb = $('#res-blurb');
const host = u => new URL(u).hostname.replace(/^www\./, '');
function showRes(id, focus) {
  const cat = RESOURCES.find(c => c.id === id) || RESOURCES[0];
  [...tabs.children].forEach(t => { const on = t.dataset.id === cat.id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
  blurb.textContent = cat.blurb;
  grid.setAttribute('aria-label', cat.label);
  grid.replaceChildren(...cat.items.map((it, i) => el('a', { class: 'res', href: it.url, target: '_blank', rel: 'noopener', style: `animation-delay:${Math.min(i, 5) * 40}ms` }, `
    <h3>${esc(it.name)}</h3><p>${esc(it.note)}</p>
    <span class="res-tag">${/Govt/.test(it.tag) ? '<i></i>' : ''}${esc(it.tag)}</span>
    <span class="res-host">${esc(host(it.url))}</span>${ext}`)));
  try { history.replaceState(null, '', '#' + (cat.id === RESOURCES[0].id ? 'resources' : 'resources-' + cat.id)); } catch {}
}
RESOURCES.forEach(c => {
  const t = el('button', { class: 'tab', role: 'tab', type: 'button', 'data-id': c.id }, `${esc(c.label)}<span>${c.items.length}</span>`);
  t.addEventListener('click', () => showRes(c.id));
  tabs.append(t);
});
tabs.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const ids = RESOURCES.map(c => c.id), cur = ids.indexOf($('[aria-selected="true"]', tabs).dataset.id);
  showRes(ids[(cur + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length], true);
});
const deep = location.hash.match(/^#resources-(\w+)/);
const startHash = location.hash;
showRes(deep ? deep[1] : RESOURCES[0].id);
if (deep) { history.replaceState(null, '', startHash); requestAnimationFrame(() => $('#resources').scrollIntoView()); }
else if (!startHash) history.replaceState(null, '', location.pathname);

/* ---------- checkup ---------- */
const KEY = 'gs-checkup-v1';
let done = [];
try { done = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
const list = $('#chk-list'), fill = $('#chk-fill'), count = $('#chk-count');
function paint() {
  const n = CHECKUP.filter(c => done.includes(c.id)).length;
  fill.style.transform = `scaleX(${n / CHECKUP.length})`;
  fill.classList.toggle('full', n === CHECKUP.length);
  count.textContent = `${n} of ${CHECKUP.length} done`;
}
CHECKUP.forEach(c => {
  const li = el('li', { class: 'chk' + (done.includes(c.id) ? ' done' : '') }, `
    <input type="checkbox" id="chk-${c.id}" ${done.includes(c.id) ? 'checked' : ''}>
    <div><label for="chk-${c.id}">${esc(c.text)}</label>${c.link ? `<br><a href="${c.link}" target="_blank" rel="noopener">${esc(c.linkText)}${ext}</a>` : ''}</div>`);
  $('input', li).addEventListener('change', e => {
    done = e.target.checked ? [...new Set([...done, c.id])] : done.filter(d => d !== c.id);
    li.classList.toggle('done', e.target.checked);
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch {}
    paint();
    if (done.length === CHECKUP.length && e.target.checked) toast('All seven done. Now send it to your family.');
  });
  list.append(li);
});
paint();

/* ---------- share, toast, nav, reveal ---------- */
const toastEl = $('#toast'); let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }
document.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', async () => {
  const data = { title: 'GeekSecurity', text: b.dataset.share, url: SITE.url + (b.id === 'chk-share' ? '#checkup' : '#radar') };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); toast('Link copied. Paste it in your family group.'); }
  } catch (e) { if (e && e.name !== 'AbortError') toast('Copy this link: ' + data.url); }
}));

const nav = $('#nav');
const onScroll = () => nav.classList.toggle('stuck', scrollY > 24);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

const menu = $('#menu');
menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
$('#links').addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); });

const secs = ['radar', 'resources', 'checkup', 'about'].map(id => $('#' + id));
const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
secs.forEach(s => spy.observe(s));

$('#year').textContent = new Date().getFullYear();

/* ---------- the hero phone (the page works without it) ---------- */
const stage = $('#phone'), canvas = $('#scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
(async () => {
  const { createScreen } = await import('./screen.js');
  const screen = await createScreen(SCAMS.filter(s => s.n !== 2)); // the QR sticker is not a message
  try {
    const { startPhone } = await import('./scene.js');
    startPhone(canvas, screen, { reduce });
  } catch {
    // no WebGL: show the same lock screen flat
    screen.canvas.className = 'phone-flat';
    screen.canvas.setAttribute('role', 'img');
    screen.canvas.setAttribute('aria-label', canvas.getAttribute('aria-label'));
    canvas.replaceWith(screen.canvas);
    const loop = t => { screen.tick(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  stage.classList.add('ready');
  if (reduce) return;
  let seen = true;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(stage);
  setInterval(() => { if (seen && !document.hidden) screen.push(); }, 3600);
})().catch(() => { stage.style.display = 'none'; });

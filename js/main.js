import { SCAMS, RESOURCES, CHECKUP, SITE } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); n.innerHTML = html; return n; };
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- scam radar ---------- */
const radar = $('#radar-grid');
SCAMS.forEach(s => {
  const b = el('button', { class: 'scam reveal', type: 'button', 'aria-expanded': 'false' }, `
    <span class="scam-top"><span>Scam <b>${s.n}</b> of 7</span><span>${esc(s.channel)}</span></span>
    <span class="bubble" style="display:block"><small>${esc(s.channel)} · now</small>“${esc(s.line)}”</span>
    <span class="scam-name">${esc(s.name)}</span>
    <span class="scam-hint"><i>＋</i><span class="hint-t">Tap for the rule that beats it</span></span>
    <span class="scam-more"><span style="display:block"><span class="how">${esc(s.how)}</span>
      <span class="rule" style="display:block"><small>The rule</small>${esc(s.rule)}</span></span></span>`);
  b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open));
    $('.hint-t', b).textContent = open ? 'Tap for the rule that beats it' : 'Got it';
  });
  radar.append(b);
});

/* ---------- resources ---------- */
const tabs = $('#res-tabs'), grid = $('#res-grid'), blurb = $('#res-blurb');
const host = u => new URL(u).hostname.replace(/^www\./, '');
function showRes(id, focus) {
  const cat = RESOURCES.find(c => c.id === id) || RESOURCES[0];
  [...tabs.children].forEach(t => { const on = t.dataset.id === cat.id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
  blurb.textContent = cat.blurb;
  grid.setAttribute('aria-label', cat.label);
  grid.replaceChildren(...cat.items.map((it, i) => el('a', { class: 'res', href: it.url, target: '_blank', rel: 'noopener', style: `animation-delay:${i * 45}ms` }, `
    <span class="res-top"><span class="res-n">${String(i + 1).padStart(2, '0')}</span><span class="res-tag${/Govt/.test(it.tag) ? ' gov' : ''}">${esc(it.tag)}</span></span>
    <h3>${esc(it.name)}</h3><p>${esc(it.note)}</p>
    <span class="res-host"><span>${esc(host(it.url))}</span><span aria-hidden="true">↗</span></span>`)));
  try { history.replaceState(null, '', '#' + (cat.id === RESOURCES[0].id ? 'resources' : 'resources-' + cat.id)); } catch {}
}
RESOURCES.forEach(c => {
  const t = el('button', { class: 'tab', role: 'tab', type: 'button', 'data-id': c.id }, `${esc(c.label)} <span style="opacity:.6">${c.items.length}</span>`);
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
const list = $('#chk-list'), ringFg = $('#ring-fg'), ringNum = $('#ring-num'), C = 2 * Math.PI * 52;
function paint() {
  const n = CHECKUP.filter(c => done.includes(c.id)).length;
  ringFg.style.strokeDashoffset = C * (1 - n / CHECKUP.length);
  ringFg.classList.toggle('full', n === CHECKUP.length);
  ringNum.textContent = `${n}/${CHECKUP.length}`;
  $('#ring-label').textContent = n === CHECKUP.length ? 'all done ✓' : 'done';
}
CHECKUP.forEach(c => {
  const li = el('li', { class: 'chk' + (done.includes(c.id) ? ' done' : '') }, `
    <input type="checkbox" id="chk-${c.id}" ${done.includes(c.id) ? 'checked' : ''}>
    <div><label for="chk-${c.id}">${esc(c.text)}</label>${c.link ? `<br><a href="${c.link}" target="_blank" rel="noopener">${esc(c.linkText)} ↗</a>` : ''}</div>`);
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

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach((n, i) => { n.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(n); });

const secs = ['radar', 'resources', 'checkup', 'about'].map(id => $('#' + id));
const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
secs.forEach(s => spy.observe(s));

$('#year').textContent = new Date().getFullYear();

/* ---------- 3D scene (the page works without it) ---------- */
const canvas = $('#scene');
const boot = () => import('./scene.js').then(m => m.startScene(canvas)).catch(() => { canvas.style.display = 'none'; });
('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 900 }) : setTimeout(boot, 200);

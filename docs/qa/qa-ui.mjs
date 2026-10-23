// ตรวจหน้าจออัตโนมัติ PHITLOK NEXUS (v2.4)
// ใช้: เปิดเซิร์ฟเวอร์ก่อน (npm start) แล้วรัน  BASE=http://localhost:3000 node docs/qa/qa-ui.mjs
// ต้องมี playwright: npm i -D playwright && npx playwright install chromium
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || 'docs/screens';
fs.mkdirSync(OUT, { recursive: true });

// เกณฑ์ผ่าน (ปรับได้ แต่ต้องคุยกับทีมก่อน)
const LIMITS = {
  stickyChrome: { m: 112, d: 72 },          // ความสูงรวมของแถบที่ติดจอ (px)
  visibleChars: { '/': 2200, '/app#tourist': 3800, '/app#merchant': 3000, '/app#admin': 4200, '/credits': 6000 },
  labelOverlaps: 0,
  labelAnchorMaxPx: 72,                      // ป้ายต้องอยู่ห่างจุดจริงไม่เกินนี้ (มีเส้นชี้)
  smallTargets: 0,                           // ปุ่มที่เล็กกว่า 44px (ไม่นับลิงก์ในเนื้อความ)
  tinyText: 0,                               // ตัวหนังสือที่เล็กกว่า 14px (ยกเว้น .fineprint)
};
const PAGES = ['/', '/app#tourist', '/app#merchant', '/app#admin', '/credits'];
const SIZES = [[390, 844, 'm'], [1440, 900, 'd']];
const IGNORE_CONSOLE = /swiftshader|GroupMarkerNotSet|WebGL/i;

const b = await chromium.launch();
const fails = [];
const rows = [];
for (const theme of ['light', 'dark']) {
  for (const [w, h, tag] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    for (const path of PAGES) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { if (!IGNORE_CONSOLE.test(m.text())) errs.push(m.text().slice(0, 160)); } });
      p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 160)));
      await p.goto(BASE + path + (path.includes('#') ? '' : '') , { waitUntil: 'networkidle' });
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('theme', t); } catch {} }, theme);
      await p.waitForTimeout(2000);
      const name = `${OUT}/${theme}-${tag}${path.replace(/[^a-z]/g, '_')}`;
      await p.screenshot({ path: `${name}-top.png` });
      // เลื่อนทั้งหน้าเพื่อให้รูปแบบ lazy โหลดครบ
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
      await p.waitForTimeout(800);
      const stage = await p.$('#map-stage');
      if (stage && await stage.isVisible()) { await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await stage.screenshot({ path: `${name}-map.png` }); }
      const r = await p.evaluate(() => {
        const vis = (el) => { const q = el.getBoundingClientRect(); const s = getComputedStyle(el); return q.width > 0 && q.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
        scrollTo(0, 0);
        const sticky = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e).position; return (s === 'sticky' || s === 'fixed') && vis(e) && !e.closest('#map-stage') && !e.closest('dialog,[role=dialog]'); });
        const top = sticky.filter((e) => e.getBoundingClientRect().top < 4).reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), 0);
        const bottom = sticky.filter((e) => e.getBoundingClientRect().bottom > innerHeight - 4).reduce((a, e) => a + e.getBoundingClientRect().height, 0);
        const controls = [...document.querySelectorAll('button, [role=button], a.btn, .chip, input, select')].filter(vis).filter((e) => !e.closest('p, li > p'));
        const small = controls.filter((e) => { const q = e.getBoundingClientRect(); return q.height < 44 || q.width < 44; }).map((e) => (e.getAttribute('aria-label') || e.innerText || e.className).toString().slice(0, 30));
        const tiny = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim().length > 2 && vis(e) && !e.closest('.fineprint, footer') && parseFloat(getComputedStyle(e).fontSize) < 14).map((e) => e.textContent.trim().slice(0, 30));
        const imgs = [...document.images].filter(vis).filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.alt || i.currentSrc);
        const labels = [...document.querySelectorAll('#map-labels .map-label')].filter(vis).map((l) => l.getBoundingClientRect());
        let overlaps = 0;
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], c = labels[j]; if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) overlaps++; }
        const dbg = window.__PHITLOK_DEBUG__?.labelAnchors?.() || [];
        const far = dbg.filter((d) => d.visible && Math.hypot(d.lx - d.ax, d.ly - d.ay) > 72).map((d) => d.key);
        const legend = document.querySelector('.map-legend'); let legendCover = 0;
        if (legend && vis(legend)) { const L = legend.getBoundingClientRect(); legendCover = labels.filter((a) => a.left < L.right && L.left < a.right && a.top < L.bottom && L.top < a.bottom).length; }
        return { chrome: Math.round(top + bottom), chars: document.querySelector('main')?.innerText.replace(/\s+/g, '').length ?? document.body.innerText.replace(/\s+/g, '').length, scrollW: document.documentElement.scrollWidth, vw: innerWidth, small, tiny, imgs, overlaps, far, legendCover, debug: dbg.length };
      });
      const L = LIMITS;
      const chk = (ok, msg) => { if (!ok) fails.push(`[${theme} ${tag} ${path}] ${msg}`); };
      chk(r.scrollW <= r.vw, `เลื่อนจอแนวนอนได้ (${r.scrollW}px > ${r.vw}px)`);
      chk(r.chrome <= L.stickyChrome[tag], `แถบติดจอสูง ${r.chrome}px (เกิน ${L.stickyChrome[tag]})`);
      chk(r.chars <= (L.visibleChars[path] ?? 99999), `ข้อความ ${r.chars} ตัวอักษร (เกิน ${L.visibleChars[path]})`);
      chk(r.small.length <= L.smallTargets, `ปุ่มเล็กกว่า 44px ${r.small.length} จุด เช่น ${r.small.slice(0, 4).join(' | ')}`);
      chk(r.tiny.length <= L.tinyText, `ตัวหนังสือเล็กกว่า 14px ${r.tiny.length} จุด เช่น ${r.tiny.slice(0, 4).join(' | ')}`);
      chk(r.imgs.length === 0, `รูปเสีย ${r.imgs.length} รูป: ${r.imgs.slice(0, 3).join(' | ')}`);
      chk(r.overlaps <= L.labelOverlaps, `ป้ายบนแผนที่ซ้อนกัน ${r.overlaps} คู่`);
      chk(r.legendCover === 0, `กล่องสัญลักษณ์บังป้าย ${r.legendCover} ป้าย`);
      chk(r.far.length === 0, `ป้ายอยู่ไกลจุดจริงเกิน ${L.labelAnchorMaxPx}px: ${r.far.join(', ')}`);
      if (path === '/app#tourist') chk(r.debug > 0, 'ยังไม่มี window.__PHITLOK_DEBUG__.labelAnchors() ให้ตรวจตำแหน่งป้าย');
      chk(errs.length === 0, `console มี error/warning ${errs.length}: ${errs.slice(0, 2).join(' | ')}`);
      rows.push({ theme, tag, path, chrome: r.chrome, chars: r.chars, small: r.small.length, tiny: r.tiny.length, imgs: r.imgs.length, overlaps: r.overlaps });
      await p.close();
    }
    await ctx.close();
  }
}
await b.close();
console.table(rows);
if (fails.length) { console.log(`\nไม่ผ่าน ${fails.length} ข้อ`); for (const f of fails) console.log(' ✗ ' + f); process.exit(1); }
console.log('\nผ่านทุกข้อ ✓');

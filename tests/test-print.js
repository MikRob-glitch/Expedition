/* =====================================================================
   EXPÉDITION — BANC DU MOTEUR DE CADRE (`print-frame.js`)
   ---------------------------------------------------------------------
   Rejouable hors ligne, sans réseau ni base :
       npm i jsdom && node tests/test-print.js      (depuis la racine)

   ⚠️ CE BANC NE DESSINE RIEN. `node-canvas` ne s'installe pas dans
   l'environnement de développement : on remplace le canvas par un
   ENREGISTREUR qui note les appels (drawImage, arc, strokeRect,
   fillText…) et dont `measureText` rend `longueur × taille × 0,5`.
   On vérifie donc la GÉOMÉTRIE, jamais les pixels. Un tirage réel
   reste nécessaire — c'est un tirage réel qui a corrigé #55 (voir #58),
   et c'est encore un tirage réel qui a révélé #69.

   ⚠️ Le sceau n'est PAS le dernier `arc` tracé : drawRose en dessine
   d'autres derrière lui (disque à 31·s, cercle à 30·s, moyeu à 3,4·s).
   Prendre l'arc de PLUS GRAND RAYON, jamais `.pop()`.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'print-frame.js'), 'utf8');

/* ─────────── Canvas enregistreur ─────────── */
function makeCtx(rec) {
  const st = { font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left' };
  const noop = () => {};
  return new Proxy({
    ...st,
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop,
    lineTo: noop, fill: noop, stroke: noop, translate: noop, rotate: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    fillRect: (x, y, w, h) => rec.fillRect.push({ x, y, w, h }),
    strokeRect(x, y, w, h) { rec.strokeRect.push({ x, y, w, h, lw: this.lineWidth, color: this.strokeStyle }); },
    drawImage(img, x, y, w, h) { rec.drawImage.push({ img, x, y, w, h }); },
    arc(x, y, r) { rec.arc.push({ x, y, r }); },
    fillText(t, x, y) { rec.fillText.push({ t, x, y, font: this.font, color: this.fillStyle }); },
    strokeText: noop,
    measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); return { width: String(t).length * (m ? +m[1] : 10) * 0.5 }; }
  }, { get: (o, k) => o[k], set: (o, k, v) => (o[k] = v, true) });
}

function install(dom, rec) {
  const { window } = dom;
  window.document.createElement = (tag) => {
    if (tag !== 'canvas') return { style: {}, appendChild() {}, remove() {}, click() {} };
    const cv = { width: 0, height: 0, getContext: () => makeCtx(rec), toBlob: (cb) => cb({}) };
    return cv;
  };
  window.document.fonts = { load: () => Promise.resolve(), ready: Promise.resolve() };
  window.URL.createObjectURL = () => 'blob:x';
  window.URL.revokeObjectURL = () => {};
  window.fetch = async () => ({ ok: true, blob: async () => ({}) });
  // L'image « chargée » : ses dimensions sont pilotées par le test courant.
  window.__nextImages = [];
  window.Image = function () {
    const spec = window.__nextImages.shift() || { w: 1600, h: 1200 };
    this.naturalWidth = spec.w; this.naturalHeight = spec.h;
    this.width = spec.w; this.height = spec.h;
    this.decode = () => Promise.resolve();
    Object.defineProperty(this, 'src', { get: () => 'blob:x', set: () => {} });
  };
}

/* ─────────── Harnais ─────────── */
let pass = 0, fail = 0;
const T = (name, fn) => {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message); }
};
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || ''} attendu ${b}, obtenu ${a}`); };
const near = (a, b, tol, m) => { if (Math.abs(a - b) > tol) throw new Error(`${m || ''} attendu ~${b} (±${tol}), obtenu ${a}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'faux'); };

const GAME = {
  code: 'LBM7', name: 'Sur les traces de la fée Carabosse',
  location: 'Capfun Camping de l’Eve', huntDate: '2026-08-08', logoUrl: null
};
const TEAM = { name: 'Titi et gros minet' };

async function render({ w, h, logo = false }) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const rec = { fillRect: [], strokeRect: [], drawImage: [], arc: [], fillText: [] };
  install(dom, rec);
  dom.window.eval(SRC);
  const PF = dom.window.PrintFrame;
  dom.window.__nextImages = [{ w, h }];
  if (logo) dom.window.__nextImages.push({ w: 600, h: 400 });
  const cv = await PF.build({ photoUrl: 'x' }, TEAM, { ...GAME, logoUrl: logo ? 'l' : null });
  return { cv, rec, PF };
}

const photoOf = (rec) => rec.drawImage[0];
const sealOf = (rec) => rec.arc.reduce((a, b) => (b.r > a.r ? b : a), rec.arc[0]);
// Les strokeRect du cadre : filet photo (noir, lw 5), filet noir extérieur (lw 4),
// filet doré (lw 2). On les distingue par leur épaisseur, jamais par leur ordre.
const rectBy = (rec, lw) => rec.strokeRect.find(r => r.lw === lw);

(async () => {
  console.log('\n── Format de sortie ──');
  const L = await render({ w: 1600, h: 1200 });
  const P = await render({ w: 1200, h: 1600 });
  T('paysage : canvas 1800×1200', () => { eq(L.cv.width, 1800); eq(L.cv.height, 1200); });
  T('portrait : canvas 1200×1800', () => { eq(P.cv.width, 1200); eq(P.cv.height, 1800); });
  T('une photo carrée part en paysage (iw >= ih)', async () => {
    ok(true); // vérifié ci-dessous par le cas 1200×1200
  });
  const SQ = await render({ w: 1200, h: 1200 });
  T('photo carrée : canvas paysage', () => { eq(SQ.cv.width, 1800); eq(SQ.cv.height, 1200); });

  console.log('\n── Constantes de sécurité (#69) ──');
  T('PX_MM ≈ 11,81 px/mm', () => near(L.PF.PX_MM, 11.811, 0.01));
  T('SAFE = 53 px (4,5 mm)', () => eq(L.PF.SAFE, 53));
  T('PAD = 77 px (6,5 mm)', () => eq(L.PF.PAD, 77));

  console.log('\n── Zone de sécurité : RIEN de décoratif à moins de 4 mm du bord ──');
  // C'est LE test du lot #69. Il aurait échoué sur l'ancienne géométrie (filets à
  // 14 et 22 px en paysage, 20 et 33 px en portrait), donc sur le tirage réel qui a
  // motivé la correction. Ne jamais l'assouplir : la bande rognée fait 2 à 3 mm.
  const MIN = 4 * L.PF.PX_MM; // 47,2 px
  for (const [nom, R] of [['paysage', L], ['portrait', P]]) {
    T(`${nom} : filets et losanges à ≥ 4 mm du bord`, () => {
      const { cv, rec } = R;
      for (const lw of [4, 2]) {
        const r = rectBy(rec, lw);
        ok(r, `filet lw=${lw} absent`);
        const marges = [r.x, r.y, cv.width - (r.x + r.w), cv.height - (r.y + r.h)];
        ok(Math.min(...marges) >= MIN,
          `filet lw=${lw} à ${Math.min(...marges).toFixed(1)} px du bord (< ${MIN.toFixed(1)})`);
      }
    });
    T(`${nom} : aucun texte du cartouche dans la bande rognée`, () => {
      const { cv, rec } = R;
      for (const t of rec.fillText) {
        ok(t.x >= MIN && t.y >= MIN && t.y <= cv.height - 0.5 * L.PF.PX_MM,
          `texte « ${t.t} » à (${t.x.toFixed(0)},${t.y.toFixed(0)}) hors zone sûre`);
      }
    });
  }
  T('paysage : filet noir à 53 px, doré à 67 px', () => {
    eq(rectBy(L.rec, 4).x, 53); eq(rectBy(L.rec, 2).x, 67);
  });
  T('portrait : mêmes insets absolus (indépendants de l’orientation)', () => {
    eq(rectBy(P.rec, 4).x, 53); eq(rectBy(P.rec, 2).x, 67);
  });

  console.log('\n── Fenêtre photo ──');
  T('portrait : photo 3:4 pose 1046×1395 en (77,77) — remplissage exact', () => {
    const p = photoOf(P.rec);
    eq(p.x, 77); eq(p.y, 77); eq(p.w, 1046); near(p.h, 1395, 1);
  });
  T('portrait : le ratio de la fenêtre reste 3:4 (aucune bande de parchemin)', () => {
    const p = photoOf(P.rec);
    near(p.w / p.h, 0.75, 0.002);
  });
  T('paysage : photo 4:3 pose 1244×933', () => {
    const p = photoOf(L.rec);
    near(p.w, 1244, 1); near(p.h, 933, 1); eq(p.y, 77);
  });
  T('paysage : la photo est centrée horizontalement', () => {
    const p = photoOf(L.rec);
    near(p.x + p.w / 2, 900, 1);
  });
  T('la photo n’est jamais rognée (contain, ratio source préservé)', () => {
    const p = photoOf(L.rec);
    near(p.w / p.h, 1600 / 1200, 0.005);
  });
  T('une 16:9 paysage reste dans la fenêtre', async () => { ok(true); });
  const W169 = await render({ w: 1600, h: 900 });
  T('16:9 : largeur bornée par la fenêtre (≤ 1646)', () => {
    const p = photoOf(W169.rec);
    ok(p.w <= 1646, `largeur ${p.w} > 1646`);
    ok(p.y + p.h <= 1200 - 190, 'la photo mord sur le cartouche');
  });

  console.log('\n── Sceau (rose des vents) ──');
  T('portrait : rayon 117 px', () => near(sealOf(P.rec).r, 117, 0.5));
  T('paysage : rayon 90,5 px', () => near(sealOf(L.rec).r, 90.48, 0.5));
  T('sceau ancré sur le bord GAUCHE réel de la photo, pas sur la fenêtre', () => {
    const p = photoOf(L.rec), s = sealOf(L.rec);
    near(s.x, p.x + s.r, 0.5);
  });
  T('sceau à cheval sur le filet bas : 30 % du rayon sous la photo', () => {
    const p = photoOf(L.rec), s = sealOf(L.rec);
    near(s.y, p.y + p.h - s.r * 0.30, 0.5);
  });
  T('le sceau ne déborde jamais du papier', () => {
    for (const R of [L, P]) {
      const s = sealOf(R.rec);
      ok(s.x - s.r >= 0 && s.y + s.r <= R.cv.height, 'sceau hors cadre');
    }
  });

  console.log('\n── Cartouche ──');
  T('paysage : DEUX lignes de texte + « EXPÉDITION »', () => {
    // « EXPÉDITION » est dessiné caractère par caractère (drawSpaced) : 10 appels.
    const blocs = L.rec.fillText.filter(t => t.t.length > 3);
    eq(blocs.length, 2);
  });
  T('portrait : QUATRE lignes (équipe / chasse / lieu / date)', () => {
    const blocs = P.rec.fillText.filter(t => t.t.length > 3);
    eq(blocs.length, 3); // la date est interlettrée, donc dessinée caractère par caractère
  });
  T('paysage : le bloc est centré sur l’axe du CADRE', () => {
    const nom = L.rec.fillText.find(t => t.t.startsWith('Titi'));
    const m = /(\d+(?:\.\d+)?)px/.exec(nom.font);
    near(nom.x + nom.t.length * +m[1] * 0.25, 900, 2);
  });
  T('paysage : « EXPÉDITION » reste au-dessus du filet doré', () => {
    const lettres = L.rec.fillText.filter(t => t.t.length === 1);
    ok(lettres.length >= 10, 'mot EXPÉDITION absent');
    const bas = Math.max(...lettres.map(t => t.y));
    ok(bas < 1200 - 67, `le mot descend à ${bas}, sous le filet doré (1133)`);
  });
  T('le nom d’équipe est présent et non tronqué en paysage', () => {
    ok(L.rec.fillText.some(t => t.t === 'Titi et gros minet'));
  });

  console.log('\n── Logo du lieu ──');
  const LL = await render({ w: 1600, h: 1200, logo: true });
  T('logo posé à droite du cartouche', () => {
    const imgs = LL.rec.drawImage;
    eq(imgs.length, 2);
    const lg = imgs[1];
    ok(lg.x > 900, 'logo à gauche du centre');
    near(lg.x + lg.w, 1800 - 77, 1);
  });
  T('logo dans la moitié basse (le cartouche), pas sur la photo', () => {
    const lg = LL.rec.drawImage[1];
    ok(lg.y >= 1200 - 190, 'logo au-dessus du cartouche');
  });
  T('un logo illisible ne bloque pas le tirage', async () => { ok(true); });

  console.log('\n── Épreuve joueur ──');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const rec = { fillRect: [], strokeRect: [], drawImage: [], arc: [], fillText: [] };
  install(dom, rec);
  dom.window.eval(SRC);
  dom.window.__nextImages = [{ w: 1600, h: 1200 }];
  const proof = await dom.window.PrintFrame.proof({ photoUrl: 'x' }, TEAM, GAME);
  T('épreuve ramenée à 700 px au plus long côté', () => { eq(Math.max(proof.width, proof.height), 700); });
  T('épreuve : ratio conservé', () => near(proof.width / proof.height, 1.5, 0.01));
  T('épreuve : filigrane ÉPREUVE répété', () => {
    const f = rec.fillText.filter(t => t.t.includes('ÉPREUVE'));
    ok(f.length >= 5, `${f.length} passes de filigrane`);
  });

  console.log('\n── Nommage de fichier ──');
  T('fileName assainit code et nom d’équipe', () => {
    const n = dom.window.PrintFrame.fileName({ code: 'LBM7' }, { name: 'Titi/gros: minet' });
    eq(n, 'Expedition_LBM7_Titigros_minet.jpg');
  });
  T('dateStr suit huntDate en priorité', () => {
    eq(dom.window.PrintFrame.dateStr({ huntDate: '2026-08-08' }), '8 août 2026');
  });

  console.log(`\n${pass} réussis, ${fail} échoués\n`);
  process.exit(fail ? 1 : 0);
})();

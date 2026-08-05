/* =====================================================================
   EXPÉDITION — MOTEUR DU CADRE DE TIRAGE (`print-frame.js`)
   ---------------------------------------------------------------------
   Source de vérité UNIQUE du tirage souvenir, chargée par `expedition.html`
   ET par `regie.html`. Extrait de `expedition.html` le 2026-07-30 (#59)
   pour que la console puisse produire les tirages sans recopier ~250 lignes
   de composition canvas remaniées trois fois (#41, #42, #44, #55, #58).

   ⚠️ NE JAMAIS DUPLIQUER CE FICHIER. Deux cadres « Expédition » qui
   divergent ne se verraient qu'à l'impression, donc trop tard.

   Aucune dépendance : ni Supabase, ni STATE, ni DOM applicatif. Tout ce
   dont le cadre a besoin est passé en argument (`sub`, `team`, `game`).
   Le seul contrat externe est la forme des objets :
     sub  { photoUrl }
     team { name }
     game { code, name, location, logoUrl, huntDate, endedAt, createdAt }

   ⚠️ Les photos sont chargées par fetch → blob → objectURL. Une <img>
   pointant directement le Storage (autre origine) SOUILLERAIT le canvas
   et ferait échouer toBlob()/toDataURL().
   ⚠️ Les polices doivent être préchargées (`ensureFonts`) sinon le canvas
   dessine en repli système.
   ===================================================================== */
(function (root) {
'use strict';

const Q = 0.92;                        // qualité JPEG du tirage
const LONG = 1800, SHORT = 1200;       // 15×10 cm à ~300 dpi : format de sortie FIXE
const PROOF_LONG = 700;                // épreuve joueur (basse définition + filigrane)

function dateStr(g){
  const d = g?.huntDate ? new Date(g.huntDate+'T12:00:00')
          : g?.endedAt ? new Date(g.endedAt)
          : g?.createdAt ? new Date(g.createdAt) : new Date();
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}
function safeFile(s){ return (s||'').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_').trim() || '_'; }
function fileName(g, team){
  return `Expedition_${safeFile(g?.code)}_${safeFile(team?.name||'equipe')}.jpg`;
}

// ────── Chargement d'une photo sans souiller le canvas ──────
async function loadImage(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP '+r.status);
  const objUrl = URL.createObjectURL(await r.blob());
  const img = new Image();
  img.src = objUrl;
  try{
    if(img.decode) await img.decode();
    else await new Promise((res,rej)=>{ img.onload=res; img.onerror=()=>rej(new Error('image illisible')); });
  }catch(e){ URL.revokeObjectURL(objUrl); throw e; }
  return img;
}

// ────── Rose des vents (mêmes tracés que icons/favicon.svg, repère 64×64) ──────
const ROSE_STAR = [[32,5],[34.1,26.92],[40.84,23.16],[37.08,29.9],[59,32],[37.08,34.1],[40.84,40.84],[34.1,37.08],[32,59],[29.9,37.08],[23.16,40.84],[26.92,34.1],[5,32],[26.92,29.9],[23.16,23.16],[29.9,26.92]];
const ROSE_GOLD = [[[40.84,23.16],[37.08,29.9],[34.1,26.92]],[[40.84,40.84],[34.1,37.08],[37.08,34.1]],[[23.16,40.84],[26.92,34.1],[29.9,37.08]],[[23.16,23.16],[29.9,26.92],[26.92,29.9]]];
const ROSE_NORTH = [[32,5],[34.1,26.92],[29.9,26.92]];
function drawRose(ctx, cx, cy, R){
  const s = R/31, TAU = Math.PI*2;
  const poly = pts => { ctx.beginPath(); pts.forEach((p,i)=>{ const x=cx+(p[0]-32)*s, y=cy+(p[1]-32)*s; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.closePath(); };
  ctx.beginPath(); ctx.arc(cx,cy,31*s,0,TAU); ctx.fillStyle='#f4ede0'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,30*s,0,TAU); ctx.strokeStyle='#1a1815'; ctx.lineWidth=2.2*s; ctx.stroke();
  poly(ROSE_STAR); ctx.fillStyle='#1a1815'; ctx.fill();
  ctx.fillStyle='#a0832f'; ROSE_GOLD.forEach(g=>{ poly(g); ctx.fill(); });
  poly(ROSE_NORTH); ctx.fillStyle='#8b2e2e'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,3.4*s,0,TAU); ctx.fillStyle='#a0832f'; ctx.fill();
  ctx.lineWidth=Math.max(1,1*s); ctx.strokeStyle='#1a1815'; ctx.stroke();
}

// ────── Typo canvas : ajustement, ellipse, interlettrage manuel ──────
// (ctx.letterSpacing n'est pas supporté partout → on dessine caractère par caractère.)
function fitFont(ctx, text, maxW, mk, size, min){
  let s = size;
  while(s > min){ ctx.font = mk(s); if(ctx.measureText(text).width <= maxW) return s; s -= Math.max(1, Math.round(s*0.05)); }
  ctx.font = mk(min); return min;
}
function ellipsize(ctx, t, maxW){
  if(!t) return '';
  if(ctx.measureText(t).width <= maxW) return t;
  let s = t;
  while(s.length > 1 && ctx.measureText(s+'…').width > maxW) s = s.slice(0,-1);
  return s+'…';
}
function spacedWidth(ctx, t, sp){ let w=0; for(const ch of t) w += ctx.measureText(ch).width + sp; return Math.max(0, w-sp); }
function drawSpaced(ctx, t, x, y, sp, align){
  let cx = align==='right' ? x - spacedWidth(ctx,t,sp) : align==='center' ? x - spacedWidth(ctx,t,sp)/2 : x;
  for(const ch of t){ ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
}
async function ensureFonts(){
  if(!document.fonts?.load) return;
  try{
    await Promise.all([
      document.fonts.load('800 80px Fraunces'),
      document.fonts.load('italic 600 80px Fraunces'),
      document.fonts.load('600 80px "Geist Mono"'),
      document.fonts.ready
    ]);
  }catch(_){}
}

// ────── Le cadre ──────
// Le tirage complet (photo + cadre) sort au format EXACT 10×15 cm — 1200×1800 px en
// portrait, 1800×1200 en paysage (~300 dpi) selon l'orientation de la photo. Le labo
// imprime donc plein format, sans recadrage ni bande blanche de son côté.
// La photo est posée ENTIÈRE (« contain », jamais rognée) dans la fenêtre ; le parchemin
// absorbe la différence de ratio. Cas remarquable : une photo portrait 3:4 (sortie
// standard de compressImage) remplit la fenêtre portrait exactement, sans marge.
async function build(sub, team, g){
  if(!g) throw new Error('chasse manquante');
  await ensureFonts();
  const img = await loadImage(sub.photoUrl);
  // Logo du lieu : facultatif et jamais bloquant — un échec de chargement ne doit pas
  // priver l'équipe de son tirage.
  const venue = g.logoUrl ? await loadImage(g.logoUrl).catch(e=>{ console.warn('Logo du lieu', e); return null; }) : null;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if(!iw || !ih){ URL.revokeObjectURL(img.src); throw new Error('image vide'); }

  const landscape = iw >= ih;
  const W = landscape ? LONG : SHORT;
  const H = landscape ? SHORT : LONG;
  // Marge : 60 px (≈5 mm) en portrait, 40 en paysage. En paysage la photo est limitée
  // par la HAUTEUR (elle n'atteint jamais les bords latéraux), donc chaque pixel rendu
  // par la marge et par le cartouche agrandit la fenêtre — c'est le seul levier.
  const pad  = landscape ? 40 : Math.round(SHORT*0.05);
  // Cartouche : 300 px en portrait → fenêtre 1080×1440 = 3:4 exact (zéro marge pour une
  // photo standard) ; 150 px en paysage, où le texte tient sur DEUX lignes (un bandeau
  // de 1800 px de large n'a aucune raison d'empiler quatre lignes : à 230 px le bloc
  // était déjà mis à l'échelle à 0,82 faute de place verticale). Photo 4:3 en paysage :
  // 1347×1010 au lieu de 1213×910, soit +23 % de surface.
  const foot = landscape ? 150 : 300;
  const aw = W - pad*2, ah = H - pad - foot;   // fenêtre disponible pour la photo

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fond parchemin + légère vignette (même esprit que l'appli)
  ctx.fillStyle = '#f4ede0'; ctx.fillRect(0,0,W,H);
  const vg = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.28, W/2,H/2,Math.max(W,H)*0.78);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(110,85,45,0.13)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

  // Photo entière, centrée dans la fenêtre (agrandie si besoin : un tirage à trou serait pire)
  const sc = Math.min(aw/iw, ah/ih);
  const dw = Math.round(iw*sc), dh = Math.round(ih*sc);
  const dx = pad + Math.round((aw-dw)/2), dy = pad + Math.round((ah-dh)/2);
  ctx.drawImage(img, dx, dy, dw, dh);
  URL.revokeObjectURL(img.src);

  // Filet d'encadrement collé aux bords RÉELS de la photo dessinée
  const lwP = 5;
  ctx.strokeStyle = '#1a1815'; ctx.lineWidth = lwP;
  ctx.strokeRect(dx - lwP/2, dy - lwP/2, dw + lwP, dh + lwP);

  // Double filet extérieur + losanges d'angle
  const i1 = Math.round(pad*0.34), lw1 = 4;
  ctx.lineWidth = lw1; ctx.strokeStyle = '#1a1815';
  ctx.strokeRect(i1, i1, W-i1*2, H-i1*2);
  const i2 = Math.round(pad*0.55), lw2 = 2;
  ctx.lineWidth = lw2; ctx.strokeStyle = '#a0832f';
  ctx.strokeRect(i2, i2, W-i2*2, H-i2*2);
  const dR = 13;
  ctx.fillStyle = '#a0832f';
  [[i1,i1],[W-i1,i1],[i1,H-i1],[W-i1,H-i1]].forEach(([x,y])=>{
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4); ctx.fillRect(-dR/2,-dR/2,dR,dR); ctx.restore();
  });

  // ── Cartouche ──
  // Gauche : le logo maison en SCEAU à cheval sur le filet bas de la photo.
  // Droite : le logo du lieu. Entre les deux : le bloc de texte, centré.
  const y0 = H - foot;
  // Le sceau : la rose des vents porte déjà son propre disque parchemin opaque
  // (drawRose remplit un cercle #f4ede0 cerclé de noir), donc elle reste lisible sur
  // n'importe quelle photo, claire comme sombre — aucune pastille à ajouter.
  // ⚠ Dimensionné sur le PETIT CÔTÉ du tirage, jamais sur `foot` : sinon le cartouche
  // paysage ramené à 150 px rapetissait la marque, l'inverse du but recherché.
  const brandSize = SHORT*0.0175, brandSp = brandSize*0.12;
  const gap = brandSize*1.05;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${brandSize}px "Geist Mono", monospace`;
  const brandW = spacedWidth(ctx, 'EXPÉDITION', brandSp);
  const sealR = SHORT*(landscape ? 0.0754 : 0.0975);
  // Bord gauche du disque COLLÉ au filet de la photo, et 35 % du diamètre sous ce filet
  // (le reste mord sur la photo). ⚠ Ancré sur dx/dy/dw/dh, jamais sur la fenêtre : en
  // paysage une 4:3 ne remplit pas la largeur, un ancrage sur la fenêtre poserait le
  // sceau sur le parchemin, à côté de la photo.
  const sealX = dx + sealR, sealY = (dy + dh) - sealR*0.30;
  // Obstacles : (haut, bas, bord droit). Une ligne de texte dont la bande verticale
  // croise un obstacle démarre après lui ; les autres repartent de la marge.
  const obst = [[sealY - sealR, sealY + sealR, sealX + sealR]];
  // « EXPÉDITION » sous la rose dans LES DEUX orientations. ⚠️ Corrige #55 (4), qui le
  // plaçait à droite en paysage : mesuré sur un tirage réel, l'empilement tient (le mot
  // finit à ~1157 px pour un filet doré à 1178) ET il libère 171 px à gauche, ce qui
  // permet enfin de centrer le cartouche paysage au milieu du cadre.
  ctx.fillStyle = '#a0832f';
  drawSpaced(ctx, 'EXPÉDITION', sealX, sealY + sealR + gap + brandSize*0.8, brandSp, 'center');
  obst.push([sealY + sealR + gap, sealY + sealR + gap + brandSize, sealX + brandW/2]);

  // Logo du lieu, calé à droite du cartouche. La place qu'il occupe est retirée de la
  // largeur des textes — jamais l'inverse.
  let rightW = 0;
  if(venue && venue.width && venue.height){
    const bh = foot*0.62, bw = Math.min(foot*(landscape ? 1.60 : 1.30), W*(landscape ? 0.16 : 0.20));
    const vs = Math.min(bw/venue.width, bh/venue.height);
    const vw = Math.round(venue.width*vs), vh = Math.round(venue.height*vs);
    ctx.drawImage(venue, W - pad - vw, y0 + Math.round((foot-vh)/2), vw, vh);
    URL.revokeObjectURL(venue.src);
    rightW = vw + foot*0.16;
  }

  // Bloc de texte : équipe / chasse / lieu / date — le lieu a SA propre ligne (accolé au
  // nom de chasse, il se faisait tronquer dès qu'un logo mangeait de la largeur).
  // On mesure la hauteur totale avant de dessiner et on met le bloc à l'échelle s'il
  // déborde : quatre lignes ne tiennent pas aux tailles nominales dans le cartouche
  // paysage (230 px contre 300 en portrait).
  // Paysage : DEUX lignes (le bandeau est large et court). Portrait : quatre lignes,
  // le lieu gardant la sienne (accolé au nom de chasse il se faisait tronquer, #44).
  const lines = landscape
    ? [
        { t: team?.name || 'Équipe', size: foot*0.42, min: foot*0.18, color:'#1a1815', gap: foot*0.13,
          font: s=>`800 ${s}px Fraunces, Georgia, serif` },
        { t: [g.name, g.location, dateStr(g)].filter(Boolean).join(' · '),
          size: foot*0.185, min: foot*0.09, color:'#4a4438', gap: 0,
          font: s=>`italic 600 ${s}px Fraunces, Georgia, serif` }
      ]
    : [
        { t: team?.name || 'Équipe', size: foot*0.30,  min: foot*0.13, color:'#1a1815', gap: foot*0.055,
          font: s=>`800 ${s}px Fraunces, Georgia, serif` },
        { t: g.name || '',           size: foot*0.175, min: foot*0.09, color:'#4a4438', gap: foot*0.035,
          font: s=>`italic 600 ${s}px Fraunces, Georgia, serif` }
      ];
  if(!landscape){
    if(g.location) lines.push(
      { t: g.location,             size: foot*0.145, min: foot*0.08, color:'#6e6552', gap: foot*0.045,
        font: s=>`italic 500 ${s}px Fraunces, Georgia, serif` });
    lines.push(
      { t: dateStr(g).toUpperCase(), size: foot*0.125, min: foot*0.07, color:'#6e6552', gap: 0,
        font: s=>`500 ${s}px "Geist Mono", monospace`, spaced: true });
  }

  const usableTop = y0 + foot*0.09, usableBot = y0 + foot - i2 - 10;
  const usableH = usableBot - usableTop;
  const total = lines.reduce((a,l)=>a + l.size + l.gap, 0);
  const k = Math.min(1, usableH/total);
  let cursor = usableTop + Math.max(0, (usableH - total*k)/2);

  // Intervalle horizontal libre de CHAQUE ligne : le sceau et le mot ne rognent que
  // les lignes qu'ils croisent réellement ; les autres repartent de la marge.
  const xR = (W - pad) - rightW;
  const spans = [];
  let probe = cursor;
  for(const l of lines){
    const start = l.size*k;
    let xL = pad;
    for(const [ot, ob, orr] of obst) if(probe < ob && probe + start > ot) xL = Math.max(xL, orr);
    spans.push(xL + foot*0.16);
    probe += start + l.gap*k;
  }
  // Bloc centré : UN axe commun (sinon les lignes se décalent et ce n'est plus un bloc),
  // mais une largeur PROPRE à chaque ligne. ⚠ Borner toutes les lignes à l'intervalle du
  // bloc rétrécit pour rien les lignes basses et tronquait le lieu.
  // Paysage : axe du CADRE, donc vraiment centré, et robuste à l'absence de logo du lieu
  // (l'axe de la place libre dérivait de 100 px selon qu'un logo était joint ou non) ;
  // 1192 px restent disponibles, largement de quoi loger les deux lignes.
  // Portrait : axe de la place LIBRE — mesuré, l'axe du cadre y ramène le nom d'équipe de
  // 51 à 48 px et tronque la ligne du lieu, le cartouche n'y est pas assez large.
  const axis = landscape ? W/2 : (Math.max(...spans) + xR)/2;
  ctx.textAlign = 'left';
  for(let i = 0; i < lines.length; i++){
    const l = lines[i];
    const start = l.size*k;
    // Garde-fou : un logo du lieu très large + le sceau pourraient croiser les deux
    // bornes et donner une largeur négative — mieux vaut un texte minuscule qu'un tirage vide.
    const maxW = Math.max(60, 2*Math.min(axis - spans[i], xR - axis));
    const size = fitFont(ctx, l.t, maxW, l.font, start, Math.min(l.min, start));
    ctx.font = l.font(size); ctx.fillStyle = l.color;
    const baseline = cursor + start*0.80;
    if(l.spaced) drawSpaced(ctx, l.t, axis, baseline, size*0.10, 'center');
    else { const txt = ellipsize(ctx, l.t, maxW); ctx.fillText(txt, axis - ctx.measureText(txt).width/2, baseline); }
    cursor += start + l.gap*k;
  }

  // ── Sceau, posé EN DERNIER ────────────────────────────────────────────────────
  // Il doit recouvrir le filet de la photo : dessiné avant, le trait noir lui passerait
  // dessus et le ferait paraître derrière une vitre au lieu d'être apposé dessus.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = sealR*0.20; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 7;
  ctx.beginPath(); ctx.arc(sealX, sealY, sealR, 0, Math.PI*2);
  ctx.fillStyle = '#f4ede0'; ctx.fill();
  ctx.restore();
  drawRose(ctx, sealX, sealY, sealR);

  return cv;
}

// ────── Épreuve (aperçu joueur) ──────
// Le tirage est un produit : l'organisateur l'imprime, l'offre ou le vend. Les équipes
// voient donc une ÉPREUVE — définition réduite + filigrane — et n'ont aucun bouton de
// téléchargement. ⚠️ Limite honnête : tout ce qu'un navigateur affiche peut être capturé
// (appui long, capture d'écran). Le filigrane et la basse définition rendent le fichier
// inutilisable à l'impression ; ils n'empêchent pas de le copier.
async function proof(sub, team, g){
  const full = await build(sub, team, g);
  const k = PROOF_LONG / Math.max(full.width, full.height);
  const cv = document.createElement('canvas');
  cv.width = Math.round(full.width*k); cv.height = Math.round(full.height*k);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, cv.width, cv.height);
  // Filigrane en diagonale, répété : illisible à retirer, sans masquer la photo.
  ctx.save();
  ctx.translate(cv.width/2, cv.height/2);
  ctx.rotate(-Math.PI/6);
  // Texte plein + contour : lisible aussi bien sur une zone sombre que sur une zone claire.
  ctx.font = `700 ${Math.round(cv.width*0.085)}px "Geist Mono", monospace`;
  ctx.fillStyle = 'rgba(244,237,224,0.42)';
  ctx.strokeStyle = 'rgba(26,24,21,0.34)';
  ctx.lineWidth = Math.max(1, cv.width*0.0035);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const R = Math.max(cv.width, cv.height);
  const motif = 'ÉPREUVE · ÉPREUVE · ÉPREUVE · ÉPREUVE · ';
  const step = Math.round(cv.width*0.19);
  for(let y = -R; y <= R; y += step){ ctx.fillText(motif, 0, y); ctx.strokeText(motif, 0, y); }
  ctx.restore();
  return cv;
}

// ────── Sortie fichier ──────
function dataUrlToBlob(u){
  const [h,b] = u.split(','); const bin = atob(b); const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type:(h.match(/:(.*?);/)||[,'image/jpeg'])[1] });
}
function toBlob(cv){
  return new Promise((res,rej)=>{
    if(cv.toBlob) cv.toBlob(b=> b?res(b):rej(new Error('encodage impossible')), 'image/jpeg', Q);
    else { try{ res(dataUrlToBlob(cv.toDataURL('image/jpeg', Q))); }catch(e){ rej(e); } }
  });
}
function save(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 30000);
}

root.PrintFrame = {
  Q, LONG, SHORT, PROOF_LONG,
  build, proof,
  dateStr, safeFile, fileName,
  loadImage, ensureFonts,
  toBlob, dataUrlToBlob, save
};
})(typeof window !== 'undefined' ? window : globalThis);

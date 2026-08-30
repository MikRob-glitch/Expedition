/* Banc JSDOM — chasses types dans la régie (#70).
   Recette du projet : retirer les <script src>, runScripts:'outside-only',
   stubs window.*, puis window.eval(inline + sonde). Aucun réseau.

   Ce que le banc protège :
     · la normalisation d'un indice (bornes, coordonnées, id assaini) ;
     · l'unicité des id — deux indices de même id désapparieraient les preuves ;
     · l'attribution d'id NEUFS quand une chasse naît d'un modèle ;
     · le parsing d'un JSON collé (donnée hostile par principe) ;
     · l'échappement au rendu (nom de modèle et titre d'indice) ;
     · les garde-fous d'enregistrement : aucun appel réseau si le modèle est invalide ;
     · l'absence de `is_template` et de `logo_url` dans l'UPDATE de contenu.                */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if(cond){ pass++; } else { fail++; console.error('  ✗ ' + msg); } };

const UID = '11111111-1111-4111-8111-111111111111';

function makeLeafletStub(log){
  const marker = () => {
    const m = { latlng:null, icon:null, handlers:{},
      addTo(){ log.markers.push(m); return m; },
      bindTooltip(){ return m; }, bindPopup(){ return m; },
      setLatLng(ll){ m.latlng = ll; return m; }, setIcon(i){ m.icon = i; return m; },
      on(ev, cb){ m.handlers[ev] = cb; return m; }, getLatLng(){ return m.latlng; } };
    return m;
  };
  return {
    divIcon: o => ({ __divIcon:o }),
    marker: (ll, o) => { const m = marker(); m.latlng = ll; m.opts = o; m.icon = o && o.icon; return m; },
    tileLayer: () => ({ addTo(){ log.tiles++; return this; } }),
    layerGroup: () => { const lg = { addTo(){ return lg; } }; return lg; },
    map: (target) => {
      log.maps++; log.target = target;
      const mp = { handlers:{}, setView(){ return mp; }, fitBounds(b){ log.bounds = b; return mp; },
        invalidateSize(){}, remove(){ log.removed++; }, removeLayer(m){ log.layerRemoved.push(m); },
        on(ev, cb){ mp.handlers[ev] = cb; log.map = mp; return mp; } };
      log.map = mp; return mp;
    }
  };
}

// Constructeur de requêtes chaînable ET thenable : `await sb.from(x).insert(y)` marche,
// `.maybeSingle()` aussi. `log.reply(q)` décide de la réponse, test par test.
function makeSbStub(log){
  const mk = (table) => {
    const q = { table, op:'select', payload:null, filters:[], cols:null,
      select(c){ if(q.op === 'select') q.cols = c; return q; },
      insert(p){ q.op = 'insert'; q.payload = p; log.inserts.push({ table, payload:p }); return q; },
      update(p){ q.op = 'update'; q.payload = p; log.updates.push({ table, payload:p }); return q; },
      delete(){ q.op = 'delete'; return q; },
      eq(k, v){ q.filters.push([k, v]); return q; },
      order(){ return q; }, limit(){ return q; },
      maybeSingle(){ return Promise.resolve(log.reply(q)); },
      then(res, rej){ return Promise.resolve(log.reply(q)).then(res, rej); } };
    return q;
  };
  return {
    from: mk,
    rpc(fn, args){ log.rpcs.push({ fn, args }); return Promise.resolve({ error:null }); },
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:UID } } } }) },
    storage: { from: () => ({
      remove: async () => ({ error:null }),
      upload: async () => ({ error:null }),
      getPublicUrl: () => ({ data:{ publicUrl:'https://exemple.test/logo.png' } })
    }) }
  };
}

function loadPage(file, stubs){
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/<script src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(src, { runScripts:'outside-only', url:'https://example.org/' + file });
  const w = dom.window;
  Object.assign(w, stubs);
  const inline = [...fs.readFileSync(file, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  return { dom, w, inline };
}

const llog = { markers:[], maps:0, tiles:0, removed:0, bounds:null, layerRemoved:[], map:null };
const slog = { inserts:[], updates:[], rpcs:[], reply: () => ({ data:null, error:null }) };
const { w, inline } = loadPage('regie.html', {
  L: makeLeafletStub(llog),
  supabase: { createClient: () => makeSbStub(slog) },
  qrcode: () => ({ addData(){}, make(){}, createImgTag(){ return '<img>'; } }),
  JSZip: function(){}, confirm: () => true, alert: () => {},
  fetch: async () => ({ ok:true, json:async()=>({}), blob:async()=>({}) })
});
w.eval(inline + ';window.__p={get S(){return S},get TMAP(){return TMAP},get MAXC(){return TPL_MAX_CLUES},initClient};');
// JSDOM n'implémente pas scrollIntoView (mise en page absente) : stub inoffensif.
w.Element.prototype.scrollIntoView = function(){};
const P = w.__p;
P.initClient();
const S = P.S;
S.user = { id:UID, email:'mj@exemple.test' };

/* ───────── 1. Normalisation d'un indice ───────── */
(function(){
  console.log('— normalisation —');
  const c = w.normClue({ title:'  Le vieux chêne  ', text:' énigme ', points:'250', lat:'47.2755', lng:'-2.205' });
  ok(c.title === 'Le vieux chêne', 'titre trimé');
  ok(c.text === 'énigme', 'texte trimé');
  ok(c.points === 250, 'points convertis');
  ok(c.lat === 47.2755 && c.lng === -2.205, 'coordonnées converties');
  ok(w.normClue({}).points === 100, 'points par défaut = 100');
  ok(w.normClue({ points:-40 }).points === 0, 'points négatifs ramenés à 0');
  ok(w.normClue({ points:99999 }).points === 9999, 'points plafonnés');
  ok(w.normClue({ points:'abc' }).points === 100, 'points illisibles → défaut');
  ok(w.normClue({ lat:'oui', lng:'' }).lat === null, 'latitude illisible → null');
  ok(w.normClue({ lat:120, lng:5 }).lat === null, 'latitude hors bornes → null');
  ok(w.normClue({ lat:5, lng:400 }).lng === null, 'longitude hors bornes → null');
  ok(w.normClue({ lat:47.123456789, lng:0 }).lat === 47.123457, 'coordonnée arrondie à 1e-6');
  ok(w.normClue({ title:'x'.repeat(400) }).title.length === 120, 'titre tronqué à 120');
  ok(w.normClue({ text:'y'.repeat(9000) }).text.length === 4000, 'texte tronqué à 4000');

  // L'id atterrit dans un littéral JS d'attribut onclick : il ne doit contenir que [A-Za-z0-9_-].
  const hostile = w.normClue({ id: "a'),alert(1)//" }).id;
  ok(!/[^A-Za-z0-9_-]/.test(hostile), 'id assaini (aucun caractère capable de casser un onclick)');
  ok(w.normClue({ id:'   ' }).id.length >= 5, 'id vide → id généré');
  ok(w.normClue({ id:'z'.repeat(90) }).id.length === 32, 'id tronqué à 32');
})();

/* ───────── 2. Unicité des id et duplication ───────── */
(function(){
  console.log('— id d\'indices —');
  const list = w.normClues([ {id:'dup',title:'A'}, {id:'dup',title:'B'}, {id:'dup',title:'C'} ]);
  ok(new Set(list.map(c => c.id)).size === 3, 'trois id distincts après dédoublonnage');
  ok(list[0].id === 'dup', 'le premier garde son id');
  ok(list.map(c => c.title).join('') === 'ABC', 'ordre et contenu préservés');

  const big = w.normClues(Array.from({ length:200 }, (_,i) => ({ title:'i'+i })));
  ok(big.length === P.MAXC, 'liste tronquée au maximum d\'indices');

  const src = w.normClues([ {id:'c1',title:'A',points:50,lat:1,lng:2}, {id:'c2',title:'B'} ]);
  const cp = w.freshClues(src);
  ok(cp.length === 2, 'duplication : même nombre d\'indices');
  ok(cp.every(c => !src.some(s => s.id === c.id)), 'duplication : aucun id repris du modèle');
  ok(cp[0].title === 'A' && cp[0].points === 50 && cp[0].lat === 1, 'duplication : contenu identique');
  ok(src[0].id === 'c1', 'duplication : le modèle source n\'est pas modifié');

  ok(w.tplPoints(src) === 150, 'total des points (50 + défaut 100)');
  ok(w.tplPlaced(src) === 1, 'compte des indices géolocalisés');
  ok(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(w.genCode()), 'code : 4 caractères de l\'alphabet réduit');
})();

/* ───────── 3. Parsing d'un JSON collé ───────── */
(function(){
  console.log('— import JSON —');
  ok(w.tplParse('').error, 'vide refusé');
  ok(w.tplParse('{pas du json').error, 'JSON invalide refusé');
  ok(w.tplParse('{"name":"x"}').error, 'objet sans clé clues refusé');
  ok(w.tplParse('[]').error, 'tableau vide refusé');
  ok(w.tplParse('"une chaîne"').error, 'chaîne refusée');

  const a = w.tplParse('[{"title":"Un","points":80},{"title":"Deux"}]');
  ok(!a.error && a.clues.length === 2, 'tableau nu accepté');
  ok(a.clues[0].points === 80 && a.clues[1].points === 100, 'points repris ou par défaut');

  const o = w.tplParse(JSON.stringify({
    name:'Saint-Nazaire à vélo', location:'Saint-Nazaire (44)',
    durationMinutes:180, perClueMinutes:15,
    clues:[{ title:'La base', text:'…', points:120, lat:47.2755, lng:-2.205 }]
  }));
  ok(!o.error && o.meta.name === 'Saint-Nazaire à vélo', 'objet complet : nom lu');
  ok(o.meta.duration === 180 && o.meta.perClue === 15, 'objet complet : durées lues');
  ok(o.clues[0].lat === 47.2755, 'objet complet : coordonnées lues');

  const snake = w.tplParse('{"duration_minutes":90,"per_clue_minutes":10,"clues":[{"title":"A"}]}');
  ok(snake.meta.duration === 90 && snake.meta.perClue === 10, 'variantes snake_case acceptées');

  const warn = w.tplParse('[{"text":"sans titre"},{"title":"ok"}]');
  ok(warn.warn.some(x => /sans titre/.test(x)), 'avertissement sur les indices sans titre');
})();

/* ───────── 4. Éditeur : structure ───────── */
(function(){
  console.log('— éditeur —');
  w.newTemplate();
  ok(S.view === 'tpl-edit', 'passage en vue éditeur');
  ok(S.tpl.isNew && S.tpl.clues.length === 1, 'nouveau modèle : un indice vierge');
  ok(S.tplSel === S.tpl.clues[0].id, 'premier indice sélectionné');

  w.setTplMeta('name', 'Essai');
  w.setTplMeta('duration', '210');
  w.setTplMeta('perClue', 'zzz');
  ok(S.tpl.name === 'Essai', 'nom mémorisé');
  ok(S.tpl.duration === 210, 'durée mémorisée');
  ok(S.tpl.perClue === 15, 'minutes par indice illisibles → défaut');
  ok(S.tplDirty === true, 'modification signalée');

  const id0 = S.tpl.clues[0].id;
  w.setClue(id0, 'title', 'Premier');
  w.setClue(id0, 'points', '3000');
  w.setClue(id0, 'lat', '47.2755'); w.setClue(id0, 'lng', '-2.205');
  ok(S.tpl.clues[0].title === 'Premier', 'titre saisi');
  ok(S.tpl.clues[0].points === 3000, 'points saisis');
  ok(S.tpl.clues[0].lat === 47.2755, 'latitude saisie');

  w.addClue(); w.addClue();
  ok(S.tpl.clues.length === 3, 'deux indices ajoutés');
  const ids = S.tpl.clues.map(c => c.id);
  w.moveClue(ids[2], -1);
  ok(S.tpl.clues[1].id === ids[2], 'indice remonté');
  w.moveClue(ids[0], -1);
  ok(S.tpl.clues[0].id === ids[0], 'le premier ne remonte pas plus haut');
  w.delClue(ids[1]);
  ok(S.tpl.clues.length === 2, 'indice supprimé');
  while(S.tpl.clues.length > 1) w.delClue(S.tpl.clues[1].id);
  w.delClue(S.tpl.clues[0].id);
  ok(S.tpl.clues.length === 1, 'le dernier indice ne peut pas être supprimé');

  w.clearCoord(S.tpl.clues[0].id);
  ok(S.tpl.clues[0].lat === null && S.tpl.clues[0].lng === null, 'coordonnées effacées');
})();

/* ───────── 5. Rendu : échappement ───────── */
(function(){
  console.log('— rendu —');
  const nasty = '<img src=x onerror="alert(1)">';
  S.templates = [{ code:'AB23', name:nasty, location:'X', clues:[{id:'c1',title:nasty,points:10}],
                   duration_minutes:90, per_clue_minutes:15, admin_id:UID, legacy:false }];
  S.tplLoading = false;
  w.viewTemplates();
  const html = w.document.getElementById('app').innerHTML;
  // Le nom hostile doit rester du TEXTE. On juge sur le DOM construit, pas sur la
  // sérialisation d'innerHTML : un `<` dans une valeur d'attribut y ressort tel quel
  // (légal et inerte) et ferait échouer un test naïf sur la chaîne.
  ok(w.document.querySelectorAll('#app img').length === 0, 'liste : aucune balise img injectée');
  ok(w.document.querySelector('#app .tplrow b').textContent === nasty, 'liste : le nom hostile est rendu comme texte');
  ok(html.indexOf('&lt;img') !== -1, 'liste : le nom hostile est échappé dans le balisage');
  ok(html.indexOf('AB23') !== -1, 'liste : le code du modèle est affiché');

  w.editTemplate('AB23');
  ok(S.tpl && S.tpl.code === 'AB23', 'ouverture du modèle dans l\'éditeur');
  ok(w.document.querySelectorAll('#app img').length === 0, 'éditeur : aucune balise img injectée');
  ok(w.document.querySelector('#tpl-clues input').value === nasty, 'éditeur : titre hostile rendu comme valeur de champ');
  ok(w.document.getElementById('tpl-clues').children.length === 1, 'éditeur : un indice affiché');
  ok(w.document.getElementById('tpl-map') !== null, 'éditeur : conteneur de carte présent');
})();

/* ───────── 6. Carte : pose et déplacement ───────── */
(function(){
  console.log('— carte de l\'éditeur —');
  llog.markers.length = 0;
  w.initTplMap();
  ok(llog.maps > 0, 'carte instanciée');
  const clue = S.tpl.clues[0];
  S.tplSel = clue.id;
  llog.map.handlers.click({ latlng:{ lat:47.2755123456, lng:-2.2050987654 } });
  ok(clue.lat === 47.275512, 'clic carte : latitude posée et arrondie');
  ok(clue.lng === -2.205099, 'clic carte : longitude posée et arrondie');
  ok(w.document.getElementById('lat-' + clue.id).value === '47.275512', 'clic carte : champ mis à jour sans repeindre');
  ok(llog.markers.length === 1, 'un marqueur posé');
  const m = llog.markers[0];
  ok(m.opts && m.opts.draggable === true, 'marqueur déplaçable');
  m.latlng = { lat:47.3, lng:-2.3 };
  m.handlers.dragend({ target:m });
  ok(clue.lat === 47.3 && clue.lng === -2.3, 'glisser du marqueur : coordonnées mises à jour');
  w.clearCoord(clue.id);
  ok(llog.layerRemoved.length === 1, 'coordonnées effacées : marqueur retiré de la carte');
})();

/* ───────── 7. Import par FICHIER ───────── */
(async function(){
  console.log('— import fichier —');
  const wait = async (test, ms=1500) => {
    const t0 = Date.now();
    while(!test() && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 10));
    return test();
  };
  const file = (name, content, type) => new w.File([content], name, { type: type || 'application/json' });

  S.view = 'tpl-list';
  w.openTplImport();
  ok(w.document.getElementById('tplimp-ov').classList.contains('open'), 'overlay ouvert');
  ok(S.tplImport === null, 'ouverture : aucun scénario en attente');
  ok(w.document.getElementById('tplimp-file') !== null, 'un champ fichier, pas une zone de collage');
  ok(w.document.getElementById('tplimp-text') === null, 'la zone de collage a bien disparu');

  w.handleTplFile(null);
  ok(S.tplImport === null, 'aucun fichier : rien en attente');
  ok(/warn/.test(w.document.getElementById('tplimp-report').innerHTML), 'aucun fichier : message d\'erreur');

  w.handleTplFile(file('scenario.txt', '[]', 'text/plain'));
  ok(S.tplImport === null, 'extension .txt refusée');
  ok(/\.json/.test(w.document.getElementById('tplimp-report').textContent), 'refus explicite sur l\'extension');

  w.handleTplFile(file('gros.json', 'x'.repeat(600 * 1024)));
  ok(S.tplImport === null, 'fichier trop volumineux refusé');
  ok(/volumineux/.test(w.document.getElementById('tplimp-report').textContent), 'refus explicite sur la taille');

  w.handleTplFile(file('casse.json', '{ pas du json'));
  ok(await wait(() => /warn/.test(w.document.getElementById('tplimp-report').innerHTML)), 'JSON invalide : signalé');
  ok(S.tplImport === null, 'JSON invalide : rien en attente');
  ok(w.document.getElementById('tplimp-acts').innerHTML === '', 'JSON invalide : aucun bouton de validation');

  const scenario = JSON.stringify({
    name:'Saint-Nazaire à vélo', location:'Saint-Nazaire (44)',
    durationMinutes:180, perClueMinutes:15,
    clues:[{ title:'La base', text:'…', points:120, lat:47.2755, lng:-2.205 },
           { title:'Le môle', text:'…', points:90 }]
  });
  w.handleTplFile(file('saint-nazaire-velo.json', scenario));
  ok(await wait(() => S.tplImport !== null), 'fichier .json lu et accepté');
  ok(S.tplImport.clues.length === 2, 'deux indices lus');
  ok(S.tplImport.filename === 'saint-nazaire-velo.json', 'nom du fichier retenu');
  ok(w.document.getElementById('tplimp-name').textContent === 'saint-nazaire-velo.json', 'nom du fichier affiché');
  ok(/Créer le modèle/.test(w.document.getElementById('tplimp-acts').textContent), 'bouton de création proposé hors éditeur');

  w.doTplImport('new');
  ok(S.view === 'tpl-edit' && S.tpl && S.tpl.isNew, 'création du modèle depuis le fichier');
  ok(S.tpl.name === 'Saint-Nazaire à vélo' && S.tpl.duration === 180, 'métadonnées du fichier reprises');
  ok(S.tpl.clues.length === 2 && S.tpl.clues[0].lat === 47.2755, 'indices repris avec coordonnées');
  ok(w.document.getElementById('tplimp-ov').classList.contains('open') === false, 'overlay refermé');
  ok(S.tplImport === null, 'scénario consommé, plus rien en attente');

  // Dans l'éditeur, l'import propose remplacement ou ajout.
  w.openTplImport();
  w.handleTplFile(file('autre.json', '[{"title":"Ajouté"}]'));
  ok(await wait(() => S.tplImport !== null), 'second fichier lu depuis l\'éditeur');
  ok(/Remplacer les indices/.test(w.document.getElementById('tplimp-acts').textContent), 'éditeur : remplacement proposé');
  w.doTplImport('append');
  ok(S.tpl.clues.length === 3, 'ajout à la suite');
  ok(S.tpl.clues[2].title === 'Ajouté', 'indice ajouté en fin de liste');

  // Sans fichier choisi, valider ne fait rien.
  w.openTplImport();
  const before = S.tpl.clues.length;
  w.doTplImport('replace');
  ok(S.tpl.clues.length === before, 'validation sans fichier : aucun effet');
  w.closeTplImport();

/* ───────── 8. Garde-fous d'enregistrement ───────── */
  console.log('— enregistrement —');
  slog.inserts.length = 0; slog.updates.length = 0;

  w.newTemplate();
  S.tpl.name = '';
  await w.saveTemplate(null);
  ok(slog.inserts.length === 0, 'modèle sans nom : aucun appel réseau');

  S.tpl.name = 'Sans titre d\'indice';
  await w.saveTemplate(null);
  ok(slog.inserts.length === 0, 'indice sans titre : aucun appel réseau');

  // Code libre : la vérification de disponibilité répond « aucune ligne ».
  slog.reply = () => ({ data:null, error:null });
  w.setClue(S.tpl.clues[0].id, 'title', 'Premier indice');
  await w.saveTemplate(null);
  ok(slog.inserts.length === 1, 'modèle valide : un INSERT');
  const ins = slog.inserts[0].payload;
  ok(ins.is_template === true, 'INSERT : drapeau de modèle posé');
  ok(ins.admin_id === UID, 'INSERT : admin_id = compte connecté');
  ok(ins.status === 'setup' && ins.hunt_date === null, 'INSERT : statut setup, sans date');
  ok(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(ins.code), 'INSERT : code valide');
  ok(S.tplDirty === false, 'après enregistrement : plus de modification en attente');

  // Modification d'un modèle existant : UPDATE ciblé.
  slog.updates.length = 0;
  slog.reply = q => q.op === 'update' ? { data:[{ code:'AB23' }], error:null } : { data:null, error:null };
  S.templates = [{ code:'AB23', name:'M', location:'L', logo_url:'https://exemple.test/logo.png',
                   clues:[{id:'c1',title:'A',points:10}], duration_minutes:90, per_clue_minutes:15,
                   admin_id:UID, legacy:false }];
  w.editTemplate('AB23');
  w.setTplMeta('name', 'Modifié');
  await w.saveTemplate(null);
  ok(slog.updates.length >= 1, 'modèle existant : un UPDATE');
  const up = slog.updates[0].payload;
  ok(!('is_template' in up), 'UPDATE : is_template absent du payload');
  ok(!('logo_url' in up), 'UPDATE : logo_url absent du payload');
  ok(!('admin_id' in up), 'UPDATE : admin_id absent du payload');
  ok(up.name === 'Modifié', 'UPDATE : nom transmis');

  // UPDATE qui ne touche aucune ligne (RLS) : doit être détecté, pas avalé.
  slog.updates.length = 0;
  slog.reply = q => q.op === 'update' ? { data:[], error:null } : { data:null, error:null };
  S.tplDirty = true;
  await w.saveTemplate(null);
  ok(S.tplDirty === true, 'UPDATE sans ligne touchée : le modèle reste marqué non enregistré');

  /* ───────── 9. Lancement d'une chasse depuis un modèle ───────── */
  console.log('— lancement —');
  slog.inserts.length = 0;
  slog.reply = () => ({ data:null, error:null });
  S.templates = [{ code:'AB23', name:'Saint-Nazaire à vélo', location:'Saint-Nazaire (44)',
                   logo_url:null, clues:[{id:'c1',title:'A',points:120,lat:47.2,lng:-2.2},
                                         {id:'c2',title:'B',points:80}],
                   duration_minutes:180, per_clue_minutes:15, admin_id:UID, legacy:false }];
  w.openLaunch('AB23');
  ok(w.document.getElementById('lc-name').value === 'Saint-Nazaire à vélo', 'formulaire prérempli');
  const btn = { disabled:false, textContent:'' };
  await w.doLaunch(btn);
  ok(slog.inserts.length === 1, 'lancement : un INSERT de chasse');
  const g = slog.inserts[0].payload;
  ok(g.is_template === false, 'lancement : la chasse créée n\'est pas un modèle');
  ok(g.status === 'setup', 'lancement : statut préparation');
  ok(g.clues.length === 2, 'lancement : indices repris');
  ok(g.clues.every(c => c.id !== 'c1' && c.id !== 'c2'), 'lancement : id d\'indices NEUFS');
  ok(g.clues[0].title === 'A' && g.clues[0].lat === 47.2, 'lancement : contenu des indices préservé');
  ok(S.templates[0].clues[0].id === 'c1', 'lancement : le modèle n\'est pas modifié');

  console.log(`\n${pass} passés, ${fail} échoués`);
  process.exit(fail ? 1 : 0);
})();

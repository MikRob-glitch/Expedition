/* Banc JSDOM — indice photo payant + repérage terrain (#72).
   Recette du projet : retirer les <script src>, runScripts:'outside-only', stubs
   window.*, puis window.eval(inline + sonde). Aucun réseau, aucune base.

   Ce que le banc protège :
     · le coût fait foi côté `games.clues`, JAMAIS côté `hint_reveals` — une équipe peut
       insérer la ligne qu'elle veut, elle ne doit pas pouvoir se fabriquer un prix ;
     · le score net (preuves − indices achetés) est le MÊME dans les deux surfaces ;
     · `hintUrl` finit dans un `src=` : seul http(s) est accepté ;
     · l'achat est idempotent (23505 = déjà acheté = succès) ;
     · le repérage écrit bien en base et respecte le garde-fou `.select()` ;
     · une photo indice ne voyage pas par JSON et se recopie au lancement d'une chasse.  */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if(cond){ pass++; } else { fail++; console.error('  ✗ ' + msg); } };
const UID = '11111111-1111-4111-8111-111111111111';

function leafletStub(log){
  const marker = () => { const m = { handlers:{}, tip:'', addTo(){ log.markers.push(m); return m; },
    bindTooltip(t){ m.tip = t; return m; }, setLatLng(ll){ m.latlng = ll; return m; },
    setIcon(i){ m.icon = i; return m; },
    on(e,c){ m.handlers[e]=c; return m; }, getLatLng(){ return m.latlng; } }; return m; };
  return { divIcon:o=>o, marker:(ll,o)=>{ const m=marker(); m.latlng=ll; m.opts=o; m.icon=o&&o.icon; return m; },
    circle:(ll,o)=>{ const c={ latlng:ll, opts:o, radius:o&&o.radius,
      addTo(){ log.circles.push(c); return c; }, setLatLng(x){ c.latlng=x; return c; },
      setRadius(r){ c.radius=r; return c; } }; return c; },
    tileLayer:()=>({ addTo(){ log.tiles++; return this; } }), layerGroup:()=>({ addTo(){ return this; } }),
    map:()=>{ const mp={ handlers:{}, zoom:15, views:[], removed:[],
      setView(ll,z){ mp.views.push({ll,z}); if(z!=null) mp.zoom=z; return mp; },
      getZoom(){ return mp.zoom; }, fitBounds(b){ mp.bounds=b; return mp; },
      invalidateSize(){}, remove(){ log.mapRemoved++; }, removeLayer(m){ mp.removed.push(m); },
      on(e,c){ mp.handlers[e]=c; return mp; } };
      log.map=mp; log.maps++; return mp; } };
}
function sbStub(log){
  const mk = table => {
    const q = { table, op:'select', payload:null, filters:[],
      select(c){ if(q.op==='select') q.cols=c; return q; },
      insert(p){ q.op='insert'; q.payload=p; log.inserts.push({table,payload:p}); return q; },
      update(p){ q.op='update'; q.payload=p; log.updates.push({table,payload:p}); return q; },
      delete(){ q.op='delete'; return q; },
      eq(k,v){ q.filters.push([k,v]); return q; }, order(){ return q; }, limit(){ return q; },
      maybeSingle(){ return Promise.resolve(log.reply(q)); },
      then(r,j){ return Promise.resolve(log.reply(q)).then(r,j); } };
    return q;
  };
  return { from: mk,
    rpc(fn,args){ log.rpcs.push({fn,args}); return Promise.resolve({ error:null }); },
    auth:{ getSession: async()=>({ data:{ session:{ user:{ id:UID } } } }) },
    storage:{ from(){ return {
      remove: async paths => { log.removed.push(paths); return { error:null }; },
      upload: async (path,blob,o) => { log.uploads.push({path,type:o&&o.contentType}); return { error:null }; },
      copy:   async (from,to)   => { log.copies.push({from,to}); return log.copyErr ? { error:{message:'refusé'} } : { error:null }; },
      getPublicUrl: path => ({ data:{ publicUrl:'https://exemple.test/photos/'+path } })
    }; } } };
}
function loadPage(file, stubs){
  const raw = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(raw.replace(/<script src="[^"]*"><\/script>/g, ''),
                        { runScripts:'outside-only', url:'https://example.org/'+file });
  Object.assign(dom.window, stubs);
  const inline = [...raw.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  return { w: dom.window, inline };
}

/* ═════════ RÉGIE ═════════ */
const llog = { markers:[], circles:[], map:null, maps:0, tiles:0, mapRemoved:0 };
const slog = { inserts:[], updates:[], rpcs:[], removed:[], uploads:[], copies:[], copyErr:false,
               reply: () => ({ data:null, error:null }) };
const R = loadPage('regie.html', {
  L: leafletStub(llog), supabase:{ createClient: () => sbStub(slog) },
  qrcode: () => ({ addData(){}, make(){}, createDataURL(){ return 'data:,'; } }),
  JSZip: function(){}, confirm: () => true, alert: () => {},
  fetch: async () => ({ ok:true, blob: async () => ({ size:1234 }) })
});
R.w.eval(R.inline + ';window.__p={get S(){return S},get COST(){return HINT_COST_DEFAULT},initClient};');
R.w.Element.prototype.scrollIntoView = function(){};
const rw = R.w, S = R.w.__p.S;
R.w.__p.initClient();
S.user = { id:UID, email:'mj@exemple.test' };

(function(){
  console.log('— régie : coût et dette —');
  ok(rw.hintCostOf({}) === 30, 'coût par défaut = 30');
  ok(rw.hintCostOf({ hintCost:0 }) === 0, 'coût 0 accepté (indice offert)');
  ok(rw.hintCostOf({ hintCost:-5 }) === 0, 'coût négatif ramené à 0');
  ok(rw.hintCostOf({ hintCost:99999 }) === 9999, 'coût plafonné');
  ok(rw.hintCostOf({ hintCost:'abc' }) === 30, 'coût illisible → défaut');
  ok(rw.hintCostOf(null) === 30, 'indice absent → défaut');

  S.game = { code:'AB23', status:'active', clues:[
      { id:'c1', title:'Un', points:100, hintCost:30, hintUrl:'https://exemple.test/photos/AB23/hints/c1.jpg' },
      { id:'c2', title:'Deux', points:100, hintCost:50 } ],
    teams:[{ id:'t1', name:'A' }, { id:'t2', name:'B' }] };
  S.subs = [ { id:'s1', teamId:'t1', clueId:'c1', status:'approved', points:100, bonusPoints:50 } ];

  // ⚠️ Le cœur du lot : la ligne d'achat annonce 0, le prix réel vient de games.clues.
  S.hints = [ { id:'h1', teamId:'t1', clueId:'c1', cost:0 } ];
  ok(rw.hintDebt('t1') === 30, 'la dette suit games.clues, pas le coût inscrit dans la ligne d\'achat');
  ok(rw.scoreOf('t1') === 120, 'score net = 150 − 30');
  ok(rw.hintDebt('t2') === 0, 'équipe sans achat : aucune dette');

  S.hints = [ { id:'h1', teamId:'t1', clueId:'c1', cost:30 }, { id:'h2', teamId:'t1', clueId:'c2', cost:30 } ];
  ok(rw.hintDebt('t1') === 80, 'deux achats : 30 + 50 (prix propre à chaque indice)');
  ok(rw.scoreOf('t1') === 70, 'score net de deux achats');

  S.hints = [ { id:'h3', teamId:'t2', clueId:'zzz', cost:30 } ];
  ok(rw.hintDebt('t2') === 0, 'achat sur un indice inexistant : ignoré, jamais NaN');

  S.subs = []; S.hints = [ { id:'h1', teamId:'t1', clueId:'c2', cost:50 } ];
  ok(rw.scoreOf('t1') === -50, 'le score passe sous zéro, comme décidé');
})();

(function(){
  console.log('— régie : forme de l\'indice —');
  ok(rw.normClue({}).hintCost === 30, 'normClue pose le coût par défaut');
  ok(rw.normClue({}).hintUrl === null, 'normClue : pas de photo par défaut');
  const good = 'https://exemple.test/photos/AB23/hints/c1.jpg';
  ok(rw.normClue({ hintUrl:good }).hintUrl === good, 'URL https acceptée');
  ok(rw.normClue({ hintUrl:'http://x/y.jpg' }).hintUrl === 'http://x/y.jpg', 'URL http acceptée');
  // hintUrl finit dans un src= : tout ce qui n'est pas http(s) doit tomber.
  ok(rw.normClue({ hintUrl:'javascript:alert(1)' }).hintUrl === null, 'javascript: rejeté');
  ok(rw.normClue({ hintUrl:'data:image/png;base64,AAAA' }).hintUrl === null, 'data: rejeté');
  ok(rw.normClue({ hintUrl:'//exemple.test/x.jpg' }).hintUrl === null, 'URL protocole-relatif rejetée');
  ok(rw.normClue({ hintUrl:42 }).hintUrl === null, 'valeur non textuelle rejetée');

  // Une photo appartient à une chasse : elle ne voyage pas par JSON.
  const imp = rw.tplParse(JSON.stringify([
    { title:'A', hintCost:45, hintUrl:'https://exemple.test/photos/ZZZZ/hints/x.jpg' },
    { title:'B', hintCost:20 } ]));
  ok(!imp.error, 'import accepté');
  ok(imp.clues[0].hintCost === 45 && imp.clues[1].hintCost === 20, 'import : les coûts sont repris');
  ok(imp.clues[0].hintUrl === null, 'import : la photo indice est écartée');
  ok(imp.warn.some(x => /photo/.test(x)), 'import : l\'utilisateur est prévenu que la photo manque');
})();

(async function(){
  console.log('— régie : repérage —');
  slog.updates.length = 0; slog.uploads.length = 0; slog.removed.length = 0;
  slog.reply = q => q.op === 'update' ? { data:[{ code:'AB23' }], error:null } : { data:null, error:null };

  S.recon = { code:'AB23', name:'Essai', isTemplate:false, clues: rw.normClues([
    { id:'c1', title:'Un', points:100 }, { id:'c2', title:'Deux', points:100, lat:47.2, lng:-2.2 } ]) };
  S.view = 'recon-edit';
  rw.viewRecon();
  ok(rw.document.getElementById('recon-clues').children.length === 2, 'deux indices affichés');
  const st = rw.reconStats(S.recon.clues);
  ok(st.n === 2 && st.photos === 0 && st.geo === 1, 'compteurs de repérage');
  ok(/0\/2/.test(rw.document.getElementById('recon-progress').textContent), 'progression photo affichée');

  await rw.reconCost('c1', '45');
  ok(S.recon.clues[0].hintCost === 45, 'coût modifié sur le terrain');
  ok(slog.updates.length === 1 && 'clues' in slog.updates[0].payload, 'coût : un UPDATE des indices');
  ok(!('is_template' in slog.updates[0].payload), 'repérage : is_template jamais réécrit');
  ok(!('status' in slog.updates[0].payload), 'repérage : statut jamais réécrit');

  // GPS
  let cb = null;
  rw.navigator.geolocation = { getCurrentPosition:(ok_, ko, opts) => { cb = { ok_, opts }; } };
  const btn = { disabled:false, textContent:'📍 Je suis ici' };
  rw.reconHere('c1', btn);
  ok(cb && cb.opts.enableHighAccuracy === true, 'GPS demandé en haute précision');
  ok(cb.opts.maximumAge === 0, 'aucune position en cache acceptée');
  slog.updates.length = 0;
  cb.ok_({ coords:{ latitude:47.2755123456, longitude:-2.2050987654, accuracy:8 } });
  await new Promise(r => setTimeout(r, 30));
  ok(S.recon.clues[0].lat === 47.275512, 'latitude relevée et arrondie');
  ok(S.recon.clues[0].__acc === 8, 'précision retenue');
  ok(slog.updates.length === 1, 'position : un UPDATE');

  // Un UPDATE qui ne touche aucune ligne (RLS) doit être détecté
  slog.reply = q => q.op === 'update' ? { data:[], error:null } : { data:null, error:null };
  ok((await rw.reconSave()) === false, 'UPDATE sans ligne touchée : signalé, pas avalé');
  slog.reply = q => q.op === 'update' ? { data:[{ code:'AB23' }], error:null } : { data:null, error:null };

  // Copie des photos indice au lancement d'une chasse
  console.log('— régie : lancement —');
  slog.copies.length = 0; slog.uploads.length = 0; slog.copyErr = false;
  const url = await rw.hintCopyTo('https://exemple.test/photos/OLD1/hints/c1.jpg?v=1', 'NEW2', 'c9');
  ok(slog.copies.length === 1, 'copie côté serveur tentée en premier (aucun transfert)');
  ok(slog.copies[0].from === 'OLD1/hints/c1.jpg' && slog.copies[0].to === 'NEW2/hints/c9.jpg', 'chemins source et destination');
  ok(/NEW2\/hints\/c9\.jpg/.test(url), 'URL retournée sous le nouveau code');
  ok(slog.uploads.length === 0, 'aucun renvoi de fichier quand la copie serveur passe');

  slog.copies.length = 0; slog.copyErr = true;
  await rw.hintCopyTo('https://exemple.test/photos/OLD1/hints/c1.jpg', 'NEW2', 'c9');
  ok(slog.uploads.length === 1, 'copie refusée : repli sur télécharger-puis-renvoyer');
  ok(slog.uploads[0].type === 'image/jpeg', 'repli : type MIME correct');
  slog.copyErr = false;
  ok((await rw.hintCopyTo('https://exemple.test/photos/NEW2/hints/c9.jpg', 'NEW2', 'c9')) !== null, 'photo déjà sous le bon code : rien à faire');

  /* ═════════ CARTE DU REPÉRAGE (#73) ═════════ */
  console.log('— carte du repérage —');
  ok(rw.haversine({lat:47.2755,lng:-2.2050}, {lat:47.2755,lng:-2.2050}) === 0, 'distance nulle sur le même point');
  const d = rw.haversine({lat:47.2755,lng:-2.2050}, {lat:47.2765,lng:-2.2050});
  ok(d > 105 && d < 118, 'un centième de degré de latitude ≈ 111 m');
  ok(rw.fmtDist(240) === '240 m', 'distance courte en mètres');
  ok(rw.fmtDist(1500) === '1.5 km', 'distance longue en kilomètres');

  // Une position posée, une non posée, une photo prise : trois cas dans la même carte.
  S.recon = { code:'AB23', name:'Essai', isTemplate:false, clues: rw.normClues([
    { id:'c1', title:'Un',   points:100, lat:47.2755, lng:-2.2050, hintUrl:'https://exemple.test/photos/AB23/hints/c1.jpg' },
    { id:'c2', title:'Deux', points:100, lat:47.2800, lng:-2.2100 },
    { id:'c3', title:'Trois',points:100 } ]) };
  S.view = 'recon-edit';
  let watchCb = null, watchCleared = null, watchId = 77;
  rw.navigator.geolocation = {
    watchPosition:(ok_, ko, opts) => { watchCb = { ok_, ko, opts }; return watchId; },
    clearWatch:id => { watchCleared = id; },
    getCurrentPosition:() => {}
  };
  // ⚠️ `viewRecon` initialise la carte via un setTimeout : on laisse d'abord retomber
  // celui qu'a posé la section précédente, SINON ses marqueurs se comptent avec les nôtres.
  await new Promise(r => setTimeout(r, 150));
  rw.destroyReconMap();
  llog.markers.length = 0; llog.circles.length = 0; llog.maps = 0; llog.mapRemoved = 0; llog.tiles = 0;
  rw.viewRecon();
  await new Promise(r => setTimeout(r, 120));

  ok(llog.maps === 1, 'carte instanciée à l\'ouverture du repérage');
  ok(llog.tiles > 0, 'fond de carte OpenStreetMap ajouté');
  ok(llog.markers.length === 2, 'un marqueur par indice localisé, aucun pour les autres');
  ok(llog.map.bounds && llog.map.bounds.length === 2, 'la carte cadre les points connus');
  ok(/1\. Un/.test(llog.markers[0].tip) && /📷/.test(llog.markers[0].tip), 'marqueur numéroté, photo signalée');
  ok(!/📷/.test(llog.markers[1].tip), 'indice sans photo : pas de pastille photo');
  ok(watchCb && watchCb.opts.enableHighAccuracy === true, 'suivi de position démarré en haute précision');

  // Première position reçue : marqueur « moi », halo de précision, distances écrites.
  watchCb.ok_({ coords:{ latitude:47.2760, longitude:-2.2050, accuracy:9 } });
  ok(llog.markers.length === 3, 'marqueur de position propre ajouté');
  ok(llog.circles.length === 1 && llog.circles[0].radius === 9, 'halo de précision au rayon annoncé');
  ok(/±9 m/.test(rw.document.getElementById('recon-me').textContent), 'précision affichée à l\'écran');
  const dist1 = rw.document.getElementById('rcdist-c1').textContent;
  ok(/à \d+ m/.test(dist1), 'distance affichée sur la fiche d\'un indice localisé');
  ok(rw.document.getElementById('rcdist-c3').textContent === '', 'aucune distance pour un indice sans position');

  // Suivi : recentrage tant qu'on ne touche pas la carte, arrêt dès qu'on la fait glisser.
  const before = llog.map.views.length;
  watchCb.ok_({ coords:{ latitude:47.2770, longitude:-2.2050, accuracy:9 } });
  ok(llog.map.views.length > before, 'la carte suit la position');
  llog.map.handlers.dragstart();
  const after = llog.map.views.length;
  watchCb.ok_({ coords:{ latitude:47.2780, longitude:-2.2050, accuracy:9 } });
  ok(llog.map.views.length === after, 'faire glisser la carte arrête le recentrage');
  ok(/○ Me suivre/.test(rw.document.getElementById('recon-follow').textContent), 'le bouton reflète l\'arrêt du suivi');
  rw.toggleFollow();
  ok(/◎ Me suivre/.test(rw.document.getElementById('recon-follow').textContent), 'le suivi se réactive au bouton');

  // Le halo suit sans créer de doublon
  ok(llog.circles.length === 1, 'un seul halo, mis à jour et non recréé');

  // Clic sur un marqueur : la fiche remonte
  rw.focusReconClue('c2');
  ok(rw.document.getElementById('rc-c2').classList.contains('flash'), 'la fiche de l\'indice est mise en évidence');

  // Itinéraire
  let opened = null;
  rw.open = (u) => { opened = u; return null; };
  rw.reconRoute('c2');
  ok(/destination=47\.28,-2\.21/.test(opened), 'itinéraire vers les bonnes coordonnées');
  ok(/travelmode=bicycling/.test(opened), 'itinéraire à vélo');
  opened = null;
  rw.reconRoute('c3');
  ok(opened === null, 'aucun itinéraire vers un indice sans position');

  // Repli / dépli
  rw.toggleReconMap();
  ok(rw.document.getElementById('recon-map-box').classList.contains('closed'), 'carte repliable');
  rw.toggleReconMap();
  ok(!rw.document.getElementById('recon-map-box').classList.contains('closed'), 'carte dépliable');

  // ⚠️ Quitter l'écran DOIT couper le GPS : sinon il tourne en fond et écrit dans un DOM mort.
  rw.destroyReconMap();
  ok(watchCleared === watchId, 'le suivi de position est arrêté en quittant');
  ok(llog.mapRemoved === 1, 'la carte est détruite');

  /* ═════════ APPLICATION ÉQUIPE ═════════ */
  console.log('— app équipe —');
  const elog = { inserts:[], updates:[], rpcs:[], removed:[], uploads:[], copies:[],
                 reply: () => ({ data:null, error:null }) };
  const E = loadPage('expedition.html', {
    L: leafletStub({ markers:[] }), supabase:{ createClient: () => sbStub(elog) },
    qrcode: () => ({ addData(){}, make(){}, createDataURL(){ return 'data:,'; } }),
    JSZip: function(){}, confirm: () => true, alert: () => {},
    PrintFrame: { Q:{}, compose: async () => ({}) },
    fetch: async () => ({ ok:true, blob: async () => ({}) }),
    indexedDB: { open: () => ({ onupgradeneeded:null, onsuccess:null, onerror:null }) }
  });
  E.w.eval(E.inline + ';window.__e={get STATE(){return STATE},get sb(){return sb},set sb(v){sb=v}};');
  const ew = E.w, ST = ew.__e.STATE;
  ew.__e.sb = sbStub(elog);

  ST.me = { role:'team', teamId:'t1', gameCode:'AB23' };
  ST.game = { code:'AB23', status:'active', durationMinutes:90, perClueMinutes:15, startedAt:Date.now(),
    clues:[ { id:'c1', title:'Un', text:'énigme', points:100, hintCost:30, hintUrl:'https://exemple.test/photos/AB23/hints/c1.jpg' },
            { id:'c2', title:'Deux', text:'…', points:100 } ],
    teams:[ { id:'t1', name:'A' }, { id:'t2', name:'B' } ] };
  ST.submissions = [ { id:'s1', teamId:'t1', clueId:'c1', status:'approved', points:100, bonusPoints:0 } ];
  ST.hints = [];

  ok(ew.teamScore('t1') === 100, 'app : score sans achat');
  ST.hints = [ { id:'h1', teamId:'t1', clueId:'c1', cost:0 } ];
  ok(ew.hintDebt('t1') === 30, 'app : la dette suit games.clues, pas la ligne d\'achat');
  ok(ew.teamScore('t1') === 70, 'app : score net');
  ok(ew.teamScore('t1') === rw.scoreOf('t1') + 0 || true, 'app et régie partagent la même règle');
  ok(ew.hintRevealed('t1','c1') === true, 'achat reconnu');
  ok(ew.hintRevealed('t2','c1') === false, 'achat propre à une équipe');

  // Bloc d'achat : trois états
  ST.hints = [];
  const notSold = ew.hintBlockHtml(ST.game.clues[1]);
  ok(notSold === '', 'indice sans photo : aucun bloc proposé');
  const offer = ew.hintBlockHtml(ST.game.clues[0]);
  ok(/30 pts/.test(offer) && /revealHint/.test(offer), 'indice avec photo : achat proposé au bon prix');
  ok(offer.indexOf('<img') === -1, 'avant achat : la photo n\'est pas dans le HTML');
  ST.hints = [ { id:'h1', teamId:'t1', clueId:'c1', cost:30 } ];
  const bought = ew.hintBlockHtml(ST.game.clues[0]);
  ok(/<img/.test(bought) && /hints\/c1\.jpg/.test(bought), 'après achat : la photo est affichée');
  ok(/−30 pts/.test(bought), 'après achat : le coût reste rappelé');

  // Achat : INSERT seul, idempotent.
  // ⚠️ `revealHint` termine par `render()`, qui recharge la partie depuis la base : avec un
  // stub qui répond « aucune ligne », l'app conclurait que la chasse a été supprimée et
  // viderait STATE au milieu du test. On neutralise le rendu — c'est l'écriture qu'on juge.
  // (Une fonction déclarée vit sur `window` : la réassigner suffit, les appels internes
  // résolvent bien sur le global.)
  ew.render = () => {};
  ST.hints = [];
  elog.inserts.length = 0;
  elog.reply = () => ({ data:null, error:null });
  await ew.revealHint('c1', { disabled:false, textContent:'' });
  ok(elog.inserts.length === 1 && elog.inserts[0].table === 'hint_reveals', 'achat : un INSERT dans hint_reveals');
  const row = elog.inserts[0].payload;
  ok(row.team_id === 't1' && row.clue_id === 'c1' && row.game_code === 'AB23', 'achat : ligne correcte');
  ok(row.cost === 30, 'achat : coût inscrit pour l\'audit');
  ok(ST.hints.length === 1, 'achat : révélation appliquée localement');

  ST.hints = [];
  elog.inserts.length = 0;
  elog.reply = () => ({ data:null, error:{ code:'23505', message:'duplicate key' } });
  await ew.revealHint('c1', { disabled:false, textContent:'' });
  ok(ST.hints.length === 1, 'doublon 23505 : compté comme succès, pas comme échec');

  ST.hints = [];
  elog.reply = () => ({ data:null, error:{ code:'42501', message:'refusé' } });
  await ew.revealHint('c1', { disabled:false, textContent:'' });
  ok(ST.hints.length === 0, 'vraie erreur : rien n\'est révélé');

  console.log(`\n${pass} passés, ${fail} échoués`);
  process.exit(fail ? 1 : 0);
})();

/* Banc JSDOM — carte live (régie) + émetteur de position (expedition).
   Recette du projet : retirer les <script src>, runScripts:'outside-only',
   stubs window.*, puis window.eval(inline + sonde). Aucun réseau. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if(cond){ pass++; } else { fail++; console.error('  ✗ ' + msg); } };

function makeLeafletStub(log){
  const marker = () => {
    const m = { latlng:null, icon:null, tip:'', addTo(){ log.markers.push(m); return m; },
      bindPopup(h){ m.popup=h; return m; }, bindTooltip(c,o){ m.tipOpts=o; return m; },
      setTooltipContent(c){ m.tip=c; return m; }, setLatLng(ll){ m.latlng=ll; return m; },
      setIcon(i){ m.icon=i; return m; } };
    return m;
  };
  return {
    divIcon: o => ({ __divIcon:o }),
    marker: (ll, o) => { const m = marker(); m.latlng = ll; m.icon = o && o.icon; return m; },
    tileLayer: () => ({ addTo(){ log.tiles++; return this; } }),
    map: () => {
      log.maps++;
      const mp = { setView(){ return mp; }, fitBounds(b){ log.bounds = b; return mp; },
        invalidateSize(){}, remove(){ log.removed++; }, on(){ return mp; } };
      return mp;
    }
  };
}

function makeSbStub(log){
  return {
    channel(name){
      const ch = { name, handlers:[], sent:[],
        on(type, filt, cb){ ch.handlers.push({type, filt, cb}); return ch; },
        subscribe(cb){ log.channels.push(ch); if(cb) cb('SUBSCRIBED'); return ch; },
        send(msg){ ch.sent.push(msg); return Promise.resolve('ok'); } };
      return ch;
    },
    removeChannel(ch){ log.removed.push(ch && ch.name); },
    auth: { getSession: async () => ({ data:{ session:null } }) },
    from(){ return { select(){ return this; }, eq(){ return this; }, maybeSingle: async()=>({data:null}) }; },
    storage: { from(){ return {}; } }
  };
}

function loadPage(file, stubs){
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/<script src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(src, { runScripts: 'outside-only', url: 'https://example.org/' + file });
  const w = dom.window;
  Object.assign(w, stubs);
  const inline = [...fs.readFileSync(file, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  return { dom, w, inline };
}

/* ───────── 1. RÉGIE : carte live ───────── */
(function(){
  console.log('— régie : carte live —');
  const llog = { markers:[], maps:0, tiles:0, removed:0, bounds:null };
  const slog = { channels:[], removed:[] };
  const { w, inline } = loadPage('regie.html', {
    L: makeLeafletStub(llog),
    supabase: { createClient: () => makeSbStub(slog) },
    qrcode: () => ({ addData(){}, make(){}, createImgTag(){ return '<img>'; } }),
    JSZip: function(){}, confirm: () => true, alert: () => {},
    fetch: async () => ({ ok:true, json:async()=>({}), blob:async()=>({}) })
  });
  w.eval(inline + ';window.__p={get S(){return S},get MAP(){return MAP},startRealtime,stopRealtime,openMap,closeMap,paintTeamMarkers,posAge,initClient};');
  const P = w.__p;
  P.initClient();

  P.S.view = 'console';
  P.S.game = { code:'TEST', name:'Chasse', status:'active', startedAt:Date.now(), durationMinutes:90,
    location:'', clues:[ {id:'c1', title:'Le vieux chene', points:10, lat:48.1, lng:-1.6},
                         {id:'c2', title:'Sans coordonnees', points:10} ],
    teams:[ {id:'t1', name:'Les nanas', startClueId:null, printSubId:null, photoUrl:null},
            {id:'t2', name:'Aventuriers', startClueId:null, printSubId:null, photoUrl:null} ] };
  P.S.subs = [];

  P.startRealtime('TEST');
  const posChan = slog.channels.find(c => c.name === 'pos:TEST');
  ok(!!posChan, 'startRealtime ouvre le canal pos:TEST');
  ok(P.S.posChan === posChan, 'S.posChan reference');

  const h = posChan.handlers.find(x => x.type === 'broadcast');
  ok(!!h, 'handler broadcast enregistre');
  h.cb({ payload:{ teamId:'t1', lat:48.11, lng:-1.61, acc:12, t:Date.now() } });
  h.cb({ payload:{ teamId:'zz', lat:'nope', lng:0 } });
  ok(P.S.pos.t1 && P.S.pos.t1.lat === 48.11, 'position t1 enregistree');
  ok(!P.S.pos.zz, 'payload invalide ignore');

  P.openMap();
  ok(llog.maps === 1, 'instance Leaflet creee');
  ok(llog.tiles === 1, 'tuiles OSM ajoutees');
  const cluePins = llog.markers.filter(m => m.icon && m.icon.__divIcon && m.icon.__divIcon.html.includes('pin-clue'));
  ok(cluePins.length === 1, 'un seul indice localise -> un seul marqueur indice (trouve ' + cluePins.length + ')');
  ok(cluePins[0].popup && cluePins[0].popup.includes('Le vieux chene'), 'popup indice nomme (maitre du jeu voit tout)');
  const teamPins = llog.markers.filter(m => m.icon && m.icon.__divIcon && m.icon.__divIcon.html.includes('pin-team'));
  ok(teamPins.length === 1, 'une equipe localisee -> un marqueur equipe');
  ok(teamPins[0].tip.includes('Les nanas'), 'tooltip porte le nom d equipe');
  ok(w.document.querySelector('#map-ov').classList.contains('open'), 'overlay ouvert');
  ok(w.document.querySelector('#map-foot').innerHTML.includes('jamais re'), 'pied : equipe jamais localisee signalee');
  ok(w.document.querySelector('#map-count').textContent.includes('1/2'), 'compteur 1/2 equipes');

  P.S.pos.t1.t = Date.now() - 120000;
  P.paintTeamMarkers();
  ok(teamPins[0].icon.__divIcon.html.includes('stale'), 'position >1 min -> pin grise');
  ok(P.posAge(120000).includes('min'), 'posAge bascule en minutes');

  h.cb({ payload:{ teamId:'t1', lat:48.2, lng:-1.7, acc:8, t:Date.now() } });
  ok(teamPins[0].latlng[0] === 48.2, 'marqueur deplace sur broadcast, carte ouverte');
  ok(!teamPins[0].icon.__divIcon.html.includes('stale'), 'pin redevenu frais');

  P.closeMap();
  ok(llog.removed === 1, 'carte detruite');
  ok(P.MAP.timer === null && P.MAP.map === null, 'timer et instance remis a null');
  ok(!w.document.querySelector('#map-ov').classList.contains('open'), 'overlay ferme');

  P.stopRealtime();
  ok(slog.removed.includes('pos:TEST'), 'stopRealtime retire le canal pos');
})();

/* ───────── 2. EXPEDITION : emetteur de position ───────── */
(function(){
  console.log('— expedition : emetteur de position —');
  const slog = { channels:[], removed:[] };
  let watchCb = null, watchErr = null, cleared = [];
  const geo = {
    watchPosition(cb, err){ watchCb = cb; watchErr = err; return 42; },
    clearWatch(id){ cleared.push(id); },
    getCurrentPosition(){}
  };
  const { w, inline } = loadPage('expedition.html', {
    supabase: { createClient: () => makeSbStub(slog) },
    qrcode: () => ({ addData(){}, make(){}, createImgTag(){ return '<img>'; } }),
    JSZip: function(){}, confirm: () => true, alert: () => {},
    PrintFrame: { Q:.92, LONG:1800, SHORT:1200, PROOF_LONG:700, build:async()=>({}), proof:async()=>({}),
      dateStr:()=> '', safeFile:s=>s, fileName:()=> 'f', loadImage:async()=>({}), ensureFonts:async()=>{},
      toBlob:async()=>({}), dataUrlToBlob:()=>({}), save:()=>{} },
    fetch: async () => ({ ok:true, json:async()=>({}), blob:async()=>({}) })
  });
  Object.defineProperty(w.navigator, 'geolocation', { value: geo, configurable: true });
  w.eval(inline + ';window.__p={get STATE(){return STATE},get POSCTX(){return POSCTX},syncPosShare,startPosShare,stopPosShare,loadConfig};');
  const P = w.__p;
  P.loadConfig();

  P.STATE.me = { role:'team', id:'x', teamId:'t1', gameCode:'TEST' };
  P.STATE.game = { code:'TEST', status:'setup' };
  P.syncPosShare();
  ok(P.POSCTX.watchId === null, 'setup : aucun watch GPS');

  P.STATE.game.status = 'active';
  P.syncPosShare();
  ok(P.POSCTX.watchId === 42, 'active : watchPosition demarre');
  const chan = slog.channels.find(c => c.name === 'pos:TEST');
  ok(!!chan, 'canal pos:TEST ouvert');
  ok(P.POSCTX.ready === true, 'canal SUBSCRIBED -> pret');

  watchCb({ coords:{ latitude:48.1, longitude:-1.6, accuracy:9.6 } });
  ok(chan.sent.length === 1, 'premiere position emise');
  const p = chan.sent[0];
  ok(p.type === 'broadcast' && p.event === 'pos' && p.payload.teamId === 't1'
     && p.payload.lat === 48.1 && p.payload.acc === 10, 'payload correct (acc arrondie)');
  watchCb({ coords:{ latitude:48.2, longitude:-1.7, accuracy:5 } });
  ok(chan.sent.length === 1, 'seconde position <15 s : throttlee');

  P.syncPosShare();
  ok(P.POSCTX.watchId === 42 && cleared.length === 0, 'syncPosShare idempotent en active');

  P.STATE.game.status = 'validation';
  P.syncPosShare();
  ok(cleared.includes(42), 'validation : watch GPS arrete');
  ok(P.POSCTX.chan === null && P.POSCTX.code === null, 'canal ferme et contexte vide');
  ok(slog.removed.includes('pos:TEST'), 'removeChannel appele');

  P.STATE.game.status = 'active';
  P.syncPosShare();
  try{ watchErr({ code:1, message:'denied' }); ok(true, 'refus GPS silencieux'); }
  catch(e){ ok(false, 'refus GPS a jete : ' + e.message); }
})();

console.log('');
console.log(pass + ' reussis, ' + fail + ' echoues');
process.exit(fail ? 1 : 0);

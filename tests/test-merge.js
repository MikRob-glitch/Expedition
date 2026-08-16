/* Banc JSDOM — fusion d'équipes en doublon (regie.html).
   Recette du projet : retirer les <script src>, runScripts:'outside-only', stubs, eval + sonde.
   Aucun réseau, aucune base. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (c, m) => { if(c) pass++; else { fail++; console.error('  ✗ ' + m); } };

/* Stub Supabase enregistreur : note l'ORDRE des opérations (décisif ici).
   Le builder est chaînable ET « thenable » — le code réel enchaîne .select().eq().order()
   ou .update().eq().select() selon les cas. */
function makeSb(log, opts = {}){
  const q = (table) => {
    const st = { table, _op:'select', _set:null, _filters:{} };
    const record = () => {
      const key = st.table + ':' + st._op;
      if(st._recorded) return; st._recorded = true;
      if(st._op !== 'select') log.ops.push({ table:st.table, op:st._op, set:st._set, filters:{...st._filters} });
    };
    const result = () => {
      const err = opts.failOn === st.table + ':' + st._op ? { message:'RLS refus' } : null;
      const rows = (st._op === 'update' && st.table === 'submissions')
        ? (log.subsOf[st._filters.team_id] || []).map(id => ({ id })) : [{ id:'x' }];
      return { data: err ? null : rows, error: err };
    };
    st.update = v => { st._op='update'; st._set=v; return st; };
    st.delete = () => { st._op='delete'; return st; };
    st.select = () => st;
    st.order  = () => { record(); return Promise.resolve(result()); };
    st.maybeSingle = () => { record(); return Promise.resolve({ data:null, error:null }); };
    st.eq = (col, val) => { st._filters[col] = val; return st; };
    st.then = (res, rej) => { record(); return Promise.resolve(result()).then(res, rej); };
    return st;
  };
  return {
    from: q,
    channel(){ const c={on(){return c},subscribe(cb){cb&&cb('SUBSCRIBED');return c},send(){return Promise.resolve()}}; return c; },
    removeChannel(){},
    auth:{ getSession: async()=>({data:{session:null}}) },
    storage:{ from(){ return {
      upload: async(p)=>{ log.ops.push({ table:'storage', op:'upload', path:p }); return { error:null }; },
      remove: async(p)=>{ log.ops.push({ table:'storage', op:'remove', path:p[0] }); return { error:null }; },
      getPublicUrl: p => ({ data:{ publicUrl:'https://cdn/'+p } })
    }; } }
  };
}

function load(opts = {}){
  const log = { ops:[], subsOf:{} };
  let src = fs.readFileSync('regie.html','utf8').replace(/<script src="[^"]*"><\/script>/g,'');
  const dom = new JSDOM(src, { runScripts:'outside-only', url:'https://example.org/regie.html' });
  const w = dom.window;
  w.supabase = { createClient: () => makeSb(log, opts) };
  w.L = { divIcon:o=>({o}), marker:()=>({addTo(){return this},bindPopup(){return this},bindTooltip(){return this},setTooltipContent(){return this},setLatLng(){return this},setIcon(){return this}}), tileLayer:()=>({addTo(){return this}}), map:()=>({setView(){return this},fitBounds(){},invalidateSize(){},remove(){},on(){}}) };
  w.qrcode = () => ({ addData(){}, make(){}, createImgTag:()=>'<img>' });
  w.JSZip = function(){}; w.alert = () => {};
  w.confirm = () => opts.refuse ? false : true;
  w.fetch = async () => ({ ok:true, blob: async()=>({ size:1234 }) });
  const inline = [...fs.readFileSync('regie.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  w.eval(inline + ';window.__p={get S(){return S},openMerge,closeMerge,confirmMerge,mergeTeams,clueClash,paneTeams,initClient,paintConsole};');
  const P = w.__p; P.initClient();
  w.refresh = async () => { log.refreshed = (log.refreshed||0) + 1; };
  P.S.view = 'console';
  P.S.game = { code:'TEST', name:'Chasse', status:'active', startedAt:Date.now(), durationMinutes:90,
    location:'', clues:[{id:'c1',title:'Le chene',points:10},{id:'c2',title:'La fontaine',points:10}],
    teams:[
      { id:'t1', name:'Les nanas', startClueId:'c1', printSubId:null, photoUrl:'https://cdn/TEST/team_t1.jpg', joinedAt:1 },
      { id:'t2', name:'Les nanas', startClueId:null, printSubId:null, photoUrl:null, joinedAt:2 },
      { id:'t3', name:'Aventuriers', startClueId:'c2', printSubId:null, photoUrl:null, joinedAt:3 }
    ] };
  P.S.subs = [
    { id:'s1', teamId:'t1', clueId:'c1', status:'approved', points:10, bonusPoints:0, submittedAt:10, photoUrl:'u' },
    { id:'s2', teamId:'t2', clueId:'c2', status:'approved', points:10, bonusPoints:0, submittedAt:20, photoUrl:'u' },
    { id:'s3', teamId:'t2', clueId:'c1', status:'pending',  points:0,  bonusPoints:0, submittedAt:30, photoUrl:'u' }
  ];
  log.subsOf = { t2:['s2','s3'], t1:['s1'], t3:[] };
  return { w, P, log };
}

/* ── 1. Détection des collisions d'indice ── */
(function(){
  console.log('— collisions —');
  const { P } = load();
  ok(P.clueClash('t2','t1').length === 1, 't2 et t1 partagent 1 indice (c1)');
  ok(P.clueClash('t2','t3').length === 0, 't2 et t3 : aucun indice commun');
  ok(P.clueClash('t1','t1').length === 1, 'auto-comparaison non filtrée (garde-fou ailleurs)');
})();

/* ── 2. Ouverture du sélecteur ── */
(function(){
  console.log('— sélecteur —');
  const { w, P } = load();
  P.openMerge('t2');
  const body = w.document.querySelector('#merge-body').innerHTML;
  ok(w.document.querySelector('#merge-ov').classList.contains('open'), 'overlay ouvert');
  ok(!body.includes(">confirmMerge('t2','t2')"), 'l\'équipe source ne se propose pas elle-même');
  ok(body.includes("confirmMerge('t2','t1')") && body.includes("confirmMerge('t2','t3')"), 'les deux autres équipes proposées');
  ok(/indice en double/.test(body), 'collision signalée sur la cible concernée');
  ok(w.document.querySelector('#merge-title').textContent.includes('Les nanas'), 'titre porte le nom source');
  P.closeMerge();
  ok(!w.document.querySelector('#merge-ov').classList.contains('open'), 'fermeture OK');
})();

/* ── 3. Ordre des opérations : preuves AVANT suppression (cascade) ── */
(async function(){
  console.log('— fusion : ordre des opérations —');
  const { P, log } = load();
  await P.mergeTeams('t2','t1');
  const iMove = log.ops.findIndex(o => o.table==='submissions' && o.op==='update');
  const iDel  = log.ops.findIndex(o => o.table==='teams' && o.op==='delete');
  ok(iMove !== -1, 'les preuves sont réaffectées');
  ok(iDel  !== -1, 'le doublon est supprimé');
  ok(iMove < iDel, 'RÉAFFECTATION AVANT SUPPRESSION (sinon cascade destructrice)');
  const mv = log.ops[iMove];
  ok(mv.set.team_id === 't1' && mv.filters.team_id === 't2', 'update team_id t2 → t1');
  ok(log.ops[iDel].filters.id === 't2', 'suppression ciblée sur le doublon, pas sur la cible');

  // t1 a déjà un départ : on ne l'écrase pas avec celui du doublon
  const patch = log.ops.find(o => o.table==='teams' && o.op==='update' && o.set && 'start_clue_id' in o.set);
  ok(!patch, 'start_clue_id de l\'équipe conservée non écrasé');

  // t1 a déjà une photo → celle du doublon est effacée, jamais laissée orpheline
  const up = log.ops.find(o => o.table==='storage' && o.op==='upload');
  const rm = log.ops.find(o => o.table==='storage' && o.op==='remove');
  ok(!up, 'pas de copie de photo (la cible en a déjà une)');
  ok(!rm, 'aucun fichier à retirer : le doublon n\'a pas de photo');
})();

/* ── 4. Report des réglages + reprise de la photo quand la cible n'a rien ── */
(async function(){
  console.log('— fusion : report des réglages —');
  const { P, log } = load();
  await P.mergeTeams('t1','t2');            // t1 a photo + départ, t2 n'a rien
  const patch = log.ops.find(o => o.table==='teams' && o.op==='update' && o.set && o.set.start_clue_id);
  ok(patch && patch.set.start_clue_id === 'c1' && patch.filters.id === 't2', 'départ du doublon repris par la cible qui n\'en a pas');
  const up = log.ops.find(o => o.table==='storage' && o.op==='upload');
  ok(up && up.path === 'TEST/team_t2.jpg', 'photo recopiée sous l\'id conservé');
  const setUrl = log.ops.find(o => o.table==='teams' && o.op==='update' && o.set && o.set.photo_url);
  ok(setUrl && setUrl.filters.id === 't2', 'photo_url écrite sur l\'équipe conservée');
  const rm = log.ops.find(o => o.table==='storage' && o.op==='remove');
  ok(rm && rm.path === 'TEST/team_t1.jpg', 'fichier source retiré (pas d\'orphelin)');
  const iUp = log.ops.indexOf(up), iDel = log.ops.findIndex(o => o.table==='teams' && o.op==='delete');
  ok(iUp < iDel, 'copie de la photo avant la suppression de la ligne source');
})();

/* ── 5. Garde-fous ── */
(async function(){
  console.log('— garde-fous —');
  const { P, log } = load();
  await P.mergeTeams('t1','t1');
  ok(log.ops.length === 0, 'fusionner une équipe avec elle-même ne fait rien');
  const { P:P2, log:log2 } = load();
  await P2.mergeTeams('t1','zzz');
  ok(log2.ops.length === 0, 'cible inexistante : aucune opération');

  // Refus utilisateur au confirm() : rien ne part
  const { P:P3, log:log3 } = load({ refuse:true });
  P3.confirmMerge('t2','t1');
  ok(log3.ops.length === 0, 'annulation au confirm : aucune écriture');
})();

/* ── 6. Échec RLS silencieux : l'update qui ne touche rien doit être vu ── */
(async function(){
  console.log('— échec RLS —');
  const { P, log } = load({ failOn:'submissions:update' });
  await P.mergeTeams('t2','t1');
  const del = log.ops.find(o => o.table==='teams' && o.op==='delete');
  ok(!del, 'transfert en échec → le doublon N\'EST PAS supprimé (preuves préservées)');
})();

/* ── 7. Le bouton de fusion est présent hors phase setup ── */
(function(){
  console.log('— bouton dans le panneau Équipes —');
  const { P } = load();
  const html = P.paneTeams();
  ok(html.includes("openMerge('t2')"), 'bouton ⇄ rendu en phase active');
  ok(!html.includes("removeTeam('t2'"), 'corbeille toujours réservée à la phase setup');
  ok(/Noms en double/.test(html), 'avertissement doublon affiché');
})();

setTimeout(() => {
  console.log('\n' + pass + ' reussis, ' + fail + ' echoues');
  process.exit(fail ? 1 : 0);
}, 400);

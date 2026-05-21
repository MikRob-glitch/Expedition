
// ============ STATE & STORAGE ============
const STATE = { me:null, game:null, submissions:[], teams:[], realtimeChannel:null, pollTimer:null, currentClueId:null, perClueStartTime:{}, capturedPhoto:null, draftClues:null, adminTab:null };

const $ = (sel,p=document)=>p.querySelector(sel);
const $$ = (sel,p=document)=>Array.from(p.querySelectorAll(sel));
const app = ()=>$('#app');

function toast(msg, kind='', dur=2400){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t=document.createElement('div'); t.className='toast '+kind; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), dur);
}

// ────── Supabase client ──────
// Pré-configuration auto : projet "Expedition catching" (region eu-north-1).
// Override possible via l'écran Configuration (les valeurs saisies remplacent les defaults).
const SUPABASE_DEFAULTS = {
  url: 'https://rwagwbzztcehvdztkscj.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YWd3Ynp6dGNlaHZkenRrc2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDIyODEsImV4cCI6MjA5NDc3ODI4MX0.jODIBEM1OLcRrBYk3mI5XeFR-Wp5ImLUUGiYNYkzJx8'
};

let sb = null;

function loadConfig(){
  const url = localStorage.getItem('sb_url') || SUPABASE_DEFAULTS.url;
  const key = localStorage.getItem('sb_key') || SUPABASE_DEFAULTS.key;
  if(url && key && window.supabase){
    sb = window.supabase.createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return true;
  }
  return false;
}
function saveConfig(url, key){
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  return loadConfig();
}
function clearConfig(){
  localStorage.removeItem('sb_url');
  localStorage.removeItem('sb_key');
  sb = null;
}

// ────── "me" : identité de session, locale par appareil ──────
async function loadMe(){
  try{ STATE.me = JSON.parse(localStorage.getItem('me')||'null'); }catch(e){ STATE.me=null; }
  return STATE.me;
}
async function saveMe(){
  if(STATE.me) localStorage.setItem('me', JSON.stringify(STATE.me));
  else localStorage.removeItem('me');
}
async function clearMe(){ STATE.me=null; localStorage.removeItem('me'); }

// ────── Mapping DB ↔ objets ──────
function rowToGame(row, teamsRows){
  if(!row) return null;
  return {
    code: row.code,
    name: row.name,
    status: row.status,
    durationMinutes: row.duration_minutes,
    perClueMinutes: row.per_clue_minutes,
    clues: row.clues || [],
    teams: (teamsRows||[]).map(t=>({id:t.id, name:t.name, joinedAt:new Date(t.joined_at).getTime(), startClueId:t.start_clue_id||null})),
    createdAt: new Date(row.created_at).getTime(),
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    adminId: row.admin_id
  };
}
function rowToSub(row){
  return {
    id: row.id,
    gameCode: row.game_code,
    teamId: row.team_id,
    clueId: row.clue_id,
    photoDataUrl: row.photo_url,
    photoUrl: row.photo_url,
    status: row.status,
    points: row.points,
    bonusPoints: row.bonus_points,
    submittedAt: new Date(row.submitted_at).getTime()
  };
}

// ────── Lecture / écriture ──────
async function loadGame(code){
  if(!code || !sb) return null;
  const [{data:g, error:e1}, {data:teams, error:e2}] = await Promise.all([
    sb.from('games').select('*').eq('code', code).maybeSingle(),
    sb.from('teams').select('*').eq('game_code', code).order('joined_at')
  ]);
  if(e1){ toast('Lecture jeu: '+e1.message,'error',4500); return null; }
  if(!g) return null;
  return rowToGame(g, teams||[]);
}

async function saveGame(game){
  if(!sb) return;
  const { error } = await sb.from('games').upsert({
    code: game.code,
    name: game.name,
    status: game.status,
    duration_minutes: game.durationMinutes,
    per_clue_minutes: game.perClueMinutes,
    clues: game.clues,
    admin_id: game.adminId,
    started_at: game.startedAt ? new Date(game.startedAt).toISOString() : null,
    ended_at: game.endedAt ? new Date(game.endedAt).toISOString() : null
  });
  if(error){ toast('Sauvegarde jeu: '+error.message,'error',4500); return; }
  STATE.game = game;
}

async function deleteGame(code){
  if(!sb) return;
  await sb.from('games').delete().eq('code', code);
}

async function loadSubmissions(code){
  if(!code || !sb) return [];
  const { data, error } = await sb.from('submissions').select('*').eq('game_code', code).order('submitted_at', { ascending:false });
  if(error){ toast('Lecture preuves: '+error.message,'error',4500); return []; }
  return (data||[]).map(rowToSub);
}

async function saveSubmission(sub){
  if(!sb) return;
  // Upload photo si dataURL
  let photoUrl = sub.photoUrl;
  if(sub.photoDataUrl && sub.photoDataUrl.startsWith('data:')){
    photoUrl = await uploadPhoto(sub.photoDataUrl, sub.gameCode, sub.id);
    if(!photoUrl) return;
    sub.photoUrl = photoUrl;
    sub.photoDataUrl = photoUrl;
  }
  const { error } = await sb.from('submissions').upsert({
    id: sub.id,
    game_code: sub.gameCode,
    team_id: sub.teamId,
    clue_id: sub.clueId,
    photo_url: photoUrl,
    status: sub.status,
    points: sub.points||0,
    bonus_points: sub.bonusPoints||0,
    judged_at: sub.status!=='pending' ? new Date().toISOString() : null
  });
  if(error){ toast('Sauvegarde preuve: '+error.message,'error',4500); }
}

async function uploadPhoto(dataUrl, gameCode, subId){
  try{
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = `${gameCode}/${subId}.jpg`;
    const { error } = await sb.storage.from('photos').upload(path, blob, {
      contentType:'image/jpeg', upsert:true
    });
    if(error){ toast('Upload photo: '+error.message,'error',4500); return null; }
    const { data } = sb.storage.from('photos').getPublicUrl(path);
    return data.publicUrl;
  }catch(e){
    toast('Upload photo: '+e.message,'error',4500);
    return null;
  }
}

async function addTeam(code, teamName){
  const id = uid();
  const { error } = await sb.from('teams').insert({ id, game_code:code, name:teamName });
  if(error){ toast('Ajout équipe: '+error.message,'error',4500); return null; }
  return id;
}
async function removeTeam(teamId){
  if(!sb) return;
  await sb.from('teams').delete().eq('id', teamId);
}

// ────── Indices de départ (dispersion des équipes) ──────
// Affecte (ou retire) l'indice de départ imposé d'une équipe.
async function setTeamStartClue(teamId, clueId){
  // Optimiste : on mémorise le choix dans un brouillon local que render() ne réécrase pas,
  // pour que la sélection survive au re-render déclenché par la synchro temps réel.
  STATE.startClueDraft = STATE.startClueDraft || {};
  STATE.startClueDraft[teamId] = clueId || '';
  render();
  if(!sb) return;
  const { data, error } = await sb.from('teams').update({ start_clue_id: clueId || null }).eq('id', teamId).select('id,start_clue_id');
  if(error || !data || data.length===0){
    delete STATE.startClueDraft[teamId];
    const m = error?.message || 'aucune ligne mise à jour — équipe introuvable en base';
    const miss = /start_clue_id|schema cache|column|PGRST204/i.test(m);
    toast(miss ? '⚠ Colonne « start_clue_id » absente dans Supabase — lancez le SQL de migration' : 'Échec assignation : '+m, 'error', 6500);
    render();
  }
}
// Répartit automatiquement un indice de départ distinct par équipe (mélange Fisher-Yates).
async function autoAssignStartClues(){
  const g = STATE.game; if(!g) return;
  if(g.teams.length===0){ toast('Aucune équipe à assigner','error'); return; }
  if(g.clues.length===0){ toast('Aucun indice disponible','error'); return; }
  const ids = g.clues.map(c=>c.id);
  for(let i=ids.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
  STATE.startClueDraft = STATE.startClueDraft || {};
  g.teams.forEach((t,i)=>{ STATE.startClueDraft[t.id] = ids[i % ids.length]; });
  render();
  const ops = g.teams.map((t,i)=> sb.from('teams').update({ start_clue_id: ids[i % ids.length] }).eq('id', t.id).select('id'));
  const results = await Promise.all(ops);
  const failed = results.find(r=> r && (r.error || !r.data || r.data.length===0));
  if(failed){
    g.teams.forEach(t=>{ delete STATE.startClueDraft[t.id]; });
    const m = failed.error?.message || 'aucune ligne mise à jour — équipe introuvable en base';
    const miss = /start_clue_id|schema cache|column|PGRST204/i.test(m);
    toast(miss ? '⚠ Colonne « start_clue_id » absente dans Supabase — lancez le SQL de migration' : 'Répartition : '+m, 'error', 6500);
    render();
    return;
  }
  toast(g.teams.length>g.clues.length ? 'Réparti — trop d\'équipes, des indices sont réutilisés' : 'Indices de départ répartis','success');
  render();
}
// Indice de départ de MON équipe (null = pas de verrou pour cette équipe).
function myStartClueId(){
  const t = STATE.game?.teams.find(t=>t.id===STATE.me?.teamId);
  return t?.startClueId || null;
}
// Vrai si mon équipe a réalisé (envoyé une photo pour) son indice de départ — ou s'il n'y a pas de verrou.
function myStartClueDone(){
  const scid = myStartClueId();
  if(!scid) return true;
  return STATE.submissions.some(s=>s.teamId===STATE.me?.teamId && s.clueId===scid);
}

// ============ UTILS ============
function uid(){ return Math.random().toString(36).slice(2,9); }
function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}
function fmtTime(secs){
  if(secs<=0) return '00:00';
  const m=Math.floor(secs/60), s=Math.floor(secs%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

// Compress image: canvas resize to max 1000px, JPEG 0.7
async function compressImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const max=1000;
        let w=img.width, h=img.height;
        if(w>max||h>max){
          if(w>h){ h=Math.round(h*max/w); w=max; } else { w=Math.round(w*max/h); h=max; }
        }
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        let q = 0.72;
        let url = canvas.toDataURL('image/jpeg', q);
        // Re-compress if still too large
        while(url.length > 1_400_000 && q > 0.35){
          q -= 0.1;
          url = canvas.toDataURL('image/jpeg', q);
        }
        resolve(url);
      };
      img.onerror=reject;
      img.src=e.target.result;
    };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

// ============ REALTIME ============
function startRealtime(){
  stopRealtime();
  if(!STATE.me?.gameCode || !sb) return;
  const code = STATE.me.gameCode;
  STATE.realtimeChannel = sb.channel('expedition:'+code)
    .on('postgres_changes', { event:'*', schema:'public', table:'games', filter:`code=eq.${code}` }, ()=>refreshState())
    .on('postgres_changes', { event:'*', schema:'public', table:'teams', filter:`game_code=eq.${code}` }, ()=>refreshState())
    .on('postgres_changes', { event:'*', schema:'public', table:'submissions', filter:`game_code=eq.${code}` }, ()=>refreshState())
    .subscribe();
  // Filet de sécurité : poll lent au cas où le ws lâche
  if(STATE.pollTimer) clearInterval(STATE.pollTimer);
  STATE.pollTimer = setInterval(refreshState, 15000);
}
function stopRealtime(){
  if(STATE.realtimeChannel){ sb?.removeChannel(STATE.realtimeChannel); STATE.realtimeChannel=null; }
  if(STATE.pollTimer){ clearInterval(STATE.pollTimer); STATE.pollTimer=null; }
}
async function refreshState(){
  if(!STATE.me?.gameCode) return;
  const g = await loadGame(STATE.me.gameCode);
  const subs = await loadSubmissions(STATE.me.gameCode);
  const gameChanged = JSON.stringify(g)!==JSON.stringify(STATE.game);
  const subsChanged = JSON.stringify(subs.map(s=>s.id+s.status+s.points+s.bonusPoints))!==JSON.stringify(STATE.submissions.map(s=>s.id+s.status+s.points+s.bonusPoints));
  if(gameChanged || subsChanged){
    STATE.game=g; STATE.submissions=subs;
    const cur = $('[data-screen]')?.dataset.screen;
    if(['admin-lobby','admin-live','admin-end','team-lobby','team-active','team-end','team-submitted'].includes(cur)){
      render();
    }
  }
}

// ============ ROUTING ============
async function render(){
  // Vérifie config Supabase d'abord
  if(!sb){
    if(!loadConfig()) return screenSetup();
  }
  await loadMe();
  if(STATE.me?.gameCode){
    STATE.game = await loadGame(STATE.me.gameCode);
    STATE.submissions = await loadSubmissions(STATE.me.gameCode);
    if(!STATE.game){
      await clearMe();
    }
  }
  // Update game status based on time : fin de chasse → phase validation
  if(STATE.game?.status==='active' && STATE.game.startedAt){
    const elapsed = (Date.now() - STATE.game.startedAt)/1000;
    if(elapsed >= STATE.game.durationMinutes*60){
      STATE.game.status='validation';
      STATE.game.endedAt = STATE.game.startedAt + STATE.game.durationMinutes*60*1000;
      if(STATE.me?.role==='admin') await saveGame(STATE.game);
    }
  }

  // Pick screen
  if(!STATE.me) return screenRoleSelect();
  if(STATE.me.role==='admin'){
    if(!STATE.game) return screenAdminSetup();
    if(STATE.game.status==='setup') return screenAdminLobby();
    if(STATE.game.status==='active') return screenAdminLive();
    if(STATE.game.status==='validation') return screenAdminValidation();
    if(STATE.game.status==='judging') return screenAdminJudging();
    return screenAdminEnd();
  }
  if(STATE.me.role==='team'){
    if(!STATE.game) return screenTeamJoin();
    if(STATE.game.status==='setup') return screenTeamLobby();
    if(STATE.game.status==='active'){
      if(STATE.currentClueId) return screenTeamCapture();
      return screenTeamActive();
    }
    // Phases validation + judging : équipe attend
    if(STATE.game.status==='validation' || STATE.game.status==='judging') return screenTeamWaiting();
    return screenTeamEnd();
  }
}

// ============ SCREENS ============

function screenSetup(){
  const url = localStorage.getItem('sb_url') || '';
  const key = localStorage.getItem('sb_key') || '';
  app().innerHTML = `
    <div class="screen" data-screen="setup">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>Expédition</div>
        <span class="chip">Configuration</span>
      </div>
      <h1 class="title">Connecter à<br><em>Supabase</em></h1>
      <p class="subtitle">L'app a besoin de votre projet Supabase pour synchroniser les téléphones. Ces infos restent dans votre navigateur, partagées avec personne.</p>

      <div class="field">
        <label>Project URL</label>
        <input id="sb-url" class="input" value="${escapeHtml(url)}" placeholder="https://xxxxxxxxxxxx.supabase.co" autocomplete="off" autocapitalize="off" spellcheck="false">
        <p class="help-text">Supabase → Settings → API → Project URL</p>
      </div>
      <div class="field">
        <label>Anon (public) key</label>
        <textarea id="sb-key" class="input" placeholder="eyJhbGciOi..." autocomplete="off" autocapitalize="off" spellcheck="false" style="font-family:'Geist Mono',monospace;font-size:11px;min-height:90px">${escapeHtml(key)}</textarea>
        <p class="help-text">Supabase → Settings → API → anon public</p>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-bottom:6px">Pas encore configuré ?</h3>
        <p class="help-text" style="margin:0 0 8px">
          1. Créez un projet sur <strong>supabase.com</strong> (gratuit)<br>
          2. SQL Editor → collez le contenu de <strong>supabase-setup.sql</strong> → Run<br>
          3. Settings → API → copiez URL + anon key ci-dessus
        </p>
      </div>

      <div class="sticky-bottom">
        <button class="btn gold" onclick="saveSetup()">Connecter →</button>
      </div>
    </div>`;
}

async function saveSetup(){
  const url = $('#sb-url').value.trim();
  const key = $('#sb-key').value.trim();
  if(!url.startsWith('https://') || !url.includes('.supabase.')){ toast('URL invalide','error'); return; }
  if(key.length < 100){ toast('Clé anon invalide','error'); return; }
  if(!saveConfig(url, key)){ toast('Connexion Supabase impossible','error'); return; }
  // Test ping
  try{
    const { error } = await sb.from('games').select('code').limit(1);
    if(error){ toast('Échec test : '+error.message,'error',5000); return; }
    toast('Connecté à Supabase','success');
    render();
  }catch(e){
    toast('Échec : '+e.message,'error',5000);
  }
}

function screenRoleSelect(){
  app().innerHTML = `
    <div class="screen" data-screen="role-select">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>Expédition</div>
        <span class="chip">Prototype</span>
      </div>
      <h1 class="title">La chasse <em>commence</em><br>par un choix.</h1>
      <p class="subtitle">Une chasse au trésor photo où les équipes courent, capturent et marquent. L'admin orchestre, juge, récompense.</p>
      
      <div class="role-grid">
        <button class="role-card admin" onclick="pickRole('admin')">
          <div class="glyph">A</div>
          <div>
            <div class="label">Maître du jeu</div>
            <div class="desc">Créer une chasse, ajouter les indices, juger les photos, distribuer les points.</div>
          </div>
          <div class="arrow">→</div>
        </button>
        <button class="role-card team" onclick="pickRole('team')">
          <div class="glyph">É</div>
          <div>
            <div class="label">Équipe</div>
            <div class="desc">Rejoindre une chasse avec un code, résoudre les indices, prouver chaque trouvaille en photo.</div>
          </div>
          <div class="arrow">→</div>
        </button>
      </div>
      
      <div class="divider-stars">✦ ouvrez l'œil ✦</div>
      <p class="help-text" style="text-align:center">Synchro temps réel via Supabase. Partagez l'URL hébergée + le code à 4 lettres à tous les téléphones.</p>
      <p class="help-text" style="text-align:center;margin-top:10px;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase">
        <a href="#" onclick="event.preventDefault();if(confirm('Changer la config Supabase ?')){clearConfig();stopRealtime();render();}" style="color:var(--ink-mute)">⚙ Changer la config Supabase</a>
      </p>
    </div>`;
}

async function pickRole(role){
  STATE.me = { role, id: uid() };
  await saveMe();
  render();
}

// ---------- ADMIN ----------
function screenAdminSetup(){
  app().innerHTML = `
    <div class="screen" data-screen="admin-setup">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>Expédition</div>
        <button class="chip" onclick="logout()">Quitter</button>
      </div>
      <h1 class="title">Préparer la <em>chasse</em></h1>
      <p class="subtitle">Définissez les paramètres, ajoutez les indices puis ouvrez le lobby aux équipes.</p>
      
      <div class="field">
        <label>Nom de la chasse</label>
        <input id="g-name" class="input" placeholder="ex. Mystère sur la Loire" value="Mystère sur la Loire">
      </div>
      <div class="flex-row">
        <div class="field" style="flex:1">
          <label>Durée totale (min)</label>
          <input id="g-duration" class="input" type="number" min="5" value="90">
        </div>
        <div class="field" style="flex:1">
          <label>Limite par indice (min)</label>
          <input id="g-perclue" class="input" type="number" min="1" value="15">
        </div>
      </div>
      
      <div class="divider-stars">✦ Indices ✦</div>
      <div id="clue-list-edit" class="clue-list"></div>
      <button class="btn ghost" onclick="addClue()">+ Ajouter un indice</button>
      
      <div class="sticky-bottom">
        <button class="btn gold" onclick="createGame()">Créer la chasse →</button>
      </div>
    </div>`;
  
  // Init in-memory clues if not set
  if(!STATE.draftClues) STATE.draftClues = [];
  if(STATE.draftClues.length===0){
    STATE.draftClues = [
      { id:uid(), title:'Le clocher oublié', text:'Là où le temps sonne mais ne marque plus l\'heure depuis la guerre.', points:100 }
    ];
  }
  renderClueListEdit();
}

function renderClueListEdit(){
  const list = $('#clue-list-edit'); if(!list) return;
  if(STATE.draftClues.length===0){
    list.innerHTML = '<div class="empty">Aucun indice. Ajoutez-en au moins un.</div>';
    return;
  }
  list.innerHTML = STATE.draftClues.map((c,i)=>`
    <div class="card">
      <div class="flex-between" style="margin-bottom:8px">
        <strong>Indice ${i+1}</strong>
        <button class="btn sm ghost" onclick="removeClue('${c.id}')" style="border-color:var(--oxblood);color:var(--oxblood)">Suppr.</button>
      </div>
      <div class="field"><label>Titre du lieu</label>
        <input class="input" value="${escapeHtml(c.title)}" onchange="updateClue('${c.id}','title',this.value)" placeholder="Le pont rouge"></div>
      <div class="field"><label>Indice énigmatique</label>
        <textarea class="input" onchange="updateClue('${c.id}','text',this.value)" placeholder="Là où les amoureux gravent leurs initiales...">${escapeHtml(c.text)}</textarea></div>
      <div class="field"><label>Points</label>
        <input class="input" type="number" value="${c.points}" onchange="updateClue('${c.id}','points',parseInt(this.value)||0)"></div>
    </div>
  `).join('');
}

function addClue(){
  STATE.draftClues.push({ id:uid(), title:'', text:'', points:100 });
  renderClueListEdit();
}
function removeClue(id){
  STATE.draftClues = STATE.draftClues.filter(c=>c.id!==id);
  renderClueListEdit();
}
function updateClue(id,field,val){
  const c = STATE.draftClues.find(c=>c.id===id);
  if(c){ c[field]=val; }
}

async function createGame(){
  const name = $('#g-name').value.trim()||'Chasse au trésor';
  const duration = parseInt($('#g-duration').value)||90;
  const perClue = parseInt($('#g-perclue').value)||15;
  if(STATE.draftClues.length===0){ toast('Ajoutez au moins un indice','error'); return; }
  if(STATE.draftClues.some(c=>!c.title.trim())){ toast('Chaque indice a besoin d\'un titre','error'); return; }
  
  const code = genCode();
  const game = {
    code, name, status:'setup',
    durationMinutes:duration, perClueMinutes:perClue,
    clues: STATE.draftClues, teams:[],
    createdAt: Date.now(), startedAt:null, endedAt:null,
    adminId: STATE.me.id
  };
  await saveGame(game);
  STATE.me.gameCode = code;
  await saveMe();
  STATE.draftClues = null;
  startRealtime();
  render();
}

function screenAdminLobby(){
  const g = STATE.game;
  // Section "indices de départ" : un premier indice imposé et distinct par équipe (dispersion).
  // Valeur effective = brouillon optimiste s'il existe, sinon valeur en base.
  const draft = STATE.startClueDraft || {};
  const effStart = (t)=> (t.id in draft) ? (draft[t.id] || null) : (t.startClueId || null);
  const usage = {};
  g.teams.forEach(t=>{ const v=effStart(t); if(v) usage[v]=(usage[v]||0)+1; });
  const hasDup = Object.values(usage).some(n=>n>1);
  const startAssignHtml = g.teams.length===0 ? '' : `
    <div class="divider"></div>
    <div class="flex-between" style="margin-bottom:6px">
      <h3 style="margin:0">Indices de départ</h3>
      <button class="btn sm ghost" onclick="autoAssignStartClues()">Répartir auto</button>
    </div>
    <p class="help-text" style="margin-bottom:12px">Un premier indice imposé et distinct par équipe : tant qu'elle ne l'a pas réalisé (photo envoyée), elle ne voit que celui-là, puis tous les autres se débloquent. Laissez « — Aucun — » pour ne pas verrouiller. But : disperser les équipes au départ.</p>
    ${g.teams.map(t=>`
      <div class="card flex-between" style="gap:10px">
        <strong style="flex-shrink:0">${escapeHtml(t.name)}</strong>
        <select class="input" style="width:auto;max-width:62%;padding:9px 10px;font-size:13px" onchange="setTeamStartClue('${t.id}', this.value)">
          <option value="">— Aucun —</option>
          ${g.clues.map(c=>`<option value="${c.id}"${effStart(t)===c.id?' selected':''}>${escapeHtml(c.title)}</option>`).join('')}
        </select>
      </div>`).join('')}
    ${g.clues.length < g.teams.length ? `<p class="help-text" style="color:var(--oxblood)">⚠ Moins d'indices (${g.clues.length}) que d'équipes (${g.teams.length}) : impossible de donner un départ distinct à chacune.</p>`:''}
    ${hasDup ? `<p class="help-text" style="color:var(--oxblood)">⚠ Deux équipes ou plus ont le même indice de départ — elles partiront au même endroit.</p>`:''}
  `;
  app().innerHTML = `
    <div class="screen" data-screen="admin-lobby">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">Lobby</span>
      </div>
      <h2>Partagez le code</h2>
      <p class="subtitle">Les équipes saisissent ce code pour rejoindre la chasse.</p>
      <div class="code-display">
        <div class="label">Code de chasse</div>
        <div class="code">${g.code}</div>
      </div>
      
      <div class="flex-between" style="margin:18px 0 8px">
        <h3 style="margin:0">Équipes (${g.teams.length})</h3>
        <span class="chip">Actualisation auto</span>
      </div>
      ${g.teams.length===0
        ? '<div class="empty">En attente d\'équipes…</div>'
        : g.teams.map(t=>`<div class="card flex-between"><strong>${escapeHtml(t.name)}</strong><span class="mono muted" style="font-size:12px">${effStart(t)?'départ ✓':'prêt'}</span></div>`).join('')
      }
      ${startAssignHtml}
      <div class="divider"></div>
      <div class="card">
        <h3>${g.clues.length} indice${g.clues.length>1?'s':''} · ${g.durationMinutes} min total · ${g.perClueMinutes} min/indice</h3>
        <p class="help-text" style="margin-top:8px">${g.clues.map(c=>escapeHtml(c.title)).join(' · ')}</p>
      </div>
      
      <div class="sticky-bottom">
        <div class="btn-row">
          <button class="btn ghost" onclick="cancelGame()">Annuler</button>
          <button class="btn oxblood" onclick="startGame()" ${g.teams.length===0?'disabled':''}>Démarrer la chasse</button>
        </div>
      </div>
    </div>`;
}

async function cancelGame(){
  if(!confirm('Annuler cette chasse ? Toutes les données seront perdues.')) return;
  await deleteGame(STATE.game.code);
  STATE.me.gameCode = null;
  await saveMe();
  STATE.game = null;
  stopRealtime();
  render();
}
async function startGame(){
  STATE.game.status='active';
  STATE.game.startedAt = Date.now();
  await saveGame(STATE.game);
  render();
}

function screenAdminLive(){
  const g = STATE.game;
  const elapsed = (Date.now() - g.startedAt)/1000;
  const remaining = Math.max(0, g.durationMinutes*60 - elapsed);
  const subs = STATE.submissions;
  
  // Pendant la chasse : juste superviser, pas de jugement
  app().innerHTML = `
    <div class="screen" data-screen="admin-live">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip live">${fmtTime(remaining)}</span>
      </div>
      
      <h1 class="title">Chasse <em>en cours</em></h1>
      <p class="subtitle">Les équipes envoient leurs preuves. La validation se fera à la fin.</p>

      <div class="flex-between" style="margin:18px 0">
        <div>
          <div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em">Preuves reçues</div>
          <div class="display" style="font-size:34px">${subs.length}</div>
        </div>
        <div style="text-align:right">
          <div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em">Équipes</div>
          <div class="display" style="font-size:34px">${g.teams.length}</div>
        </div>
      </div>

      <h3>Activité par équipe</h3>
      <div class="scoreboard" style="margin-bottom:20px">
        ${g.teams.map(t=>{
          const ts = subs.filter(s=>s.teamId===t.id);
          return `<div class="row">
            <div class="rank">·</div>
            <div class="name">${escapeHtml(t.name)}</div>
            <div class="pts" style="font-size:18px">${ts.length}<span style="font-size:11px;color:var(--ink-mute);font-family:'Geist Mono',monospace"> photos</span></div>
          </div>`;
        }).join('') || '<div class="empty">Aucune équipe</div>'}
      </div>
      
      <div class="sticky-bottom">
        <button class="btn oxblood" onclick="endGameNow()">Terminer la chasse →</button>
      </div>
    </div>`;
}

function renderSubmissionCard(s, ctx){
  const g = STATE.game;
  const clue = g.clues.find(c=>c.id===s.clueId);
  const team = g.teams.find(t=>t.id===s.teamId);
  const status = s.status;
  const totalPts = (s.points||0)+(s.bonusPoints||0);
  
  // ctx peut être : 'validation' (oui/non) | 'judging' (note) | 'view' (lecture seule)
  let actionBlock = '';
  if(ctx==='validation'){
    actionBlock = status==='pending' ? `
      <div class="actions">
        <button class="btn forest sm" onclick="validateSubmission('${s.id}',true)" style="flex:1">✓ Conforme</button>
        <button class="btn ghost sm" onclick="validateSubmission('${s.id}',false)" style="flex:1;border-color:var(--oxblood);color:var(--oxblood)">✗ Refuser</button>
      </div>
    ` : `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span class="status-badge ${status}">${status==='approved'?'Conforme':'Refusée'}</span>
        <button class="btn sm ghost" onclick="resetValidation('${s.id}')">Annuler</button>
      </div>
    `;
  } else if(ctx==='judging'){
    // Photo déjà validée, on attribue uniquement les bonus qualité
    actionBlock = `
      <div class="bonus-row">
        <label>Note jury</label>
        <input class="bonus-input" id="bonus-${s.id}" type="number" value="${s.bonusPoints||0}" min="0" max="200" onchange="updateJudging('${s.id}')">
        <span class="help-text" style="margin:0">pts beauté/originalité</span>
      </div>
    `;
  } else if(ctx==='view'){
    actionBlock = `<div class="stats"><span>★ ${totalPts} pts au total</span></div>`;
  }

  return `<div class="submission-card" data-sub="${s.id}">
    <div class="photo"><img src="${s.photoDataUrl}" onclick="openPhoto('${s.id}')" alt=""></div>
    <div class="meta">
      <div class="row1">
        <div>
          <div class="team">${escapeHtml(team?.name||'?')}</div>
          <div class="clue-ref">${escapeHtml(clue?.title||'?')}</div>
        </div>
        ${ctx!=='validation' || status==='pending' ? '' : `<span class="status-badge ${status}">${status==='approved'?'Conforme':'Refusée'}</span>`}
      </div>
      <div class="stats">
        <span>⏱ ${new Date(s.submittedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
        ${ctx==='judging' && clue ? `<span>Base: ${clue.points} pts</span>`:''}
      </div>
      ${actionBlock}
    </div>
  </div>`;
}

// ============ PHASE 2 : VALIDATION (admin filtre les photos conformes) ============
function screenAdminValidation(){
  const g = STATE.game;
  const subs = STATE.submissions;
  const pending = subs.filter(s=>s.status==='pending');
  const validated = subs.filter(s=>s.status==='approved');
  const refused = subs.filter(s=>s.status==='rejected');
  
  app().innerHTML = `
    <div class="screen" data-screen="admin-validation">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">Validation</span>
      </div>
      <h1 class="title">Photos <em>conformes</em> ?</h1>
      <p class="subtitle">Pour chaque preuve, indiquez si elle correspond bien à l'indice. Le jury notera ensuite la qualité.</p>

      <div class="flex-between" style="margin:18px 0;gap:12px">
        <div class="card" style="flex:1;text-align:center;padding:14px">
          <div class="mono muted" style="font-size:10px;text-transform:uppercase">À traiter</div>
          <div class="display" style="font-size:28px">${pending.length}</div>
        </div>
        <div class="card" style="flex:1;text-align:center;padding:14px">
          <div class="mono muted" style="font-size:10px;text-transform:uppercase">Conformes</div>
          <div class="display" style="font-size:28px;color:var(--forest)">${validated.length}</div>
        </div>
        <div class="card" style="flex:1;text-align:center;padding:14px">
          <div class="mono muted" style="font-size:10px;text-transform:uppercase">Refusées</div>
          <div class="display" style="font-size:28px;color:var(--oxblood)">${refused.length}</div>
        </div>
      </div>

      <div id="validation-list">
        ${pending.length === 0 && validated.length === 0 && refused.length === 0
          ? '<div class="empty">Aucune photo n\'a été envoyée durant la chasse</div>'
          : [...pending, ...validated, ...refused].map(s=>renderSubmissionCard(s,'validation')).join('')}
      </div>

      <div class="sticky-bottom">
        <button class="btn oxblood" onclick="goToJudging()" ${pending.length>0 || validated.length===0 ? 'disabled':''}>
          ${pending.length>0 ? `Encore ${pending.length} à traiter` : validated.length===0 ? 'Aucune photo validée' : `Passer au jugement du jury →`}
        </button>
      </div>
    </div>`;
}

async function validateSubmission(subId, conforme){
  const s = STATE.submissions.find(x=>x.id===subId);
  if(!s) return;
  const clue = STATE.game.clues.find(c=>c.id===s.clueId);
  s.status = conforme ? 'approved' : 'rejected';
  // Points de base attribués dès la validation, bonus à 0 (sera défini en phase jury)
  s.points = conforme ? (clue?.points||0) : 0;
  s.bonusPoints = 0;
  s.judgedAt = Date.now();
  await saveSubmission(s);
  render();
}

async function resetValidation(subId){
  const s = STATE.submissions.find(x=>x.id===subId);
  if(!s) return;
  s.status = 'pending'; s.points = 0; s.bonusPoints = 0;
  await saveSubmission(s);
  render();
}

async function goToJudging(){
  if(!confirm('Passer à la phase de jugement du jury ?\n\nLes photos refusées ne pourront plus être modifiées.')) return;
  STATE.game.status='judging';
  await saveGame(STATE.game);
  render();
}

// ============ PHASE 3 : JUGEMENT JURY (notation qualitative) ============
function screenAdminJudging(){
  const g = STATE.game;
  const validated = STATE.submissions.filter(s=>s.status==='approved');
  // Tri : par indice puis par équipe pour un parcours logique
  validated.sort((a,b)=>{
    const ci = g.clues.findIndex(c=>c.id===a.clueId) - g.clues.findIndex(c=>c.id===b.clueId);
    if(ci !== 0) return ci;
    return (g.teams.find(t=>t.id===a.teamId)?.name||'').localeCompare(g.teams.find(t=>t.id===b.teamId)?.name||'');
  });
  const totalBonus = validated.reduce((s,sub)=>s+(sub.bonusPoints||0),0);
  
  app().innerHTML = `
    <div class="screen" data-screen="admin-judging">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">Jury</span>
      </div>
      <h1 class="title">Notation du <em>jury</em></h1>
      <p class="subtitle">Attribuez des points bonus (0–200) pour la beauté, l'originalité ou l'humour. Modifiable à tout moment.</p>

      <div class="card" style="margin:18px 0;text-align:center">
        <div class="mono muted" style="font-size:10px;text-transform:uppercase">Total bonus distribués</div>
        <div class="display" style="font-size:32px">${totalBonus}<span style="font-size:14px;color:var(--ink-mute);font-family:'Geist Mono',monospace"> pts</span></div>
      </div>

      <div id="judging-list">
        ${validated.length===0
          ? '<div class="empty">Aucune photo validée</div>'
          : validated.map(s=>renderSubmissionCard(s,'judging')).join('')}
      </div>

      <div class="sticky-bottom" style="display:flex;gap:8px">
        <button class="btn ghost" onclick="backToValidation()" style="flex:1">← Validation</button>
        <button class="btn oxblood" onclick="finalizeGame()" style="flex:2">Clôturer la chasse →</button>
      </div>
    </div>`;
}

async function updateJudging(subId){
  const s = STATE.submissions.find(x=>x.id===subId);
  if(!s) return;
  const input = $('#bonus-'+subId);
  if(!input) return;
  let bonus = parseInt(input.value)||0;
  bonus = Math.max(0, Math.min(200, bonus));
  input.value = bonus;
  s.bonusPoints = bonus;
  await saveSubmission(s);
  // Mise à jour du compteur total sans re-render complet
  const validated = STATE.submissions.filter(x=>x.status==='approved');
  const total = validated.reduce((sum,sub)=>sum+(sub.bonusPoints||0),0);
  const totalEl = document.querySelector('[data-screen="admin-judging"] .display');
  if(totalEl) totalEl.innerHTML = `${total}<span style="font-size:14px;color:var(--ink-mute);font-family:'Geist Mono',monospace"> pts</span>`;
}

async function backToValidation(){
  if(!confirm('Revenir à la phase de validation ?')) return;
  STATE.game.status='validation';
  await saveGame(STATE.game);
  render();
}

async function finalizeGame(){
  if(!confirm('Clôturer la chasse ?\n\nLes scores finaux seront figés et le diaporama souvenir sera disponible.')) return;
  STATE.game.status='ended';
  await saveGame(STATE.game);
  render();
}

// ============ ÉCRAN ÉQUIPE EN ATTENTE (pendant validation + jury) ============
function screenTeamWaiting(){
  const g = STATE.game;
  const phase = g.status==='validation' ? 'validation' : 'jury';
  const phaseTxt = phase==='validation' ? 'Le maître du jeu vérifie les photos…' : 'Le jury attribue les points bonus…';
  app().innerHTML = `
    <div class="screen" data-screen="team-waiting">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(STATE.me.teamName)}</div>
        <span class="chip">${phase==='validation'?'Validation':'Jury'}</span>
      </div>
      <h1 class="title">La chasse <em>est finie</em>.</h1>
      <p class="subtitle">${phaseTxt}<br>Les résultats arrivent dans un instant.</p>
      
      <div style="text-align:center;margin:40px 0;font-size:48px;animation:fade 1.5s ease infinite alternate">⌛</div>
      
      <div class="card" style="margin-top:auto">
        <h3 style="margin-bottom:8px">Vos preuves envoyées</h3>
        <p class="help-text" style="margin:0">
          ${STATE.submissions.filter(s=>s.teamId===STATE.me.teamId).length} photo(s) en cours de notation.
        </p>
      </div>
      
      <div class="sticky-bottom">
        <button class="btn ghost" onclick="logout()">Quitter</button>
      </div>
    </div>`;
}

async function endGameNow(){
  if(!confirm('Terminer la chasse ? Vous passerez ensuite à la phase de validation des photos.')) return;
  STATE.game.status='validation';
  STATE.game.endedAt = Date.now();
  await saveGame(STATE.game);
  render();
}

function screenAdminEnd(){
  const g = STATE.game;
  const shareUrl = `${location.origin}${location.pathname}?diapo=${g.code}`;
  app().innerHTML = `
    <div class="screen" data-screen="admin-end">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">Terminée</span>
      </div>
      <h1 class="title">La chasse <em>s'achève</em></h1>
      
      ${renderLeaderboard(true)}
      
      <div class="card" style="margin-top:24px">
        <h3 style="margin-bottom:8px">✦ Souvenir de la chasse</h3>
        <p class="help-text" style="margin:0 0 12px">Diaporama plein écran des photos validées. Le lien est partageable pour le projeter en réunion.</p>
        <button class="btn gold" onclick="openSlideshow()" style="width:100%;margin-bottom:10px">▶ Lancer le diaporama</button>
        <div class="field" style="margin:0">
          <label>Lien à partager</label>
          <div style="display:flex;gap:6px;align-items:stretch">
            <input id="share-url" class="input mono" value="${escapeHtml(shareUrl)}" readonly style="font-size:11px;flex:1">
            <button class="btn sm" onclick="copyShareUrl()" style="white-space:nowrap;padding:0 14px">Copier</button>
          </div>
        </div>
      </div>
      
      <div class="divider-stars">✦ Galerie ✦</div>
      ${renderGalleryByClue()}
      
      <div class="sticky-bottom">
        <button class="btn ghost" onclick="closeGame()">Nouvelle chasse</button>
      </div>
    </div>`;
}

async function copyShareUrl(){
  const input = $('#share-url'); if(!input) return;
  try{
    await navigator.clipboard.writeText(input.value);
    toast('Lien copié dans le presse-papiers','success');
  }catch(e){
    // Fallback sélection + copie
    input.select();
    document.execCommand('copy');
    toast('Lien copié','success');
  }
}

// ============ DIAPORAMA SOUVENIR ============
function openSlideshow(code){
  // Si code fourni, on est en mode public (depuis URL ?diapo=XXXX) ; sinon admin
  const gameCode = code || STATE.game?.code;
  if(!gameCode) return;
  STATE.slideshowIndex = 0;
  STATE.slideshowTimer = null;
  STATE.slideshowGameCode = gameCode;
  renderSlideshow();
}

async function renderSlideshow(){
  // Chargement des données si on est en mode public (depuis URL)
  let g = STATE.game;
  let subs = STATE.submissions;
  if(!g || g.code !== STATE.slideshowGameCode){
    g = await loadGame(STATE.slideshowGameCode);
    subs = await loadSubmissions(STATE.slideshowGameCode);
    if(!g){ toast('Chasse introuvable','error'); return; }
    STATE.game = g; STATE.submissions = subs;
  }

  const validated = subs.filter(s=>s.status==='approved');
  // Tri par indice pour un parcours narratif
  validated.sort((a,b)=>{
    const ci = g.clues.findIndex(c=>c.id===a.clueId) - g.clues.findIndex(c=>c.id===b.clueId);
    if(ci !== 0) return ci;
    return (a.submittedAt||0) - (b.submittedAt||0);
  });

  if(validated.length===0){
    app().innerHTML = `<div class="screen" data-screen="slideshow-empty">
      <h1 class="title">Aucune photo</h1>
      <p class="subtitle">Aucune photo n'a été validée pour cette chasse.</p>
      <div class="sticky-bottom"><button class="btn ghost" onclick="closeSlideshow()">Retour</button></div>
    </div>`;
    return;
  }

  const idx = STATE.slideshowIndex % validated.length;
  const s = validated[idx];
  const clue = g.clues.find(c=>c.id===s.clueId);
  const team = g.teams.find(t=>t.id===s.teamId);

  // Mode plein écran, fond noir, photo centrée, overlay minimal
  app().innerHTML = `
    <div class="screen" data-screen="slideshow" style="padding:0;background:#000;position:fixed;inset:0;z-index:9999;justify-content:center;align-items:center;display:flex">
      <img src="${s.photoDataUrl}" alt="" style="max-width:100%;max-height:100vh;object-fit:contain;display:block">
      
      <div style="position:absolute;top:0;left:0;right:0;padding:env(safe-area-inset-top,16px) 20px 16px;background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);color:#fff;font-family:'Fraunces',serif">
        <div style="font-family:'Geist Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.15em;opacity:.7">${idx+1} / ${validated.length} · ${escapeHtml(g.name)}</div>
      </div>
      
      <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 20px calc(env(safe-area-inset-bottom,16px) + 16px);background:linear-gradient(0deg,rgba(0,0,0,.85),transparent);color:#fff">
        <div style="font-family:'Fraunces',serif;font-style:italic;font-size:18px;margin-bottom:4px">"${escapeHtml(clue?.title||'?')}"</div>
        <div style="font-family:'Geist',sans-serif;font-size:14px;opacity:.85">${escapeHtml(team?.name||'?')}</div>
      </div>
      
      <button onclick="closeSlideshow()" aria-label="Fermer" style="position:absolute;top:calc(env(safe-area-inset-top,16px) + 8px);right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;backdrop-filter:blur(8px)">×</button>
    </div>`;
  
  // Auto-défilement 4s avec boucle
  if(STATE.slideshowTimer) clearTimeout(STATE.slideshowTimer);
  STATE.slideshowTimer = setTimeout(()=>{
    STATE.slideshowIndex = (STATE.slideshowIndex + 1) % validated.length;
    renderSlideshow();
  }, 4000);
}

function closeSlideshow(){
  if(STATE.slideshowTimer){ clearTimeout(STATE.slideshowTimer); STATE.slideshowTimer = null; }
  STATE.slideshowIndex = 0;
  STATE.slideshowGameCode = null;
  // Nettoyage URL si on était en mode public
  if(new URLSearchParams(location.search).has('diapo')){
    history.replaceState({}, '', location.pathname);
  }
  render();
}

async function closeGame(){
  if(!confirm('Fermer cette chasse et en créer une nouvelle ?')) return;
  await deleteGame(STATE.game.code);
  STATE.me.gameCode = null;
  await saveMe();
  STATE.game=null; STATE.submissions=[];
  stopRealtime();
  render();
}

function renderLeaderboard(showStats){
  const g = STATE.game;
  const subs = STATE.submissions;
  const board = g.teams.map(t=>{
    const teamSubs = subs.filter(s=>s.teamId===t.id);
    const approved = teamSubs.filter(s=>s.status==='approved');
    const points = approved.reduce((sum,s)=>sum+(s.points||0)+(s.bonusPoints||0),0);
    return {team:t, points, approved:approved.length, total:teamSubs.length};
  }).sort((a,b)=>b.points-a.points);
  
  if(board.length===0) return '<div class="empty">Aucune équipe</div>';
  
  return `<div class="scoreboard">${board.map((r,i)=>`
    <div class="row ${i===0?'first':''}">
      <div class="rank">${i===0?'★':i+1}</div>
      <div class="name">${escapeHtml(r.team.name)}${showStats?`<div class="mono muted" style="font-size:11px;font-weight:400">${r.approved}/${g.clues.length} indices · ${r.total-r.approved} en attente/refus</div>`:''}</div>
      <div class="pts">${r.points}</div>
    </div>`).join('')}</div>`;
}

function renderGalleryByClue(){
  const g = STATE.game;
  const subs = STATE.submissions.filter(s=>s.status==='approved');
  return g.clues.map(c=>{
    const csubs = subs.filter(s=>s.clueId===c.id);
    return `<div style="margin-bottom:18px">
      <h3>${escapeHtml(c.title)}</h3>
      <p class="muted" style="font-size:13px;margin-bottom:10px;font-style:italic">"${escapeHtml(c.text)}"</p>
      ${csubs.length===0 ? '<div class="empty" style="padding:20px;font-size:14px">Aucune équipe n\'a validé ce lieu</div>' : `
        <div class="gallery">
          ${csubs.map(s=>{
            const team = g.teams.find(t=>t.id===s.teamId);
            return `<div class="item" onclick="openPhoto('${s.id}')">
              <img src="${s.photoDataUrl}" alt="">
              ${(s.bonusPoints||0)>0?`<div class="bonus-mark">+${s.bonusPoints}</div>`:''}
              <div class="label">${escapeHtml(team?.name||'?')} · ${(s.points||0)+(s.bonusPoints||0)}pts</div>
            </div>`;
          }).join('')}
        </div>
      `}
    </div>`;
  }).join('');
}

// ---------- TEAM ----------
function screenTeamJoin(){
  app().innerHTML = `
    <div class="screen" data-screen="team-join">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>Rejoindre une chasse</div>
        <button class="chip" onclick="logout()">Quitter</button>
      </div>
      <h1 class="title">Quel est<br>le <em>code</em> ?</h1>
      <p class="subtitle">Demandez à votre maître du jeu le code à 4 lettres de la chasse.</p>
      
      <div class="field">
        <label>Code de la chasse</label>
        <input id="join-code" class="input code" maxlength="4" placeholder="XXXX">
      </div>
      <div class="field">
        <label>Nom de votre équipe</label>
        <input id="join-team" class="input" placeholder="Les Aventuriers">
      </div>
      
      <div class="sticky-bottom">
        <button class="btn oxblood" onclick="joinGame()">Rejoindre la chasse →</button>
      </div>
    </div>`;
  $('#join-code').addEventListener('input', e=>{ e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
}

async function joinGame(){
  const code = $('#join-code').value.trim().toUpperCase();
  const teamName = $('#join-team').value.trim();
  if(code.length!==4){ toast('Code invalide','error'); return; }
  if(!teamName){ toast('Donnez un nom à votre équipe','error'); return; }
  const game = await loadGame(code);
  if(!game){ toast('Aucune chasse avec ce code','error'); return; }
  if(game.status==='ended'){ toast('Cette chasse est terminée','error'); return; }
  
  const teamId = await addTeam(code, teamName);
  if(!teamId) return;
  STATE.me.gameCode = code;
  STATE.me.teamId = teamId;
  STATE.me.teamName = teamName;
  await saveMe();
  startRealtime();
  render();
}

function screenTeamLobby(){
  const g = STATE.game;
  app().innerHTML = `
    <div class="screen" data-screen="team-lobby">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">En attente</span>
      </div>
      <h1 class="title">Bientôt,<br>la <em>course</em>.</h1>
      <p class="subtitle">L'aventure n'a pas encore commencé. Restez prêts.</p>
      
      <div class="card dark">
        <h3 style="color:var(--gold)">Équipe ${escapeHtml(STATE.me.teamName)}</h3>
        <p style="opacity:.8;font-size:14px;margin:6px 0 0">${g.clues.length} indice${g.clues.length>1?'s':''} à découvrir · ${g.durationMinutes} min au total · ${g.perClueMinutes} min par indice maximum</p>
      </div>
      
      <div class="flex-between" style="margin:18px 0 8px">
        <h3 style="margin:0">Autres équipes</h3>
        <span class="chip">${g.teams.length}</span>
      </div>
      ${g.teams.filter(t=>t.id!==STATE.me.teamId).length===0
        ? '<div class="empty">Vous êtes seuls pour le moment</div>'
        : g.teams.filter(t=>t.id!==STATE.me.teamId).map(t=>`<div class="card"><strong>${escapeHtml(t.name)}</strong></div>`).join('')
      }
      
      <div class="sticky-bottom">
        <button class="btn ghost" onclick="leaveGame()">Quitter</button>
      </div>
    </div>`;
}

async function leaveGame(){
  if(!confirm('Quitter la chasse ?')) return;
  if(STATE.me.teamId){
    await removeTeam(STATE.me.teamId);
  }
  await clearMe();
  stopRealtime();
  STATE.game=null; STATE.submissions=[];
  render();
}

function screenTeamActive(){
  const g = STATE.game;
  const elapsed = (Date.now() - g.startedAt)/1000;
  const remaining = Math.max(0, g.durationMinutes*60 - elapsed);
  const mySubs = STATE.submissions.filter(s=>s.teamId===STATE.me.teamId);
  
  const myPoints = mySubs.filter(s=>s.status==='approved').reduce((p,s)=>p+(s.points||0)+(s.bonusPoints||0),0);
  
  // Verrou "indice de départ" : tant qu'il n'est pas réalisé, l'équipe ne voit que lui.
  const scid = myStartClueId();
  const startClue = scid ? g.clues.find(c=>c.id===scid) : null;
  const locked = !!startClue && !myStartClueDone();
  const clueItemHtml = (c)=>{
    const i = g.clues.findIndex(x=>x.id===c.id);
    const sub = mySubs.find(s=>s.clueId===c.id);
    const cls = sub?.status==='approved'?'done':sub?'pending':'';
    const label = sub?.status==='approved'?`${(sub.points||0)+(sub.bonusPoints||0)} pts`:sub?.status==='pending'?'En attente':sub?.status==='rejected'?'Refusée — refaire':`${c.points} pts`;
    const startBadge = c.id===scid ? '<span class="chip gold" style="margin-right:6px;padding:2px 7px">Départ</span>' : '';
    return `<button class="clue-item ${cls}" onclick="openClue('${c.id}')">
            <div class="num">${i+1}</div>
            <div class="body">
              <div class="title-row"><div class="name">${startBadge}${escapeHtml(c.title)}</div><div class="pts">${label}</div></div>
              <div class="preview">${escapeHtml(c.text)}</div>
            </div>
          </button>`;
  };
  const lockedCount = g.clues.length - 1;
  const clueListHtml = (locked && startClue) ? `
        <div class="card dark" style="margin-bottom:12px">
          <h3 style="color:var(--gold);margin-bottom:4px">Indice de départ imposé</h3>
          <p style="opacity:.85;font-size:13px;margin:0">Réalisez-le (envoyez la photo) pour débloquer ${lockedCount>0?`les ${lockedCount} autre${lockedCount>1?'s':''}`:'la suite'}.</p>
        </div>
        <div class="clue-list">${clueItemHtml(startClue)}</div>
        ${lockedCount>0?`<div class="card flex-row" style="gap:10px;color:var(--ink-mute)"><span style="font-size:20px">🔒</span><span style="font-size:14px">${lockedCount} indice${lockedCount>1?'s':''} verrouillé${lockedCount>1?'s':''} — débloqué${lockedCount>1?'s':''} dès votre indice de départ réalisé.</span></div>`:''}
      ` : `<div class="clue-list">${g.clues.map(clueItemHtml).join('')}</div>`;

  app().innerHTML = `
    <div class="screen" data-screen="team-active">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(STATE.me.teamName)}</div>
        <span class="chip live">${fmtTime(remaining)}</span>
      </div>
      
      <div class="flex-between" style="margin-bottom:18px">
        <div>
          <div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em">Score</div>
          <div class="display" style="font-size:34px">${myPoints}<span style="font-size:14px;color:var(--ink-mute);font-family:'Geist Mono',monospace;font-weight:400"> pts</span></div>
        </div>
        <div style="text-align:right">
          <div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em">Indices</div>
          <div class="display" style="font-size:34px">${mySubs.filter(s=>s.status==='approved').length}<span style="font-size:14px;color:var(--ink-mute);font-family:'Geist Mono',monospace;font-weight:400">/${g.clues.length}</span></div>
        </div>
      </div>
      
      <h2>Les indices</h2>
      ${clueListHtml}
      
      <div class="sticky-bottom">
        <button class="btn ghost" onclick="leaveGame()">Quitter la chasse</button>
      </div>
    </div>`;
}

function openClue(clueId){
  // Garde-fou : indice de départ pas encore réalisé → on ne peut ouvrir que lui.
  if(myStartClueId() && !myStartClueDone() && clueId!==myStartClueId()){
    toast('Réalisez d\'abord votre indice de départ','');
    return;
  }
  const sub = STATE.submissions.find(s=>s.clueId===clueId && s.teamId===STATE.me.teamId);
  if(sub && sub.status==='approved'){
    toast('Indice déjà validé','success');
    return;
  }
  if(sub && sub.status==='pending'){
    toast('Photo en attente de validation','');
    return;
  }
  STATE.currentClueId = clueId;
  STATE.capturedPhoto = null;
  // Le timer per-indice redémarre à chaque ouverture : on ne pénalise pas
  // les équipes qui ouvrent puis ferment un indice avant d'y revenir
  STATE.perClueStartTime[clueId] = Date.now();
  render();
}

function screenTeamCapture(){
  const g = STATE.game;
  const clue = g.clues.find(c=>c.id===STATE.currentClueId);
  const startedAt = STATE.perClueStartTime[clue.id];
  const recommended = g.perClueMinutes*60;
  const usedOnClue = (Date.now()-startedAt)/1000;
  const perClueRemaining = recommended - usedOnClue;
  const gameRemaining = Math.max(0, g.durationMinutes*60 - (Date.now()-g.startedAt)/1000);
  const isOverrun = perClueRemaining < 0;
  const displaySec = isOverrun
    ? Math.min(-perClueRemaining, gameRemaining)
    : Math.min(perClueRemaining, gameRemaining);
  const tClass = gameRemaining < 60 ? 'alert' : isOverrun ? 'warn' : (perClueRemaining < 180 ? 'warn' : '');
  const timerLabel = `${isOverrun ? '+' : ''}${fmtTime(displaySec)}`;
  
  app().innerHTML = `
    <div class="screen" data-screen="team-capture">
      <div class="topbar">
        <button class="chip" onclick="abortClue()">← Retour</button>
        <div style="text-align:right">
          <div style="font-family:'Geist Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-mute);margin-bottom:2px">${isOverrun ? 'Au-delà du conseil' : 'Conseillé'}</div>
          <span class="timer ${tClass}">${timerLabel}</span>
        </div>
      </div>
      <h2>${escapeHtml(clue.title)}</h2>
      <div class="card" style="margin-bottom:18px">
        <p class="italic-d" style="font-size:17px;line-height:1.5;margin:0">"${escapeHtml(clue.text)}"</p>
      </div>
      
      <h3>Photo de l'équipe sur le lieu</h3>
      <p class="help-text" style="margin-bottom:10px">Toute l'équipe devant le lieu, bien visible en arrière-plan.</p>
      <label class="photo-preview" for="capture-input">
        ${STATE.capturedPhoto 
          ? `<img src="${STATE.capturedPhoto}" alt=""><div class="retake">Refaire</div>`
          : `<div class="icon">⊕</div><div>Prendre la photo</div>`}
      </label>
      <input id="capture-input" type="file" accept="image/*" capture="environment" class="hidden-input" onchange="handleCapture(event)">
      
      <div class="sticky-bottom">
        <button class="btn oxblood" onclick="submitClue()" ${!STATE.capturedPhoto?'disabled':''}>Envoyer la preuve →</button>
      </div>
    </div>`;
}

async function handleCapture(e){
  const file = e.target.files?.[0];
  if(!file) return;
  toast('Compression de la photo…');
  try{
    const dataUrl = await compressImage(file);
    STATE.capturedPhoto = dataUrl;
    render();
  }catch(err){ toast('Erreur image','error'); }
}

function abortClue(){
  STATE.currentClueId=null;
  STATE.capturedPhoto=null;
  render();
}

async function submitClue(){
  // Anti-double-tap : on désactive le bouton immédiatement
  const btn = document.querySelector('[data-screen="team-capture"] .btn.oxblood');
  if(btn){
    if(btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
  }

  const sub = {
    id: uid(),
    gameCode: STATE.game.code,
    teamId: STATE.me.teamId,
    clueId: STATE.currentClueId,
    photoDataUrl: STATE.capturedPhoto,
    submittedAt: Date.now(),
    status:'pending',
    points:0, bonusPoints:0
  };
  try{
    await saveSubmission(sub);
    toast('Preuve envoyée à l\'admin','success');
    STATE.currentClueId=null;
    STATE.capturedPhoto=null;
    render();
  }catch(err){
    if(btn){ btn.disabled = false; btn.textContent = 'Envoyer la preuve →'; }
    toast('Erreur d\'envoi : '+(err.message||'inconnue'),'error',4500);
  }
}

function screenTeamEnd(){
  const g = STATE.game;
  const mySubs = STATE.submissions.filter(s=>s.teamId===STATE.me.teamId);
  const myApproved = mySubs.filter(s=>s.status==='approved');
  const myPoints = myApproved.reduce((p,s)=>p+(s.points||0)+(s.bonusPoints||0),0);
  
  const board = g.teams.map(t=>{
    const ts = STATE.submissions.filter(s=>s.teamId===t.id && s.status==='approved');
    return {team:t, points:ts.reduce((p,s)=>p+(s.points||0)+(s.bonusPoints||0),0)};
  }).sort((a,b)=>b.points-a.points);
  const myRank = board.findIndex(b=>b.team.id===STATE.me.teamId)+1;
  
  app().innerHTML = `
    <div class="screen" data-screen="team-end">
      <div class="topbar">
        <div class="brand"><span class="brand-icon">✦</span>${escapeHtml(g.name)}</div>
        <span class="chip">Terminée</span>
      </div>
      <h1 class="title">${myRank===1?'<em>Vainqueurs</em>.':'La chasse <em>est finie</em>.'}</h1>
      
      <div class="card dark" style="text-align:center;padding:24px">
        <div class="mono" style="font-size:11px;text-transform:uppercase;letter-spacing:.2em;opacity:.7;color:var(--gold)">${escapeHtml(STATE.me.teamName)} · Rang ${myRank}/${board.length}</div>
        <div class="display" style="font-size:64px;color:var(--gold);margin:8px 0">${myPoints}</div>
        <div class="mono" style="font-size:13px;opacity:.7">${myApproved.length} indice${myApproved.length>1?'s':''} validé${myApproved.length>1?'s':''}</div>
      </div>
      
      ${renderLeaderboard(false)}
      
      <div class="divider-stars">✦ Galerie ✦</div>
      ${renderGalleryByClue()}
      
      <div class="sticky-bottom">
        <button class="btn ghost" onclick="logout()">Sortir</button>
      </div>
    </div>`;
}

function screenTeamSubmitted(){ /* not used directly, render handles */ }

// ---------- MODAL ----------
function openPhoto(subId){
  const s = STATE.submissions.find(x=>x.id===subId);
  if(!s) return;
  const team = STATE.game.teams.find(t=>t.id===s.teamId);
  const clue = STATE.game.clues.find(c=>c.id===s.clueId);
  $('#modal .modal-inner').innerHTML = `
    <img src="${s.photoDataUrl}">
    <div class="info">${escapeHtml(team?.name||'?')} · ${escapeHtml(clue?.title||'?')} · ${(s.points||0)+(s.bonusPoints||0)} pts${(s.bonusPoints||0)>0?` (dont +${s.bonusPoints} bonus)`:''}</div>
  `;
  $('#modal').classList.add('open');
}
function closeModal(){ $('#modal').classList.remove('open'); }

// ---------- UTIL ----------
function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function logout(){ stopRealtime(); await clearMe(); STATE.game=null; STATE.submissions=[]; render(); }

// ---------- TICK ----------
// Re-render timers each second on active screens
setInterval(()=>{
  const cur = $('[data-screen]')?.dataset.screen;
  if(['admin-live','team-active','team-capture'].includes(cur)){
    // Light update: only timer chips
    if(STATE.game?.status==='active' && STATE.game.startedAt){
      const elapsed = (Date.now()-STATE.game.startedAt)/1000;
      const remaining = Math.max(0, STATE.game.durationMinutes*60 - elapsed);
      const chip = $('.chip.live');
      if(chip) chip.textContent = fmtTime(remaining);
      if(remaining<=0){ render(); return; }
      
      if(cur==='team-capture' && STATE.currentClueId){
        // Timer per-indice INDICATIF : aide l'équipe à doser son rythme.
        // Aucun timeout brutal — le seul vrai timer est le global.
        const st = STATE.perClueStartTime[STATE.currentClueId];
        if(st){
          const recommended = STATE.game.perClueMinutes*60;
          const usedOnClue = (Date.now()-st)/1000;
          const perClueRemaining = recommended - usedOnClue;
          const isOverrun = perClueRemaining < 0;
          const displaySec = isOverrun
            ? Math.min(-perClueRemaining, remaining)
            : Math.min(perClueRemaining, remaining);
          const t = $('.timer');
          if(t){
            t.textContent = `${isOverrun ? '+' : ''}${fmtTime(displaySec)}`;
            let cls = '';
            if(remaining < 60) cls = 'alert';
            else if(isOverrun) cls = 'warn';
            else if(perClueRemaining < 180) cls = 'warn';
            t.className = 'timer ' + cls;
          }
          // Mise à jour du label "Conseillé / Au-delà du conseil"
          const lbl = document.querySelector('[data-screen="team-capture"] .topbar div > div:first-child');
          if(lbl) lbl.textContent = isOverrun ? 'Au-delà du conseil' : 'Conseillé';
        }
      }
    }
  }
}, 1000);

// ---------- INIT ----------
(async ()=>{
  loadConfig();
  // Mode diaporama public via URL : ?diapo=CODE
  const params = new URLSearchParams(location.search);
  const diapoCode = params.get('diapo');
  if(diapoCode && sb){
    openSlideshow(diapoCode.toUpperCase());
    return;
  }
  await render();
  if(sb && STATE.me?.gameCode) startRealtime();
})();


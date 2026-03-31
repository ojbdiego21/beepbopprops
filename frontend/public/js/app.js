// BeepBopProps$ v3 — frontend app.js
var slipPicks = [];
var allProps  = [];

var TEAMS = ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW',
             'HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK',
             'OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'];

var EMOJI = {
  LAL:'👑',BOS:'☘️',GSW:'⚡',MIA:'🔥',PHI:'🔔',ATL:'🦅',BKN:'🌉',CHA:'🐝',
  CHI:'🐂',CLE:'⚔️',DAL:'🤠',DEN:'⛰️',DET:'🏎️',HOU:'🚀',IND:'🏎️',LAC:'🦈',
  MEM:'🐻',MIL:'🦌',MIN:'🐺',NOP:'🎷',NYK:'🗽',OKC:'⚡',ORL:'🌊',PHX:'☀️',
  POR:'🌹',SAC:'👑',SAS:'🌟',TOR:'🦖',UTA:'🎵',WAS:'🧙'
};

document.addEventListener('DOMContentLoaded', function() {
  setDate();
  populateH2H();
  loadAllData();
  setInterval(loadLive, 60000);
  setInterval(animateMeters, 3500);
});

function setDate() {
  var d = new Date();
  var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('date-display').textContent =
    days[d.getDay()] + ' · ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function populateH2H() {
  ['h2h-t1','h2h-t2'].forEach(function(id) {
    var sel = document.getElementById(id);
    TEAMS.forEach(function(t) {
      var o = document.createElement('option');
      o.value = t; o.textContent = (EMOJI[t]||'') + ' ' + t;
      sel.appendChild(o);
    });
  });
}

async function loadAllData() {
  var btn = document.getElementById('refresh-btn');
  btn.disabled = true; btn.classList.add('loading');
  await Promise.allSettled([loadGames(), loadProps(), loadInjuries(), loadLive(), loadParlays()]);
  btn.disabled = false; btn.classList.remove('loading');
  var now = new Date();
  document.getElementById('last-updated-txt').textContent =
    '🕸️ Updated ' + now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

async function loadGames() {
  try {
    var r = await fetch('/api/games'); var d = await r.json();
    if (!d.success || !d.games.length) { showErr('games','No games found today.'); return; }
    renderGames(d.games); updateTicker(d.games);
  } catch(e) { showErr('games', e.message); }
}

function renderGames(games) {
  var html = '<div class="games-grid">';
  games.forEach(function(g) {
    var hp = Math.round(g.homeWinProb || 50);
    var ap = 100 - hp;
    var isLive  = g.status === 'live';
    var isFinal = g.status === 'final';
    var tc = 'b-' + (g.tier || 'neutral');
    html += '<div class="game-card' + (isLive?' live-game':'') + '">'
      + '<div class="gc-head">'
        + '<span class="gc-time">' + (isFinal ? '✅ FINAL' : isLive ? g.quarter+' '+g.clock : g.tipoff) + (g.arena ? ' · '+g.arena:'') + '</span>'
        + (isLive ? '<span class="gc-live">● LIVE</span>' : '<span class="badge '+tc+'">'+(g.tier||'neutral').toUpperCase()+'</span>')
      + '</div>'
      + '<div class="matchup">'
        + '<div class="team"><div class="team-emoji">'+(EMOJI[g.awayTeam]||'🏀')+'</div><div class="team-abbr">'+g.awayTeam+'</div>'+(isLive||isFinal?'<div class="team-score">'+g.awayScore+'</div>':'')+'<div class="team-rec">'+g.awayRecord+'</div></div>'
        + '<div class="vs-mid"><div class="vs-at">@</div><div class="gspread">'+g.spread+'</div><div class="gtotal">O/U '+g.total+'</div></div>'
        + '<div class="team"><div class="team-emoji">'+(EMOJI[g.homeTeam]||'🏀')+'</div><div class="team-abbr">'+g.homeTeam+'</div>'+(isLive||isFinal?'<div class="team-score">'+g.homeScore+'</div>':'')+'<div class="team-rec">'+g.homeRecord+'</div></div>'
      + '</div>'
      + '<div class="prob-row"><span class="plabel">'+g.awayTeam+' '+ap+'%</span><div class="pbar"><div class="pfill" style="width:'+ap+'%"></div></div><span class="plabel">'+g.homeTeam+' '+hp+'%</span></div>'
      + '<div class="gc-foot">'+(g.topPicks||[]).map(function(p){return'<span class="badge b-strong">'+p+'</span>';}).join('')+'</div>'
    + '</div>';
  });
  document.getElementById('games-content').innerHTML = html + '</div>';
}

async function loadProps() {
  try {
    var r = await fetch('/api/props'); var d = await r.json();
    if (!d.success) { showErr('props','Could not load props.'); return; }
    allProps = d.props || [];
    renderProps(allProps);
    renderAltLines(allProps);
  } catch(e) { showErr('props', e.message); }
}

function renderProps(props) {
  if (!props.length) {
    document.getElementById('props-content').innerHTML = '<div class="err-box"><h3>No Props</h3><p>Props appear when lines are posted. Try refreshing.</p></div>';
    return;
  }
  var html = '<div class="props-grid">';
  props.forEach(function(p) { html += buildPropCard(p); });
  document.getElementById('props-content').innerHTML = html + '</div>';
}

function buildPropCard(p) {
  var conf = p.confidence || 60;
  var t    = p.tier || 'neutral';
  var da   = Math.round((conf/100)*88);
  var rc   = t==='elite'?'#FFD700':t==='strong'?'#00D4AA':t==='neutral'?'#60a5fa':'#ff5555';
  var pid  = p.nbaPhotoId || '0';
  var bookLines = [
    { key:'dk',  name:'DraftKings', line: p.dkLine,  odds: p.dkOdds  },
    { key:'fd',  name:'FanDuel',    line: p.fdLine,   odds: p.fdOdds  },
    { key:'mgm', name:'BetMGM',     line: p.mgmLine,  odds: p.mgmOdds },
    { key:'czr', name:'Caesars',    line: p.czrLine,  odds: p.czrOdds },
    { key:'pp',  name:'PrizePicks', line: p.ppLine,   odds: 'More'    },
    { key:'reb', name:'Rebet',      line: p.rebetLine,odds: p.rebetOdds },
  ];
  var validLines = bookLines.filter(function(b){ return b.line != null; });
  var bestLine   = validLines.length ? Math.min.apply(null, validLines.map(function(b){ return b.line; })) : p.line;
  var booksHtml = '<div class="books6">';
  bookLines.forEach(function(b) {
    var isBest = b.line != null && b.line === bestLine && p.direction === 'over';
    booksHtml += '<div class="bk' + (isBest?' best-line':'') + '"><div class="bkname '+b.key+'">'+b.name+'</div><div class="bknum">'+(b.line != null ? b.line : '--')+'</div><div class="bkodds">'+(b.odds||'--')+'</div></div>';
  });
  booksHtml += '</div>';
  var pickId = (pid + '_' + p.statType + '_' + (p.team||'')).replace(/[^a-z0-9_]/gi,'_');
  var safeLabel = (p.playerName+' '+cap(p.statType)+' '+(p.direction||'over').toUpperCase()+' '+(p.line||p.dkLine||'?')).replace(/'/g,"\\'");
  var safeName  = (p.playerName||'').replace(/'/g,"\\'");
  var safeGame  = ((p.team||'')+(p.opponent?' vs '+p.opponent:'')).replace(/'/g,"\\'");

  return '<div class="prop-card '+t+'" data-type="'+p.statType+'" data-tier="'+t+'">'
    + '<div class="pp-head">'
      + '<div class="av"><img src="https://cdn.nba.com/headshots/nba/latest/1040x760/'+pid+'.png" onerror="this.style.display=\'none\'"></div>'
      + '<div class="pinfo"><div class="pname">'+p.playerName+'</div><div class="pteam">'+(p.team||'')+(p.opponent?' · vs '+p.opponent:'')+'</div></div>'
      + '<div class="cr"><svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#1a1a2e" stroke-width="4"/><circle cx="18" cy="18" r="14" fill="none" stroke="'+rc+'" stroke-width="4" stroke-dasharray="'+da+' '+(88-da)+'" stroke-linecap="round"/></svg><div class="ct">'+conf+'%</div></div>'
    + '</div>'
    + '<div class="pp-body">'
      + '<div class="ps-lbl">'+cap(p.statType)+' · '+t.toUpperCase()+' PICK</div>'
      + '<div class="pline-row"><span class="stat-num">'+(p.line||p.dkLine||'?')+'</span><span class="ou '+(p.direction||'over')+'">'+(p.direction||'over').toUpperCase()+'</span></div>'
      + booksHtml
      + '<div class="pp-foot"><div class="hr">L10: <span>'+(p.hitRateLast10||'?/10')+'</span></div><span class="badge b-'+t+'">'+t.toUpperCase()+'</span></div>'
      + (p.reasoning ? '<div class="reason-text">'+p.reasoning+'</div>' : '')
      + '<button class="btn-add-pick" data-pick-id="'+pickId+'" onclick="addPick(this,\''+safeLabel+'\',\''+safeName+'\',\''+safeGame+'\','+conf+',\''+p.statType+'\',\''+pid+'\',\''+pickId+'\')">＋ Add to Slip</button>'
    + '</div>'
  + '</div>';
}

function renderAltLines(props) {
  if (!props.length) { document.getElementById('altlines-content').innerHTML = '<div class="err-box"><h3>No Alt Lines</h3><p>Load props first.</p></div>'; return; }
  var html = '';
  props.forEach(function(p) {
    var pid = p.nbaPhotoId || '0';
    var alts = p.altLines || [];
    var mainLine = p.dkLine || p.line || 0;
    html += '<div class="alt-card" data-alt-type="'+p.statType+'">'
      + '<div class="alt-card-head">'
        + '<div class="av" style="width:40px;height:40px"><img src="https://cdn.nba.com/headshots/nba/latest/1040x760/'+pid+'.png" onerror="this.style.display=\'none\'"></div>'
        + '<div class="alt-card-name"><div class="pname">'+p.playerName+'</div><div class="pteam">'+(p.team||'')+(p.opponent?' vs '+p.opponent:'')+'</div></div>'
        + '<div class="alt-card-stat">'+cap(p.statType)+'</div>'
      + '</div>'
      + '<div style="padding:10px 14px">'
        + '<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--muted);margin-bottom:5px;font-weight:600">ALL BOOKS</div>'
          + '<div class="books6">'
            + mkBk('dk','DraftKings',p.dkLine,p.dkOdds,mainLine,p.direction)
            + mkBk('fd','FanDuel',p.fdLine,p.fdOdds,mainLine,p.direction)
            + mkBk('mgm','BetMGM',p.mgmLine,p.mgmOdds,mainLine,p.direction)
            + mkBk('czr','Caesars',p.czrLine,p.czrOdds,mainLine,p.direction)
            + mkBk('pp','PrizePicks',p.ppLine,'More/Less',mainLine,p.direction)
            + mkBk('reb','Rebet',p.rebetLine,p.rebetOdds,mainLine,p.direction)
          + '</div></div>'
        + '<div style="font-size:10px;color:var(--muted);margin-bottom:5px;font-weight:600">ALTERNATE LINES (DraftKings)</div>'
        + '<div class="alt-table-wrap"><table class="alt-table"><thead><tr><th>Line</th><th>Over</th><th>Under</th><th>Implied</th></tr></thead><tbody>'
        + alts.map(function(a) {
            var isMain = a.line === mainLine;
            var edge = calcEdge(a.overOdds);
            return '<tr class="'+(isMain?'main-line':'')+'">'
              + '<td>'+a.line+(isMain?'<span class="alt-tag main">MAIN</span>':'<span class="alt-tag">ALT</span>')+'</td>'
              + '<td class="'+(parseFloat(a.overOdds)>0?'odds-pos':'odds-neg')+'">'+a.overOdds+'</td>'
              + '<td class="'+(parseFloat(a.underOdds)>0?'odds-pos':'odds-neg')+'">'+a.underOdds+'</td>'
              + '<td style="font-size:9px;color:var(--muted)">'+edge+'</td>'
            + '</tr>';
          }).join('')
        + '</tbody></table></div>'
      + '</div></div>';
  });
  document.getElementById('altlines-content').innerHTML = html || '<div style="color:var(--muted);padding:20px;text-align:center">No props loaded yet.</div>';
}

function mkBk(key,name,line,odds,mainLine,dir) {
  var isBest = line != null && dir==='over' && line <= mainLine;
  return '<div class="bk'+(isBest?' best-line':'')+'"><div class="bkname '+key+'">'+name+'</div><div class="bknum">'+(line!=null?line:'--')+'</div><div class="bkodds">'+(odds||'--')+'</div></div>';
}

function calcEdge(odds) {
  if (!odds) return '--';
  var n = parseInt(odds.replace('+',''));
  if (isNaN(n)) return '--';
  var imp = n > 0 ? 100/(n+100) : Math.abs(n)/(Math.abs(n)+100);
  return (imp*100).toFixed(0)+'% imp';
}

function filterAlt(type,btn) {
  document.querySelectorAll('.fbtn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('.alt-card').forEach(function(c){
    c.style.display=(type==='all'||c.dataset.altType===type)?'':'none';
  });
}

async function loadLive() {
  try {
    var gr = await fetch('/api/games'); var gd = await gr.json();
    var live = (gd.games||[]).filter(function(g){ return g.status==='live'; });
    var pr = await fetch('/api/props'); var pd = await pr.json();
    var props = (pd.props||[]).slice(0,12);
    var html = live.length
      ? '<p style="color:var(--muted);font-size:12px;margin-bottom:10px">'+live.length+' game(s) in progress.</p>'
      : '<p style="color:var(--muted);font-size:12px;margin-bottom:10px">No games live yet. Showing pre-game lines.</p>';
    html += '<div class="live-grid">';
    props.forEach(function(p) {
      var w = 35 + Math.round((p.confidence||50)*0.55);
      html += '<div class="lbet"><div class="lbet-name">'+p.playerName+'</div><div class="lbet-stat">'+cap(p.statType)+' '+(p.direction||'over').toUpperCase()+' '+(p.line||'?')+'</div><div class="lbet-odds">DK: '+(p.dkOdds||'--')+' &nbsp;|&nbsp; PP: '+(p.ppLine||p.line||'?')+'</div><div class="lbet-prog">'+(p.confidence>=75?'🟢':p.confidence>=55?'🟡':'🔴')+' '+(p.confidence||60)+'% confidence</div><div class="lmeter"><div class="lfill" style="width:'+w+'%"></div></div></div>';
    });
    html += '</div>';
    document.getElementById('live-content').innerHTML = html;
  } catch(e) { showErr('live', e.message); }
}

async function lookupH2H() {
  var t1 = document.getElementById('h2h-t1').value;
  var t2 = document.getElementById('h2h-t2').value;
  if (!t1||!t2||t1===t2) { showToast('Pick two different teams!'); return; }
  document.getElementById('h2h-result').innerHTML = '<div class="loader-box" style="padding:30px"><div class="sp">🕷️</div><div class="lt">Searching...</div></div>';
  try {
    var r = await fetch('/api/h2h/'+t1+'/'+t2); var d = await r.json();
    if (!d.success||!d.h2h) { document.getElementById('h2h-result').innerHTML='<div class="err-box"><h3>No Data</h3><p>No matchup history found.</p></div>'; return; }
    var h = d.h2h;
    var html = '<div class="h2h-result-card">'
      + '<div class="h2h-header">'
        + '<div class="h2h-tb"><div class="h2h-tn">'+(EMOJI[t1]||'')+' '+t1+'</div><div class="h2h-tw">'+h.team1Wins+' wins</div></div>'
        + '<div style="text-align:center;font-family:\'Bebas Neue\',cursive;font-size:20px;color:var(--muted)">L'+h.last5Games.length+'</div>'
        + '<div class="h2h-tb"><div class="h2h-tn">'+(EMOJI[t2]||'')+' '+t2+'</div><div class="h2h-tw">'+h.team2Wins+' wins</div></div>'
      + '</div>'
      + (h.last5Games||[]).map(function(g){ return '<div class="h2h-row"><span>'+g.date+'</span><span class="h2h-w">W: '+g.winner+'</span><span>'+g.score+'</span><span style="color:var(--muted)">'+g.location+'</span></div>'; }).join('')
    + '</div>';
    document.getElementById('h2h-result').innerHTML = html;
  } catch(e) { document.getElementById('h2h-result').innerHTML='<div class="err-box"><h3>Error</h3><p>'+e.message+'</p></div>'; }
}

async function loadParlays() {
  try {
    var r = await fetch('/api/props'); var d = await r.json();
    var props  = d.props || [];
    var elite  = props.filter(function(p){ return p.tier==='elite'; }).slice(0,5);
    var strong = props.filter(function(p){ return p.tier==='strong'; }).slice(0,4);
    var fade   = props.filter(function(p){ return p.tier==='fade'; }).slice(0,3);
    var html = '<div class="parlay-grid">';
    if (elite.length>=2) html += mkParlay('🕸️ Safe Web (2-Leg DK)', elite.slice(0,2));
    if (elite.length>=3) html += mkParlay('🔥 Value Builder (3-Leg)', elite.slice(0,3));
    if (elite.length+strong.length>=4) html += mkParlay('⚡ Power 4 (PrizePicks)', [...elite.slice(0,2),...strong.slice(0,2)]);
    if (elite.length+strong.length>=5) html += mkParlay('🌐 Flex 5 (PrizePicks)', [...elite.slice(0,3),...strong.slice(0,2)]);
    if (fade.length>=2) {
      html += '<div class="parl-card" style="border-top-color:var(--fade)"><div class="parl-title" style="color:var(--fade)">🚫 AVOID — Fade Parlay</div>'
        + fade.map(function(p,i){ return '<div class="parl-leg"><span class="legn" style="color:var(--fade)">✗</span>'+p.playerName+' '+cap(p.statType)+' '+(p.direction||'over').toUpperCase()+' '+p.line+'</div>'; }).join('')
        + '<div class="parl-foot"><div><div class="po-lbl">Rating</div><div class="po-val" style="color:var(--fade)">AVOID</div></div><span class="badge b-fade">FADE</span></div></div>';
    }
    if (html==='<div class="parlay-grid">') html += '<div style="color:var(--muted);padding:20px;text-align:center;font-size:12px">Parlays load once props are available.</div>';
    document.getElementById('parlays-content').innerHTML = html + '</div>';
  } catch(e) { showErr('parlays', e.message); }
}

function mkParlay(title,picks) {
  var prob = picks.reduce(function(a,p){ return a*(p.confidence/100); },1);
  var pct  = Math.round(prob*100);
  var out  = '+$'+Math.round(((1/prob)-1)*100).toLocaleString();
  return '<div class="parl-card"><div class="parl-title">'+title+'</div>'
    + picks.map(function(p,i){ return '<div class="parl-leg"><span class="legn">'+(i+1)+'</span>'+p.playerName+' '+cap(p.statType)+' '+(p.direction||'over').toUpperCase()+' '+(p.line||'?')+' (DK '+(p.dkOdds||'')+')</div>'; }).join('')
    + '<div class="parl-foot"><div><div class="po-lbl">Prob ~'+pct+'% · Payout</div><div class="po-val">'+out+'</div></div><span class="badge b-strong">STRONG</span></div></div>';
}

async function loadInjuries() {
  try {
    var r = await fetch('/api/injuries'); var d = await r.json();
    if (!d.injuries.length) { document.getElementById('injuries-content').innerHTML='<div style="color:var(--muted);padding:20px;text-align:center">No injuries reported today. 🟢</div>'; return; }
    var html = '<div class="inj-grid">';
    d.injuries.forEach(function(inj) {
      var s = (inj.status||'').toLowerCase();
      var ic = s.includes('out')?'ic-out':s.includes('quest')?'ic-q':'ic-dtd';
      html += '<div class="inj-card '+(s.includes('quest')?'q':s.includes('prob')?'prob':'')+'">'
        + '<div class="inj-name">'+inj.playerName+'<span class="inj-chip '+ic+'">'+inj.status+'</span></div>'
        + '<div class="inj-team">'+inj.team+' · '+(inj.injury||'')+'</div>'
        + '<div class="inj-imp">'+(inj.bettingImpact||'Monitor situation.')+'</div>'
      + '</div>';
    });
    document.getElementById('injuries-content').innerHTML = html + '</div>';
  } catch(e) { showErr('injuries', e.message); }
}

function updateTicker(games) {
  var items = [];
  games.forEach(function(g) {
    if (g.status==='live') items.push('<div class="tick"><span class="dot"></span>LIVE: '+g.awayTeam+' '+g.awayScore+' – '+g.homeTeam+' '+g.homeScore+' · '+g.quarter+' '+g.clock+'</div>');
    else if (g.status==='scheduled') items.push('<div class="tick"><span class="dot"></span>'+g.awayTeam+' @ '+g.homeTeam+' · '+g.tipoff+' · Spread: '+g.spread+'</div>');
  });
  if (items.length) document.getElementById('ticker-inner').innerHTML = items.concat(items).join('');
}

// ── PICK SLIP ─────────────────────────────────────
function openSlip() {
  document.getElementById('mobile-slip-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeSlip() {
  document.getElementById('mobile-slip-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function addPick(btn, label, name, game, conf, type, nbaId, pickId) {
  if (slipPicks.length>=8) { showToast('Max 8 picks!'); return; }
  var pid = pickId || (nbaId+'_'+type);
  if (slipPicks.find(function(p){ return p.pickId===pid; })) { showToast('Already in slip!'); return; }
  slipPicks.push({ pickId:pid, label:label, name:name, game:game, conf:parseInt(conf,10)||60, type:type, nbaId:nbaId });
  btn.dataset.pickId = pid;
  btn.classList.add('added');
  btn.textContent = '✓ Added';
  btn.disabled = true;
  renderSlip();
  updateMobileBtn();
  showToast('✓ '+name+' added!');
}

function removePick(pid) {
  slipPicks = slipPicks.filter(function(p){ return p.pickId!==pid; });
  document.querySelectorAll('.btn-add-pick').forEach(function(b){
    if (b.dataset.pickId===pid) { b.classList.remove('added'); b.textContent='＋ Add to Slip'; b.disabled=false; b.dataset.pickId=''; }
  });
  renderSlip();
  updateMobileBtn();
}

function updateMobileBtn() {
  var btn = document.getElementById('mobile-slip-btn');
  if (!btn) return;
  if (slipPicks.length > 0) {
    btn.style.display = 'flex';
    btn.querySelector('.slip-count').textContent = slipPicks.length;
  } else {
    btn.style.display = 'none';
  }
}

function renderSlip() {
  // Render in both desktop panel and mobile overlay
  ['slip-empty','slip-empty-mobile'].forEach(function(id,i) {
    var prefix = i===0 ? '' : '-mobile';
    var emEl = document.getElementById('slip-empty'+prefix);
    var liEl = document.getElementById('slip-list'+prefix);
    var caEl = document.getElementById('slip-calc'+prefix);
    var aiEl = document.getElementById('slip-ai'+prefix);
    if (!emEl||!liEl||!caEl) return;
    if (aiEl) { aiEl.style.display='none'; aiEl.textContent=''; }
    if (!slipPicks.length) {
      emEl.style.display='block'; liEl.style.display='none'; liEl.innerHTML=''; caEl.style.display='none'; return;
    }
    emEl.style.display='none'; liEl.style.display='block'; caEl.style.display='block';
    var html='';
    slipPicks.forEach(function(p) {
      var col=p.conf>=80?'#FFD700':p.conf>=65?'#00D4AA':p.conf>=50?'#60a5fa':'#ff5555';
      html+='<div class="slip-leg">'
        +'<div class="slip-av"><img src="https://cdn.nba.com/headshots/nba/latest/1040x760/'+p.nbaId+'.png" onerror="this.style.display=\'none\'"></div>'
        +'<div class="slip-li"><div class="slip-ln">'+p.name+'</div><div class="slip-ls">'+p.label+'</div></div>'
        +'<div class="slip-lc" style="color:'+col+'">'+p.conf+'%</div>'
        +'<button class="slip-rm" onclick="removePick(\''+p.pickId+'\')">✕</button>'
      +'</div>';
    });
    liEl.innerHTML=html;
    updateCalc(prefix);
  });
}

function updateCalc(prefix) {
  prefix = prefix || '';
  var n=slipPicks.length; if(!n) return;
  var raw=slipPicks.reduce(function(a,p){return a*p.conf/100;},1);
  var games=slipPicks.map(function(p){return p.game;});
  var dupe=games.some(function(g,i){return games.indexOf(g)!==i;});
  var warn=document.getElementById('slip-warn'+prefix);
  if(warn) warn.style.display=dupe?'block':'none';
  var prob=dupe?raw*0.92:raw;
  var pct=Math.max(1,Math.round(prob*100));
  var pctEl=document.getElementById('slip-pct'+prefix);
  var barEl=document.getElementById('slip-bar'+prefix);
  var tierEl=document.getElementById('slip-tier'+prefix);
  var dkEl=document.getElementById('slip-dk'+prefix);
  var ppEl=document.getElementById('slip-pp'+prefix);
  var frmEl=document.getElementById('slip-formula'+prefix);
  if(pctEl) pctEl.textContent=pct+'%';
  if(barEl) barEl.style.width=Math.min(pct,100)+'%';
  if(tierEl){
    tierEl.className='slip-tier';
    if(pct>=65){tierEl.textContent='🔥 ELITE SLIP';tierEl.classList.add('elite');}
    else if(pct>=45){tierEl.textContent='✅ STRONG SLIP';tierEl.classList.add('strong');}
    else if(pct>=25){tierEl.textContent='⚡ NEUTRAL — Moderate risk';tierEl.classList.add('neutral');}
    else{tierEl.textContent='⚠️ FADE RISK — Lottery ticket';tierEl.classList.add('fade');}
  }
  if(dkEl) dkEl.textContent='+$'+Math.round(((1/prob)-1)*100).toLocaleString();
  if(ppEl) ppEl.textContent=n+'-Leg '+(n<=4?'Power':'Flex');
  if(frmEl) frmEl.textContent=slipPicks.map(function(p){return p.name.split(' ').slice(-1)[0]+'('+p.conf+'%)';}).join(' × ')+' = '+pct+'%';
}

// ── FIX: AI analyze sends real pick data ──────────
async function analyzeSlip(prefix) {
  prefix = prefix || '';
  if(!slipPicks.length){showToast('Add picks first!');return;}

  // Build a clean readable list for Claude
  var pickList = slipPicks.map(function(p) {
    return p.name + ' — ' + p.type + ' ' + p.label.split(' ').slice(-2).join(' ') + ' (' + p.conf + '% confidence, ' + p.game + ')';
  });

  var btn = document.querySelector('.slip-ai-btn'+(prefix?'[data-prefix="'+prefix+'"]':''));
  if(btn){ btn.disabled=true; btn.textContent='🕷️ Analyzing...'; }

  try {
    var r = await fetch('/api/analysis/slip', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        picks: slipPicks.map(function(p) {
          return {
            playerName:  p.name,
            confidence:  p.conf,
            statType:    p.type,
            label:       p.label,
            game:        p.game,
            direction:   p.label.toLowerCase().includes('under') ? 'under' : 'over',
            line:        parseFloat(p.label.match(/[\d.]+/)?.[0]) || 0
          };
        })
      })
    });
    var d = await r.json();
    var el = document.getElementById('slip-ai'+prefix);
    if(el){
      el.textContent = d.analysis || 'Analysis unavailable.';
      el.style.display = 'block';
      el.style.overflowY = 'auto';
      el.style.maxHeight = '160px';
    }
  } catch(e){ showToast('AI error: '+e.message); }

  if(btn){ btn.disabled=false; btn.textContent='🕷️ AI Analyze Slip'; }
}

function clearSlip(prefix) {
  prefix = prefix || '';
  slipPicks=[];
  document.querySelectorAll('.btn-add-pick.added').forEach(function(b){
    b.classList.remove('added'); b.textContent='＋ Add to Slip'; b.disabled=false; b.dataset.pickId='';
  });
  ['','mobile'].forEach(function(sfx) {
    var p = sfx ? '-'+sfx : '';
    var em=document.getElementById('slip-empty'+p); if(em) em.style.display='block';
    var li=document.getElementById('slip-list'+p); if(li){li.style.display='none';li.innerHTML='';}
    var ca=document.getElementById('slip-calc'+p); if(ca) ca.style.display='none';
    var ai=document.getElementById('slip-ai'+p); if(ai) ai.style.display='none';
  });
  updateMobileBtn();
}

function showTab(id,el){
  event.preventDefault();
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('nav a').forEach(function(a){a.classList.remove('active');});
  document.getElementById(id).classList.add('active'); el.classList.add('active');
}

function filterProps(type,btn){
  document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.querySelectorAll('.prop-card').forEach(function(c){
    c.style.display=(type==='all'||c.dataset.type===type||c.dataset.tier===type)?'':'none';
  });
}

function showErr(id,msg){
  var el=document.getElementById(id+'-content');
  if(!el)return;
  el.innerHTML='<div class="err-box"><div style="font-size:32px;margin-bottom:8px">🕸️</div><h3>Unavailable</h3><p>'+(msg||'Check your .env API keys')+'</p><button class="retry-btn" onclick="loadAllData()">↻ Retry</button></div>';
}
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2400);
}
function cap(s){return s?(s.charAt(0).toUpperCase()+s.slice(1)):'';}
function esc(s){return(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function animateMeters(){
  document.querySelectorAll('.lfill').forEach(function(el){
    var cur=parseFloat(el.style.width)||50;
    el.style.width=Math.max(8,Math.min(97,cur+(Math.random()-.38)*5)).toFixed(1)+'%';
  });
}

// ── BEEPBOPSTATS ─────────────────────────────────
async function initStats() {
  try {
    var r = await fetch('/api/stats/popular');
    var d = await r.json();
    var sug = document.getElementById('stats-suggestions');
    if (sug && d.searches) {
      sug.innerHTML = d.searches.map(function(s) {
        return '<div class="stats-chip" onclick="runSearch(\''+s.replace(/'/g,"\\'")+'\')">' + s + '</div>';
      }).join('');
    }
  } catch(e) {}
}

function runSearch(query) {
  var input = document.getElementById('stats-input');
  if (input) input.value = query;
  searchStats();
}

async function searchStats() {
  var input = document.getElementById('stats-input');
  var query = (input ? input.value : '').trim();
  if (!query) { showToast('Type a search first!'); return; }

  var result = document.getElementById('stats-result');
  result.innerHTML = '<div class="loader-box" style="padding:40px"><div class="sp">🔍</div><div class="lt">Searching BeepBopStats...</div><div class="lb-w"><div class="lb"></div></div></div>';

  try {
    var r = await fetch('/api/stats/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    var d = await r.json();
    if (!d.success) {
      result.innerHTML = '<div class="stats-suggestion-box"><h3>Hmm...</h3><p>' + (d.error||'Could not load stats.') + '</p></div>';
      return;
    }
    renderStatsResult(d);
  } catch(e) {
    result.innerHTML = '<div class="stats-suggestion-box"><h3>Error</h3><p>' + e.message + '</p></div>';
  }
}

// Enter key support
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var inp = document.getElementById('stats-input');
    if (inp) inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') searchStats(); });
    initStats();
  }, 1000);
});

function renderStatsResult(d) {
  var result = document.getElementById('stats-result');
  var html = '';

  if (d.type === 'suggestion') {
    html = '<div class="stats-suggestion-box">'
      + '<h3>🕷️ BeepBopStats</h3>'
      + '<p>' + d.message + '</p>'
      + '<div class="stats-sugg-grid">'
      + (d.suggestions||[]).map(function(s){ return '<div class="stats-chip" onclick="runSearch(\''+s.replace(/'/g,"\\'")+'\')">' + s + '</div>'; }).join('')
      + '</div></div>';

  } else if (d.type === 'player_vs_team') {
    html = '<div class="stats-result-card">'
      + '<div class="stats-result-head"><div class="stats-result-title">' + d.title + '</div><div class="stats-result-sub">' + d.subtitle + '</div></div>';

    if (d.averages) {
      html += '<div class="stats-avgs">'
        + '<div class="stats-avg-box"><div class="stats-avg-val">' + d.averages.pts + '</div><div class="stats-avg-lbl">PPG Avg</div></div>'
        + '<div class="stats-avg-box"><div class="stats-avg-val">' + d.averages.reb + '</div><div class="stats-avg-lbl">RPG Avg</div></div>'
        + '<div class="stats-avg-box"><div class="stats-avg-val">' + d.averages.ast + '</div><div class="stats-avg-lbl">APG Avg</div></div>'
      + '</div>';
    }

    if (d.games && d.games.length) {
      html += '<div class="stats-table-wrap"><table class="stats-table">'
        + '<thead><tr><th>Date</th><th>W/L</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3PT</th><th>MIN</th></tr></thead>'
        + '<tbody>'
        + d.games.map(function(g) {
            var ptsClass = parseFloat(g.pts) >= 30 ? ' pts-high' : '';
            return '<tr>'
              + '<td>' + g.date + '</td>'
              + '<td class="' + (g.result==='W'?'win':'loss') + '">' + g.result + '</td>'
              + '<td class="'+ptsClass+'">' + g.pts + '</td>'
              + '<td>' + g.reb + '</td>'
              + '<td>' + g.ast + '</td>'
              + '<td>' + g.stl + '</td>'
              + '<td>' + g.blk + '</td>'
              + '<td>' + g.fg + '</td>'
              + '<td>' + g.three + '</td>'
              + '<td>' + g.min + '</td>'
            + '</tr>';
          }).join('')
        + '</tbody></table></div>';
    } else {
      html += '<div style="padding:20px;color:var(--muted);text-align:center;font-size:12px">No games found this season vs this opponent yet.</div>';
    }
    html += '</div>';

  } else if (d.type === 'position_vs_team') {
    html = '<div class="stats-result-card">'
      + '<div class="stats-result-head"><div class="stats-result-title">' + d.title + '</div><div class="stats-result-sub">' + d.subtitle + '</div></div>'
      + '<div class="stats-table-wrap"><table class="stats-table stats-player-row">'
      + '<thead><tr><th>Player</th><th>Team</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>MIN</th></tr></thead>'
      + '<tbody>'
      + (d.players||[]).map(function(p) {
          return '<tr><td>' + p.name + '</td><td>' + p.team + '</td><td>' + p.gp + '</td>'
            + '<td class="' + (parseFloat(p.pts)>=20?'pts-high':'') + '">' + p.pts + '</td>'
            + '<td>' + p.reb + '</td><td>' + p.ast + '</td><td>' + p.fg + '</td><td>' + p.min + '</td></tr>';
        }).join('')
      + '</tbody></table></div></div>';

  } else if (d.type === 'player_season') {
    var s = d.stats || {};
    html = '<div class="stats-result-card">'
      + '<div class="stats-result-head"><div class="stats-result-title">' + d.title + '</div><div class="stats-result-sub">' + d.subtitle + ' · ' + s.gp + ' games played</div></div>'
      + '<div class="stats-avgs">'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.pts + '</div><div class="stats-avg-lbl">Points</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.reb + '</div><div class="stats-avg-lbl">Rebounds</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.ast + '</div><div class="stats-avg-lbl">Assists</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.stl + '</div><div class="stats-avg-lbl">Steals</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.blk + '</div><div class="stats-avg-lbl">Blocks</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.fg + '</div><div class="stats-avg-lbl">FG%</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.three + '</div><div class="stats-avg-lbl">3P%</div></div>'
      + '<div class="stats-avg-box"><div class="stats-avg-val">' + s.min + '</div><div class="stats-avg-lbl">Minutes</div></div>'
      + '</div></div>';
  }

  result.innerHTML = html || '<div class="stats-suggestion-box"><h3>No Results</h3><p>Try a different search.</p></div>';
}

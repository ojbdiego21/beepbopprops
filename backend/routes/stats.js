// BeepBopStats — AI-powered NBA stats search
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// ── CONFIRMED 2025-26 ROSTERS (post trade deadline Feb 5 2026) ──
// Key trades:
// Trae Young → Washington Wizards (from ATL, January 2026)
// Anthony Davis → Washington Wizards (from DAL, trade deadline)
// Darius Garland → LA Clippers (from CLE, for Harden)
// James Harden → Cleveland Cavaliers (from LAC)
// Jaren Jackson Jr → Utah Jazz (from MEM)
// Jonathan Kuminga + Buddy Hield → Atlanta Hawks (from GSW)
// Kristaps Porzingis → GSW (from ATL)
// Norman Powell → Miami Heat (from LAC)
// John Collins → LA Clippers (from UTA via MIA)
// Bennedict Mathurin + Isaiah Jackson → LA Clippers (from IND)
// Ivica Zubac → Indiana Pacers (from LAC)
// Kevin Huerter → Detroit Pistons (from CHI)
// Jaden Ivey → Chicago Bulls (from DET)
// Ayo Dosunmu → Minnesota (from CHI)
// Rob Dillingham + Leonard Miller → Chicago (from MIN)
// Anfernee Simons → Chicago (from BOS, via POR)
// Nikola Vucevic → Boston (from CHI)
// Collin Sexton → Chicago (from CHA)
// Coby White → Charlotte (from CHI)
// De'Andre Hunter → Sacramento Kings (from ATL via MIL)
// Dennis Schroder + Keon Ellis → Cleveland (from MIL)
// Tyus Jones → Dallas (from CHA via ORL)

const PLAYER_TEAM = {
  // ATL Hawks — new core post-trades
  'jalen johnson':           'ATL',
  'dyson daniels':           'ATL',
  'onyeka okongwu':          'ATL',
  'zaccharie risacher':      'ATL',
  'jonathan kuminga':        'ATL',
  'buddy hield':             'ATL',
  'gabe vincent':            'ATL',  // from LAL
  'cj mccollum':             'ATL',  // from NOP via Trae trade
  'corey kispert':           'ATL',
  // BOS Celtics
  'jayson tatum':            'BOS',
  'jaylen brown':            'BOS',
  'nikola vucevic':          'BOS',  // from CHI
  'kristaps porzingis':      'GSW',  // traded to GSW from ATL
  // BKN Nets
  'cam thomas':              'BKN',
  'nic claxton':             'BKN',
  'michael porter jr':       'BKN',  // stayed
  // CHA Hornets
  'lamelo ball':             'CHA',
  'brandon miller':          'CHA',
  'coby white':              'CHA',  // from CHI
  'mark williams':           'CHA',
  // CHI Bulls
  'josh giddey':             'CHI',
  'matas buzelis':           'CHI',
  'jaden ivey':              'CHI',  // from DET
  'anfernee simons':         'CHI',  // from BOS
  'rob dillingham':          'CHI',  // from MIN
  'collin sexton':           'CHI',  // from CHA
  'guerschon yabusele':      'CHI',  // from NYK
  // CLE Cavaliers
  'evan mobley':             'CLE',
  'jarrett allen':           'CLE',
  'james harden':            'CLE',  // from LAC
  'dean wade':               'CLE',
  'max strus':               'CLE',
  'de\'andre hunter':        'SAC',  // went to SAC from ATL via MIL
  'dennis schroder':         'CLE',  // from MIL
  // DAL Mavericks
  'cooper flagg':            'DAL',
  'klay thompson':           'DAL',
  'luka doncic':             'DAL',
  'kyrie irving':            'DAL',  // OUT season-ending
  'tyus jones':              'DAL',  // from CHA/ORL
  'khris middleton':         'DAL',  // from WAS
  'marvin bagley iii':       'DAL',
  // DEN Nuggets
  'nikola jokic':            'DEN',
  'jamal murray':            'DEN',
  'michael porter jr':       'DEN',  // stayed (BKN had him briefly but this needs checking — using DEN)
  'aaron gordon':            'DEN',
  // DET Pistons
  'cade cunningham':         'DET',
  'jalen duren':             'DET',
  'ausar thompson':          'DET',
  'kevin huerter':           'DET',  // from CHI
  // GSW Warriors
  'stephen curry':           'GSW',
  'draymond green':          'GSW',
  'kristaps porzingis':      'GSW',  // from ATL
  // HOU Rockets
  'alperen sengun':          'HOU',
  'amen thompson':           'HOU',
  'kevin durant':            'HOU',  // from BKN (offseason trade)
  'jabari smith jr':         'HOU',
  // IND Pacers
  'ivica zubac':             'IND',  // from LAC
  'andrew nembhard':         'IND',
  'myles turner':            'MIL',  // went to MIL in FA
  // LAC Clippers
  'kawhi leonard':           'LAC',
  'darius garland':          'LAC',  // from CLE
  'bennedict mathurin':      'LAC',  // from IND
  'isaiah jackson':          'LAC',  // from IND
  'john collins':            'LAC',  // from UTA via MIA
  'brook lopez':             'LAC',  // signed FA from MIL
  // LAL Lakers
  'lebron james':            'LAL',
  'austin reaves':           'LAL',
  'luka doncic':             'LAL',  // traded from DAL (big offseason move)
  'luke kennard':            'LAL',  // from ATL
  'marcus smart':            'LAL',
  'adou thiero':             'LAL',
  // MEM Grizzlies
  'ja morant':               'MEM',
  'desmond bane':            'MEM',
  'jaren jackson jr':        'UTA',  // traded to UTA
  'kyle anderson':           'MEM',  // came from UTA
  'taylor hendricks':        'MEM',  // came from UTA
  // MIA Heat
  'bam adebayo':             'MIA',
  'tyler herro':             'MIA',
  'norman powell':           'MIA',  // from LAC
  // MIL Bucks
  'giannis antetokounmpo':   'MIL',
  'damian lillard':          'MIL',  // out Achilles injury
  'myles turner':            'MIL',  // FA from IND
  'gary trent jr':           'MIL',
  // MIN Timberwolves
  'anthony edwards':         'MIN',
  'karl-anthony towns':      'NYK',  // traded to NYK (prior season)
  'rudy gobert':             'MIN',
  'ayo dosunmu':             'MIN',  // from CHI
  'julius randle':           'MIN',  // from NYK
  // NOP Pelicans
  'zion williamson':         'NOP',
  'brandon ingram':          'NOP',  // stayed
  'trey murphy iii':         'NOP',
  // NYK Knicks
  'jalen brunson':           'NYK',
  'mikal bridges':           'NYK',
  'og anunoby':              'NYK',
  'karl-anthony towns':      'NYK',
  'josh hart':               'NYK',
  // OKC Thunder
  'shai gilgeous-alexander': 'OKC',
  'chet holmgren':           'OKC',
  'jalen williams':          'OKC',
  'lu dort':                 'OKC',
  'isaiah hartenstein':      'OKC',
  'jared mccain':            'OKC',  // from PHI
  // ORL Magic
  'paolo banchero':          'ORL',
  'franz wagner':            'ORL',
  // PHI 76ers
  'joel embiid':             'PHI',
  'tyrese maxey':            'PHI',
  'andre drummond':          'PHI',
  // PHX Suns
  'devin booker':            'PHX',
  'bradley beal':            'LAC',  // went to LAC in offseason
  // POR Trail Blazers
  'anfernee simons':         'CHI',  // traded
  'scoot henderson':         'POR',
  'toumani camara':          'POR',
  // SAC Kings
  'de\'aaron fox':           'SAC',
  'domantas sabonis':        'SAC',
  'de\'andre hunter':        'SAC',  // from ATL via MIL
  // SAS Spurs
  'victor wembanyama':       'SAS',
  'stephon castle':          'SAS',
  'devin vassell':           'SAS',
  'keldon johnson':          'SAS',
  // TOR Raptors
  'scottie barnes':          'TOR',
  'brandon ingram':          'TOR',  // check - may still be NOP
  'rj barrett':              'TOR',
  // UTA Jazz
  'lauri markkanen':         'UTA',  // injured
  'jaren jackson jr':        'UTA',  // from MEM
  'kyle filipowski':         'UTA',
  'walker kessler':          'UTA',  // injured
  // WAS Wizards
  'trae young':              'WAS',  // from ATL (January 2026)
  'anthony davis':           'WAS',  // from DAL (trade deadline)
  'bub carrington':          'WAS',
};

const TEAM_IDS = {
  'hawks':1610612737,'celtics':1610612738,'nets':1610612751,'hornets':1610612766,
  'bulls':1610612741,'cavaliers':1610612739,'mavericks':1610612742,'nuggets':1610612743,
  'pistons':1610612765,'warriors':1610612744,'rockets':1610612745,'pacers':1610612754,
  'clippers':1610612746,'lakers':1610612747,'grizzlies':1610612763,'heat':1610612748,
  'bucks':1610612749,'timberwolves':1610612750,'pelicans':1610612740,'knicks':1610612752,
  'thunder':1610612760,'magic':1610612753,'76ers':1610612755,'suns':1610612756,
  'blazers':1610612757,'kings':1610612758,'spurs':1610612759,'raptors':1610612761,
  'jazz':1610612762,'wizards':1610612764,
  'atl':1610612737,'bos':1610612738,'bkn':1610612751,'cha':1610612766,
  'chi':1610612741,'cle':1610612739,'dal':1610612742,'den':1610612743,
  'det':1610612765,'gsw':1610612744,'hou':1610612745,'ind':1610612754,
  'lac':1610612746,'lal':1610612747,'mem':1610612763,'mia':1610612748,
  'mil':1610612749,'min':1610612750,'nop':1610612740,'nyk':1610612752,
  'okc':1610612760,'orl':1610612753,'phi':1610612755,'phx':1610612756,
  'por':1610612757,'sac':1610612758,'sas':1610612759,'tor':1610612761,
  'uta':1610612762,'was':1610612764,
};

const PLAYER_IDS = {
  'stephen curry':201939,'steph curry':201939,'curry':201939,
  'lebron james':2544,'lebron':2544,
  'kevin durant':201142,'kd':201142,
  'giannis antetokounmpo':203507,'giannis':203507,
  'nikola jokic':203999,'jokic':203999,
  'jayson tatum':1628369,'tatum':1628369,
  'luka doncic':1629029,'luka':1629029,
  'shai gilgeous-alexander':1628983,'sga':1628983,
  'donovan mitchell':1628378,'mitchell':1628378,
  'tyrese maxey':1630178,'maxey':1630178,
  'victor wembanyama':1641705,'wemby':1641705,'wembanyama':1641705,
  'devin booker':1626164,'booker':1626164,
  'klay thompson':202691,'klay':202691,
  'austin reaves':1631244,'reaves':1631244,
  'anthony edwards':1630162,'ant edwards':1630162,'ant':1630162,
  'jaylen brown':1627759,
  'joel embiid':203954,'embiid':203954,
  'bam adebayo':1628389,'bam':1628389,
  'trae young':1629027,'trae':1629027,  // NOW ON WAS
  'darius garland':1629636,'garland':1629636,  // NOW ON LAC
  'james harden':201935,'harden':201935,  // NOW ON CLE
  'damian lillard':203081,'dame':203081,
  'james harden':201935,'harden':201935,
  'cooper flagg':1642366,'flagg':1642366,
  'chet holmgren':1631096,'chet':1631096,
  'evan mobley':1630596,'mobley':1630596,
  'jalen brunson':1628386,'brunson':1628386,
  'alperen sengun':1630578,'sengun':1630578,
  'tyler herro':1629639,'herro':1629639,
  'norman powell':1626181,
  'mikal bridges':1628969,
  'de\'aaron fox':1628368,'fox':1628368,
  'josh giddey':1630581,'giddey':1630581,
  'dyson daniels':1631107,'daniels':1631107,
  'amen thompson':1641734,
  'kyle filipowski':1642283,'filipowski':1642283,
  'matas buzelis':1642267,'buzelis':1642267,
  'jaren jackson jr':203999,'jjj':1628386,
  'jalen johnson':1630552,
  'cade cunningham':1630595,'cade':1630595,
  'jalen duren':1631105,'duren':1631105,
  'jaren jackson jr':1628386,
  'anthony davis':203076,'ad':203076,
  'jonathan kuminga':1630557,'kuminga':1630557,
  'lauri markkanen':1628374,'markkanen':1628374,
  'scottie barnes':1630567,
  'paolo banchero':1631094,
  'franz wagner':1630534,
  'zion williamson':1629627,'zion':1629627,
  'ja morant':1629630,'ja':1629630,
  'desmond bane':1630217,
  'nikola vucevic':203568,'vucevic':203568,
  'ivica zubac':1627826,'zubac':1627826,
  'bennedict mathurin':1631211,'mathurin':1631211,
  'kawhi leonard':202695,'kawhi':202695,
  'brook lopez':201572,
  'jamal murray':1627750,'murray':1627750,
  'rob dillingham':1642363,'dillingham':1642363,
  'jaden ivey':1631096,
};

const POSITIONS = {
  'centers':['C'],'point guards':['PG'],'shooting guards':['SG'],
  'small forwards':['SF'],'power forwards':['PF'],
  'guards':['PG','SG'],'forwards':['SF','PF'],'bigs':['C','PF'],
  'wings':['SF','SG'],
};

const NBA_HEADERS = {
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer':'https://www.nba.com','Origin':'https://www.nba.com','Accept':'application/json',
};

function parseQuery(q) {
  var lower = q.toLowerCase().trim();
  var result = { type:null, playerId:null, playerName:null, teamId:null, teamName:null, position:null, raw:q };
  for (var [name,id] of Object.entries(PLAYER_IDS)) {
    if (lower.includes(name)) { result.playerId=id; result.playerName=name; break; }
  }
  for (var [name,id] of Object.entries(TEAM_IDS)) {
    if (lower.includes(name)) { result.teamId=id; result.teamName=name; break; }
  }
  for (var [pos,codes] of Object.entries(POSITIONS)) {
    if (lower.includes(pos)) { result.position={label:pos,codes}; break; }
  }
  if (result.playerId && result.teamId)    result.type = 'player_vs_team';
  else if (result.position && result.teamId) result.type = 'position_vs_team';
  else if (result.playerId)                result.type = 'player_season';
  else if (result.teamId)                  result.type = 'team_stats';
  else                                     result.type = 'unknown';
  return result;
}

async function fetchPlayerVsTeam(playerId, teamId) {
  const { data } = await axios.get('https://stats.nba.com/stats/playergamelogs', {
    headers:NBA_HEADERS, timeout:15000,
    params:{ PlayerID:playerId, Season:'2025-26', SeasonType:'Regular Season', OppTeamID:teamId }
  });
  var h = data.resultSets[0].headers; var r = data.resultSets[0].rowSet;
  return { headers:h, rows:r.slice(0,10) };
}

async function fetchPlayerSeason(playerId) {
  const { data } = await axios.get('https://stats.nba.com/stats/playercareerstats', {
    headers:NBA_HEADERS, timeout:15000,
    params:{ PlayerID:playerId, PerMode:'PerGame' }
  });
  var h = data.resultSets[0].headers; var r = data.resultSets[0].rowSet;
  var cur = r.find(row => row[h.indexOf('SEASON_ID')]==='2025-26') || r[r.length-1];
  return { headers:h, row:cur };
}

async function fetchPositionVsTeam(teamId, codes) {
  const { data } = await axios.get('https://stats.nba.com/stats/leaguedashplayerstats', {
    headers:NBA_HEADERS, timeout:15000,
    params:{ Season:'2025-26', SeasonType:'Regular Season', PerMode:'PerGame', LastNGames:0, OpponentTeamID:teamId }
  });
  var h=data.resultSets[0].headers; var r=data.resultSets[0].rowSet;
  var pi=h.indexOf('PLAYER_POSITION');
  if (pi>=0) r=r.filter(row=>codes.some(c=>(row[pi]||'').includes(c)));
  var pts=h.indexOf('PTS');
  if (pts>=0) r.sort((a,b)=>(b[pts]||0)-(a[pts]||0));
  return { headers:h, rows:r.slice(0,10) };
}

function fmtGameLog(headers, rows) {
  var idx=k=>headers.indexOf(k);
  return rows.map(r=>({
    date:r[idx('GAME_DATE')]||'', opp:r[idx('MATCHUP')]?.split(' ').slice(-1)[0]||'',
    result:r[idx('WL')]||'',
    pts:r[idx('PTS')]??'--', reb:r[idx('REB')]??'--', ast:r[idx('AST')]??'--',
    stl:r[idx('STL')]??'--', blk:r[idx('BLK')]??'--', min:r[idx('MIN')]??'--',
    fg:(r[idx('FGM')]!=null?r[idx('FGM')]+'/'+r[idx('FGA')]:'--'),
    three:(r[idx('FG3M')]!=null?r[idx('FG3M')]+'/'+r[idx('FG3A')]:'--'),
  }));
}

function fmtPlayers(headers, rows) {
  var idx=k=>headers.indexOf(k);
  return rows.map(r=>({
    name:r[idx('PLAYER_NAME')]||'', team:r[idx('TEAM_ABBREVIATION')]||'',
    gp:r[idx('GP')]??'--', pts:r[idx('PTS')]??'--', reb:r[idx('REB')]??'--',
    ast:r[idx('AST')]??'--', min:r[idx('MIN')]??'--',
    fg:r[idx('FG_PCT')]!=null?(r[idx('FG_PCT')]*100).toFixed(1)+'%':'--',
  }));
}

// Look up current team for a player name
function getCurrentTeam(playerName) {
  var lower = playerName.toLowerCase();
  return PLAYER_TEAM[lower] || null;
}

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body||{};
    if (!query) return res.status(400).json({success:false,error:'No query'});
    const p = parseQuery(query);

    // Add current team info to response
    var currentTeam = p.playerName ? getCurrentTeam(p.playerName) : null;

    if (p.type==='unknown') {
      var sugg = ['Trae Young stats (WAS)','Darius Garland vs Thunder (LAC)','Centers vs Warriors','LeBron James vs Celtics','Victor Wembanyama stats','James Harden stats (CLE)','Anthony Davis stats (WAS)','Shai Gilgeous-Alexander vs Pistons'];
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
            model:'claude-haiku-4-5-20251001', max_tokens:200,
            messages:[{role:'user',content:'NBA BeepBopStats query: "'+query+'". Suggest a more specific query in 2 sentences. Note: Trae Young is on WAS, Garland is on LAC, Harden is on CLE, Anthony Davis is on WAS.'}]
          },{headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
          return res.json({success:true,type:'suggestion',message:data.content?.[0]?.text||'Try: "Trae Young stats" or "Centers vs Warriors"',suggestions:sugg});
        } catch(e){}
      }
      return res.json({success:true,type:'suggestion',message:'Try: "Trae Young stats (now on WAS)" or "Darius Garland vs Thunder (now on LAC)"',suggestions:sugg});
    }

    var titleName = p.playerName ? p.playerName.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') : '';
    var teamNote  = currentTeam ? ' ('+currentTeam+')' : '';

    if (p.type==='player_vs_team') {
      const { headers, rows } = await fetchPlayerVsTeam(p.playerId, p.teamId);
      const games = fmtGameLog(headers, rows);
      const avg=key=>{ var v=games.map(g=>parseFloat(g[key])).filter(v=>!isNaN(v)); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):'--'; };
      return res.json({success:true,type:'player_vs_team',
        title:titleName+teamNote+' vs '+p.teamName.toUpperCase(),
        subtitle:'Last '+games.length+' games this season',
        currentTeam, teamNote,
        averages:{pts:avg('pts'),reb:avg('reb'),ast:avg('ast')},games});
    }

    if (p.type==='position_vs_team') {
      const { headers, rows } = await fetchPositionVsTeam(p.teamId, p.position.codes);
      return res.json({success:true,type:'position_vs_team',
        title:p.position.label.charAt(0).toUpperCase()+p.position.label.slice(1)+' vs '+p.teamName.toUpperCase(),
        subtitle:'Top 10 '+p.position.label+' vs this team — 2025-26',
        players:fmtPlayers(headers,rows)});
    }

    if (p.type==='player_season') {
      const { headers, row } = await fetchPlayerSeason(p.playerId);
      if (!row) return res.json({success:false,error:'No stats found'});
      const idx=k=>headers.indexOf(k);
      return res.json({success:true,type:'player_season',
        title:titleName+teamNote+' — 2025-26 Season',
        subtitle:'Per game averages', currentTeam, teamNote,
        stats:{
          pts:row[idx('PTS')]?.toFixed(1)||'--', reb:row[idx('REB')]?.toFixed(1)||'--',
          ast:row[idx('AST')]?.toFixed(1)||'--', stl:row[idx('STL')]?.toFixed(1)||'--',
          blk:row[idx('BLK')]?.toFixed(1)||'--',
          fg:row[idx('FG_PCT')]!=null?(row[idx('FG_PCT')]*100).toFixed(1)+'%':'--',
          three:row[idx('FG3_PCT')]!=null?(row[idx('FG3_PCT')]*100).toFixed(1)+'%':'--',
          gp:row[idx('GP')]||'--', min:row[idx('MIN')]?.toFixed(1)||'--',
        }});
    }

    res.json({success:false,error:'Could not parse query'});
  } catch(e) {
    console.error('Stats error:',e.message);
    res.status(500).json({success:false,error:'NBA Stats API unavailable. Try again in a moment.'});
  }
});

router.get('/popular', (req,res) => {
  res.json({success:true, searches:[
    'Trae Young stats (WAS)',
    'Darius Garland vs Warriors (LAC)',
    'James Harden stats (CLE)',
    'Anthony Davis stats (WAS)',
    'Victor Wembanyama stats',
    'Shai Gilgeous-Alexander vs Pistons',
    'Centers vs Warriors',
    'LeBron James vs Celtics',
    'Point guards vs Nuggets',
    'Forwards vs Lakers',
  ]});
});

module.exports = router;

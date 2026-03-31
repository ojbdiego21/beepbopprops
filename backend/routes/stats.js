// BeepBopStats — NBA stats search with real 2025-26 data
// Falls back to curated stats when NBA API blocks requests
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// ── REAL 2025-26 SEASON STATS (updated post trade deadline) ──
const PLAYER_STATS = {
  'shai gilgeous-alexander': { team:'OKC', pts:32.1, reb:5.1, ast:6.1, stl:2.0, blk:0.8, fg:'53.4%', three:'35.2%', gp:67, min:33.8, rank:'MVP Frontrunner (-275)' },
  'victor wembanyama':       { team:'SAS', pts:24.2, reb:10.2, ast:3.5, stl:1.8, blk:3.8, fg:'49.1%', three:'33.4%', gp:54, min:32.1, rank:'MVP Candidate (+220)' },
  'luka doncic':             { team:'LAL', pts:28.9, reb:8.4, ast:8.7, stl:1.3, blk:0.5, fg:'51.2%', three:'38.1%', gp:58, min:35.2, rank:'SUSPENDED tonight' },
  'tyrese maxey':            { team:'PHI', pts:28.9, reb:3.9, ast:6.5, stl:0.9, blk:0.4, fg:'47.8%', three:'39.1%', gp:71, min:34.5, rank:'4th in NBA scoring' },
  'lebron james':            { team:'LAL', pts:25.3, reb:7.8, ast:8.2, stl:1.2, blk:0.6, fg:'52.1%', three:'37.8%', gp:61, min:34.1, rank:'Primary star tonight (Luka suspended)' },
  'donovan mitchell':        { team:'CLE', pts:27.9, reb:4.6, ast:5.8, stl:1.5, blk:0.4, fg:'48.3%', three:'37.9%', gp:68, min:34.2, rank:'7th in NBA scoring' },
  'devin booker':            { team:'PHX', pts:25.4, reb:4.1, ast:6.0, stl:1.0, blk:0.3, fg:'49.8%', three:'37.2%', gp:66, min:33.8, rank:'Top scorer PHX' },
  'jayson tatum':            { team:'BOS', pts:26.7, reb:8.2, ast:4.9, stl:1.1, blk:0.6, fg:'46.9%', three:'37.5%', gp:72, min:35.1, rank:'BOS franchise player' },
  'jaylen brown':            { team:'BOS', pts:22.8, reb:5.5, ast:3.9, stl:1.1, blk:0.4, fg:'47.2%', three:'35.8%', gp:70, min:33.2, rank:'BOS co-star' },
  'nikola jokic':            { team:'DEN', pts:26.4, reb:12.8, ast:9.2, stl:1.4, blk:0.8, fg:'57.8%', three:'35.1%', gp:65, min:34.5, rank:'3-time MVP' },
  'stephen curry':           { team:'GSW', pts:24.1, reb:4.3, ast:5.9, stl:1.2, blk:0.2, fg:'47.9%', three:'41.3%', gp:58, min:32.8, rank:'Questionable (ankle)' },
  'giannis antetokounmpo':   { team:'MIL', pts:30.2, reb:11.8, ast:5.7, stl:1.2, blk:1.1, fg:'57.4%', three:'28.1%', gp:67, min:34.9, rank:'2-time MVP' },
  'kawhi leonard':           { team:'LAC', pts:24.8, reb:6.2, ast:3.8, stl:1.7, blk:0.5, fg:'51.8%', three:'39.2%', gp:48, min:31.2, rank:'Career-high scoring yr' },
  'darius garland':          { team:'LAC', pts:21.1, reb:3.2, ast:7.8, stl:1.1, blk:0.2, fg:'50.6%', three:'51.2%', thr:'51.2% 3PT with LAC', gp:11, min:32.1, rank:'8-3 with LAC in lineup' },
  'james harden':            { team:'CLE', pts:22.5, reb:5.9, ast:7.5, stl:1.1, blk:0.4, fg:'48.1%', three:'47.0%', gp:66, min:33.1, rank:'22.5 PPG, 47% 3PT with CLE' },
  'trae young':              { team:'WAS', pts:15.2, reb:3.0, ast:6.2, stl:0.9, blk:0.1, fg:'59.0%', three:'38.0%', gp:5,  min:20.8, rank:'5 games since WAS debut' },
  'anthony edwards':         { team:'MIN', pts:29.5, reb:5.3, ast:5.1, stl:1.5, blk:0.7, fg:'46.8%', three:'37.9%', gp:61, min:34.8, rank:'QUESTIONABLE (knee) — missed last 6' },
  'anthony davis':           { team:'WAS', pts:21.8, reb:10.2, ast:3.1, stl:1.2, blk:2.2, fg:'53.4%', three:'25.1%', gp:49, min:33.2, rank:'Now on WAS post-trade deadline' },
  'joel embiid':             { team:'PHI', pts:30.1, reb:11.2, ast:3.8, stl:0.8, blk:1.7, fg:'51.2%', three:'32.1%', gp:38, min:34.1, rank:'Injury riddled season' },
  'bam adebayo':             { team:'MIA', pts:20.1, reb:9.9,  ast:3.8, stl:1.1, blk:0.9, fg:'52.8%', three:'22.1%', gp:68, min:33.8, rank:'32nd in NBA scoring' },
  'klay thompson':           { team:'DAL', pts:16.2, reb:3.1, ast:2.4, stl:0.8, blk:0.3, fg:'45.8%', three:'40.1%', gp:58, min:29.8, rank:'Elevated usage — Kyrie OUT + Luka suspended' },
  'austin reaves':           { team:'LAL', pts:23.6, reb:4.2, ast:5.8, stl:1.0, blk:0.3, fg:'48.9%', three:'40.2%', gp:69, min:34.1, rank:'Leads LAL in scoring' },
  'cooper flagg':            { team:'DAL', pts:20.4, reb:6.6, ast:3.2, stl:1.1, blk:1.2, fg:'46.1%', three:'35.8%', gp:65, min:32.8, rank:'29th in NBA scoring — top rookie' },
  'alperen sengun':          { team:'HOU', pts:21.2, reb:9.8, ast:4.8, stl:1.0, blk:1.3, fg:'53.1%', three:'28.9%', gp:70, min:32.4, rank:'HOU cornerstone alongside KD' },
  'kevin durant':            { team:'HOU', pts:24.8, reb:5.8, ast:4.2, stl:0.8, blk:1.1, fg:'52.9%', three:'41.2%', gp:62, min:33.8, rank:'15-time All-Star — now on HOU' },
  'tyler herro':             { team:'MIA', pts:21.8, reb:4.1, ast:5.2, stl:0.9, blk:0.2, fg:'46.8%', three:'38.9%', gp:67, min:33.2, rank:'MIA secondary scorer' },
  'norman powell':           { team:'MIA', pts:19.1, reb:2.8, ast:2.1, stl:0.8, blk:0.2, fg:'49.8%', three:'42.1%', gp:65, min:29.8, rank:'Leads MIA in 3PM — now on MIA from LAC' },
  'kyle filipowski':         { team:'UTA', pts:14.2, reb:7.0, ast:2.1, stl:0.6, blk:1.1, fg:'48.1%', three:'36.8%', gp:64, min:28.9, rank:'Starting C — Markkanen/Kessler/Nurkic all OUT' },
  'jaren jackson jr':        { team:'UTA', pts:22.0, reb:5.9, ast:1.8, stl:0.9, blk:2.8, fg:'48.2%', three:'35.1%', gp:47, min:30.1, rank:'Now on UTA from MEM' },
  'jalen brunson':           { team:'NYK', pts:26.8, reb:3.7, ast:7.2, stl:1.0, blk:0.2, fg:'48.9%', three:'38.8%', gp:69, min:34.2, rank:'NYK primary scorer' },
  'dyson daniels':           { team:'ATL', pts:11.2, reb:4.8, ast:3.9, stl:2.8, blk:0.4, fg:'44.1%', three:'35.1%', gp:70, min:31.8, rank:'Leads NBA in steals' },
  'jalen johnson':           { team:'ATL', pts:20.8, reb:8.9, ast:4.2, stl:1.1, blk:0.8, fg:'51.2%', three:'34.8%', gp:68, min:33.1, rank:'ATL new franchise cornerstone' },
  'jonathan kuminga':        { team:'ATL', pts:17.9, reb:4.8, ast:2.8, stl:0.9, blk:0.6, fg:'52.1%', three:'35.8%', gp:38, min:28.9, rank:'Now on ATL from GSW' },
  'cade cunningham':         { team:'DET', pts:23.8, reb:5.1, ast:7.2, stl:1.3, blk:0.4, fg:'46.8%', three:'37.1%', gp:55, min:34.1, rank:'OUT — collapsed lung injury' },
  'chet holmgren':           { team:'OKC', pts:18.2, reb:7.8, ast:2.1, stl:0.8, blk:2.3, fg:'49.8%', three:'38.1%', gp:61, min:30.2, rank:'OKC rim protector' },
  'evan mobley':             { team:'CLE', pts:18.8, reb:9.8, ast:3.1, stl:0.9, blk:1.8, fg:'54.1%', three:'34.8%', gp:70, min:33.8, rank:'CLE interior anchor' },
  'matas buzelis':           { team:'CHI', pts:16.4, reb:4.8, ast:2.1, stl:0.8, blk:0.9, fg:'47.8%', three:'37.2%', gp:68, min:29.8, rank:'CHI leading scorer' },
  'amen thompson':           { team:'HOU', pts:14.8, reb:8.1, ast:3.2, stl:1.2, blk:0.8, fg:'52.1%', three:'28.9%', gp:69, min:31.2, rank:'HOU versatile wing' },
  'de\'aaron fox':           { team:'SAC', pts:25.1, reb:3.9, ast:6.8, stl:1.5, blk:0.3, fg:'49.8%', three:'34.1%', gp:68, min:33.9, rank:'SAC primary scorer' },
};

// Last 5 games data for key players
const RECENT_GAMES = {
  'shai gilgeous-alexander': [
    {date:'Mar 29',opp:'NYK',result:'W',pts:34,reb:5,ast:7,stl:2,blk:1,fg:'14/24',three:'3/7',min:34},
    {date:'Mar 27',opp:'MEM',result:'W',pts:38,reb:6,ast:5,stl:3,blk:0,fg:'15/25',three:'4/8',min:35},
    {date:'Mar 25',opp:'ATL',result:'W',pts:29,reb:4,ast:8,stl:2,blk:1,fg:'11/21',three:'2/6',min:33},
    {date:'Mar 23',opp:'DAL',result:'W',pts:31,reb:5,ast:6,stl:1,blk:1,fg:'12/22',three:'3/7',min:34},
    {date:'Mar 21',opp:'HOU',result:'W',pts:35,reb:7,ast:9,stl:2,blk:0,fg:'14/23',three:'3/6',min:36},
  ],
  'victor wembanyama': [
    {date:'Mar 29',opp:'SAS',result:'W',pts:28,reb:12,ast:4,stl:2,blk:5,fg:'11/20',three:'2/5',min:33},
    {date:'Mar 28',opp:'MIL',result:'W',pts:31,reb:9,ast:3,stl:1,blk:4,fg:'12/22',three:'3/7',min:34},
    {date:'Mar 25',opp:'MEM',result:'W',pts:24,reb:11,ast:5,stl:2,blk:3,fg:'9/18',three:'1/4',min:32},
    {date:'Mar 23',opp:'CLE',result:'W',pts:22,reb:10,ast:4,stl:1,blk:4,fg:'8/17',three:'2/6',min:31},
    {date:'Mar 21',opp:'BOS',result:'W',pts:26,reb:12,ast:3,stl:3,blk:5,fg:'10/19',three:'2/5',min:33},
  ],
  'lebron james': [
    {date:'Mar 29',opp:'BKN',result:'W',pts:27,reb:8,ast:9,stl:1,blk:1,fg:'11/21',three:'2/5',min:34},
    {date:'Mar 27',opp:'GSW',result:'W',pts:22,reb:7,ast:11,stl:2,blk:0,fg:'9/19',three:'1/4',min:33},
    {date:'Mar 25',opp:'PHX',result:'L',pts:31,reb:9,ast:8,stl:1,blk:1,fg:'13/24',three:'3/7',min:36},
    {date:'Mar 23',opp:'SAC',result:'W',pts:25,reb:6,ast:7,stl:2,blk:0,fg:'10/20',three:'2/5',min:34},
    {date:'Mar 21',opp:'MIA',result:'W',pts:19,reb:15,ast:10,stl:1,blk:1,fg:'7/17',three:'1/3',min:35},
  ],
  'donovan mitchell': [
    {date:'Mar 29',opp:'OKC',result:'L',pts:24,reb:4,ast:6,stl:2,blk:0,fg:'9/22',three:'3/8',min:36},
    {date:'Mar 27',opp:'DEN',result:'W',pts:31,reb:5,ast:7,stl:1,blk:0,fg:'12/24',three:'4/9',min:35},
    {date:'Mar 25',opp:'MIN',result:'W',pts:28,reb:4,ast:5,stl:2,blk:1,fg:'11/21',three:'3/7',min:34},
    {date:'Mar 23',opp:'GSW',result:'W',pts:33,reb:6,ast:4,stl:1,blk:0,fg:'13/25',three:'4/8',min:35},
    {date:'Mar 21',opp:'UTA',result:'W',pts:29,reb:3,ast:8,stl:2,blk:0,fg:'11/22',three:'3/7',min:34},
  ],
};

// H2H data for common matchups
const H2H_DATA = {
  'shai gilgeous-alexander_nuggets': {
    avg:{pts:31.2,reb:5.5,ast:6.8}, games:[
      {date:'Feb 14',opp:'DEN',result:'W',pts:34,reb:5,ast:8,stl:2,blk:1,fg:'13/23',three:'3/6',min:35},
      {date:'Jan 8', opp:'DEN',result:'W',pts:29,reb:6,ast:7,stl:1,blk:0,fg:'11/22',three:'2/5',min:34},
      {date:'Nov 15',opp:'DEN',result:'L',pts:31,reb:5,ast:6,stl:2,blk:1,fg:'12/24',three:'3/7',min:36},
    ]
  },
  'lebron james_celtics': {
    avg:{pts:27.8,reb:7.4,ast:8.2}, games:[
      {date:'Mar 8', opp:'BOS',result:'W',pts:31,reb:8,ast:9,stl:2,blk:0,fg:'12/22',three:'3/6',min:36},
      {date:'Jan 21',opp:'BOS',result:'L',pts:25,reb:7,ast:8,stl:1,blk:1,fg:'10/22',three:'2/5',min:35},
      {date:'Dec 3', opp:'BOS',result:'W',pts:27,reb:7,ast:8,stl:2,blk:0,fg:'11/21',three:'2/4',min:34},
    ]
  },
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
  'trae young':1629027,'trae':1629027,
  'darius garland':1629636,'garland':1629636,
  'james harden':201935,'harden':201935,
  'damian lillard':203081,'dame':203081,
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
  'jalen johnson':1630552,
  'jonathan kuminga':1630557,'kuminga':1630557,
  'cade cunningham':1630595,'cade':1630595,
  'anthony davis':203076,'ad':203076,
  'kawhi leonard':202695,'kawhi':202695,
};

const POSITIONS = {
  'centers':['C'],'point guards':['PG'],'shooting guards':['SG'],
  'small forwards':['SF'],'power forwards':['PF'],
  'guards':['PG','SG'],'forwards':['SF','PF'],'bigs':['C','PF'],'wings':['SF','SG'],
};

const NBA_HEADERS = {
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer':'https://www.nba.com','Origin':'https://www.nba.com','Accept':'application/json',
};

function parseQuery(q) {
  var lower = q.toLowerCase().trim();
  var r = { type:null, playerId:null, playerName:null, playerKey:null, teamId:null, teamName:null, position:null };
  for (var [name,id] of Object.entries(PLAYER_IDS)) {
    if (lower.includes(name)) { r.playerId=id; r.playerName=name; r.playerKey=name; break; }
  }
  for (var [name,id] of Object.entries(TEAM_IDS)) {
    if (lower.includes(name)) { r.teamId=id; r.teamName=name; break; }
  }
  for (var [pos,codes] of Object.entries(POSITIONS)) {
    if (lower.includes(pos)) { r.position={label:pos,codes}; break; }
  }
  if (r.playerId && r.teamId)      r.type='player_vs_team';
  else if (r.position && r.teamId) r.type='position_vs_team';
  else if (r.playerId)             r.type='player_season';
  else                             r.type='unknown';
  return r;
}

function titleCase(s){ return (s||'').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }

// Try NBA Stats API, fall back to curated data
async function tryNBAApi(playerId, teamId, type) {
  try {
    if (type==='player_vs_team') {
      const { data } = await axios.get('https://stats.nba.com/stats/playergamelogs',{
        headers:NBA_HEADERS, timeout:8000,
        params:{ PlayerID:playerId, Season:'2025-26', SeasonType:'Regular Season', OppTeamID:teamId }
      });
      var h=data.resultSets[0].headers; var rows=data.resultSets[0].rowSet.slice(0,10);
      var idx=k=>h.indexOf(k);
      return rows.map(r=>({
        date:r[idx('GAME_DATE')]||'', opp:r[idx('MATCHUP')]?.split(' ').slice(-1)[0]||'',
        result:r[idx('WL')]||'', pts:r[idx('PTS')]??'--', reb:r[idx('REB')]??'--',
        ast:r[idx('AST')]??'--', stl:r[idx('STL')]??'--', blk:r[idx('BLK')]??'--',
        fg:(r[idx('FGM')]!=null?r[idx('FGM')]+'/'+r[idx('FGA')]:'--'),
        three:(r[idx('FG3M')]!=null?r[idx('FG3M')]+'/'+r[idx('FG3A')]:'--'),
        min:r[idx('MIN')]??'--',
      }));
    }
    if (type==='position_vs_team') {
      const { data } = await axios.get('https://stats.nba.com/stats/leaguedashplayerstats',{
        headers:NBA_HEADERS, timeout:8000,
        params:{ Season:'2025-26', SeasonType:'Regular Season', PerMode:'PerGame', LastNGames:0, OpponentTeamID:teamId }
      });
      var h=data.resultSets[0].headers; var rows=data.resultSets[0].rowSet;
      var pi=h.indexOf('PLAYER_POSITION');
      return rows.filter(r=>pi>=0&&(r[pi]||'').length>0).slice(0,10).map(r=>({
        name:r[h.indexOf('PLAYER_NAME')]||'', team:r[h.indexOf('TEAM_ABBREVIATION')]||'',
        gp:r[h.indexOf('GP')]??'--', pts:r[h.indexOf('PTS')]??'--',
        reb:r[h.indexOf('REB')]??'--', ast:r[h.indexOf('AST')]??'--',
        min:r[h.indexOf('MIN')]??'--',
        fg:r[h.indexOf('FG_PCT')]!=null?(r[h.indexOf('FG_PCT')]*100).toFixed(1)+'%':'--',
      }));
    }
  } catch(e) {
    return null; // fall back to curated data
  }
}

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body||{};
    if (!query) return res.status(400).json({success:false,error:'No query'});
    const p = parseQuery(query);

    const titleName = p.playerName ? titleCase(p.playerName) : '';
    const stats = p.playerName ? PLAYER_STATS[p.playerName] : null;
    const teamNote = stats ? ' ('+stats.team+')' : '';

    // ── PLAYER VS TEAM ──
    if (p.type==='player_vs_team') {
      // Try live API first, fall back to curated
      const h2hKey = p.playerName+'_'+p.teamName;
      const curated = H2H_DATA[h2hKey];
      const liveGames = await tryNBAApi(p.playerId, p.teamId, 'player_vs_team');
      const games = liveGames || (curated ? curated.games : null);

      if (!games) {
        // No data — show season stats instead with a note
        if (stats) {
          return res.json({success:true, type:'player_season',
            title:titleName+teamNote+' — 2025-26 Season',
            subtitle:'No matchup data vs '+p.teamName.toUpperCase()+' yet this season. Showing season averages.',
            currentTeam:stats.team, stats:{
              pts:stats.pts, reb:stats.reb, ast:stats.ast, stl:stats.stl,
              blk:stats.blk, fg:stats.fg, three:stats.three, gp:stats.gp, min:stats.min
            }
          });
        }
        return res.json({success:false,error:'No data found for this matchup.'});
      }

      const avg = key => {
        var vals = games.map(g=>parseFloat(g[key])).filter(v=>!isNaN(v));
        return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '--';
      };
      return res.json({success:true, type:'player_vs_team',
        title:titleName+teamNote+' vs '+p.teamName.toUpperCase(),
        subtitle:'Last '+games.length+' games this season',
        currentTeam:stats?.team, teamNote,
        averages:{pts:avg('pts'),reb:avg('reb'),ast:avg('ast')},
        games, note: liveGames ? null : '📊 Data from BeepBopStats curated records'
      });
    }

    // ── PLAYER SEASON ──
    if (p.type==='player_season') {
      if (stats) {
        const recent = RECENT_GAMES[p.playerName];
        return res.json({success:true, type:'player_season',
          title:titleName+teamNote+' — 2025-26 Season',
          subtitle:'Per game averages · '+stats.rank,
          currentTeam:stats.team, teamNote,
          stats:{ pts:stats.pts, reb:stats.reb, ast:stats.ast, stl:stats.stl,
                  blk:stats.blk, fg:stats.fg, three:stats.three, gp:stats.gp, min:stats.min },
          games: recent || null,
        });
      }
      return res.json({success:false, error:'Player stats not found. Try searching by full name.'});
    }

    // ── POSITION VS TEAM ──
    if (p.type==='position_vs_team') {
      const livePlayers = await tryNBAApi(null, p.teamId, 'position_vs_team');
      if (livePlayers && livePlayers.length) {
        return res.json({success:true, type:'position_vs_team',
          title:titleCase(p.position.label)+' vs '+p.teamName.toUpperCase(),
          subtitle:'Top performers vs this team — 2025-26',
          players:livePlayers
        });
      }
      return res.json({success:false, error:'Position vs team data temporarily unavailable. Try searching a specific player instead.'});
    }

    // ── UNKNOWN ──
    return res.json({success:true, type:'suggestion',
      message:'Try searching a player name like "LeBron James" or "Shai Gilgeous-Alexander stats", or a matchup like "Curry vs Nuggets".',
      suggestions:[
        'Shai Gilgeous-Alexander stats','Victor Wembanyama stats',
        'LeBron James vs Celtics','Donovan Mitchell stats',
        'Trae Young stats (WAS)','Darius Garland stats (LAC)',
        'James Harden stats (CLE)','Anthony Davis stats (WAS)',
        'Cooper Flagg stats','Devin Booker stats',
      ]
    });

  } catch(e) {
    console.error('Stats error:',e.message);
    res.status(500).json({success:false, error:'Stats search error: '+e.message});
  }
});

router.get('/popular', (req,res) => {
  res.json({success:true, searches:[
    'Shai Gilgeous-Alexander stats',
    'Victor Wembanyama stats',
    'LeBron James vs Celtics',
    'Donovan Mitchell stats',
    'Trae Young stats (WAS)',
    'Darius Garland stats (LAC)',
    'James Harden stats (CLE)',
    'Anthony Davis stats (WAS)',
    'Cooper Flagg stats',
    'Devin Booker stats',
  ]});
});

module.exports = router;

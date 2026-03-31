require('dotenv').config();
const axios = require('axios');
const { Game, Prop, Injury } = require('../models');

const mem = { games: [], props: [], injuries: [] };
function today() { return new Date().toISOString().split('T')[0]; }

function buildAltLines(mainLine, mainOdds) {
  const base = parseFloat(mainLine) || 0;
  const num  = parseInt((mainOdds || '-110').replace('+', '')) || -110;
  const isNeg = (mainOdds || '').startsWith('-');
  return [-2.0,-1.5,-1.0,-0.5,0.5,1.0,1.5,2.0].map(shift => {
    const alt = base + shift;
    const os  = Math.round(shift * 22);
    const ov  = isNeg ? num - os : num - os;
    const un  = -(Math.abs(ov) + 20);
    const fmt = n => n >= 0 ? '+' + n : String(n);
    return { line: parseFloat(alt.toFixed(1)), overOdds: fmt(Math.round(ov/5)*5), underOdds: fmt(Math.round(un/5)*5) };
  });
}

async function resetDailyProps() {
  try {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yds = yd.toISOString().split('T')[0];
    await Prop.deleteMany({ date: yds }).catch(()=>{});
    await Game.deleteMany({ date: yds }).catch(()=>{});
    await Injury.deleteMany({ date: yds }).catch(()=>{});
    console.log('✅ Cleared ' + yds + ' data');
  } catch(e) { console.error('❌ resetDailyProps:', e.message); }
}

async function fetchGames() {
  try {
    const d = today().replace(/-/g,'');
    const { data } = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+d, { timeout:10000 });
    const games = (data.events||[]).map(ev => {
      const comp=ev.competitions[0]; const home=comp.competitors.find(c=>c.homeAway==='home'); const away=comp.competitors.find(c=>c.homeAway==='away');
      const odds=comp.odds?.[0]||{}; const st=ev.status.type.name;
      return { gameId:ev.id, date:today(), status:st.includes('FINAL')?'final':st.includes('PROGRESS')?'live':'scheduled',
        homeTeam:home?.team?.abbreviation||'', awayTeam:away?.team?.abbreviation||'',
        homeRecord:home?.records?.[0]?.summary||'', awayRecord:away?.records?.[0]?.summary||'',
        homeScore:parseInt(home?.score)||0, awayScore:parseInt(away?.score)||0,
        quarter:ev.status.period?'Q'+ev.status.period:'', clock:ev.status.displayClock||'',
        tipoff:new Date(ev.date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})+' ET',
        arena:comp.venue?.fullName||'', spread:odds.details||'Pick', total:odds.overUnder?String(odds.overUnder):'N/A',
        homeWinProb:comp.predictor?.homeTeam?.gameProjection||50, awayWinProb:comp.predictor?.awayTeam?.gameProjection||50, updatedAt:new Date() };
    });
    for (const g of games) await Game.findOneAndUpdate({gameId:g.gameId},g,{upsert:true,new:true}).catch(()=>{});
    mem.games=games; console.log('✅ '+games.length+' games'); return games;
  } catch(e) { console.error('❌ fetchGames:',e.message); return mem.games; }
}

async function fetchProps() {
  if (!process.env.ODDS_API_KEY) { console.log('⚠️ No ODDS_API_KEY'); return mem.props; }
  try {
    const KEY=process.env.ODDS_API_KEY;
    const markets=['player_points','player_rebounds','player_assists','player_threes','player_blocks','player_steals','player_turnovers','player_points_rebounds_assists','player_points_rebounds','player_points_assists','player_rebounds_assists'].join(',');
    const url='https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey='+KEY+'&regions=us&markets='+markets+'&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars,pointsbet';
    const { data } = await axios.get(url, { timeout:20000 });
    const map={};
    for (const game of data) {
      for (const bm of game.bookmakers) {
        for (const mkt of bm.markets) {
          const st=mkt.key.replace('player_','');
          for (const out of mkt.outcomes) {
            const k=out.name+'|'+st+'|'+game.id;
            if (!map[k]) map[k]={playerName:out.name,gameId:game.id,statType:st,line:out.point,books:{},date:today()};
            map[k].books[bm.key]={line:out.point,price:out.price};
          }
        }
      }
    }
    const props=[];
    for (const [,p] of Object.entries(map)) {
      const dk=p.books['draftkings']; const fd=p.books['fanduel']; const mgm=p.books['betmgm']; const czr=p.books['caesars']; const pb=p.books['pointsbet'];
      if (!dk&&!fd) continue;
      const pr=dk||fd; const ml=pr.line; const mp=pr.price; const dko=mp>0?'+'+mp:String(mp);
      const prop={playerName:p.playerName,gameId:p.gameId,statType:p.statType,direction:'over',line:ml,
        dkLine:dk?.line||ml, dkOdds:dk?(dk.price>0?'+'+dk.price:String(dk.price)):dko,
        fdLine:fd?.line||ml, fdOdds:fd?(fd.price>0?'+'+fd.price:String(fd.price)):dko,
        mgmLine:mgm?.line||ml, mgmOdds:mgm?(mgm.price>0?'+'+mgm.price:String(mgm.price)):dko,
        czrLine:czr?.line||ml, czrOdds:czr?(czr.price>0?'+'+czr.price:String(czr.price)):dko,
        ppLine:ml, rebetLine:pb?.line||ml, rebetOdds:pb?(pb.price>0?'+'+pb.price:String(pb.price)):dko,
        altLines:buildAltLines(ml,dko), date:today(), updatedAt:new Date()};
      props.push(prop);
      await Prop.findOneAndUpdate({playerName:prop.playerName,statType:prop.statType,date:today()},prop,{upsert:true,new:true}).catch(()=>{});
    }
    mem.props=props; console.log('✅ '+props.length+' props'); return props;
  } catch(e) { console.error('❌ fetchProps:',e.message); return mem.props; }
}

async function fetchInjuries() {
  try {
    const { data } = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',{timeout:10000});
    const injuries=[];
    for (const team of (data.injuries||[])) {
      for (const item of (team.injuries||[])) {
        const s=(item.status||'').toLowerCase();
        const impact=s.includes('out')?'OUT — significant impact.':s.includes('quest')?'Questionable — check 90 min before tip.':'Day-to-day — confirm closer to tip.';
        const inj={playerId:item.athlete?.id||'',playerName:item.athlete?.displayName||'',team:team.team?.abbreviation||'',status:item.status||'Unknown',injury:item.type?.abbreviation||'Injury',bettingImpact:impact,date:today(),updatedAt:new Date()};
        injuries.push(inj);
        await Injury.findOneAndUpdate({playerName:inj.playerName,date:today()},inj,{upsert:true,new:true}).catch(()=>{});
      }
    }
    mem.injuries=injuries; console.log('✅ '+injuries.length+' injuries'); return injuries;
  } catch(e) { console.error('❌ fetchInjuries:',e.message); return mem.injuries; }
}

async function refreshAllData() { await Promise.allSettled([fetchGames(),fetchProps(),fetchInjuries()]); }
module.exports = { refreshAllData, fetchGames, fetchProps, fetchInjuries, buildAltLines, resetDailyProps, mem };

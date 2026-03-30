require('dotenv').config();
const axios = require('axios');
const { Game, Prop, Injury } = require('../models');

// In-memory fallback when no DB
const mem = { games: [], props: [], injuries: [] };

function today() { return new Date().toISOString().split('T')[0]; }

// ── Generate alternate lines around a main line ──
// Books offer alts at 0.5, 1.0, 1.5, 2.0 above and below
function buildAltLines(mainLine, mainOdds) {
  const base = parseFloat(mainLine) || 0;
  const baseOddsNum = parseInt((mainOdds || '-110').replace('+', '')) || -110;
  const isNeg = (mainOdds || '').startsWith('-');

  // Each step away from main line: odds shift ~20-25 pts
  const shifts = [-2.0, -1.5, -1.0, -0.5, 0.5, 1.0, 1.5, 2.0];
  return shifts.map(shift => {
    const altLine = base + shift;
    // Lower line = easier to hit = worse odds for Over; higher = harder = better odds
    const oddsShift = Math.round(shift * 22);
    let overOddsNum, underOddsNum;
    if (isNeg) {
      overOddsNum  = baseOddsNum - oddsShift;  // e.g. -110 - 44 = -154 for lower line
      underOddsNum = -(Math.abs(overOddsNum) - 30); // rough mirror
    } else {
      overOddsNum  = baseOddsNum - oddsShift;
      underOddsNum = -(Math.abs(overOddsNum) + 20);
    }
    const fmt = n => n >= 0 ? '+' + n : String(n);
    return {
      line:      parseFloat(altLine.toFixed(1)),
      overOdds:  fmt(Math.round(overOddsNum / 5) * 5),
      underOdds: fmt(Math.round(underOddsNum / 5) * 5),
    };
  });
}

// ── ESPN Games ──
async function fetchGames() {
  try {
    const d = today().replace(/-/g, '');
    const { data } = await axios.get(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d}`,
      { timeout: 10000 }
    );
    const games = (data.events || []).map(ev => {
      const comp  = ev.competitions[0];
      const home  = comp.competitors.find(c => c.homeAway === 'home');
      const away  = comp.competitors.find(c => c.homeAway === 'away');
      const odds  = comp.odds?.[0] || {};
      const st    = ev.status.type.name;
      return {
        gameId:      ev.id,
        date:        today(),
        status:      st.includes('FINAL') ? 'final' : st.includes('PROGRESS') ? 'live' : 'scheduled',
        homeTeam:    home?.team?.abbreviation || '',
        awayTeam:    away?.team?.abbreviation || '',
        homeRecord:  home?.records?.[0]?.summary || '',
        awayRecord:  away?.records?.[0]?.summary || '',
        homeScore:   parseInt(home?.score) || 0,
        awayScore:   parseInt(away?.score) || 0,
        quarter:     ev.status.period ? 'Q' + ev.status.period : '',
        clock:       ev.status.displayClock || '',
        tipoff:      new Date(ev.date).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:'America/New_York' }) + ' ET',
        arena:       comp.venue?.fullName || '',
        spread:      odds.details || 'Pick',
        total:       odds.overUnder ? String(odds.overUnder) : 'N/A',
        homeWinProb: comp.predictor?.homeTeam?.gameProjection || 50,
        awayWinProb: comp.predictor?.awayTeam?.gameProjection || 50,
        updatedAt:   new Date(),
      };
    });
    for (const g of games) {
      await Game.findOneAndUpdate({ gameId: g.gameId }, g, { upsert: true, new: true }).catch(() => {});
    }
    mem.games = games;
    console.log(`✅ ${games.length} games fetched`);
    return games;
  } catch (e) {
    console.error('❌ fetchGames:', e.message);
    return mem.games;
  }
}

// ── Odds API — props + alt lines ──
async function fetchProps() {
  if (!process.env.ODDS_API_KEY) {
    console.log('⚠️  No ODDS_API_KEY — using seeded props');
    return mem.props;
  }
  try {
    const KEY  = process.env.ODDS_API_KEY;
    const BASE = 'https://api.the-odds-api.com/v4';
    // Fetch standard lines
    const markets = 'player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals,player_turnovers,player_points_rebounds_assists,player_points_rebounds,player_points_assists,player_first_basket';
    const url = `${BASE}/sports/basketball_nba/odds/?apiKey=${KEY}&regions=us&markets=${markets}&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars,pointsbet`;
    const { data } = await axios.get(url, { timeout: 15000 });

    const props = [];
    for (const game of data) {
      // Collect lines from all bookmakers
      const byPlayer = {};
      for (const bm of game.bookmakers) {
        for (const mkt of bm.markets) {
          const statType = mkt.key.replace('player_', '');
          for (const outcome of mkt.outcomes) {
            const key = outcome.name + '|' + statType;
            if (!byPlayer[key]) byPlayer[key] = { playerName: outcome.name, statType, gameId: game.id, books: {} };
            byPlayer[key].books[bm.key] = {
              line: outcome.point, price: outcome.price,
              direction: outcome.name.toLowerCase().includes('over') ? 'over' : 'under'
            };
          }
        }
      }
      // Build prop objects with all books + alt lines
      for (const [, p] of Object.entries(byPlayer)) {
        const dk  = p.books['draftkings'];
        const fd  = p.books['fanduel'];
        const mgm = p.books['betmgm'];
        const czr = p.books['caesars'];
        if (!dk) continue;
        const mainLine = dk.line;
        const dkOdds   = dk.price > 0 ? '+' + dk.price : String(dk.price);
        const prop = {
          playerName:   p.playerName,
          gameId:       p.gameId,
          statType:     p.statType,
          direction:    'over',
          line:         mainLine,
          dkLine:       mainLine,
          dkOdds:       dkOdds,
          ppLine:       mainLine,
          fdLine:       fd?.line || mainLine,
          fdOdds:       fd ? (fd.price > 0 ? '+' + fd.price : String(fd.price)) : dkOdds,
          mgmLine:      mgm?.line || mainLine,
          mgmOdds:      mgm ? (mgm.price > 0 ? '+' + mgm.price : String(mgm.price)) : dkOdds,
          czrLine:      czr?.line || mainLine,
          czrOdds:      czr ? (czr.price > 0 ? '+' + czr.price : String(czr.price)) : dkOdds,
          rebetLine:    mainLine,
          rebetOdds:    dkOdds,
          altLines:     buildAltLines(mainLine, dkOdds),
          date:         today(),
          updatedAt:    new Date(),
        };
        props.push(prop);
        await Prop.findOneAndUpdate(
          { playerName: prop.playerName, statType: prop.statType, date: today() },
          prop, { upsert: true, new: true }
        ).catch(() => {});
      }
    }
    mem.props = props;
    console.log(`✅ ${props.length} props fetched`);
    return props;
  } catch (e) {
    console.error('❌ fetchProps:', e.message);
    return mem.props;
  }
}

// ── ESPN Injuries ──
async function fetchInjuries() {
  try {
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',
      { timeout: 10000 }
    );
    const injuries = [];
    for (const team of (data.injuries || [])) {
      for (const item of (team.injuries || [])) {
        const s = (item.status || '').toLowerCase();
        let impact = 'Monitor situation.';
        if (s.includes('out')) impact = 'OUT — significant usage/spread impact.';
        else if (s.includes('quest')) impact = 'Questionable — wait for pregame report ~90 min before tip.';
        else if (s.includes('day')) impact = 'Day-to-day — check closer to tip-off.';
        const inj = {
          playerId:    item.athlete?.id || '',
          playerName:  item.athlete?.displayName || '',
          team:        team.team?.abbreviation || '',
          status:      item.status || 'Unknown',
          injury:      item.type?.abbreviation || 'Injury',
          returnDate:  item.date || '',
          bettingImpact: impact,
          date:        today(),
          updatedAt:   new Date(),
        };
        injuries.push(inj);
        await Injury.findOneAndUpdate(
          { playerName: inj.playerName, date: today() },
          inj, { upsert: true, new: true }
        ).catch(() => {});
      }
    }
    mem.injuries = injuries;
    console.log(`✅ ${injuries.length} injuries fetched`);
    return injuries;
  } catch (e) {
    console.error('❌ fetchInjuries:', e.message);
    return mem.injuries;
  }
}

async function refreshAllData() {
  await Promise.allSettled([fetchGames(), fetchProps(), fetchInjuries()]);
}

module.exports = { refreshAllData, fetchGames, fetchProps, fetchInjuries, buildAltLines, mem };

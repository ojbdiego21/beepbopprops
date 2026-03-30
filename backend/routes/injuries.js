const express  = require('express');
const axios    = require('axios');
const { Injury, H2H } = require('../models');
const { mem, fetchH2H: _fh } = require('../jobs/dataRefresh');

function today() { return new Date().toISOString().split('T')[0]; }

// ── INJURIES ──────────────────────────────────────
const injRouter = express.Router();

injRouter.get('/', async (req, res) => {
  try {
    const date = req.query.date || today();
    let injuries = await Injury.find({ date }).lean().catch(() => []);
    if (!injuries.length) injuries = mem.injuries;
    res.json({ success: true, count: injuries.length, injuries });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── H2H ──────────────────────────────────────────
const h2hRouter = express.Router();

const TEAM_IDS = {
  LAL:'13',BOS:'2',GSW:'9',MIA:'14',PHI:'20',ATL:'1',BKN:'17',CHA:'30',
  CHI:'4',CLE:'5',DAL:'6',DEN:'7',DET:'8',HOU:'10',IND:'11',LAC:'12',
  MEM:'29',MIL:'15',MIN:'16',NOP:'3',NYK:'18',OKC:'25',ORL:'19',PHX:'21',
  POR:'22',SAC:'23',SAS:'24',TOR:'28',UTA:'26',WAS:'27'
};

h2hRouter.get('/:t1/:t2', async (req, res) => {
  try {
    const t1 = req.params.t1.toUpperCase();
    const t2 = req.params.t2.toUpperCase();
    const key = [t1,t2].sort().join('_vs_');

    // Check DB cache (24h)
    let cached = await H2H.findOne({ cacheKey: key }).lean().catch(() => null);
    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < 86400000) {
      return res.json({ success: true, h2h: cached });
    }

    // Fetch from ESPN
    const id1 = TEAM_IDS[t1];
    if (!id1) return res.status(400).json({ success: false, error: 'Unknown team: ' + t1 });

    const { data } = await axios.get(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id1}/schedule`,
      { timeout: 10000 }
    );

    const matchups = (data.events || [])
      .filter(e => (e.competitions?.[0]?.competitors || []).some(c => c.team?.abbreviation === t2))
      .slice(-5)
      .map(e => {
        const comp   = e.competitions[0];
        const home   = comp.competitors.find(c => c.homeAway === 'home');
        const away   = comp.competitors.find(c => c.homeAway === 'away');
        const winner = home?.winner ? home.team.abbreviation : away?.team?.abbreviation;
        return {
          date:     (e.date || '').split('T')[0],
          winner:   winner || '?',
          score:    (away?.score || 0) + '-' + (home?.score || 0),
          location: home?.team?.abbreviation === t1 ? 'Home' : 'Away',
        };
      });

    const t1wins = matchups.filter(m => m.winner === t1).length;
    const h2h = {
      cacheKey: key, team1: t1, team2: t2,
      last5Games: matchups, team1Wins: t1wins, team2Wins: matchups.length - t1wins,
      updatedAt: new Date()
    };
    await H2H.findOneAndUpdate({ cacheKey: key }, h2h, { upsert: true, new: true }).catch(() => {});
    res.json({ success: true, h2h });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── AI ANALYSIS ──────────────────────────────────
const analysisRouter = express.Router();

analysisRouter.post('/slip', async (req, res) => {
  try {
    const { picks } = req.body || {};
    if (!picks?.length) return res.status(400).json({ success: false, error: 'No picks' });

    const combined = picks.reduce((a, p) => a * (p.confidence / 100), 1);
    const pct = Math.round(combined * 100);

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ success: true, probability: pct, analysis: 'Add your ANTHROPIC_API_KEY in .env to unlock AI slip analysis.' });
    }

    const list = picks.map(p => `${p.playerName} — ${p.statType} ${p.direction} ${p.line} (${p.confidence}% conf)`).join('\n');
    const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001', max_tokens: 350,
      messages: [{ role: 'user', content: `Analyze this NBA parlay slip in 3-4 sentences. Cover: combined probability, correlation risks, strongest/weakest legs, and a one-line verdict.\n\n${list}` }]
    }, {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    });

    res.json({ success: true, probability: pct, analysis: data.content?.[0]?.text || '' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = { injuriesRouter: injRouter, h2hRouter, analysisRouter };

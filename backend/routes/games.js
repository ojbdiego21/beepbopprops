const express = require('express');
const router  = express.Router();
const { Game } = require('../models');
const { mem }  = require('../jobs/dataRefresh');

function today() { return new Date().toISOString().split('T')[0]; }

// Convert spread to win probability — each point = ~2.8% edge
function spreadToWinProb(spread, homeTeam) {
  if (!spread || spread === 'Pick' || spread === 'N/A') return { home: 50, away: 50 };
  var match = String(spread).match(/([+-]?\d+\.?\d*)/);
  if (!match) return { home: 50, away: 50 };
  var num  = parseFloat(match[1]);
  var edge = Math.abs(num) * 2.8;
  var favP = Math.min(50 + edge, 92);
  var dogP = 100 - favP;
  // Negative number = home team favored
  var homeFav = num < 0;
  return homeFav
    ? { home: Math.round(favP), away: Math.round(dogP) }
    : { home: Math.round(dogP), away: Math.round(favP) };
}

// Real win probabilities for today's games — Mar 30 2026
var KNOWN = {
  'MIA_PHI':{ home:44, away:56 },
  'ATL_BOS':{ home:54, away:46 },
  'MEM_PHX':{ home:14, away:86 },
  'SAS_CHI':{ home:94, away:6  },
  'DAL_MIN':{ home:28, away:72 },
  'UTA_CLE':{ home:7,  away:93 },
  'OKC_DET':{ home:85, away:15 },
  'LAL_WAS':{ home:92, away:8  },
};

router.get('/', async (req, res) => {
  try {
    const date = req.query.date || today();
    let games  = await Game.find({ date }).sort({ tipoff:1 }).lean().catch(()=>[]);
    if (!games.length) games = mem.games;

    games = games.map(g => {
      var k1 = g.homeTeam+'_'+g.awayTeam;
      var k2 = g.awayTeam+'_'+g.homeTeam;
      var kn = KNOWN[k1] || (KNOWN[k2] ? { home: KNOWN[k2].away, away: KNOWN[k2].home } : null);

      var hp, ap;
      if (kn) {
        hp = kn.home; ap = kn.away;
      } else if (g.homeWinProb && g.homeWinProb !== 50) {
        hp = Math.round(g.homeWinProb); ap = 100 - hp;
      } else {
        var p = spreadToWinProb(g.spread, g.homeTeam);
        hp = p.home; ap = p.away;
      }

      var gap  = Math.abs(hp - 50);
      var tier = gap>=35?'elite':gap>=20?'strong':gap>=8?'neutral':'fade';
      var fav  = hp>50 ? g.homeTeam : g.awayTeam;
      var dog  = hp>50 ? g.awayTeam : g.homeTeam;
      var favP = Math.max(hp, ap);

      var picks = favP>=85
        ? [fav+' Win', fav+' -ATS']
        : favP>=70
        ? [fav+' Win', 'Check Spread']
        : ['Close Game', 'Value on '+dog];

      return { ...g, homeWinProb:hp, awayWinProb:ap, tier, topPicks:picks };
    });

    res.json({ success:true, date, count:games.length, games });
  } catch(e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

module.exports = router;

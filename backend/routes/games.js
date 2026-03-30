const express = require('express');
const router  = express.Router();
const { Game } = require('../models');
const { mem }  = require('../jobs/dataRefresh');

function today() { return new Date().toISOString().split('T')[0]; }

router.get('/', async (req, res) => {
  try {
    const date  = req.query.date || today();
    let games   = await Game.find({ date }).sort({ tipoff: 1 }).lean().catch(() => []);
    if (!games.length) games = mem.games;
    // Tier by win prob
    games = games.map(g => {
      const gap = Math.abs((g.homeWinProb || 50) - 50);
      const tier = gap >= 35 ? 'elite' : gap >= 20 ? 'strong' : gap >= 8 ? 'neutral' : 'fade';
      return { ...g, tier };
    });
    res.json({ success: true, date, count: games.length, games });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

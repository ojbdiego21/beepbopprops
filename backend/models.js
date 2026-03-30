const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: String, date: String, status: String,
  homeTeam: String, awayTeam: String, homeRecord: String, awayRecord: String,
  homeScore: Number, awayScore: Number, quarter: String, clock: String,
  tipoff: String, arena: String, spread: String, total: String,
  homeWinProb: Number, awayWinProb: Number, tier: String, topPicks: [String],
  updatedAt: { type: Date, default: Date.now }
});

const altLineSchema = new mongoose.Schema({
  line: Number, overOdds: String, underOdds: String
});

const propSchema = new mongoose.Schema({
  playerId: String, playerName: String, team: String, opponent: String,
  gameId: String, position: String, statType: String,
  line: Number, direction: String, confidence: Number, tier: String,
  // Primary book lines
  dkLine: Number, dkOdds: String,
  ppLine: Number,
  rebetLine: Number, rebetOdds: String,
  fdLine: Number, fdOdds: String,
  mgmLine: Number, mgmOdds: String,
  czrLine: Number, czrOdds: String,
  // Alternate lines array
  altLines: [altLineSchema],
  hitRateLast10: String, reasoning: String, nbaPhotoId: String,
  date: String, updatedAt: { type: Date, default: Date.now }
});

const injurySchema = new mongoose.Schema({
  playerId: String, playerName: String, team: String,
  status: String, injury: String, returnDate: String, bettingImpact: String,
  date: String, updatedAt: { type: Date, default: Date.now }
});

const h2hSchema = new mongoose.Schema({
  cacheKey: String, team1: String, team2: String,
  last5Games: [{ date: String, winner: String, score: String, location: String }],
  team1Wins: Number, team2Wins: Number, avgTotal: Number,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  Game:   mongoose.model('Game',   gameSchema),
  Prop:   mongoose.model('Prop',   propSchema),
  Injury: mongoose.model('Injury', injurySchema),
  H2H:    mongoose.model('H2H',    h2hSchema),
};

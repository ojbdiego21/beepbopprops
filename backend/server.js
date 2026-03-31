require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const path     = require('path');
const cron     = require('node-cron');

const gamesRouter                                   = require('./routes/games');
const propsRouter                                   = require('./routes/props');
const { injuriesRouter, h2hRouter, analysisRouter } = require('./routes/injuries');
const statsRouter                                   = require('./routes/stats');
const { refreshAllData, resetDailyProps }           = require('./jobs/dataRefresh');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/api/games',    gamesRouter);
app.use('/api/props',    propsRouter);
app.use('/api/injuries', injuriesRouter);
app.use('/api/h2h',      h2hRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/stats',    statsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));

async function start() {
  try {
    const uri = process.env.MONGODB_URI || '';
    if (uri && !uri.includes('YOUR_USERNAME')) {
      await mongoose.connect(uri);
      console.log('✅ MongoDB connected');
    } else {
      console.log('⚠️  No MongoDB — in-memory mode');
    }
    app.listen(PORT, () => console.log('🕷️  BeepBopProps$ → http://localhost:' + PORT));

    // Reset yesterday's data at midnight ET
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Midnight reset...');
      await resetDailyProps();
      await refreshAllData();
    }, { timezone: 'America/New_York' });

    // Refresh every 15 min during game hours
    cron.schedule('*/15 12-23 * * *', () => {
      console.log('🔄 15-min refresh...');
      refreshAllData();
    }, { timezone: 'America/New_York' });

    await refreshAllData();
    console.log('✅ Ready!');
  } catch(e) {
    console.error('❌ Startup error:', e.message);
    process.exit(1);
  }
}
start();

// Force clear props cache — visit /api/clear-props to reset
app.get('/api/clear-props', async (req, res) => {
  try {
    const { Prop } = require('./models');
    await Prop.deleteMany({}).catch(()=>{});
    const { mem } = require('./jobs/dataRefresh');
    mem.props = [];
    res.json({ success: true, message: 'Props cleared! Refresh your board now.' });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

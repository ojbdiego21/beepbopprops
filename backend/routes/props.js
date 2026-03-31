const express = require('express');
const router  = express.Router();
const { Prop, Injury } = require('../models');
const { mem, buildAltLines } = require('../jobs/dataRefresh');

function today() { return new Date().toISOString().split('T')[0]; }

const PHOTO_IDS = {
  'shai gilgeous-alexander':'1628983','lebron james':'2544',
  'donovan mitchell':'1628378','tyrese maxey':'1630178',
  'victor wembanyama':'1641705','devin booker':'1626164',
  'klay thompson':'202691','austin reaves':'1631244',
  'tyler herro':'1629639','anthony edwards':'1630162',
  'jayson tatum':'1628369','jaylen brown':'1627759',
  'nikola jokic':'203999','stephen curry':'201939',
  'joel embiid':'203954','giannis antetokounmpo':'203507',
  'luka doncic':'1629029','bam adebayo':'1628389',
  'cooper flagg':'1642366','kyle filipowski':'1642283',
  'chet holmgren':'1631096','jalen duren':'1631105',
  'trae young':'1629027','darius garland':'1629636',
  'james harden':'201935','de\'aaron fox':'1628368',
  'alperen sengun':'1630578','evan mobley':'1630596',
  'jalen brunson':'1628386','mikal bridges':'1628969',
  'norman powell':'1626181','matas buzelis':'1642267',
  'josh giddey':'1630581','jalen johnson':'1630552',
  'dyson daniels':'1631107','amen thompson':'1641734',
  'jaren jackson jr':'1628386','jonathan kuminga':'1630557',
  'cade cunningham':'1630595','anthony davis':'203076',
  'kawhi leonard':'202695','bennedict mathurin':'1631211',
  'rob dillingham':'1642363','jamal murray':'1627750',
};

function photoId(name) { return PHOTO_IDS[(name||'').toLowerCase()] || '0'; }

function score(prop, injuries) {
  let s = 52;
  const odds = parseInt((prop.dkOdds||'-110').replace('+',''))|| -110;
  if ((prop.dkOdds||'').startsWith('-')) {
    const o = Math.abs(odds);
    if (o>=160)s+=18; else if(o>=135)s+=13; else if(o>=115)s+=8; else if(o>=105)s+=4;
  } else {
    if(odds>=160)s-=12; else if(odds>=130)s-=7; else if(odds>=110)s-=3;
  }
  if (injuries.length > 4) s += 4;
  return Math.max(32, Math.min(93, s));
}
function tier(c){ return c>=80?'elite':c>=65?'strong':c>=50?'neutral':'fade'; }

// ── SEEDED PROPS — March 31 2026 — fully updated rosters ──
function seededProps() {
  const d = today();
  const raw = [
    // ── ELITE ──
    { n:'Shai Gilgeous-Alexander', t:'OKC', opp:'DET', pos:'PG', st:'points',   l:30.5, dir:'over',  dk:30.5,dko:'-112',pp:30.5,fd:30.5,fdo:'-112',mgm:31,  mgmo:'-118',czr:30.5,czro:'-112',reb:30.5,rebo:'-110',conf:87,hr:'8/10',pid:'1628983',reason:'SGA vs DET — 84.8% win prob. MVP race front-runner. L10: 32.1 PPG avg.' },
    { n:'Victor Wembanyama',       t:'SAS', opp:'CHI', pos:'C',  st:'blocks',   l:3.5,  dir:'over',  dk:3.5, dko:'+116',pp:3.5, fd:3.5, fdo:'+112',mgm:3,  mgmo:'-130',czr:3.5, czro:'+110',reb:3.5, rebo:'+108',conf:85,hr:'6/10',pid:'1641705',reason:'Wemby vs CHI — leads NBA in blocks. SAS 93.9% win prob. +EV price. MVP candidate.' },
    { n:'Donovan Mitchell',        t:'CLE', opp:'UTA', pos:'SG', st:'points',   l:26.5, dir:'over',  dk:26.5,dko:'-111',pp:27.5,fd:27,  fdo:'-115',mgm:26.5,mgmo:'-110',czr:27, czro:'-112',reb:26.5,rebo:'-108',conf:84,hr:'7/10',pid:'1628378',reason:'Mitchell vs UTA — CLE 93% win prob. UTA 30th defense. 3 UTA centers OUT.' },
    { n:'Tyrese Maxey',            t:'PHI', opp:'MIA', pos:'PG', st:'points',   l:26.5, dir:'over',  dk:26.5,dko:'-107',pp:26.5,fd:26.5,fdo:'-108',mgm:27, mgmo:'-115',czr:26.5,czro:'-107',reb:26.5,rebo:'-105',conf:82,hr:'7/10',pid:'1630178',reason:'Maxey leads PHI — 28.9 PPG avg (4th NBA). PHI 56% win prob vs MIA.' },
    { n:'Devin Booker',            t:'PHX', opp:'MEM', pos:'SG', st:'points',   l:25.5, dir:'over',  dk:25.5,dko:'-105',pp:25.5,fd:25.5,fdo:'-108',mgm:26, mgmo:'-112',czr:25.5,czro:'-105',reb:25.5,rebo:'-105',conf:83,hr:'8/10',pid:'1626164',reason:'Booker vs MEM — PHX 85.8% win prob. MEM 25th defense. Low juice.' },
    { n:'Klay Thompson',           t:'DAL', opp:'MIN', pos:'SG', st:'threes',   l:1.5,  dir:'over',  dk:1.5, dko:'+141',pp:1.5, fd:1.5, fdo:'+138',mgm:1.5,mgmo:'+135',czr:1.5, czro:'+140',reb:1.5, rebo:'+135',conf:80,hr:'7/10',pid:'202691',  reason:'Klay vs MIN — Kyrie OUT (season). Luka SUSPENDED tonight. Direct usage spike. 3.0 3PM/gm avg.' },
    // ── STRONG ──
    { n:'LeBron James',            t:'LAL', opp:'WAS', pos:'SF', st:'points',   l:26.5, dir:'over',  dk:26.5,dko:'-112',pp:26.5,fd:26.5,fdo:'-115',mgm:27, mgmo:'-118',czr:26.5,czro:'-112',reb:26.5,rebo:'-110',conf:74,hr:'7/10',pid:'2544',    reason:'LeBron vs WAS — Luka SUSPENDED so LeBron is the primary star. WAS 29th defense. LAL 92% win.' },
    { n:'Austin Reaves',           t:'LAL', opp:'WAS', pos:'SG', st:'points',   l:22.5, dir:'over',  dk:22.5,dko:'-108',pp:22.5,fd:22.5,fdo:'-110',mgm:23, mgmo:'-115',czr:22.5,czro:'-107',reb:22.5,rebo:'-105',conf:72,hr:'6/8', pid:'1631244', reason:'Reaves leads LAL scoring at 23.6 PPG. Luka suspended — more usage tonight.' },
    { n:'Tyler Herro',             t:'MIA', opp:'PHI', pos:'SG', st:'threes',   l:2.5,  dir:'over',  dk:2.5, dko:'-108',pp:2.5, fd:2.5, fdo:'-108',mgm:2.5,mgmo:'-110',czr:2.5, czro:'-107',reb:2.5, rebo:'-105',conf:68,hr:'6/10',pid:'1629639', reason:'Herro schemed from perimeter. MIA 2nd in scoring (120.3 PPG).' },
    { n:'Bam Adebayo',             t:'MIA', opp:'PHI', pos:'C',  st:'points',   l:19.5, dir:'over',  dk:19.5,dko:'-112',pp:20.5,fd:20,  fdo:'-115',mgm:19.5,mgmo:'-110',czr:20, czro:'-112',reb:20,  rebo:'-110',conf:67,hr:'6/10',pid:'1628389', reason:'Bam leads MIA at 20.1 PPG. PHI allows pts to interior bigs.' },
    { n:'Kyle Filipowski',         t:'UTA', opp:'CLE', pos:'C',  st:'rebounds', l:7.5,  dir:'over',  dk:7.5, dko:'+106',pp:7.5, fd:7.5, fdo:'+102',mgm:7.5,mgmo:'+100',czr:7,  czro:'-115',reb:7.5, rebo:'+100',conf:67,hr:'5/7', pid:'1642283', reason:'Filipowski starts with Markkanen+Kessler+Nurkic all OUT. Max boards.' },
    { n:'Jayson Tatum',            t:'BOS', opp:'ATL', pos:'SF', st:'points',   l:25.5, dir:'over',  dk:25.5,dko:'-110',pp:26.5,fd:26,  fdo:'-112',mgm:25.5,mgmo:'-108',czr:25.5,czro:'-110',reb:25.5,rebo:'-108',conf:66,hr:'6/10',pid:'1628369', reason:'Tatum leads BOS. ATL 55% home edge but BOS still has Tatum carrying offense.' },
    { n:'Jaylen Brown',            t:'BOS', opp:'ATL', pos:'SG', st:'points',   l:22.5, dir:'over',  dk:22.5,dko:'-110',pp:22.5,fd:22.5,fdo:'-112',mgm:23, mgmo:'-118',czr:22.5,czro:'-108',reb:22.5,rebo:'-108',conf:66,hr:'6/10',pid:'1627759', reason:'Brown even money on scoring line. ATL 22nd in pts allowed.' },
    { n:'Jalen Johnson',           t:'ATL', opp:'BOS', pos:'PF', st:'rebounds', l:8.5,  dir:'over',  dk:8.5, dko:'+102',pp:8.5, fd:8.5, fdo:'+100',mgm:8.5,mgmo:'+100',czr:9,  czro:'-112',reb:8.5, rebo:'+100',conf:66,hr:'5/8', pid:'1630552', reason:'Johnson boards in uptempo ATL vs BOS. +EV price at +102.' },
    { n:'Norman Powell',           t:'MIA', opp:'PHI', pos:'SG', st:'threes',   l:2.5,  dir:'over',  dk:2.5, dko:'-110',pp:2.5, fd:2.5, fdo:'-108',mgm:2.5,mgmo:'-112',czr:2.5, czro:'-110',reb:2.5, rebo:'-108',conf:65,hr:'6/10',pid:'1626181', reason:'Powell leads MIA in 3PM at 2.7/gm. MIA 2nd in scoring. Now on MIA post-trade.' },
    { n:'Shai Gilgeous-Alexander', t:'OKC', opp:'DET', pos:'PG', st:'assists',  l:5.5,  dir:'over',  dk:5.5, dko:'-115',pp:5.5, fd:5.5, fdo:'-115',mgm:5.5,mgmo:'-112',czr:6,  czro:'-125',reb:5.5, rebo:'-112',conf:72,hr:'6/10',pid:'1628983', reason:'SGA dishes 6.1 APG. DET bottom-5 in forcing turnovers.' },
    { n:'Victor Wembanyama',       t:'SAS', opp:'CHI', pos:'C',  st:'points',   l:23.5, dir:'over',  dk:23.5,dko:'-115',pp:24.5,fd:24,  fdo:'-118',mgm:23.5,mgmo:'-112',czr:23.5,czro:'-112',reb:23.5,rebo:'-112',conf:72,hr:'7/10',pid:'1641705', reason:'Wemby 24.2 PPG. SAS 93.9% win prob vs CHI. Dominant matchup.' },
    { n:'Victor Wembanyama',       t:'SAS', opp:'CHI', pos:'C',  st:'rebounds', l:9.5,  dir:'over',  dk:9.5, dko:'-112',pp:9.5, fd:9.5, fdo:'-115',mgm:9.5,mgmo:'-110',czr:10, czro:'-125',reb:9.5, rebo:'-110',conf:70,hr:'6/10',pid:'1641705', reason:'Wemby 10.2 RPG. CHI small ball gives up interior boards.' },
    { n:'Matas Buzelis',           t:'CHI', opp:'SAS', pos:'PF', st:'points',   l:15.5, dir:'over',  dk:15.5,dko:'-110',pp:15.5,fd:16,  fdo:'-118',mgm:15.5,mgmo:'-108',czr:15.5,czro:'-110',reb:16,  rebo:'-108',conf:58,hr:'5/10',pid:'1642267', reason:'Buzelis leads CHI at 16.4 PPG. Line may be low.' },
    { n:'Jalen Duren',             t:'DET', opp:'OKC', pos:'C',  st:'rebounds', l:10.5, dir:'under', dk:10.5,dko:'-110',pp:10.5,fd:10.5,fdo:'-112',mgm:10.5,mgmo:'-112',czr:10, czro:'+108',reb:10.5,rebo:'-108',conf:42,hr:'4/10',pid:'1631105', reason:'FADE OVER — Chet Holmgren limits paint boards. Duren 11.1 RPG but tough matchup.' },
    { n:'Chet Holmgren',           t:'OKC', opp:'DET', pos:'C',  st:'blocks',   l:1.5,  dir:'over',  dk:1.5, dko:'-125',pp:1.5, fd:1.5, fdo:'-125',mgm:1.5,mgmo:'-128',czr:1.5, czro:'-125',reb:1.5, rebo:'-120',conf:68,hr:'6/10',pid:'1631096', reason:'Holmgren 2.3 BPG. DET drives paint frequently.' },
    { n:'Alperen Sengun',          t:'HOU', opp:'NOP', pos:'C',  st:'points',   l:20.5, dir:'over',  dk:20.5,dko:'-112',pp:20.5,fd:21,  fdo:'-118',mgm:20.5,mgmo:'-110',czr:20.5,czro:'-110',reb:20.5,rebo:'-108',conf:66,hr:'6/10',pid:'1630578', reason:'Sengun emerging HOU star. 21.2 PPG L10. Kevin Durant alongside him.' },
    { n:'Amen Thompson',           t:'HOU', opp:'NOP', pos:'SF', st:'rebounds', l:7.5,  dir:'over',  dk:7.5, dko:'-115',pp:7.5, fd:7.5, fdo:'-115',mgm:7.5,mgmo:'-112',czr:8,  czro:'-125',reb:7.5, rebo:'-112',conf:65,hr:'6/10',pid:'1641734', reason:'Thompson 8.1 RPG. NOP 26th in opp REB allowed.' },
    { n:'Evan Mobley',             t:'CLE', opp:'UTA', pos:'PF', st:'rebounds', l:9.5,  dir:'over',  dk:9.5, dko:'-115',pp:9.5, fd:9.5, fdo:'-115',mgm:9.5,mgmo:'-112',czr:10, czro:'-125',reb:9.5, rebo:'-112',conf:70,hr:'6/10',pid:'1630596', reason:'Mobley vs UTA with zero interior D. 9.8 RPG season avg.' },
    { n:'Jalen Brunson',           t:'NYK', opp:'HOU', pos:'PG', st:'points',   l:26.5, dir:'over',  dk:26.5,dko:'-112',pp:26.5,fd:27,  fdo:'-118',mgm:26.5,mgmo:'-110',czr:26.5,czro:'-110',reb:26.5,rebo:'-108',conf:66,hr:'6/10',pid:'1628386', reason:'Brunson 26.8 PPG. HOU allows pts to opposing PGs.' },
    { n:'Mikal Bridges',           t:'NYK', opp:'HOU', pos:'SF', st:'points',   l:16.5, dir:'over',  dk:16.5,dko:'-112',pp:16.5,fd:17,  fdo:'-118',mgm:16.5,mgmo:'-110',czr:16.5,czro:'-110',reb:16.5,rebo:'-108',conf:62,hr:'5/10',pid:'1628969', reason:'Bridges 17.1 PPG. HOU focuses D on Brunson leaving Bridges open.' },
    { n:'De\'Aaron Fox',           t:'SAC', opp:'BKN', pos:'PG', st:'points',   l:24.5, dir:'over',  dk:24.5,dko:'-112',pp:24.5,fd:25,  fdo:'-118',mgm:24.5,mgmo:'-110',czr:24.5,czro:'-110',reb:24.5,rebo:'-108',conf:64,hr:'6/10',pid:'1628368', reason:'Fox 25.1 PPG. BKN 27th in pts allowed.' },
    { n:'Dyson Daniels',           t:'ATL', opp:'BOS', pos:'SG', st:'steals',   l:1.5,  dir:'over',  dk:1.5, dko:'+105',pp:1.5, fd:1.5, fdo:'+102',mgm:1.5,mgmo:'+100',czr:1.5, czro:'+105',reb:1.5, rebo:'+100',conf:65,hr:'6/10',pid:'1631107', reason:'Daniels leads NBA in steals. +EV price. BOS high turnover rate.' },
    { n:'Trae Young',              t:'WAS', opp:'LAL', pos:'PG', st:'assists',  l:6.5,  dir:'over',  dk:6.5, dko:'-115',pp:6.5, fd:6.5, fdo:'-115',mgm:6.5,mgmo:'-112',czr:7,  czro:'-125',reb:6.5, rebo:'-112',conf:60,hr:'5/10',pid:'1629027', reason:'Trae now on WAS — 6.2 APG since joining. Watch quad contusion status.' },
    { n:'Darius Garland',          t:'LAC', opp:'POR', pos:'PG', st:'points',   l:19.5, dir:'over',  dk:19.5,dko:'-112',pp:19.5,fd:20,  fdo:'-118',mgm:19.5,mgmo:'-110',czr:19.5,czro:'-110',reb:19.5,rebo:'-108',conf:65,hr:'6/10',pid:'1629636', reason:'Garland now on LAC — 21.1 PPG with Clippers. Avg 50.6% FG with LAC.' },
    { n:'James Harden',            t:'CLE', opp:'UTA', pos:'PG', st:'assists',  l:7.5,  dir:'over',  dk:7.5, dko:'-115',pp:7.5, fd:7.5, fdo:'-115',mgm:7.5,mgmo:'-112',czr:8,  czro:'-125',reb:7.5, rebo:'-112',conf:68,hr:'6/10',pid:'201935',   reason:'Harden now on CLE — 7.5 APG with Cavs. CLE 93% win vs UTA.' },
    { n:'Cooper Flagg',            t:'DAL', opp:'MIN', pos:'PF', st:'points',   l:19.5, dir:'over',  dk:19.5,dko:'-110',pp:19.5,fd:19.5,fdo:'-112',mgm:20, mgmo:'-118',czr:19.5,czro:'-110',reb:20,  rebo:'-110',conf:55,hr:'5/10',pid:'1642366', reason:'Flagg 20.4 PPG. Klay Thompson primary ball handler with Kyrie OUT + Luka SUSPENDED.' },
    { n:'Jonathan Kuminga',        t:'ATL', opp:'BOS', pos:'SF', st:'points',   l:17.5, dir:'over',  dk:17.5,dko:'-110',pp:17.5,fd:18,  fdo:'-115',mgm:17.5,mgmo:'-110',czr:17.5,czro:'-108',reb:17.5,rebo:'-108',conf:63,hr:'5/10',pid:'1630557', reason:'Kuminga now on ATL — new role as starter alongside Jalen Johnson.' },
    { n:'Cade Cunningham',         t:'DET', opp:'OKC', pos:'PG', st:'points',   l:22.5, dir:'under', dk:22.5,dko:'-112',pp:22.5,fd:22.5,fdo:'-110',mgm:22.5,mgmo:'-112',czr:22, czro:'+105',reb:22.5,rebo:'-110',conf:38,hr:'4/10',pid:'1630595', reason:'FADE OVER — Cade injured (collapsed lung) — check status before betting.' },
    { n:'Bam Adebayo',             t:'MIA', opp:'PHI', pos:'C',  st:'rebounds', l:9.5,  dir:'under', dk:9.5, dko:'-110',pp:9.5, fd:9.5, fdo:'-108',mgm:9.5,mgmo:'-112',czr:9,  czro:'+108',reb:9.5, rebo:'-108',conf:40,hr:'4/10',pid:'1628389', reason:'FADE OVER — PHI limits boards to opposing Cs. Bam 9.9 RPG but tough matchup.' },
  ];

  return raw.map(r => ({
    playerName:r.n, team:r.t, opponent:r.opp, position:r.pos,
    statType:r.st, line:r.l, direction:r.dir, confidence:r.conf,
    tier:tier(r.conf),
    dkLine:r.dk,   dkOdds:r.dko,
    ppLine:r.pp,
    fdLine:r.fd,   fdOdds:r.fdo,
    mgmLine:r.mgm, mgmOdds:r.mgmo,
    czrLine:r.czr, czrOdds:r.czro,
    rebetLine:r.reb, rebetOdds:r.rebo,
    altLines:   buildAltLines(r.dk, r.dko),
    hitRateLast10: r.hr,
    reasoning:  r.reason,
    nbaPhotoId: r.pid,
    date:       d,
  }));
}

router.get('/', async (req, res) => {
  try {
    const date     = req.query.date || today();
    const statType = req.query.type;
    const tierFilt = req.query.tier;

    let props = await Prop.find({ date }).lean().catch(() => []);
    if (!props.length) props = mem.props.length ? mem.props : seededProps();
    if (!props.length) props = seededProps();

    const injuries = await Injury.find({ date }).lean().catch(() => []);
    props = props.map(p => {
      const c = p.confidence || score(p, injuries);
      const t = p.tier || tier(c);
      return {
        ...p, confidence:c, tier:t,
        nbaPhotoId: p.nbaPhotoId || photoId(p.playerName||''),
        altLines: p.altLines?.length ? p.altLines : buildAltLines(p.dkLine||p.line, p.dkOdds),
      };
    });

    const tOrd = { elite:0, strong:1, neutral:2, fade:3 };
    props.sort((a,b) => (tOrd[a.tier]||2)-(tOrd[b.tier]||2) || b.confidence-a.confidence);

    if (statType) props = props.filter(p => p.statType === statType);
    if (tierFilt) props = props.filter(p => p.tier === tierFilt);

    res.json({ success:true, date, count:props.length, props });
  } catch(e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

module.exports = router;

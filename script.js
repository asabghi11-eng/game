(function(){
  "use strict";
  const N = 10;
  const STICKS = 15;
  const TURN_SECONDS = 25;
  const ICE_CELL_COUNT = 5;
  const PORTAL_PAIR_COUNT = 2;
  const FRAGILE_WALL_TURNS = 5;
  const FOG_RADIUS = 2.6;
  const ITEM_TYPES = ['stick','double','shield','freeze','spy','jump','hammer','swap','steal','mystery'];
  const ITEM_ICON = {stick:'🪵', double:'⚡', shield:'🛡', freeze:'❄️', spy:'👁', jump:'🌀', hammer:'🔨', swap:'🔄', steal:'💰', mystery:'🎁'};
  const ITEM_COLOR = {
    stick:['#e0a458','#f3c98a'], double:['#f5e14a','#fff4a3'], shield:['#7cc17a','#b8e8b0'],
    freeze:['#8fd8ff','#d6f3ff'], spy:['#c9aef0','#e8dcff'], jump:['#4fb0a5','#7fd6cb'],
    hammer:['#d9634f','#f0a08f'], swap:['#9b6fd6','#c9aef0'], steal:['#f3c98a','#ffe9c2'],
    mystery:['#e07ab0','#f5b8d8']
  };
  const MAX_ITEMS_ON_BOARD = 3;
  // WebRTC needs more than STUN to connect two phones that are on different
  // networks (e.g. two different mobile-data connections, or WiFi with strict/
  // symmetric NAT) — a lot of "quick play can't find anyone" reports are
  // actually this: matchmaking finds each other fine, but the direct
  // peer-to-peer connection itself never finishes negotiating, so it just
  // looks like nothing happened. STUN alone gets you through on the same
  // WiFi/LAN; the ExpressTURN relay below is what makes cross-network
  // matches (different WiFi, mobile data, etc.) actually connect.
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:free.expressturn.com:3478', username: '000000002100651466', credential: 'OTWoNw2HIhM1pz++89XdvfKoUOI=' },
    { urls: 'turn:free.expressturn.com:3478?transport=tcp', username: '000000002100651466', credential: 'OTWoNw2HIhM1pz++89XdvfKoUOI=' },
  ];
  const PEER_OPTS = { config: { iceServers: ICE_SERVERS } };
  const ROOM_PREFIX = "mesir-azad-";
  const MM_PREFIX = "mesir-azad-mm-";
  const MM_SLOTS = 30;
  const MM_CONNECT_TIMEOUT = 2800;
  const MM_BATCH_SIZE = 3; // slots probed in parallel per scan round (was 1 — serial)
  const STAKE_TIERS = [
    {amount:25,  name:'مبتدی'},
    {amount:50,  name:'معمولی'},
    {amount:100, name:'حرفه‌ای'},
    {amount:200, name:'قهرمان'},
    {amount:400, name:'افسانه‌ای'}
  ];
  let quickPlayStake = null;
  const SUDDEN_DEATH_DELAY_MS = 2*60*1000;
  const SUDDEN_DEATH_SECONDS = 10;
  const SPY_DURATION_MS = 4500;

  const THEMES = [
    {name:'کهربایی', base:'#e0a458', glow:'#f3c98a', dark:'#a06a2c'},
    {name:'فیروزه‌ای', base:'#4fb0a5', glow:'#7fd6cb', dark:'#2c6f66'},
    {name:'یاقوتی', base:'#d9634f', glow:'#f0a08f', dark:'#8a3a2c'},
    {name:'بنفش', base:'#9b6fd6', glow:'#c9aef0', dark:'#5c3a8a'},
    {name:'سبزِ لیمویی', base:'#8fc45a', glow:'#c3ea9a', dark:'#4a6e2c'},
    {name:'صورتی', base:'#e07ab0', glow:'#f5b8d8', dark:'#8a3a63'},
  ];
  let playerTheme = [0, 1];
  let suddenDeathEnabled = false;
  let sessionScore = [0, 0];

  // ---------- coin economy / shop catalog ----------
  const TILE_THEMES = [
    {id:'classic',  name:'کلاسیکِ چوبی',   price:0,   a:'#382a1e', b:'#2f2318', accent:'#e0a458'},
    {id:'midnight', name:'نیمه‌شبِ آبی',    price:60,  a:'#1c2436', b:'#161c2b', accent:'#5aa9e6'},
    {id:'jade',     name:'یشمِ سبز',        price:60,  a:'#20362c', b:'#192a22', accent:'#5ecb8f'},
    {id:'rose',     name:'گلبهیِ گرم',      price:90,  a:'#3a2230', b:'#2e1a26', accent:'#e67aa8'},
    {id:'sunset',   name:'غروبِ نارنجی',    price:100, a:'#3a2413', b:'#2e1b0d', accent:'#e69245'},
    {id:'ocean',    name:'اقیانوسِ آبی',    price:100, a:'#132a36', b:'#0d1f2a', accent:'#45c2e6'},
    {id:'obsidian', name:'ابسیدینِ سیاه',   price:140, a:'#181818', b:'#101010', accent:'#c9a24b'},
    {id:'aurora',   name:'شفقِ قطبی',       price:400, a:'#141c33', b:'#0d1224', accent:'#7fe6c8'},
    {id:'galaxy',   name:'کهکشانیِ بنفش',   price:220, a:'#241238', b:'#180c28', accent:'#b388ff'},
    {id:'lava',     name:'گدازه‌ایِ آتشین', price:220, a:'#3a120c', b:'#280a06', accent:'#ff6b3d'},
    {id:'emerald',  name:'زمردیِ سلطنتی',   price:260, a:'#0e2e22', b:'#0a2118', accent:'#2ee6a8'},
    {id:'diamond',  name:'الماسِ کهکشانی',  price:500, a:'#0d1a2b', b:'#091220', accent:'#bfe9ff'}
  ];
  const RING_EFFECTS = [
    {id:'none',     name:'بدونِ جلوه',        price:0,   icon:'⚪'},
    {id:'halo',     name:'هالهٔ نورانی',      price:40,  icon:'✨'},
    {id:'dashed',   name:'حلقهٔ نقطه‌چین',    price:70,  icon:'⭕'},
    {id:'spark',    name:'جرقه‌های دوار',     price:110, icon:'🌟'},
    {id:'crown',    name:'تاجِ قهرمانی',      price:160, icon:'👑'},
    {id:'rainbow',  name:'حلقهٔ رنگین‌کمانی', price:250, icon:'🌈'},
    {id:'galaxy',   name:'هالهٔ کهکشانی',     price:350, icon:'🌌'},
    {id:'phoenix',  name:'شعلهٔ ققنوس',      price:400, icon:'🔥'}
  ];
  const WALL_SKINS = [
    {id:'classic', name:'چوبِ ساده',       price:0,   icon:'🪵'},
    {id:'grain',   name:'رگه‌های چوب',     price:50,  icon:'🌲'},
    {id:'metal',   name:'فلزِ پرچ‌دار',     price:90,  icon:'⚙️'},
    {id:'crystal', name:'کریستالِ یخی',    price:130, icon:'💎'},
    {id:'gold',    name:'طلاییِ درخشان',   price:150, icon:'✨'},
    {id:'neon',    name:'نئونِ درخشان',    price:200, icon:'💠'},
    {id:'onyx',    name:'اُنیکسِ بنفش',    price:260, icon:'🟣'},
    {id:'greatwall', name:'دیوارِ چین',    price:400, icon:'🧱'}
  ];
  const WIN_FX = [
    {id:'confetti-gold', name:'کانفتیِ طلایی', price:0,   icon:'🎉'},
    {id:'fireworks',     name:'آتش‌بازی',      price:80,  icon:'🎆'},
    {id:'star-shower',   name:'بارشِ ستاره',    price:120, icon:'⭐'},
    {id:'coin-rain',     name:'بارشِ سکه',      price:120, icon:'🪙'},
    {id:'balloons',      name:'بادکنک‌های رنگی', price:160, icon:'🎈'},
    {id:'crown-drop',    name:'افتادنِ تاج',    price:200, icon:'👑'},
    {id:'rainbow-burst', name:'انفجارِ رنگین‌کمانی', price:280, icon:'🌈'}
  ];
  const AVATAR_SKINS = [
    {id:'none',    name:'حرفِ اول (پیش‌فرض)', price:0,   icon:'🔤'},
    {id:'wolf',    name:'گرگِ استراتژیست',     price:60,  icon:'🐺'},
    {id:'owl',     name:'جغدِ دانا',           price:60,  icon:'🦉'},
    {id:'ninja',   name:'نینجای سایه',         price:100, icon:'🥷'},
    {id:'wizard',  name:'جادوگرِ اهریمنی',      price:100, icon:'🧙'},
    {id:'lion',    name:'شیرِ میدان',          price:140, icon:'🦁'},
    {id:'robot',   name:'ربات‌جنگجو',          price:180, icon:'🤖'},
    {id:'dragon',  name:'اژدهای افسانه‌ای',     price:280, icon:'🐉'},
    {id:'king',    name:'شاهِ تخته',           price:350, icon:'👑'}
  ];
  let equippedRing = 'none';
  let equippedWallSkin = 'classic';
  let equippedWinFx = 'confetti-gold';

  // ---------- profile / achievements ----------
  const PROFILE_KEY = 'mesirAzad_profile_v1';
  const TUTORIAL_SEEN_KEY = 'mesirAzad_tutorialSeen_v1';
  const BADGES = {
    noWall:  {icon:'🥋', name:'برد بدونِ باختنِ یه چوب', desc:'بدونِ گذاشتنِ حتی یه چوب، به هدف برس'},
    jump:    {icon:'🌀', name:'برد با آیتمِ جهش',          desc:'در بازیِ برنده، آیتمِ جهش رو استفاده کن'},
    breaker: {icon:'💥', name:'خیبرشکنِ برنده',            desc:'در بازیِ برنده، از خیبرشکن استفاده کن'}
  };
  function defaultProfile(){
    return {
      gamesPlayed:0, wins:0, fastestWinSec:null, mostWalls:0, badges:{},
      coins:0,
      ownedTiles:['classic'], ownedRings:['none'], ownedWalls:['classic'], ownedAvatars:['none'],
      equipTile:'classic', equipRing:'none', equipWall:'classic', equipAvatar:'none',
      rating:1000, weekKey:null, weekWins:0, weekLosses:0, weekStartRating:1000, weeklyHistory:[]
    };
  }
  function loadProfile(){
    try{
      const raw = localStorage.getItem(PROFILE_KEY);
      if(!raw) return defaultProfile();
      const p = JSON.parse(raw);
      return Object.assign(defaultProfile(), p, {badges: Object.assign({}, p.badges)});
    }catch(e){ return defaultProfile(); }
  }
  function saveProfile(p){
    try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }catch(e){}
  }

  // ---------- referral / invite friends ----------
  const REF_CLAIMED_KEY = 'mesirAzad_refClaimed_v1';
  function genRefCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }
  function ensureRefCode(p){
    if(!p.refCode){ p.refCode = genRefCode(); saveProfile(p); }
    return p.refCode;
  }
  function referralLink(p){
    try{
      const url = new URL(location.href);
      url.hash = '';
      url.search = '';
      url.searchParams.set('ref', ensureRefCode(p));
      return url.toString();
    }catch(e){ return location.href; }
  }
  function claimIncomingReferral(){
    try{
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if(!ref) return;
      const hasProfile = !!localStorage.getItem(PROFILE_KEY);
      const alreadyClaimed = !!localStorage.getItem(REF_CLAIMED_KEY);
      if(hasProfile || alreadyClaimed) return;
      localStorage.setItem(REF_CLAIMED_KEY, '1');
      const p = defaultProfile();
      p.referredBy = ref.slice(0,12);
      saveProfile(p);
      setTimeout(()=> awardCoins(30, 'خوش‌آمد از طرفِ یه دوست 🎉'), 900);
    }catch(e){}
  }
  claimIncomingReferral();
  async function shareOrCopy(text, url){
    const full = url ? (text + '\n' + url) : text;
    if(navigator.share){
      try{ await navigator.share({title:'مسیرِ آزاد', text:text, url:url||location.href}); return true; }
      catch(e){ return false; }
    }
    try{ await navigator.clipboard.writeText(full); toast('لینک کپی شد ✅'); return true; }
    catch(e){ toast('نشد کپی بشه، دستی کپی کن'); return false; }
  }
  function markInviteShared(){
    const p = loadProfile();
    const firstTime = !(p.inviteShares>0);
    p.inviteShares = (p.inviteShares||0) + 1;
    saveProfile(p);
    if(firstTime) awardCoins(20, 'اولین دعوتِ دوستان 🎁');
  }

  // ---------- online rank / weekly leaderboard (local, per-device) ----------
  function weekKeyFromDate(d){
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay()+6)%7;
    date.setUTCDate(date.getUTCDate()-dayNum+3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
    const week = 1 + Math.round(((date-firstThursday)/86400000 - 3 + ((firstThursday.getUTCDay()+6)%7))/7);
    return date.getUTCFullYear()+'-W'+String(week).padStart(2,'0');
  }
  function todayWeekKey(){ return weekKeyFromDate(new Date()); }
  function ensureCurrentWeek(p){
    const wk = todayWeekKey();
    if(p.weekKey !== wk){
      if(p.weekKey && ((p.weekWins||0)>0 || (p.weekLosses||0)>0)){
        p.weeklyHistory = p.weeklyHistory || [];
        p.weeklyHistory.unshift({
          weekKey:p.weekKey, wins:p.weekWins||0, losses:p.weekLosses||0,
          startRating:p.weekStartRating||1000, endRating:p.rating||1000
        });
        p.weeklyHistory = p.weeklyHistory.slice(0,8);
      }
      p.weekKey = wk;
      p.weekWins = 0;
      p.weekLosses = 0;
      p.weekStartRating = p.rating||1000;
    }
    return p;
  }
  const RANK_TIERS = [
    {min:1700, name:'استاد', icon:'👑'},
    {min:1500, name:'الماسی', icon:'💎'},
    {min:1300, name:'طلایی', icon:'🥇'},
    {min:1100, name:'نقره‌ای', icon:'🥈'},
    {min:900,  name:'برنزی', icon:'🥉'},
    {min:0,    name:'تازه‌کار', icon:'🌱'}
  ];
  function rankTierOf(rating){
    return RANK_TIERS.find(t=> rating>=t.min) || RANK_TIERS[RANK_TIERS.length-1];
  }
  function computeEloDelta(myRating, oppRating, won){
    const K = 32;
    const expected = 1/(1+Math.pow(10, (oppRating-myRating)/400));
    return Math.round(K*((won?1:0)-expected));
  }
  function recordOnlineRatingResult(won, oppRatingVal){
    let p = loadProfile();
    p = ensureCurrentWeek(p);
    const before = p.rating||1000;
    const delta = computeEloDelta(before, oppRatingVal||1000, won);
    p.rating = Math.max(100, before + delta);
    if(won) p.weekWins = (p.weekWins||0)+1; else p.weekLosses = (p.weekLosses||0)+1;
    saveProfile(p);
    return {delta, rating:p.rating};
  }
  function renderWeekHistory(p){
    if(!weekHistoryListEl) return;
    const hist = p.weeklyHistory || [];
    if(!hist.length){
      weekHistoryListEl.innerHTML = '<div class="week-empty">هنوز هفته‌ای ثبت نشده — یه بازیِ آنلاین ببر تا رتبه‌ت شکل بگیره!</div>';
      return;
    }
    weekHistoryListEl.innerHTML = hist.map(w=>{
      const d = w.endRating - w.startRating;
      const sign = d>0 ? '+' : '';
      const cls = d>0 ? 'pos' : (d<0 ? 'neg' : '');
      return '<div class="week-row"><span class="wk-label">'+w.weekKey+'</span>'+
        '<span>'+toFa(w.wins)+' برد · '+toFa(w.losses)+' باخت</span>'+
        '<span class="wk-delta '+cls+'">'+sign+toFa(d)+'</span></div>';
    }).join('');
  }
  function fmtSec(s){
    const m = Math.floor(s/60), r = Math.round(s%60);
    return (m>0 ? m+':'+String(r).padStart(2,'0') : r+'s');
  }
  function showBadgePop(text){
    badgePopEl.textContent = text;
    badgePopEl.classList.add('show');
    clearTimeout(showBadgePop._t);
    showBadgePop._t = setTimeout(()=> badgePopEl.classList.remove('show'), 2400);
  }
  function recordGameResult(winnerIdx, elapsedSec, wallsUsedByWinner, jumpUsed, breakerUsed){
    const p = loadProfile();
    p.gamesPlayed++;
    p.wins++;
    if(p.fastestWinSec===null || elapsedSec < p.fastestWinSec) p.fastestWinSec = elapsedSec;
    if(wallsUsedByWinner > p.mostWalls) p.mostWalls = wallsUsedByWinner;
    const newlyUnlocked = [];
    function unlock(key, cond){
      if(cond && !p.badges[key]){ p.badges[key] = true; newlyUnlocked.push(key); }
    }
    unlock('noWall', wallsUsedByWinner===0);
    unlock('jump', jumpUsed);
    unlock('breaker', breakerUsed);
    saveProfile(p);
    newlyUnlocked.forEach((key,i)=>{
      setTimeout(()=> showBadgePop('🏅 دستاورد جدید: ' + BADGES[key].name), 900 + i*2600);
    });
    return p;
  }
  function renderProfile(){
    let p = loadProfile();
    p = ensureCurrentWeek(p);
    saveProfile(p);
    statGamesEl.textContent = p.gamesPlayed;
    statWinsEl.textContent = p.wins;
    statFastestEl.textContent = p.fastestWinSec===null ? '—' : fmtSec(p.fastestWinSec);
    statMostWallsEl.textContent = p.mostWalls;
    const tier = rankTierOf(p.rating||1000);
    rankIconEl.textContent = tier.icon;
    rankTierNameEl.textContent = tier.name;
    rankRatingNumEl.textContent = toFa(p.rating||1000);
    if(rankWeekLineEl) rankWeekLineEl.innerHTML = 'این هفته<br>'+toFa(p.weekWins||0)+' برد · '+toFa(p.weekLosses||0)+' باخت';
    if(profileNameDisplayEl){
      const nm = (name1Input && name1Input.value) ? name1Input.value.trim() : 'بازیکن ۱';
      profileNameDisplayEl.textContent = nm;
    }
    renderWeekHistory(p);
    // XP progress within current tier (visual only)
    if(profileXpFillEl){
      const rating = p.rating||1000;
      const idx = RANK_TIERS.findIndex(t=> t===tier);
      const nextMin = idx>0 ? RANK_TIERS[idx-1].min : tier.min+400;
      const span = Math.max(1, nextMin - tier.min);
      const pct = Math.max(2, Math.min(100, Math.round(((rating - tier.min)/span)*100)));
      profileXpFillEl.style.width = pct + '%';
    }
    if(winrateRingEl){
      const gp = p.gamesPlayed||0;
      const pct = gp>0 ? Math.round(((p.wins||0)/gp)*100) : 0;
      winrateRingEl.style.setProperty('--pct', pct);
      winratePctEl.textContent = toFa(pct) + '٪';
    }
    if(profileInitialEl){
      const g = equippedAvatarGlyph();
      const nm = (name1Input && name1Input.value) ? name1Input.value.trim() : 'ب';
      profileInitialEl.textContent = g || (nm.charAt(0) || 'ب');
    }
    badgeListEl.innerHTML = '';
    Object.keys(BADGES).forEach(key=>{
      const b = BADGES[key];
      const unlocked = !!p.badges[key];
      const tile = document.createElement('div');
      tile.className = 'badge-tile' + (unlocked ? ' unlocked' : '');
      tile.title = b.name + ' — ' + b.desc;
      tile.innerHTML = `<div class="b-icon">${b.icon}</div>`;
      badgeListEl.appendChild(tile);
    });
    renderInvite(p);
  }
  function renderInvite(p){
    if(!inviteLinkInput) return;
    inviteLinkInput.value = referralLink(p);
    inviteShareCountEl.textContent = toFa(p.inviteShares||0);
  }

  // ---------- coin economy ----------
  function awardCoins(amount, reason){
    if(!amount || amount<=0) return;
    const p = loadProfile();
    p.coins = (p.coins||0) + amount;
    saveProfile(p);
    updateCoinDisplays();
    setTimeout(()=> showBadgePop('🪙 +' + toFa(amount) + ' سکه' + (reason ? ' — ' + reason : '')), 500);
  }
  function spendCoins(amount){
    if(!amount || amount<=0) return true;
    const p = loadProfile();
    if((p.coins||0) < amount) return false;
    p.coins -= amount;
    saveProfile(p);
    updateCoinDisplays();
    return true;
  }
  function updateCoinDisplays(){
    const p = loadProfile();
    const bal = toFa(p.coins||0);
    if(coinBalStart) coinBalStart.textContent = bal;
    if(coinBalApp) coinBalApp.textContent = bal;
    if(shopCoinBal) shopCoinBal.textContent = bal;
  }
  function applyTileTheme(){
    const p = loadProfile();
    const th = TILE_THEMES.find(t=> t.id===p.equipTile) || TILE_THEMES[0];
    document.documentElement.style.setProperty('--cell-a', th.a);
    document.documentElement.style.setProperty('--cell-b', th.b);
    if(typeof markBoardBgDirty === 'function') markBoardBgDirty();
  }
  function applyEquippedCosmetics(){
    const p = loadProfile();
    equippedRing = p.equipRing || 'none';
    equippedWallSkin = p.equipWall || 'classic';
    equippedWinFx = p.equipWinfx || 'confetti-gold';
    applyTileTheme();
    refreshAvatarDisplays();
  }
  // ---- purchasable avatar (character) system ----
  let oppAvatar = null; // opponent's chosen avatar glyph, synced at match start
  function equippedAvatarGlyph(){
    const p = loadProfile();
    if(p.equipAvatar && p.equipAvatar!=='none'){
      const a = AVATAR_SKINS.find(x=> x.id===p.equipAvatar);
      if(a) return a.icon;
    }
    return null;
  }
  // Returns the emoji glyph to show for board-slot `idx` (0 or 1), or null to fall back to the initial letter.
  function avatarGlyphFor(idx){
    const iAmMe = (onlineMode && myRole!=null) ? (idx===myRole) : (idx===0);
    if(iAmMe) return equippedAvatarGlyph();
    if(onlineMode) return oppAvatar || null;
    return null;
  }
  function refreshAvatarDisplays(){
    if(setupInitial1El){
      const g = equippedAvatarGlyph();
      setupInitial1El.textContent = g || ((setupName1 && setupName1.value.trim().charAt(0)) || '۱');
    }
    applyPlayerColors();
    if(profileInitialEl){
      const g = equippedAvatarGlyph();
      const nm = (name1Input && name1Input.value) ? name1Input.value.trim() : 'ب';
      profileInitialEl.textContent = g || (nm.charAt(0) || 'ب');
    }
  }
  function updateVsRevealAvatars(){
    if(!vsRevealOverlay.classList.contains('show')) return;
    const g0 = avatarGlyphFor(0), g1 = avatarGlyphFor(1);
    if(vsInitial1) vsInitial1.textContent = g0 || ((playerNames[0]||'').trim().charAt(0) || '۱');
    if(vsInitial2) vsInitial2.textContent = g1 || ((playerNames[1]||'').trim().charAt(0) || '۲');
  }
  function shopCatalog(tab){
    if(tab==='tile') return TILE_THEMES;
    if(tab==='ring') return RING_EFFECTS;
    if(tab==='winfx') return WIN_FX;
    if(tab==='avatar') return AVATAR_SKINS;
    return WALL_SKINS;
  }
  function shopOwnedKey(tab){ return tab==='tile' ? 'ownedTiles' : tab==='ring' ? 'ownedRings' : tab==='winfx' ? 'ownedWinfx' : tab==='avatar' ? 'ownedAvatars' : 'ownedWalls'; }
  function shopEquipKey(tab){ return tab==='tile' ? 'equipTile' : tab==='ring' ? 'equipRing' : tab==='winfx' ? 'equipWinfx' : tab==='avatar' ? 'equipAvatar' : 'equipWall'; }
  function shopDescText(tab){
    if(tab==='tile') return 'رنگِ خانه‌های تخته رو عوض کن.';
    if(tab==='ring') return 'یه جلوهٔ تزئینی دورِ مهره‌های هر دو بازیکن اضافه کن.';
    if(tab==='winfx') return 'جلوه‌ای که موقعِ بردنِ بازی روی صفحه پخش می‌شه رو انتخاب کن.';
    if(tab==='avatar') return 'به‌جایِ حرفِ اول، یه کاراکترِ اختصاصی رو مهره و آواتارِ خودت نشون بده.';
    return 'ظاهرِ چوب‌ها رو با یه متریالِ جدید عوض کن.';
  }
  let shopTab = 'tile';
  function renderShop(){
    const p = loadProfile();
    if(shopCoinBal) shopCoinBal.textContent = toFa(p.coins||0);
    shopTabBtns.forEach(b=> b.classList.toggle('on', b.dataset.tab===shopTab));
    shopDescEl.textContent = shopDescText(shopTab);
    const items = shopCatalog(shopTab);
    const ok = shopOwnedKey(shopTab), ek = shopEquipKey(shopTab);
    const owned = p[ok] || [];
    shopGridEl.innerHTML = '';
    items.forEach(item=>{
      const isOwned = owned.includes(item.id);
      const isEquipped = p[ek]===item.id;
      const tile = document.createElement('div');
      tile.className = 'shop-item' + (isEquipped ? ' equipped' : '');
      let previewHtml;
      if(shopTab==='tile'){
        previewHtml = `<div class="si-preview iso" style="--accent:${item.accent}">
          <div class="iso-board" style="background:linear-gradient(135deg, ${item.a} 50%, ${item.b} 50%); border-color:${item.accent}">
            <div class="iso-shine"></div>
          </div>
        </div>`;
      } else {
        previewHtml = `<div class="si-preview" style="background:rgba(255,255,255,.06)">${item.icon}</div>`;
      }
      let btnHtml;
      if(isEquipped) btnHtml = `<button class="si-btn equipped-btn" disabled>در حالِ استفاده</button>`;
      else if(isOwned) btnHtml = `<button class="si-btn owned" data-act="equip" data-id="${item.id}">انتخاب</button>`;
      else btnHtml = `<button class="si-btn" data-act="buy" data-id="${item.id}" ${((p.coins||0)<item.price) ? 'disabled' : ''}>🪙 ${toFa(item.price)}</button>`;
      const statusText = isEquipped ? 'در حالِ استفاده' : (isOwned ? 'مالِ توئه' : ('قیمت: ' + toFa(item.price) + ' سکه'));
      const ribbonHtml = isEquipped ? '<div class="si-ribbon">✓</div>' : '';
      tile.innerHTML = ribbonHtml + previewHtml +
        `<div class="si-info"><div class="si-name">${item.name}</div><div class="si-price">${statusText}</div></div>` +
        btnHtml;
      shopGridEl.appendChild(tile);
    });
  }
  function handleShopAction(act, id){
    const p = loadProfile();
    const ok = shopOwnedKey(shopTab), ek = shopEquipKey(shopTab);
    if(!p[ok]) p[ok] = [];
    if(act==='buy'){
      const item = shopCatalog(shopTab).find(i=> i.id===id);
      if(!item || (p.coins||0) < item.price || p[ok].includes(id)) return;
      p.coins = (p.coins||0) - item.price;
      p[ok].push(id);
      p[ek] = id;
      saveProfile(p);
      vibrate(15);
      playSound('item');
      toast('🎉 خریداری شد و فعال شد!');
    } else if(act==='equip'){
      p[ek] = id;
      saveProfile(p);
      vibrate(10);
    }
    applyEquippedCosmetics();
    updateCoinDisplays();
    renderShop();
    draw();
  }

  // ---------- daily challenge ----------
  const DAILY_KEY = 'mesirAzad_daily_v1';
  function dateKeyFromDate(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function todayStr(){ return dateKeyFromDate(new Date()); }
  function loadDailyData(){
    try{
      const raw = localStorage.getItem(DAILY_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveDailyData(d){
    try{ localStorage.setItem(DAILY_KEY, JSON.stringify(d)); }catch(e){}
  }
  function seedFromStr(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h>>>0;
  }
  function mulberry32(seed){
    let a = seed>>>0;
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ a>>>15, 1 | a);
      t = (t + Math.imul(t ^ t>>>7, 61 | t)) ^ t;
      return ((t ^ t>>>14) >>> 0) / 4294967296;
    };
  }
  function computeStreak(data){
    let streak = 0;
    const d = new Date();
    for(let i=0;i<400;i++){
      const key = dateKeyFromDate(d);
      const rec = data[key];
      if(rec && rec.won){ streak++; }
      else if(i===0){ /* today not finished yet — doesn't break an existing streak */ }
      else break;
      d.setDate(d.getDate()-1);
    }
    return streak;
  }
  function bestTimeMs(data){
    let best = null;
    Object.values(data).forEach(rec=>{ if(rec.won && (best===null || rec.timeMs<best)) best = rec.timeMs; });
    return best;
  }
  function fmtMs(ms){ return fmtSec(ms/1000); }
  function generateDailyLayout(seedStr){
    const rng = mulberry32(seedFromStr(seedStr));
    let placed = 0, attempts = 0;
    while(placed<5 && attempts<250){
      attempts++;
      if(rng()<0.5){
        const x = Math.floor(rng()*(N-1)), y = Math.floor(rng()*N), key = x+','+y;
        if(state.wallsV.has(key)) continue;
        state.wallsV.add(key);
        if(!bothPathsOk()){ state.wallsV.delete(key); continue; }
      } else {
        const x = Math.floor(rng()*N), y = Math.floor(rng()*(N-1)), key = x+','+y;
        if(state.wallsH.has(key)) continue;
        state.wallsH.add(key);
        if(!bothPathsOk()){ state.wallsH.delete(key); continue; }
      }
      placed++;
    }
    let itemsPlaced = 0, itemAttempts = 0;
    while(itemsPlaced<3 && itemAttempts<200){
      itemAttempts++;
      const x = Math.floor(rng()*N), y = Math.floor(rng()*N), key = x+','+y;
      if(state.items[key]) continue;
      if(state.pos[0].x===x && state.pos[0].y===y) continue;
      if(state.pos[1].x===x && state.pos[1].y===y) continue;
      state.items[key] = ITEM_TYPES[Math.floor(rng()*ITEM_TYPES.length)];
      itemsPlaced++;
    }
  }
  function renderDailyWeek(data){
    dailyWeekEl.innerHTML = '';
    const d = new Date();
    d.setDate(d.getDate()-6);
    const today = todayStr();
    for(let i=0;i<7;i++){
      const key = dateKeyFromDate(d);
      const rec = data[key];
      const dot = document.createElement('div');
      dot.className = 'dw-dot' + (rec && rec.won ? ' win' : (rec ? ' lose' : '')) + (key===today ? ' today' : '');
      dot.textContent = String(d.getDate());
      dailyWeekEl.appendChild(dot);
      d.setDate(d.getDate()+1);
    }
  }
  function renderDailyOverlay(){
    const data = loadDailyData();
    const key = todayStr();
    dailyDateLabel.textContent = new Date().toLocaleDateString('fa-IR', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    dailyStreakEl.textContent = computeStreak(data);
    const best = bestTimeMs(data);
    dailyBestEl.textContent = best===null ? '—' : fmtMs(best);
    renderDailyWeek(data);
    const rec = data[key];
    if(rec && rec.won){
      dailyStatusMsg.textContent = 'امروز رو بردی! ⏱ ' + fmtMs(rec.timeMs) + ' — دوباره بازی کن تا رکوردتو بشکنی';
      startDailyBtn.textContent = '🔁 تلاشِ دوباره';
    } else if(rec && !rec.won){
      dailyStatusMsg.textContent = 'امروز باختی، ولی می‌تونی دوباره امتحان کنی 💪';
      startDailyBtn.textContent = '🔁 تلاشِ دوباره';
    } else {
      dailyStatusMsg.textContent = 'امروز هنوز بازی نکردی — بریم! 🚀';
      startDailyBtn.textContent = '🎮 شروعِ چالشِ امروز';
    }
  }
  function startDailyChallenge(){
    aiEnabled = true;
    aiDifficulty = 'medium';
    onlineMode = false;
    aiThinking = false;
    playerNames[0] = 'شما';
    playerNames[1] = '🤖 حریفِ روزانه';
    suddenDeathEnabled = false;
    sessionScore = [0,0];
    startScreen.classList.add('hidden');
    dailyOverlay.classList.remove('show');
    appEl.classList.remove('hidden');
    applyPlayerColors();
    state = freshState();
    state.daily = true;
    state.dailySeed = todayStr();
    generateDailyLayout(state.dailySeed);
    state.dailyPar = bfsDist(state.pos[0].x, state.pos[0].y, state.goal[0]);
    setMode('move');
    updateHud();
    updateScoreBar();
    updateNameEditability();
    updateRoomBadge();
    sdBadge.classList.add('hidden');
    resize();
    draw();
  }

  // ---------- puzzle mode ----------
  const PUZZLE_KEY = 'mesirAzad_puzzle_v1';
  const PUZZLE_HANDCRAFTED = [
    {id:1, name:'قدمِ اول',       bands:[{y:4, gap:8}]},
    {id:2, name:'زیگزاگِ کوچیک',  bands:[{y:3, gap:1},{y:6, gap:8}]},
    {id:3, name:'مارپیچ',         bands:[{y:2, gap:8},{y:4, gap:1},{y:6, gap:8}]},
    {id:4, name:'تنگنا',          bands:[{y:2, gap:1},{y:4, gap:8},{y:6, gap:1},{y:8, gap:8}]},
    {id:5, name:'هزارتوی سخت',    bands:[{y:1, gap:8},{y:3, gap:1},{y:5, gap:8},{y:6, gap:1},{y:8, gap:8}]},
    {id:6, name:'استادی',         bands:[{y:1, gap:1},{y:2, gap:8},{y:4, gap:1},{y:5, gap:8},{y:7, gap:1},{y:8, gap:8}]}
  ];
  let puzzleMode = false;
  let currentPuzzleIdx = null;

  function loadPuzzleData(){
    try{
      const raw = localStorage.getItem(PUZZLE_KEY);
      const d = raw ? JSON.parse(raw) : {};
      if(!d.best) d.best = {};
      if(!d.unlocked) d.unlocked = 1;
      return d;
    }catch(e){ return {best:{}, unlocked:1}; }
  }
  function savePuzzleData(d){
    try{ localStorage.setItem(PUZZLE_KEY, JSON.stringify(d)); }catch(e){}
  }
  function buildPuzzleWalls(bands){
    const wallsH = new Set();
    bands.forEach(b=>{
      for(let x=0;x<N;x++){
        if(x===b.gap) continue;
        wallsH.add(x+','+b.y);
      }
    });
    return wallsH;
  }
  // standalone BFS (doesn't touch the global `state`) used to compute a puzzle's
  // optimal move count, safe to call anytime — e.g. while rendering the puzzle list.
  function puzzleParFor(wallsH){
    const startX=4, startY=0, goalRow=9;
    if(startY===goalRow) return 0;
    const blocked = (x,y,nx,ny)=>{
      if(x===nx){ const y0=Math.min(y,ny); return wallsH.has(x+','+y0); }
      return false; // these puzzles never use vertical walls
    };
    const visited = new Set([startX+','+startY]);
    let frontier = [[startX,startY]];
    let dist = 0;
    while(frontier.length){
      dist++;
      const nf = [];
      for(const [x,y] of frontier){
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of dirs){
          const nx=x+dx, ny=y+dy;
          if(nx<0||nx>=N||ny<0||ny>=N) continue;
          if(blocked(x,y,nx,ny)) continue;
          const k = nx+','+ny;
          if(visited.has(k)) continue;
          visited.add(k);
          if(ny===goalRow) return dist;
          nf.push([nx,ny]);
        }
      }
      frontier = nf;
      if(dist>200) return Infinity;
    }
    return Infinity;
  }
  // ----- procedural puzzle generation -----
  // Uses the same seeded RNG (mulberry32/seedFromStr) already used for the daily
  // challenge, and validates every candidate through puzzleParFor so a level is
  // only kept if it's actually solvable (par !== Infinity).
  function faDigitsLocal(n){ return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
  function generateProceduralPuzzleLevel(seedStr, targetPar, minBands, maxBands){
    const rng = mulberry32(seedFromStr(seedStr));
    let best = null, bestDiff = Infinity;
    for(let attempt=0; attempt<60; attempt++){
      const bandCount = minBands + Math.floor(rng()*(maxBands-minBands+1));
      const usedY = new Set();
      const bands = [];
      for(let i=0;i<bandCount;i++){
        let y, tries=0;
        do{ y = 1 + Math.floor(rng()*8); tries++; }while(usedY.has(y) && tries<10);
        usedY.add(y);
        bands.push({y, gap: Math.floor(rng()*9)});
      }
      bands.sort((a,b)=>a.y-b.y);
      const par = puzzleParFor(buildPuzzleWalls(bands));
      if(par===Infinity) continue;
      const diff = Math.abs(par-targetPar);
      if(diff<bestDiff){ bestDiff = diff; best = {bands, par}; }
      if(diff===0) break;
    }
    return best;
  }
  function generateProceduralPuzzles(startId, count){
    const levels = [];
    for(let i=0;i<count;i++){
      const id = startId+i;
      const targetPar = 10 + Math.round(i*0.8);            // gentle upward difficulty ramp
      const minBands = 3 + Math.min(3, Math.floor(i/5));
      const maxBands = 4 + Math.min(3, Math.floor(i/4));
      const gen = generateProceduralPuzzleLevel('mesir-azad-puzzle-'+id, targetPar, minBands, maxBands);
      if(!gen) continue;
      levels.push({id, name: 'پازلِ ' + faDigitsLocal(id), bands: gen.bands, generated:true});
    }
    return levels;
  }
  // 6 hand-crafted + 15 generated = 21 total levels
  const PUZZLES = PUZZLE_HANDCRAFTED.concat(generateProceduralPuzzles(7, 15));
  function parForLevel(level){ return puzzleParFor(buildPuzzleWalls(level.bands)); }
  function starsForResult(movesUsed, par){
    if(movesUsed<=par) return 3;
    if(movesUsed<=par+3) return 2;
    return 1;
  }
  function freshPuzzleState(level){
    const s = freshState({wallCount:1});
    s.pos = [{x:4,y:0}, {x:-3,y:-3}];
    s.goal = [9, -1];
    s.sticksLeft = [0,0];
    s.wallTotal = 0;
    s.breakerLeft = [0,0];
    s.wallsH = buildPuzzleWalls(level.bands);
    s.wallsV = new Set();
    s.dailyMoves = 0;
    s.puzzleLevel = level;
    s.puzzlePar = parForLevel(level);
    return s;
  }
  function setPuzzleUI(on){
    hudRow.classList.toggle('hidden', on);
    wallModeBtn.classList.toggle('hidden', on);
    breakModeBtn.classList.toggle('hidden', on);
    puzzleBar.classList.toggle('show', on);
  }
  function exitPuzzleMode(){
    puzzleMode = false;
    currentPuzzleIdx = null;
    setPuzzleUI(false);
  }
  function updatePuzzleBar(){
    if(!state.puzzleLevel) return;
    puzzleBarName.textContent = '🧩 ' + state.puzzleLevel.name;
    puzzleBarMoves.textContent = toFa(state.dailyMoves);
    puzzleBarPar.textContent = toFa(state.puzzlePar);
  }
  function renderPuzzleList(){
    const data = loadPuzzleData();
    puzzleListEl.innerHTML = '';
    PUZZLES.forEach((level, idx)=>{
      const unlocked = idx < data.unlocked;
      const best = data.best[level.id];
      const row = document.createElement('button');
      row.className = 'puzzle-row' + (unlocked ? '' : ' locked');
      let starsHtml = '';
      if(unlocked && best!==undefined){
        const stars = starsForResult(best, parForLevel(level));
        starsHtml = '<div class="puzzle-row-stars">' + '⭐'.repeat(stars) + '☆'.repeat(3-stars) + '</div>';
      }
      row.innerHTML =
        '<div class="puzzle-row-num">' + (unlocked ? toFa(idx+1) : '🔒') + '</div>' +
        '<div class="puzzle-row-info">' +
          '<div class="puzzle-row-name">' + level.name + '</div>' +
          '<div class="puzzle-row-meta">' + (unlocked ? (best!==undefined ? 'بهترین رکورد: ' + toFa(best) + ' حرکت' : 'هنوز حل نشده') : 'با حلِ پازلِ قبلی باز می‌شه') + '</div>' +
        '</div>' + starsHtml;
      row.addEventListener('click', ()=>{
        if(!unlocked){ toast('🔒 اول پازلِ قبلی رو حل کن'); vibrate(10); return; }
        startPuzzle(idx);
      });
      puzzleListEl.appendChild(row);
    });
  }
  function startPuzzle(idx){
    const level = PUZZLES[idx];
    if(!level) return;
    aiEnabled = false;
    onlineMode = false;
    tournamentMode = false;
    aiThinking = false;
    puzzleMode = true;
    currentPuzzleIdx = idx;
    playerNames[0] = 'شما';
    playerNames[1] = '—';
    sessionScore = [0,0];
    startScreen.classList.add('hidden');
    puzzleOverlay.classList.remove('show');
    winOverlay.classList.remove('show');
    appEl.classList.remove('hidden');
    applyPlayerColors();
    state = freshPuzzleState(level);
    setMode('move');
    setPuzzleUI(true);
    updateHud();
    updateScoreBar();
    updateNameEditability();
    updateRoomBadge();
    sdBadge.classList.add('hidden');
    resize();
    draw();
  }
  function handlePuzzleWin(){
    state.over = true;
    const level = state.puzzleLevel;
    const movesUsed = state.dailyMoves;
    const par = state.puzzlePar;
    const data = loadPuzzleData();
    const prevBest = data.best[level.id];
    const isFirst = prevBest===undefined;
    const improved = !isFirst && movesUsed < prevBest;
    const idx = PUZZLES.findIndex(l=>l.id===level.id);
    if(isFirst || improved) data.best[level.id] = movesUsed;
    if(idx+1 < PUZZLES.length && data.unlocked < idx+2) data.unlocked = idx+2;
    savePuzzleData(data);

    const stars = starsForResult(movesUsed, par);
    winOverlay.classList.add('show');
    winTitle.textContent = '🧩 «' + level.name + '» حل شد!';
    const wt = themeOf(0);
    winDot.style.background = dotGradient(wt);
    winDot.style.color = wt.base;
    vibrate([30,60,30]);
    playSound('win');
    launchConfetti(0);
    dailyResultBox.classList.add('hidden');
    tMatchResultBox.classList.add('hidden');
    rankResultBox.classList.add('hidden');
    tNextMatchBtn.classList.add('hidden');
    gameResultBox.classList.add('hidden');
    winnerChip.classList.add('hidden');
    puzzleResultBox.classList.remove('hidden');
    puzzleResultStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
    puzzleResultMoves.textContent = toFa(movesUsed);
    puzzleResultPar.textContent = toFa(par);
    puzzleResultBest.textContent = toFa(Math.min(isFirst ? movesUsed : prevBest, movesUsed));
    winSubtitle.textContent = '';
    puzzleNextBtn.classList.toggle('hidden', !(idx+1 < PUZZLES.length));
    puzzleListBtn2.classList.remove('hidden');
    if(isFirst || improved){
      awardCoins(stars===3 ? 25 : (stars===2 ? 15 : 8), '🧩 پازل «' + level.name + '»');
    }
  }

  let playerNames = ['بازیکن ۱', 'بازیکن ۲'];
  function themeOf(idx){ return THEMES[playerTheme[idx]] || THEMES[idx]; }

  // ---------- theme unlocks (tied to profile stats) ----------
  function isThemeUnlocked(i){
    if(i===0 || i===1) return true;
    const p = loadProfile();
    if(i===2) return p.wins >= 5;
    if(i===3) return p.gamesPlayed >= 15;
    if(i===4) return !!p.badges.jump;
    if(i===5) return !!(p.badges.noWall && p.badges.jump && p.badges.breaker);
    return true;
  }
  function themeUnlockDesc(i){
    if(i===2) return 'با ۵ برد باز می‌شه';
    if(i===3) return 'با ۱۵ بازیِ انجام‌شده باز می‌شه';
    if(i===4) return 'با دستاورد 🌀 (برد با جهش) باز می‌شه';
    if(i===5) return 'با هر سه دستاورد باز می‌شه';
    return '';
  }

  // ---------- state ----------
  let state;
  function pickSpecialCell(s, used){
    for(let tries=0; tries<40; tries++){
      const x = Math.floor(Math.random()*N);
      const y = Math.floor(Math.random()*N);
      if(y===0 || y===N-1) continue; // keep goal rows clear
      const key = x+','+y;
      if(used.has(key)) continue;
      if(s.pos[0].x===x && s.pos[0].y===y) continue;
      if(s.pos[1].x===x && s.pos[1].y===y) continue;
      return key;
    }
    return null;
  }
  function freshState(opts){
    opts = opts || {};
    const wallCount = opts.wallCount || STICKS;
    const s = {
      pos: [ {x:4,y:0}, {x:5,y:9} ],       // p1 starts top (goal row 9), p2 starts bottom (goal row 0)
      goal: [9, 0],                        // now represents ROW, not column
      sticksLeft: [wallCount, wallCount],
      wallTotal: wallCount,
      wallsV: new Set(),
      wallsH: new Set(),
      wallOwner: {},
      turn: 0,
      mode: 'move',
      over: false,
      anim: null,
      items: {},                 // 'x,y' -> type
      shield: [0, 0],             // shield charges per player
      extraMove: [false, false],  // grants an extra move without ending turn
      skipNext: [false, false],   // opponent's next turn gets skipped
      breakerLeft: [1, 1],         // خیبرشکن — one wall-destroy use per player
      turnDeadline: performance.now() + TURN_SECONDS*1000,
      gameStart: performance.now(),
      suddenDeathNotified: false,
      spyEffect: null,             // {hideOwner, until}
      wallsPlaced: [0, 0],         // for achievements
      usedJump: [false, false],
      usedBreaker: [false, false],
      particles: [],                // pickup particle bursts
      daily: false,                 // true when playing the daily challenge
      dailyMoves: 0,                // action count for the human player (daily challenge stat)
      actionCount: [0, 0],          // total actions (moves+walls) per player, for end-game stats
      hintPath: null,               // active hint trail (array of {x,y}), or null
      hintExpire: null,             // performance.now() timestamp when the hint trail fades
      puzzleLevel: null,            // set when this state represents a puzzle-mode board
      puzzlePar: null,              // optimal move count for the current puzzle
      // ---- special level mechanics (local/AI games only; always off unless explicitly requested) ----
      iceEnabled: !!opts.ice,
      iceCells: new Set(),
      portalsEnabled: !!opts.portal,
      portals: {},
      fragileEnabled: !!opts.fragile,
      fragileWalls: {},           // 'v:x,y' / 'h:x,y' -> turns left
      fogEnabled: !!opts.fog,
      turnCounter: 0
    };
    if(s.iceEnabled || s.portalsEnabled){
      const used = new Set();
      if(s.iceEnabled){
        for(let i=0;i<ICE_CELL_COUNT;i++){
          const key = pickSpecialCell(s, used);
          if(!key) break;
          used.add(key);
          s.iceCells.add(key);
        }
      }
      if(s.portalsEnabled){
        for(let i=0;i<PORTAL_PAIR_COUNT;i++){
          const a = pickSpecialCell(s, used);
          if(!a) break;
          used.add(a);
          const b = pickSpecialCell(s, used);
          if(!b) break;
          used.add(b);
          s.portals[a] = b;
          s.portals[b] = a;
        }
      }
    }
    return s;
  }
  state = freshState();

  // ---------- online state ----------
  let onlineMode = false;
  let quickPlayMode = false;
  let mmCancelled = false;
  let mmSlotOrder = [];
  let mmAttemptIdx = -1;
  let mmBatchPeers = []; // Peer objects currently being probed in the active batch
  let myRole = null;     // 0 = host/creator, 1 = joiner
  let oppRating = 1000;  // opponent's online rank rating, synced at match start

  // ---------- tournament state ----------
  const TOURNAMENT_PREFIX = "mesir-azad-t-";
  let tournamentMode = false;
  let myTournamentSlot = null;   // 0=host, 1/2/3=joiners — persistent identity for the whole tournament
  let hostConns = {};            // host-only: {1:DataConnection, 2:DataConnection, 3:DataConnection}
  let tournament = null;         // {code, players:[{name,connected}], matches:[...], currentMatchIdx, finished}
  const MATCH_ACTION_TYPES = new Set(['move','wall','break','item','reaction']);

  // ---------- AI opponent state ----------
  let aiEnabled = false;
  const aiIdx = 1;        // AI always plays as player 2
  let aiDifficulty = 'medium'; // easy | medium | hard
  let aiThinking = false;
  let aiPrevName2 = 'بازیکن ۲';
  let peer = null;
  let conn = null;
  let currentRoomCode = null;

  // ---------- dom ----------
  const appEl = document.getElementById('app');
  const startScreen = document.getElementById('startScreen');
  const setupName1 = document.getElementById('setupName1');
  const setupName2 = document.getElementById('setupName2');
  function syncAvatarInitial(input, initialEl){
    if(!input || !initialEl) return;
    const v = input.value.trim();
    initialEl.textContent = v ? v.charAt(0) : '؟';
  }
  if(setupName1) setupName1.addEventListener('input', ()=> syncAvatarInitial(setupName1, setupInitial1El));
  if(setupName2) setupName2.addEventListener('input', ()=> syncAvatarInitial(setupName2, setupInitial2El));
  const setupDot1 = document.getElementById('setupDot1');
  const setupDot2 = document.getElementById('setupDot2');
  const swatches1El = document.getElementById('swatches1');
  const swatches2El = document.getElementById('swatches2');
  const suddenDeathToggle = document.getElementById('suddenDeathToggle');
  const aiToggle = document.getElementById('aiToggle');
  const mechanicsToggleBtn = document.getElementById('mechanicsToggleBtn');
  const mechanicsPanel = document.getElementById('mechanicsPanel');
  const mechanicsChevron = document.getElementById('mechanicsChevron');
  const mechanicsCountBadge = document.getElementById('mechanicsCountBadge');
  const iceToggle = document.getElementById('iceToggle');
  const portalToggle = document.getElementById('portalToggle');
  const fragileToggle = document.getElementById('fragileToggle');
  const fogToggle = document.getElementById('fogToggle');
  const mechanicsToggles = [iceToggle, portalToggle, fragileToggle, fogToggle];
  const aiDiffRow = document.getElementById('aiDiffRow');
  const diffBtns = Array.from(document.querySelectorAll('.diff-btn'));
  const startGameBtn = document.getElementById('startGameBtn');
  const startOnlineBtn = document.getElementById('startOnlineBtn');
  const startRulesBtn = document.getElementById('startRulesBtn');
  const homeBtn = document.getElementById('homeBtn');
  const scoreBar = document.getElementById('scoreBar');
  const sdBadge = document.getElementById('sdBadge');

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const boardWrap = document.getElementById('boardWrap');
  const toastEl = document.getElementById('toast');
  const turnAlertEl = document.getElementById('turnAlert');
  let turnAlertTimer = null;
  const card1 = document.getElementById('card1');
  const card2 = document.getElementById('card2');
  const sticks1 = document.getElementById('sticks1');
  const sticks2 = document.getElementById('sticks2');
  const name1Input = document.getElementById('name1');
  const name2Input = document.getElementById('name2');
  const turnTimerCircle = document.getElementById('turnTimerCircle');
  const turnTimerText = document.getElementById('turnTimerText');
  const vsRevealOverlay = document.getElementById('vsRevealOverlay');
  const vsPingVal = document.getElementById('vsPingVal');
  const vsAvatar1 = document.getElementById('vsAvatar1');
  const vsAvatar2 = document.getElementById('vsAvatar2');
  const vsInitial1 = document.getElementById('vsInitial1');
  const vsInitial2 = document.getElementById('vsInitial2');
  const vsName1 = document.getElementById('vsName1');
  const vsName2 = document.getElementById('vsName2');
  const vsTier1 = document.getElementById('vsTier1');
  const vsTier2 = document.getElementById('vsTier2');
  const vsRating1 = document.getElementById('vsRating1');
  const vsRating2 = document.getElementById('vsRating2');
  const vsStatusLine = document.getElementById('vsStatusLine');
  const moveModeBtn = document.getElementById('moveModeBtn');
  const wallModeBtn = document.getElementById('wallModeBtn');
  const breakModeBtn = document.getElementById('breakModeBtn');
  const breakBadge = document.getElementById('breakBadge');
  const restartBtn = document.getElementById('restartBtn');
  const hintBtn = document.getElementById('hintBtn');
  const hudRow = document.getElementById('hudRow');
  const winOverlay = document.getElementById('winOverlay');
  const winTitle = document.getElementById('winTitle');
  const winDot = document.getElementById('winDot');
  const winFlagBanner = document.getElementById('winFlagBanner');
  const winExitBtn = document.getElementById('winExitBtn');
  const winnerChip = document.getElementById('winnerChip');
  const winnerChipName = document.getElementById('winnerChipName');
  const winnerChipBonus = document.getElementById('winnerChipBonus');
  const gsTime = document.getElementById('gsTime');
  const gsMoves = document.getElementById('gsMoves');
  const gsWalls = document.getElementById('gsWalls');
  const gameResultBox = document.getElementById('gameResultBox');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const rulesBtn = document.getElementById('rulesBtn');
  const rulesOverlay = document.getElementById('rulesOverlay');
  const closeRules = document.getElementById('closeRules');
  const closeRules2 = document.getElementById('closeRules2');

  const tutorialBtn = document.getElementById('tutorialBtn');
  const tutorialNewBadge = document.getElementById('tutorialNewBadge');
  const tutorialOverlay = document.getElementById('tutorialOverlay');
  const closeTutorial = document.getElementById('closeTutorial');
  const tutProgress = document.getElementById('tutProgress');
  const tutStepTitle = document.getElementById('tutStepTitle');
  const tutStepText = document.getElementById('tutStepText');
  const tutBoard = document.getElementById('tutBoard');
  const tutGrid = document.getElementById('tutGrid');
  const tutItemsGrid = document.getElementById('tutItemsGrid');
  const tutPrevBtn = document.getElementById('tutPrevBtn');
  const tutNextBtn = document.getElementById('tutNextBtn');
  const tutSkipBtn = document.getElementById('tutSkipBtn');

  const profileBtn = document.getElementById('profileBtn');
  const startProfileBtn = document.getElementById('startProfileBtn');
  const profileOverlay = document.getElementById('profileOverlay');
  const closeProfile = document.getElementById('closeProfile');
  const closeProfile2 = document.getElementById('closeProfile2');
  const statGamesEl = document.getElementById('statGames');
  const statWinsEl = document.getElementById('statWins');
  const statFastestEl = document.getElementById('statFastest');
  const statMostWallsEl = document.getElementById('statMostWalls');
  const badgeListEl = document.getElementById('badgeList');
  const rankCard = document.getElementById('rankCard');
  const rankIconEl = document.getElementById('rankIcon');
  const rankTierNameEl = document.getElementById('rankTierName');
  const rankRatingNumEl = document.getElementById('rankRatingNum');
  const rankWeekLineEl = document.getElementById('rankWeekLine');
  const profileNameDisplayEl = document.getElementById('profileNameDisplay');
  const weekHistoryListEl = document.getElementById('weekHistoryList');
  const profileInitialEl = document.getElementById('profileInitial');
  const profileXpFillEl = document.getElementById('profileXpFill');
  const winrateRingEl = document.getElementById('winrateRing');
  const winratePctEl = document.getElementById('winratePct');
  const hudAvatar1El = document.getElementById('hudAvatar1');
  const hudAvatar2El = document.getElementById('hudAvatar2');
  const rating1El = document.getElementById('rating1');
  const rating2El = document.getElementById('rating2');
  const setupInitial1El = document.getElementById('setupInitial1');
  const setupInitial2El = document.getElementById('setupInitial2');
  const openInviteFromProfileBtn = document.getElementById('openInviteFromProfileBtn');
  const inviteOverlay = document.getElementById('inviteOverlay');
  const closeInvite = document.getElementById('closeInvite');
  const closeInvite2 = document.getElementById('closeInvite2');
  const inviteLinkInput = document.getElementById('inviteLinkInput');
  const copyInviteBtn = document.getElementById('copyInviteBtn');
  const shareInviteBtn = document.getElementById('shareInviteBtn');
  const inviteShareCountEl = document.getElementById('inviteShareCount');
  const shareResultBtn = document.getElementById('shareResultBtn');
  const rankResultBox = document.getElementById('rankResultBox');
  const rankResultTierIcon = document.getElementById('rankResultTierIcon');
  const rankResultTier = document.getElementById('rankResultTier');
  const rankResultRating = document.getElementById('rankResultRating');
  const rankResultDelta = document.getElementById('rankResultDelta');
  const badgePopEl = document.getElementById('badgePop');

  const coinBalStart = document.getElementById('coinBalStart');
  const coinBalApp = document.getElementById('coinBalApp');
  const coinPillStart = document.getElementById('coinPillStart');
  const coinPillApp = document.getElementById('coinPillApp');
  const shopBtnStart = document.getElementById('shopBtnStart');
  const shopBtnApp = document.getElementById('shopBtnApp');
  const shopOverlay = document.getElementById('shopOverlay');
  const closeShop = document.getElementById('closeShop');
  const closeShop2 = document.getElementById('closeShop2');
  const shopCoinBal = document.getElementById('shopCoinBal');
  const shopTabBtns = Array.from(document.querySelectorAll('.shop-tab'));
  const shopDescEl = document.getElementById('shopDesc');
  const shopGridEl = document.getElementById('shopGrid');

  const dailyBtn = document.getElementById('dailyBtn');
  const dailyOverlay = document.getElementById('dailyOverlay');
  const closeDaily = document.getElementById('closeDaily');
  const dailyDateLabel = document.getElementById('dailyDateLabel');
  const dailyStreakEl = document.getElementById('dailyStreakEl');
  const dailyBestEl = document.getElementById('dailyBestEl');
  const dailyWeekEl = document.getElementById('dailyWeekEl');
  const dailyStatusMsg = document.getElementById('dailyStatusMsg');
  const startDailyBtn = document.getElementById('startDailyBtn');
  const winSubtitle = document.getElementById('winSubtitle');
  const dailyResultBox = document.getElementById('dailyResultBox');
  const dailyResultStars = document.getElementById('dailyResultStars');
  const dailyResultTime = document.getElementById('dailyResultTime');
  const dailyResultMoves = document.getElementById('dailyResultMoves');
  const dailyResultBest = document.getElementById('dailyResultBest');
  const dailyResultStreak = document.getElementById('dailyResultStreak');

  const puzzleBtn = document.getElementById('puzzleBtn');
  const puzzleOverlay = document.getElementById('puzzleOverlay');
  const closePuzzle = document.getElementById('closePuzzle');
  const closePuzzle2 = document.getElementById('closePuzzle2');
  const puzzleListEl = document.getElementById('puzzleListEl');
  const puzzleBar = document.getElementById('puzzleBar');
  const puzzleBarName = document.getElementById('puzzleBarName');
  const puzzleBarMoves = document.getElementById('puzzleBarMoves');
  const puzzleBarPar = document.getElementById('puzzleBarPar');
  const puzzleBarListBtn = document.getElementById('puzzleBarListBtn');
  const puzzleResultBox = document.getElementById('puzzleResultBox');
  const puzzleResultStars = document.getElementById('puzzleResultStars');
  const puzzleResultMoves = document.getElementById('puzzleResultMoves');
  const puzzleResultPar = document.getElementById('puzzleResultPar');
  const puzzleResultBest = document.getElementById('puzzleResultBest');
  const puzzleNextBtn = document.getElementById('puzzleNextBtn');
  const puzzleListBtn2 = document.getElementById('puzzleListBtn2');

  const onlineBtn = document.getElementById('onlineBtn');
  const onlineOverlay = document.getElementById('onlineOverlay');
  const closeOnline = document.getElementById('closeOnline');
  const onlineMenuView = document.getElementById('onlineMenuView');
  const onlineCreateView = document.getElementById('onlineCreateView');
  const onlineJoinView = document.getElementById('onlineJoinView');
  const onlineQuickView = document.getElementById('onlineQuickView');
  const onlineStakeView = document.getElementById('onlineStakeView');
  const stakeCoinBal = document.getElementById('stakeCoinBal');
  const stakeGrid = document.getElementById('stakeGrid');
  const backFromStake = document.getElementById('backFromStake');
  const quickStakeLabel = document.getElementById('quickStakeLabel');
  const quickPlayBtn = document.getElementById('quickPlayBtn');
  const quickStatus = document.getElementById('quickStatus');
  const quickSpinner = document.getElementById('quickSpinner');
  const backFromQuick = document.getElementById('backFromQuick');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const backFromCreate = document.getElementById('backFromCreate');
  const backFromJoin = document.getElementById('backFromJoin');
  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const createStatus = document.getElementById('createStatus');
  const createSpinner = document.getElementById('createSpinner');
  const joinCodeInput = document.getElementById('joinCodeInput');
  const joinStatus = document.getElementById('joinStatus');
  const connectBtn = document.getElementById('connectBtn');
  const roomBadge = document.getElementById('roomBadge');
  const roomBadgeText = document.getElementById('roomBadgeText');
  const leaveRoomBtn = document.getElementById('leaveRoomBtn');
  const reactionBtn = document.getElementById('reactionBtn');
  const reactionPicker = document.getElementById('reactionPicker');

  const tournamentBtn = document.getElementById('tournamentBtn');
  const tournamentOverlay = document.getElementById('tournamentOverlay');
  const tournamentPanel = document.getElementById('tournamentPanel');
  const closeTournament = document.getElementById('closeTournament');
  const tMenuView = document.getElementById('tMenuView');
  const tCreateView = document.getElementById('tCreateView');
  const tJoinCodeView = document.getElementById('tJoinCodeView');
  const tLobbyView = document.getElementById('tLobbyView');
  const tCreateBtn = document.getElementById('tCreateBtn');
  const tJoinBtn = document.getElementById('tJoinBtn');
  const tCodeDisplay = document.getElementById('tCodeDisplay');
  const tSlotList = document.getElementById('tSlotList');
  const tCreateStatus = document.getElementById('tCreateStatus');
  const tStartBtn = document.getElementById('tStartBtn');
  const tBackFromCreate = document.getElementById('tBackFromCreate');
  const tJoinCodeInput = document.getElementById('tJoinCodeInput');
  const tJoinStatus = document.getElementById('tJoinStatus');
  const tConnectBtn = document.getElementById('tConnectBtn');
  const tBackFromJoin = document.getElementById('tBackFromJoin');
  const tLobbySlotList = document.getElementById('tLobbySlotList');
  const tLobbyStatus = document.getElementById('tLobbyStatus');
  const tLeaveLobbyBtn = document.getElementById('tLeaveLobbyBtn');
  const tBracketBtn = document.getElementById('tBracketBtn');
  const tBracketOverlay = document.getElementById('tBracketOverlay');
  const tBracketList = document.getElementById('tBracketList');
  const closeTBracket = document.getElementById('closeTBracket');
  const closeTBracket2 = document.getElementById('closeTBracket2');
  const tChampionOverlay = document.getElementById('tChampionOverlay');
  const tChampionDot = document.getElementById('tChampionDot');
  const tChampionTitle = document.getElementById('tChampionTitle');
  const tChampionSubtitle = document.getElementById('tChampionSubtitle');
  const tChampionBracketList = document.getElementById('tChampionBracketList');
  const tChampionHomeBtn = document.getElementById('tChampionHomeBtn');
  const tSpectateBanner = document.getElementById('tSpectateBanner');
  const tMatchResultBox = document.getElementById('tMatchResultBox');
  const tMatchRoundLabel = document.getElementById('tMatchRoundLabel');
  const tMatchStatusLabel = document.getElementById('tMatchStatusLabel');
  const tNextMatchBtn = document.getElementById('tNextMatchBtn');

  let cell = 0, dpr = 1;
  let selectedEdge = null;

  let canvasRect = null;
  function resize(){
    const rect = boardWrap.getBoundingClientRect();
    const size = Math.min(rect.width - 20, rect.height - 20);
    dpr = window.devicePixelRatio || 1;
    canvas.width = size*dpr;
    canvas.height = size*dpr;
    canvas.style.width = size+'px';
    canvas.style.height = size+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cell = size / N;
    canvasRect = canvas.getBoundingClientRect();
    markBoardBgDirty();
    draw();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', ()=> setTimeout(resize, 60));
  if(window.visualViewport){ window.visualViewport.addEventListener('resize', resize); }
  window.addEventListener('scroll', ()=>{ canvasRect = canvas.getBoundingClientRect(); }, {passive:true});

  // ---------- theme / setup helpers ----------
  function dotGradient(t){
    return `radial-gradient(circle at 35% 30%, ${t.glow}, ${t.base} 60%, ${t.dark} 100%)`;
  }
  function updateSetupDot(idx){
    const dot = idx===0 ? setupDot1 : setupDot2;
    dot.style.background = dotGradient(themeOf(idx));
  }
  function buildSwatches(container, idx){
    container.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const unlocked = isThemeUnlocked(i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (playerTheme[idx]===i ? ' selected' : '') + (unlocked ? '' : ' locked');
      b.style.background = dotGradient(t);
      b.title = unlocked ? t.name : (t.name + ' — قفل');
      if(!unlocked) b.innerHTML = '<span class="lock-ico">🔒</span>';
      b.addEventListener('click', ()=>{
        if(!isThemeUnlocked(i)){ toast('🔒 پوسته‌ی «' + t.name + '» ' + themeUnlockDesc(i)); vibrate(10); return; }
        if(playerTheme[1-idx]===i){ toast('این رنگ دستِ بازیکنِ دیگه‌ست'); return; }
        playerTheme[idx] = i;
        buildSwatches(container, idx);
        updateSetupDot(idx);
      });
      container.appendChild(b);
    });
  }
  function applyPlayerColors(){
    [0,1].forEach(idx=>{
      const t = themeOf(idx);
      const card = idx===0 ? card1 : card2;
      card.querySelector('.dot').style.background = dotGradient(t);
      card.style.setProperty('--turn-color', t.base);
      const avatarEl = idx===0 ? hudAvatar1El : hudAvatar2El;
      const initEl = avatarEl && avatarEl.querySelector('.avatar-initial');
      if(initEl){
        const glyph = avatarGlyphFor(idx);
        if(glyph){
          initEl.textContent = glyph;
        } else {
          const nm = (playerNames[idx]||'').trim();
          initEl.textContent = nm ? nm.charAt(0) : (idx===0 ? '۱' : '۲');
        }
      }
    });
  }
  function updateScoreBar(){
    if(sessionScore[0]===0 && sessionScore[1]===0){ scoreBar.classList.add('hidden'); return; }
    scoreBar.classList.remove('hidden');
    scoreBar.textContent = playerNames[0] + ' ' + toFa(sessionScore[0]) + '  —  ' + toFa(sessionScore[1]) + ' ' + playerNames[1];
  }
  function currentTurnSeconds(){
    if(suddenDeathEnabled && state.gameStart && (performance.now()-state.gameStart) >= SUDDEN_DEATH_DELAY_MS) return SUDDEN_DEATH_SECONDS;
    return TURN_SECONDS;
  }

  // ---------- helpers ----------
  function edgeVKey(x,y){ return x+','+y; }
  function edgeHKey(x,y){ return x+','+y; }

  function blockedBetween(ax,ay,bx,by){
    if(ax===bx){
      const y = Math.min(ay,by);
      return state.wallsH.has(edgeHKey(ax,y));
    } else {
      const x = Math.min(ax,bx);
      return state.wallsV.has(edgeVKey(x,ay));
    }
  }

  function occupied(x,y, excludePlayer){
    for(let i=0;i<2;i++){
      if(i===excludePlayer) continue;
      if(state.pos[i].x===x && state.pos[i].y===y) return true;
    }
    return false;
  }

  function inBounds(x,y){ return x>=0 && x<N && y>=0 && y<N; }

  function legalMoves(playerIdx){
    const p = state.pos[playerIdx];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const out = [];
    for(const [dx,dy] of dirs){
      const nx=p.x+dx, ny=p.y+dy;
      if(!inBounds(nx,ny)) continue;
      if(blockedBetween(p.x,p.y,nx,ny)) continue;
      if(occupied(nx,ny, playerIdx)) continue;
      out.push({x:nx,y:ny});
    }
    return out;
  }

  function pathExists(startX, startY, goalRow){
    const visited = new Set();
    const queue = [[startX,startY]];
    visited.add(startX+','+startY);
    while(queue.length){
      const [x,y] = queue.shift();
      if(y===goalRow) return true;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of dirs){
        const nx=x+dx, ny=y+dy;
        if(!inBounds(nx,ny)) continue;
        if(blockedBetween(x,y,nx,ny)) continue;
        const k = nx+','+ny;
        if(visited.has(k)) continue;
        visited.add(k);
        queue.push([nx,ny]);
      }
    }
    return false;
  }

  function bothPathsOk(){
    return pathExists(state.pos[0].x, state.pos[0].y, state.goal[0]) &&
           pathExists(state.pos[1].x, state.pos[1].y, state.goal[1]);
  }

  // ---------- AI opponent engine ----------
  function bfsDist(startX, startY, goalRow){
    if(startY===goalRow) return 0;
    const visited = new Set([startX+','+startY]);
    let frontier = [[startX,startY]];
    let dist = 0;
    while(frontier.length){
      dist++;
      const nf = [];
      for(const [x,y] of frontier){
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of dirs){
          const nx=x+dx, ny=y+dy;
          if(!inBounds(nx,ny)) continue;
          if(blockedBetween(x,y,nx,ny)) continue;
          const k = nx+','+ny;
          if(visited.has(k)) continue;
          visited.add(k);
          if(ny===goalRow) return dist;
          nf.push([nx,ny]);
        }
      }
      frontier = nf;
      if(dist>200) return Infinity; // safety valve
    }
    return Infinity;
  }

  // returns the shortest path (array of {x,y}, including the start cell) from
  // (startX,startY) to the nearest cell in goalRow, or null if none exists.
  function bfsPath(startX, startY, goalRow){
    const startKey = startX+','+startY;
    if(startY===goalRow) return [{x:startX,y:startY}];
    const visited = new Set([startKey]);
    const prev = {};
    let frontier = [[startX,startY]];
    let guard = 0;
    while(frontier.length){
      guard++;
      const nf = [];
      for(const [x,y] of frontier){
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of dirs){
          const nx=x+dx, ny=y+dy;
          if(!inBounds(nx,ny)) continue;
          if(blockedBetween(x,y,nx,ny)) continue;
          const k = nx+','+ny;
          if(visited.has(k)) continue;
          visited.add(k);
          prev[k] = x+','+y;
          if(ny===goalRow){
            const path = [k];
            let cur = k;
            while(cur !== startKey){
              cur = prev[cur];
              path.push(cur);
            }
            path.reverse();
            return path.map(s=>{ const [px,py]=s.split(',').map(Number); return {x:px,y:py}; });
          }
          nf.push([nx,ny]);
        }
      }
      frontier = nf;
      if(guard>200) return null;
    }
    return null;
  }

  const HINT_COST = 5;
  function useHint(){
    if(state.over) return;
    if(onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
    if(aiEnabled && state.turn===aiIdx){ toast('نوبتِ ربات 🤖'); return; }
    if(tournamentMode && myRole===null){ return; }
    const idx = state.turn;
    const path = bfsPath(state.pos[idx].x, state.pos[idx].y, state.goal[idx]);
    if(!path || path.length<2){ toast('راهی پیدا نشد!'); return; }
    if(!spendCoins(HINT_COST)){
      toast('🪙 سکه‌ت کافی نیست! راهنما ۵ سکه لازم داره');
      vibrate(15); playSound('error');
      return;
    }
    state.hintPath = path;
    state.hintExpire = performance.now() + 3200;
    toast('💡 راهنما فعال شد (−۵ سکه)');
    vibrate(10); playSound('item');
    requestAnimationFrame(draw);
  }

  function enumerateValidWalls(){
    const out = [];
    for(let x=0;x<N-1;x++){
      for(let y=0;y<N;y++){
        const key = x+','+y;
        if(state.wallsV.has(key)) continue;
        state.wallsV.add(key);
        const ok = bothPathsOk();
        state.wallsV.delete(key);
        if(ok) out.push({type:'v', x, y});
      }
    }
    for(let x=0;x<N;x++){
      for(let y=0;y<N-1;y++){
        const key = x+','+y;
        if(state.wallsH.has(key)) continue;
        state.wallsH.add(key);
        const ok = bothPathsOk();
        state.wallsH.delete(key);
        if(ok) out.push({type:'h', x, y});
      }
    }
    return out;
  }

  function scoreWallCandidates(pIdx, myDistBefore, oppDistBefore){
    const oppIdx = 1-pIdx;
    const myPos = state.pos[pIdx], oppPos = state.pos[oppIdx];
    const goalRow = state.goal[pIdx], oppGoalRow = state.goal[oppIdx];
    return enumerateValidWalls().map(w=>{
      const key = w.x+','+w.y;
      if(w.type==='v') state.wallsV.add(key); else state.wallsH.add(key);
      const oppD = bfsDist(oppPos.x, oppPos.y, oppGoalRow);
      const myD = bfsDist(myPos.x, myPos.y, goalRow);
      if(w.type==='v') state.wallsV.delete(key); else state.wallsH.delete(key);
      const score = (oppD - oppDistBefore) - (myD - myDistBefore);
      return {type:w.type, x:w.x, y:w.y, score, oppD, myD};
    }).sort((a,b)=> b.score - a.score);
  }

  function aiDecideEasy(moves, wallCandidates){
    const r = Math.random();
    if(wallCandidates.length && state.sticksLeft[aiIdx]>0 && r<0.08){
      const pool = wallCandidates.slice(0, Math.min(10, wallCandidates.length));
      return {kind:'wall', wall: pool[Math.floor(Math.random()*pool.length)]};
    }
    if(r<0.55) return {kind:'move', move: moves[Math.floor(Math.random()*moves.length)]};
    return {kind:'move', move: moves[0]};
  }

  function aiDecideMedium(moves, wallCandidates, myDistBefore, oppDistBefore){
    const bestWall = wallCandidates[0];
    const oppAheadOrTied = oppDistBefore <= myDistBefore;
    if(bestWall && bestWall.score>0 && state.sticksLeft[aiIdx]>0 && oppAheadOrTied && Math.random()<0.55){
      return {kind:'wall', wall:bestWall};
    }
    const top = moves.filter(m=> m.dist <= moves[0].dist+1);
    const pick = Math.random()<0.75 ? moves[0] : top[Math.floor(Math.random()*top.length)];
    return {kind:'move', move:pick};
  }

  function aiDecideHard(moves, wallCandidates, myDistBefore, oppDistBefore){
    const oppIdx = 1-aiIdx;
    const oppPos = state.pos[oppIdx];
    const oppGoalRow = state.goal[oppIdx];
    const goalRow = state.goal[aiIdx];
    const candidates = [];
    moves.forEach(m=> candidates.push({kind:'move', move:m, score:(myDistBefore-m.dist)}));
    wallCandidates.slice(0,10).forEach(w=>{
      if(w.score>0) candidates.push({kind:'wall', wall:w, score:w.score*1.15});
    });
    candidates.sort((a,b)=> b.score-a.score);
    const shortlist = candidates.slice(0,6);
    let best = null, bestNet = -Infinity;
    shortlist.forEach(c=>{
      let removedKey=null, removedType=null, origPos=null;
      if(c.kind==='wall'){
        removedKey = c.wall.x+','+c.wall.y; removedType = c.wall.type;
        if(removedType==='v') state.wallsV.add(removedKey); else state.wallsH.add(removedKey);
      } else {
        origPos = state.pos[aiIdx];
        state.pos[aiIdx] = {x:c.move.x, y:c.move.y};
      }
      const oppMoves = legalMoves(oppIdx);
      let oppBestDist = bfsDist(oppPos.x, oppPos.y, oppGoalRow);
      oppMoves.forEach(om=>{
        const d = bfsDist(om.x, om.y, oppGoalRow);
        if(d<oppBestDist) oppBestDist = d;
      });
      const myDistAfter = bfsDist(state.pos[aiIdx].x, state.pos[aiIdx].y, goalRow);
      const net = (oppBestDist - oppDistBefore) - (myDistAfter - myDistBefore);
      if(c.kind==='wall'){
        if(removedType==='v') state.wallsV.delete(removedKey); else state.wallsH.delete(removedKey);
      } else {
        state.pos[aiIdx] = origPos;
      }
      if(net>bestNet){ bestNet=net; best=c; }
    });
    return best || {kind:'move', move: moves[0]};
  }

  function performAiAction(){
    const pIdx = aiIdx, oppIdx = 1-aiIdx;
    const goalRow = state.goal[pIdx], oppGoalRow = state.goal[oppIdx];
    const myPos = state.pos[pIdx], oppPos = state.pos[oppIdx];
    const myDistBefore = bfsDist(myPos.x, myPos.y, goalRow);
    const oppDistBefore = bfsDist(oppPos.x, oppPos.y, oppGoalRow);
    const moves = legalMoves(pIdx).map(m=> ({x:m.x, y:m.y, dist: bfsDist(m.x, m.y, goalRow)})).sort((a,b)=>a.dist-b.dist);
    if(!moves.length){ endTurn(); maybeSpawnItem(); draw(); return; }
    const wallCandidates = state.sticksLeft[pIdx]>0 ? scoreWallCandidates(pIdx, myDistBefore, oppDistBefore) : [];

    let action;
    if(aiDifficulty==='easy') action = aiDecideEasy(moves, wallCandidates);
    else if(aiDifficulty==='hard') action = aiDecideHard(moves, wallCandidates, myDistBefore, oppDistBefore);
    else action = aiDecideMedium(moves, wallCandidates, myDistBefore, oppDistBefore);

    if(action && action.kind==='wall' && action.wall){
      tryPlaceWall(action.wall.type, action.wall.x, action.wall.y, true);
    } else if(action && action.kind==='move' && action.move){
      tryMove(pIdx, action.move.x, action.move.y, true);
    } else {
      tryMove(pIdx, moves[0].x, moves[0].y, true);
    }
    if(state.anim) requestAnimationFrame(draw); else draw();
  }

  function maybeTriggerAI(){
    if(!aiEnabled || state.over || state.turn!==aiIdx || aiThinking) return;
    aiThinking = true;
    const delay = 550 + Math.random()*550;
    setTimeout(()=>{
      aiThinking = false;
      if(!aiEnabled || state.over || state.turn!==aiIdx) return;
      performAiAction();
    }, delay);
  }

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 1600);
  }

  function vibrate(ms){
    if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} }
  }

  // ---- online: instantly tell the local player the turn is now theirs ----
  function announceYourTurn(){
    vibrate([20,60,20,60,30]);
    playSound('yourturn');
    if(turnAlertEl){
      turnAlertEl.classList.remove('show');
      void turnAlertEl.offsetWidth; // restart CSS animation
      turnAlertEl.classList.add('show');
      clearTimeout(turnAlertTimer);
      turnAlertTimer = setTimeout(()=> turnAlertEl.classList.remove('show'), 1500);
    }
    const myCard = myRole===0 ? card1 : (myRole===1 ? card2 : null);
    if(myCard){
      myCard.classList.remove('turn-flash');
      void myCard.offsetWidth;
      myCard.classList.add('turn-flash');
      setTimeout(()=> myCard.classList.remove('turn-flash'), 900);
    }
  }
  // light tactile tick on every button tap across the app (menus, tabs, icons...)
  document.addEventListener('pointerdown', (e)=>{
    if(e.target.closest('button')){ vibrate(6); playSound('click'); }
  }, {passive:true});

  // ---------- sound fx (synthesized, no external files) ----------
  const AUDIO_KEY = 'mesirAzad_audio_v1';
  let audioSettings = {sfx:0.85, music:0.5, muted:false};
  (function loadAudioSettings(){
    try{
      const raw = localStorage.getItem(AUDIO_KEY);
      if(raw){
        const d = JSON.parse(raw);
        if(typeof d.sfx==='number') audioSettings.sfx = d.sfx;
        if(typeof d.music==='number') audioSettings.music = d.music;
        if(typeof d.muted==='boolean') audioSettings.muted = d.muted;
      }
    }catch(e){}
  })();
  function saveAudioSettings(){
    try{ localStorage.setItem(AUDIO_KEY, JSON.stringify(audioSettings)); }catch(e){}
  }

  let actx = null;
  function getActx(){
    if(!actx){
      try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    }
    if(actx.state === 'suspended'){ try{ actx.resume(); }catch(e){} }
    return actx;
  }
  function beep(freq, dur, type, gainVal, delay){
    if(audioSettings.muted) return;
    const ac = getActx();
    if(!ac) return;
    const vol = (gainVal||0.12) * audioSettings.sfx;
    if(vol <= 0) return;
    const t0 = ac.currentTime + (delay||0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  }
  function playSound(kind){
    try{
      if(kind==='move') beep(320, .09, 'triangle', .09);
      else if(kind==='wall') beep(140, .14, 'square', .1);
      else if(kind==='break'){ beep(90,.18,'sawtooth',.14); beep(60,.22,'square',.1,.05); }
      else if(kind==='item') { beep(660,.09,'sine',.11); beep(880,.12,'sine',.1,.09); }
      else if(kind==='shield') beep(500,.15,'triangle',.1);
      else if(kind==='freeze') beep(760,.18,'sine',.09);
      else if(kind==='error') beep(160,.12,'sawtooth',.08);
      else if(kind==='click') beep(700,.035,'square',.05);
      else if(kind==='win'){
        [523,659,784,1046].forEach((f,i)=> beep(f,.22,'triangle',.13,i*0.11));
      } else if(kind==='lose'){
        [392,330,262].forEach((f,i)=> beep(f,.26,'sawtooth',.1,i*0.13));
      } else if(kind==='timeout') beep(220,.16,'square',.1);
      else if(kind==='yourturn'){ beep(523,.11,'sine',.13); beep(784,.16,'sine',.12,.1); }
    }catch(e){}
  }

  // ---------- ambient menu music (synthesized loop, no external files) ----------
  let musicGain = null, musicNodes = [], musicPlaying = false;
  const MENU_CHORD = [130.81, 164.81, 196.00, 246.94]; // Cm-ish soft pad (C3 E3b-ish G3 B3)
  function startMenuMusic(){
    if(musicPlaying || audioSettings.muted || audioSettings.music<=0) return;
    const ac = getActx();
    if(!ac) return;
    musicPlaying = true;
    musicGain = ac.createGain();
    musicGain.gain.value = audioSettings.music * 0.16;
    musicGain.connect(ac.destination);
    MENU_CHORD.forEach((freq, i)=>{
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const voiceGain = ac.createGain();
      voiceGain.gain.value = 1/MENU_CHORD.length;
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.frequency.value = 0.08 + i*0.015;
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain); lfoGain.connect(voiceGain.gain);
      osc.connect(voiceGain); voiceGain.connect(musicGain);
      osc.start(); lfo.start();
      musicNodes.push(osc, lfo);
    });
  }
  function stopMenuMusic(){
    if(!musicPlaying) return;
    musicPlaying = false;
    musicNodes.forEach(n=>{ try{ n.stop(); }catch(e){} });
    musicNodes = [];
    if(musicGain){ try{ musicGain.disconnect(); }catch(e){} musicGain = null; }
  }
  function applyAudioSettingsLive(){
    if(musicGain) musicGain.gain.value = audioSettings.muted ? 0 : audioSettings.music * 0.16;
    if(!audioSettings.muted && audioSettings.music>0) startMenuMusic();
    if(audioSettings.muted || audioSettings.music<=0) stopMenuMusic();
    if(sdMusicGain) sdMusicGain.gain.value = audioSettings.muted ? 0 : audioSettings.music * 0.2;
    if(audioSettings.muted || audioSettings.music<=0) stopSuddenDeathMusic();
  }

  // ---------- sudden-death tension music (synthesized, no external files) ----------
  let sdMusicPlaying = false, sdMusicNodes = [], sdMusicGain = null, sdMusicBeatTimer = null;
  function startSuddenDeathMusic(){
    if(sdMusicPlaying || audioSettings.muted || audioSettings.music<=0) return;
    const ac = getActx();
    if(!ac) return;
    sdMusicPlaying = true;
    stopMenuMusic();
    sdMusicGain = ac.createGain();
    sdMusicGain.gain.value = audioSettings.music * 0.2;
    sdMusicGain.connect(ac.destination);
    // low dissonant drone — two close, slightly detuned tones for unease
    [55, 58.3].forEach(freq=>{
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const voiceGain = ac.createGain();
      voiceGain.gain.value = 0.22;
      osc.connect(voiceGain); voiceGain.connect(sdMusicGain);
      osc.start();
      sdMusicNodes.push(osc);
    });
    // accelerating heartbeat-like pulse to build tension
    let beat = 0;
    const doBeat = ()=>{
      if(!sdMusicPlaying) return;
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.exponentialRampToValueAtTime(45, t0+0.16);
      g.gain.setValueAtTime(0.3, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+0.18);
      osc.connect(g); g.connect(sdMusicGain);
      osc.start(t0); osc.stop(t0+0.2);
      beat++;
      const interval = Math.max(420, 620 - beat*6); // gradually speeds up
      sdMusicBeatTimer = setTimeout(doBeat, interval);
    };
    doBeat();
  }
  function stopSuddenDeathMusic(){
    if(!sdMusicPlaying) return;
    sdMusicPlaying = false;
    clearTimeout(sdMusicBeatTimer);
    sdMusicBeatTimer = null;
    sdMusicNodes.forEach(n=>{ try{ n.stop(); }catch(e){} });
    sdMusicNodes = [];
    if(sdMusicGain){ try{ sdMusicGain.disconnect(); }catch(e){} sdMusicGain = null; }
  }

  // ---------- interactive tutorial ----------
  const TUT_CELL = 36, TUT_GAP = 6, TUT_STEP = TUT_CELL + TUT_GAP; // 42
  const TUT_ITEMS_INFO = [
    {ico:'🪵', name:'چوب', desc:'۲ چوبِ اضافه میده'},
    {ico:'⚡', name:'برق', desc:'یه حرکتِ اضافه بدونِ از دست دادنِ نوبت'},
    {ico:'🛡', name:'سپر', desc:'دیوارِ بعدیِ حریف رو بی‌اثر می‌کنه'},
    {ico:'❄️', name:'یخ', desc:'نوبتِ بعدیِ حریف رو می‌پرونه'},
    {ico:'👁', name:'دیدِ حریف', desc:'چند ثانیه چوب‌های حریف رو محو می‌کنه'},
    {ico:'🌀', name:'جهش', desc:'دو خونه به سمتِ هدفت می‌پری'},
    {ico:'🔨', name:'چکش', desc:'یه خیبرشکنِ اضافه میده'},
    {ico:'🔄', name:'جابجایی', desc:'جای تو و حریف عوض میشه'},
    {ico:'💰', name:'دزدی', desc:'یه چوب از حریفِ خودت می‌دزدی'},
    {ico:'🎁', name:'جعبه‌شانس', desc:'یکی از آیتم‌ها رو به‌طورِ تصادفی بهت میده'}
  ];

  function buildTutorialSteps(){
    return [
      {
        title:'خوش‌آمدی به مسیرِ آزاد! 👋', type:'board',
        text:'هدف ساده‌ست: بازیکنِ کهربایی (بالا) باید به ردیفِ پایین برسه؛ بازیکنِ فیروزه‌ای (پایین) باید به ردیفِ بالا برسه. هرکی زودتر برسه، برنده‌ست.',
        board:{p1:{x:2,y:0}, p2:{x:2,y:4}, wallsH:[], wallsV:[]}, interaction:null
      },
      {
        title:'حرکت کردن 🔵', type:'board',
        text:'هر نوبت یا حرکت می‌کنی، یا چوب می‌ذاری. رو خونه‌ی هایلایت‌شده بزن تا بازیکنِ کهربایی یه قدم جلو بره.',
        board:{p1:{x:2,y:0}, p2:{x:2,y:4}, wallsH:[], wallsV:[]},
        interaction:{kind:'move', target:{x:2,y:1}}
      },
      {
        title:'گذاشتنِ چوب 🪵', type:'board',
        text:'به‌جایِ حرکت، می‌تونی یه چوب بینِ دو خونه بذاری تا مسیرِ حریف رو طولانی‌تر کنی. رو خطِ هایلایت‌شده بزن.',
        board:{p1:{x:2,y:1}, p2:{x:2,y:4}, wallsH:[], wallsV:[]},
        interaction:{kind:'wall', target:{type:'h', x:1, y:3}}
      },
      {
        title:'قانونِ طلایی 🚫', type:'board',
        text:'هیچ‌وقت نمی‌تونی راهِ رفتنِ حریف رو کاملاً ببندی. بازیکنِ فیروزه‌ای تقریباً محاصره شده — رو خطِ قرمز بزن و ببین چی میشه.',
        board:{p1:{x:2,y:1}, p2:{x:2,y:4}, wallsH:[{x:1,y:3}], wallsV:[{x:1,y:4},{x:2,y:4}]},
        interaction:{kind:'wallBlocked', target:{type:'h', x:2, y:3}}
      },
      {
        title:'خیبرشکن 💥', type:'board',
        text:'هر بازیکن فقط یه‌بار می‌تونه یه چوبِ رو‌به‌رو رو — مالِ خودش یا حریف — کاملاً از بین ببره. رو چوبِ هایلایت‌شده بزن تا خیبرشکن بزنی.',
        board:{p1:{x:2,y:0}, p2:{x:2,y:4}, wallsH:[{x:2,y:1}], wallsV:[]},
        interaction:{kind:'break', target:{type:'h', x:2, y:1}}
      },
      {
        title:'آیتم‌ها 🎁', type:'items',
        text:'گاهی رو تخته آیتم ظاهر میشه. رو خونه‌ش وایسا تا بگیریش. رو هر آیکون بزن تا اثرش رو ببینی.',
        board:null, interaction:null
      },
      {
        title:'آماده‌ای؟ 🎮', type:'text', isLast:true,
        text:'هر نوبت ۲۵ ثانیه وقت داری؛ اگه تموم بشه، یه حرکتِ تصادفی خودکار انجام میشه. همین‌قدر کافیه — حالا وقتِ بازیِ واقعیه!',
        board:null, interaction:null
      }
    ];
  }
  let TUTORIAL_STEPS = buildTutorialSteps();
  let tutStepIdx = 0;

  function tutCellStyle(x,y){ return 'left:'+(x*TUT_STEP)+'px; top:'+(y*TUT_STEP)+'px; width:'+TUT_CELL+'px; height:'+TUT_CELL+'px;'; }
  function tutDotStyle(x,y){ const off=(TUT_CELL-26)/2; return 'left:'+(x*TUT_STEP+off)+'px; top:'+(y*TUT_STEP+off)+'px; width:26px; height:26px;'; }
  function tutVWallStyle(x,y){ return 'left:'+(x*TUT_STEP+TUT_CELL)+'px; top:'+(y*TUT_STEP)+'px; width:'+TUT_GAP+'px; height:'+TUT_CELL+'px;'; }
  function tutHWallStyle(x,y){ return 'left:'+(x*TUT_STEP)+'px; top:'+(y*TUT_STEP+TUT_CELL)+'px; width:'+TUT_CELL+'px; height:'+TUT_GAP+'px;'; }

  function buildTutBoard(step){
    tutGrid.innerHTML = '';
    const b = step.board;
    for(let y=0;y<5;y++){
      for(let x=0;x<5;x++){
        const cell = document.createElement('div');
        cell.className = 'tut-cell';
        cell.style.cssText = tutCellStyle(x,y);
        if(step.interaction && step.interaction.kind==='move' && !step.interaction._done &&
           step.interaction.target.x===x && step.interaction.target.y===y){
          cell.classList.add('tap');
          cell.addEventListener('click', ()=> handleTutMove(step));
        }
        tutGrid.appendChild(cell);
      }
    }
    (b.wallsH||[]).forEach(w=>{
      const el = document.createElement('div');
      el.className = 'tut-wall';
      el.style.cssText = tutHWallStyle(w.x, w.y);
      tutGrid.appendChild(el);
    });
    (b.wallsV||[]).forEach(w=>{
      const el = document.createElement('div');
      el.className = 'tut-wall';
      el.style.cssText = tutVWallStyle(w.x, w.y);
      tutGrid.appendChild(el);
    });
    if(step.interaction && !step.interaction._done &&
       (step.interaction.kind==='wall' || step.interaction.kind==='wallBlocked' || step.interaction.kind==='break')){
      const t = step.interaction.target;
      const el = document.createElement('div');
      el.className = 'tut-wall tap';
      el.style.cssText = t.type==='h' ? tutHWallStyle(t.x,t.y) : tutVWallStyle(t.x,t.y);
      el.addEventListener('click', ()=> handleTutWall(step, el));
      tutGrid.appendChild(el);
    }
    const d1 = document.createElement('div'); d1.className='tut-dot p1'; d1.style.cssText = tutDotStyle(b.p1.x, b.p1.y);
    const d2 = document.createElement('div'); d2.className='tut-dot p2'; d2.style.cssText = tutDotStyle(b.p2.x, b.p2.y);
    tutGrid.appendChild(d1); tutGrid.appendChild(d2);
  }

  function handleTutMove(step){
    const t = step.interaction.target;
    step.board.p1 = {x:t.x, y:t.y};
    step.interaction._done = true;
    vibrate(12); playSound('move');
    buildTutBoard(step);
    setTimeout(()=>{ if(tutorialOverlay.classList.contains('show')) goTutStep(tutStepIdx+1); }, 500);
  }

  function handleTutWall(step, el){
    const kind = step.interaction.kind;
    const t = step.interaction.target;
    if(kind==='wall'){
      vibrate(18); playSound('wall');
      step.interaction._done = true;
      (t.type==='h' ? step.board.wallsH : step.board.wallsV).push({x:t.x,y:t.y});
      buildTutBoard(step);
      setTimeout(()=>{ if(tutorialOverlay.classList.contains('show')) goTutStep(tutStepIdx+1); }, 550);
    } else if(kind==='wallBlocked'){
      el.classList.add('blocked');
      vibrate([10,40,10]); playSound('error');
      toast('این کار راهِ رفتنِ حریف رو کاملاً می‌بنده! غیرمجازه 🚫');
      setTimeout(()=> el.classList.remove('blocked'), 400);
    } else if(kind==='break'){
      vibrate([15,20,15]); playSound('break');
      step.interaction._done = true;
      const arr = t.type==='h' ? step.board.wallsH : step.board.wallsV;
      const i = arr.findIndex(w=> w.x===t.x && w.y===t.y);
      if(i>=0) arr.splice(i,1);
      buildTutBoard(step);
      setTimeout(()=>{ if(tutorialOverlay.classList.contains('show')) goTutStep(tutStepIdx+1); }, 550);
    }
  }

  function buildTutItems(){
    tutItemsGrid.innerHTML = '';
    TUT_ITEMS_INFO.forEach(it=>{
      const btn = document.createElement('button');
      btn.className = 'tut-item-ico';
      btn.textContent = it.ico;
      btn.addEventListener('click', ()=>{ toast(it.name + ' — ' + it.desc); vibrate(8); playSound('item'); });
      tutItemsGrid.appendChild(btn);
    });
  }

  function renderTutorialStep(){
    const step = TUTORIAL_STEPS[tutStepIdx];
    tutProgress.innerHTML = TUTORIAL_STEPS.map((s,i)=>
      '<span class="dot '+(i===tutStepIdx?'on':(i<tutStepIdx?'done':''))+'"></span>').join('');
    tutStepTitle.textContent = step.title;
    tutStepText.textContent = step.text;
    tutPrevBtn.disabled = tutStepIdx===0;
    tutPrevBtn.style.opacity = tutStepIdx===0 ? '.4' : '1';
    tutNextBtn.textContent = step.isLast ? 'بزن بریم! 🎮' : 'بعدی';
    tutBoard.classList.toggle('hidden', step.type!=='board');
    tutItemsGrid.classList.toggle('hidden', step.type!=='items');
    if(step.type==='board') buildTutBoard(step);
    else if(step.type==='items') buildTutItems();
  }

  function goTutStep(idx){
    if(idx < 0) idx = 0;
    if(idx >= TUTORIAL_STEPS.length){ finishTutorial(); return; }
    tutStepIdx = idx;
    renderTutorialStep();
  }

  function markTutorialSeen(){
    try{ localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); }catch(e){}
    tutorialNewBadge.classList.add('hidden');
  }

  function finishTutorial(){
    markTutorialSeen();
    tutorialOverlay.classList.remove('show');
    toast('آماده‌ای! بزن بریم 🎮');
  }

  function openTutorial(){
    TUTORIAL_STEPS = buildTutorialSteps();
    tutStepIdx = 0;
    renderTutorialStep();
    tutorialOverlay.classList.add('show');
  }

  tutorialBtn.addEventListener('click', openTutorial);
  closeTutorial.addEventListener('click', ()=> tutorialOverlay.classList.remove('show'));
  tutSkipBtn.addEventListener('click', ()=>{ markTutorialSeen(); tutorialOverlay.classList.remove('show'); });
  tutPrevBtn.addEventListener('click', ()=> goTutStep(tutStepIdx-1));
  tutNextBtn.addEventListener('click', ()=>{
    const step = TUTORIAL_STEPS[tutStepIdx];
    if(step.isLast){ finishTutorial(); return; }
    goTutStep(tutStepIdx+1);
  });

  try{
    if(!localStorage.getItem(TUTORIAL_SEEN_KEY)) tutorialNewBadge.classList.remove('hidden');
  }catch(e){}

  // ---------- quick reactions (online) ----------
  const REACTIONS = ['😄','😱','👏','😤','🤔','🔥'];
  function buildReactionPicker(){
    reactionPicker.innerHTML = '';
    REACTIONS.forEach(emoji=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reaction-emoji-btn';
      b.textContent = emoji;
      b.addEventListener('click', ()=>{
        sendReaction(emoji);
        closeReactionPicker();
      });
      reactionPicker.appendChild(b);
    });
  }
  function positionReactionPicker(){
    const r = reactionBtn.getBoundingClientRect();
    reactionPicker.style.top = (r.bottom + 8) + 'px';
    reactionPicker.style.left = Math.max(8, r.left - 150) + 'px';
  }
  function toggleReactionPicker(){
    if(reactionPicker.classList.contains('show')){ closeReactionPicker(); return; }
    positionReactionPicker();
    reactionPicker.classList.add('show');
  }
  function closeReactionPicker(){ reactionPicker.classList.remove('show'); }
  document.addEventListener('click', (e)=>{
    if(!reactionPicker.classList.contains('show')) return;
    if(e.target===reactionBtn || reactionBtn.contains(e.target)) return;
    if(reactionPicker.contains(e.target)) return;
    closeReactionPicker();
  });
  function sendReaction(emoji){
    if(!onlineMode) return;
    showFloatingReaction(myRole, emoji);
    sendAction({type:'reaction', idx:myRole, emoji:emoji});
  }
  function showFloatingReaction(idx, emoji){
    const card = idx===1 ? card2 : card1;
    const r = card.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'reaction-float';
    el.textContent = emoji;
    el.style.left = (r.left + r.width/2 - 14) + 'px';
    el.style.top = (r.top - 6) + 'px';
    document.body.appendChild(el);
    vibrate(8);
    setTimeout(()=> el.remove(), 1750);
  }
  function updateReactionUI(){
    reactionBtn.classList.toggle('show', onlineMode);
    tBracketBtn.classList.toggle('show', tournamentMode);
    restartBtn.classList.toggle('hidden', tournamentMode);
    if(!onlineMode) closeReactionPicker();
  }
  reactionBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleReactionPicker(); });
  buildReactionPicker();

  // ---------- networking ----------
  function sendAction(action){
    if(tournamentMode){
      if(myTournamentSlot===0){
        tournamentBroadcastAll(action);
      } else if(conn && conn.open){
        try{ conn.send(action); }catch(e){}
      }
      return;
    }
    if(conn && conn.open){ try{ conn.send(action); }catch(e){} }
  }

  function isAuthorityNow(){
    return tournamentMode ? myTournamentSlot===0 : myRole===0;
  }

  function genCode(){
    return String(Math.floor(100000 + Math.random()*900000));
  }

  function setupConnection(c){
    conn = c;
    conn.on('data', data=> handleRemoteData(data));
    conn.on('close', ()=>{
      toast('اتصال با حریف قطع شد');
      exitOnline();
    });
    conn.on('error', ()=>{
      toast('خطا در اتصال');
    });
  }

  function handleRemoteData(data){
    if(!data || !data.type) return;
    if(data.type==='move'){
      tryMove(state.turn, data.x, data.y, true);
      draw();
      if(state.anim) requestAnimationFrame(draw);
    } else if(data.type==='wall'){
      tryPlaceWall(data.wallType, data.x, data.y, true);
      draw();
    } else if(data.type==='break'){
      tryBreakWall(data.wallType, data.x, data.y, true);
      draw();
    } else if(data.type==='restart'){
      restart(true);
    } else if(data.type==='item'){
      state.items[data.x+','+data.y] = data.itemType;
      draw();
    } else if(data.type==='name'){
      playerNames[data.idx] = data.name;
      if(data.idx===0) name1Input.value = data.name; else name2Input.value = data.name;
      updateHud();
    } else if(data.type==='rating'){
      oppRating = data.rating || 1000;
      updateRatingBadges();
      updateVsRevealRatings();
    } else if(data.type==='avatar'){
      const skin = AVATAR_SKINS.find(a=> a.id===data.avatar);
      oppAvatar = (skin && skin.id!=='none') ? skin.icon : null;
      applyPlayerColors();
      updateVsRevealAvatars();
      draw();
    } else if(data.type==='reaction'){
      showFloatingReaction(data.idx, data.emoji);
    } else if(data.type==='t_slot_assign'){
      myTournamentSlot = data.slot;
      renderTournamentLobbyView();
    } else if(data.type==='t_lobby'){
      tournament.players = data.players;
      renderTournamentLobbyView();
    } else if(data.type==='t_bracket'){
      tournament.matches = data.matches;
      renderBracket();
    } else if(data.type==='t_match_start'){
      applyMatchStart(data);
    } else if(data.type==='t_finished'){
      showTournamentChampion(data.championSlot, data.championName);
    }
  }

  function updateVsRevealRatings(){
    if(!vsRevealOverlay.classList.contains('show')) return;
    const myR = loadProfile().rating || 1000;
    const r0 = myRole===0 ? myR : oppRating;
    const r1 = myRole===1 ? myR : oppRating;
    const t0 = rankTierOf(r0), t1 = rankTierOf(r1);
    vsTier1.innerHTML = t0.icon + ' <span id="vsRating1">' + toFa(r0) + '</span>';
    vsTier2.innerHTML = t1.icon + ' <span id="vsRating2">' + toFa(r1) + '</span>';
  }

  function startOnlineGame(){
    closeOnlineOverlay();
    vsAvatar1.style.background = dotGradient(themeOf(0));
    vsAvatar2.style.background = dotGradient(themeOf(1));
    vsInitial1.textContent = (playerNames[0]||'').trim().charAt(0) || '۱';
    vsInitial2.textContent = (playerNames[1]||'').trim().charAt(0) || '۲';
    vsName1.textContent = playerNames[0];
    vsName2.textContent = playerNames[1];
    vsPingVal.textContent = toFa(Math.round(20 + Math.random()*55));
    vsStatusLine.textContent = 'در حال آماده‌سازیِ بازی...';
    updateVsRevealRatings();
    vsRevealOverlay.classList.add('show');
    sendAction({type:'name', idx:myRole, name:playerNames[myRole]});
    sendAction({type:'rating', rating:(loadProfile().rating||1000)});
    sendAction({type:'avatar', idx:myRole, avatar:(loadProfile().equipAvatar||'none')});
    updateVsRevealAvatars();
    setTimeout(updateVsRevealRatings, 350);
    setTimeout(updateVsRevealAvatars, 350);
    setTimeout(()=>{
      vsRevealOverlay.classList.remove('show');
      reallyStartOnlineGame();
    }, 1900);
  }

  function reallyStartOnlineGame(){
    state = freshState();
    onlineMode = true;
    suddenDeathEnabled = false;
    sessionScore = [0,0];
    startScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    applyPlayerColors();
    setMode('move');
    updateHud();
    updateScoreBar();
    sdBadge.classList.add('hidden');
    updateRoomBadge();
    updateNameEditability();
    resize();
    draw();
    toast('حریف وصل شد! نوبتِ ' + playerNames[0] + ' 🎮');
  }

  function updateNameEditability(){
    if(onlineMode){
      name1Input.readOnly = (myRole !== 0);
      name2Input.readOnly = (myRole !== 1);
    } else if(aiEnabled){
      name1Input.readOnly = false;
      name2Input.readOnly = true;
    } else {
      name1Input.readOnly = false;
      name2Input.readOnly = false;
    }
  }

  function updateRoomBadge(){
    updateReactionUI();
    if(tournamentMode){
      roomBadge.classList.add('show');
      const roundName = tournament && tournament.currentMatchIdx>=0
        ? (tournament.matches[tournament.currentMatchIdx].round===1 ? 'نیمه‌نهایی' : 'فینال')
        : 'لابی';
      const roleTxt = myRole===null ? 'در حالِ تماشا 👀' : (myRole===0 ? 'بازیکن ۱' : 'بازیکن ۲');
      roomBadgeText.textContent = '🏆 تورنومنت: ' + (tournament ? tournament.code : '------') + '  •  ' + roundName + '  •  ' + roleTxt;
    } else if(onlineMode){
      roomBadge.classList.add('show');
      const roleTxt = myRole===0 ? 'بازیکن ۱' : 'بازیکن ۲';
      const label = quickPlayMode ? '🎲 بازیِ سریع' : ('روم: ' + (currentRoomCode || '------'));
      roomBadgeText.textContent = label + '  •  شما: ' + roleTxt;
    } else {
      roomBadge.classList.remove('show');
    }
  }

  function exitOnline(){
    onlineMode = false;
    quickPlayMode = false;
    quickPlayStake = null;
    mmCancelled = true;
    myRole = null;
    currentRoomCode = null;
    oppRating = 1000;
    oppAvatar = null;
    if(conn){ try{ conn.close(); }catch(e){} conn=null; }
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    updateRoomBadge();
    updateNameEditability();
    state = freshState();
    setMode('move');
    updateHud();
    draw();
  }

  // ----- create room flow -----
  function openOnlineOverlay(){
    aiEnabled = false;
    aiToggle.checked = false;
    aiDiffRow.classList.add('hidden');
    onlineOverlay.classList.add('show');
    showOnlineView('menu');
  }
  function closeOnlineOverlay(){
    onlineOverlay.classList.remove('show');
  }
  function showOnlineView(view){
    onlineMenuView.classList.toggle('hidden', view!=='menu');
    onlineCreateView.classList.toggle('hidden', view!=='create');
    onlineJoinView.classList.toggle('hidden', view!=='join');
    onlineStakeView.classList.toggle('hidden', view!=='stake');
    onlineQuickView.classList.toggle('hidden', view!=='quick');
  }
  function renderStakeGrid(){
    const p = loadProfile();
    stakeCoinBal.textContent = toFa(p.coins||0);
    stakeGrid.innerHTML = '';
    STAKE_TIERS.forEach(tier=>{
      const btn = document.createElement('button');
      btn.className = 'stake-btn';
      btn.dataset.amount = tier.amount;
      const affordable = (p.coins||0) >= tier.amount;
      btn.disabled = !affordable;
      btn.innerHTML = `<span class="stake-name">${tier.name}</span><span class="stake-price">🪙 ${toFa(tier.amount)}</span>`;
      stakeGrid.appendChild(btn);
    });
  }
  function beginStakeSelection(){
    mmCancelled = true;
    quickPlayMode = false;
    showOnlineView('stake');
    renderStakeGrid();
  }
  function chooseStakeAndPlay(amount){
    const p = loadProfile();
    if((p.coins||0) < amount){ toast('سکه‌ت کافی نیست'); return; }
    if(!spendCoins(amount)) return;
    quickPlayStake = amount;
    beginQuickPlay();
  }

  let createAttempts = 0;
  function beginCreateRoom(){
    mmCancelled = true;
    quickPlayMode = false;
    showOnlineView('create');
    createAttempts = 0;
    createStatus.textContent = 'در حال آماده‌سازی...';
    createStatus.className = 'status-line';
    createSpinner.classList.remove('hidden');
    roomCodeDisplay.textContent = '------';
    attemptCreate();
  }
  function attemptCreate(){
    createAttempts++;
    if(createAttempts > 5){
      createStatus.textContent = 'مشکلی پیش اومد، دوباره امتحان کن.';
      createStatus.className = 'status-line err';
      createSpinner.classList.add('hidden');
      return;
    }
    const code = genCode();
    if(peer){ try{ peer.destroy(); }catch(e){} }
    peer = new Peer(ROOM_PREFIX + code, PEER_OPTS);
    peer.on('open', ()=>{
      currentRoomCode = code;
      roomCodeDisplay.textContent = code;
      createStatus.textContent = 'در انتظار ورود بازیکن دوم...';
      createSpinner.classList.remove('hidden');
    });
    peer.on('connection', (c)=>{
      myRole = 0;
      setupConnection(c);
      c.on('open', ()=>{
        startOnlineGame();
      });
    });
    peer.on('error', (err)=>{
      if(err && err.type==='unavailable-id'){
        attemptCreate();
      } else {
        createStatus.textContent = 'خطا در ساخت روم. اتصال اینترنت رو چک کن.';
        createStatus.className = 'status-line err';
        createSpinner.classList.add('hidden');
      }
    });
  }

  // ----- join room flow -----
  function beginJoinRoom(){
    mmCancelled = true;
    quickPlayMode = false;
    showOnlineView('join');
    joinCodeInput.value = '';
    joinStatus.textContent = '';
    joinStatus.className = 'status-line';
    setTimeout(()=> joinCodeInput.focus(), 200);
  }
  function attemptJoin(){
    const code = joinCodeInput.value.trim();
    if(!/^\d{6}$/.test(code)){
      joinStatus.textContent = 'کد باید ۶ رقم باشه.';
      joinStatus.className = 'status-line err';
      return;
    }
    joinStatus.textContent = 'در حال اتصال...';
    joinStatus.className = 'status-line';
    connectBtn.disabled = true;

    if(peer){ try{ peer.destroy(); }catch(e){} }
    peer = new Peer(PEER_OPTS);
    let settled = false;
    const timeout = setTimeout(()=>{
      if(!settled){
        settled = true;
        joinStatus.textContent = 'روم پیدا نشد. کد رو چک کن.';
        joinStatus.className = 'status-line err';
        connectBtn.disabled = false;
      }
    }, 9000);

    peer.on('open', ()=>{
      const c = peer.connect(ROOM_PREFIX + code, {reliable:true});
      setupConnection(c);
      c.on('open', ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(timeout);
        myRole = 1;
        currentRoomCode = code;
        connectBtn.disabled = false;
        startOnlineGame();
      });
      c.on('error', ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(timeout);
        joinStatus.textContent = 'روم پیدا نشد. کد رو چک کن.';
        joinStatus.className = 'status-line err';
        connectBtn.disabled = false;
      });
    });
    peer.on('error', (err)=>{
      if(settled) return;
      settled = true;
      clearTimeout(timeout);
      joinStatus.textContent = 'روم پیدا نشد. کد رو چک کن.';
      joinStatus.className = 'status-line err';
      connectBtn.disabled = false;
    });
  }

  // ----- quick play (random matchmaking) flow -----
  // Serverless matchmaking trick: scan a pool of well-known "waiting slot" peer IDs
  // in random order. For each slot: try connecting as a client first (fast — if
  // someone is already waiting there, we pair immediately). If nobody answers within
  // MM_CONNECT_TIMEOUT, try to claim that slot ourselves and wait for someone else's scan to find us.
  function shuffledSlotList(){
    const arr = Array.from({length: MM_SLOTS}, (_,i)=> i+1);
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp;
    }
    return arr;
  }
  function beginQuickPlay(){
    mmCancelled = false;
    quickPlayMode = true;
    showOnlineView('quick');
    quickStatus.textContent = 'در حال جستجوی حریف...';
    quickStatus.className = 'status-line';
    quickSpinner.classList.remove('hidden');
    quickStakeLabel.textContent = quickPlayStake ? ('🪙 پاتِ این دست: ' + toFa(quickPlayStake*2) + ' سکه') : '';
    mmSlotOrder = shuffledSlotList();
    mmAttemptIdx = -1;
    scanNextSlot();
  }
  function refundStakeIfUnmatched(){
    if(quickPlayStake && !onlineMode){
      awardCoins(quickPlayStake, 'برگشتِ سکهٔ استیک');
      quickPlayStake = null;
    }
  }
  function destroyBatchPeers(except){
    mmBatchPeers.forEach(p=>{
      if(p!==except){ try{ p.destroy(); }catch(e){} }
    });
    mmBatchPeers = except ? [except] : [];
  }
  function cancelQuickPlay(){
    mmCancelled = true;
    quickPlayMode = false;
    refundStakeIfUnmatched();
    destroyBatchPeers(null);
    if(peer){ try{ peer.destroy(); }catch(e){} peer = null; }
    showOnlineView('menu');
  }
  function scanNextSlot(){
    if(mmCancelled) return;
    if(mmAttemptIdx >= mmSlotOrder.length-1){
      // scanned every slot as a client and nobody was waiting anywhere —
      // become the host on a random slot ourselves and wait for the next
      // person's scan to find us.
      tryClaimSlot(mmSlotOrder[Math.floor(Math.random()*mmSlotOrder.length)]);
      return;
    }
    const batch = mmSlotOrder.slice(mmAttemptIdx+1, mmAttemptIdx+1+MM_BATCH_SIZE);
    mmAttemptIdx += batch.length;
    quickStatus.textContent = 'در حال جستجوی حریف... (' + toFa(mmAttemptIdx+1) + ' از ' + toFa(mmSlotOrder.length) + ')';
    quickStatus.className = 'status-line';
    quickSpinner.classList.remove('hidden');
    tryJoinSlotsBatch(batch);
  }
  // Probes up to MM_BATCH_SIZE waiting-slot IDs at the same time instead of one
  // at a time. Whichever slot answers first wins the match; if none answer within
  // MM_CONNECT_TIMEOUT, we move on to the next batch. Only once every slot has
  // been probed with nobody found do we claim a slot ourselves and wait.
  function tryJoinSlotsBatch(slotNums){
    if(mmCancelled) return;
    let settled = false;
    destroyBatchPeers(null);
    const failTimeout = setTimeout(()=>{
      if(settled) return;
      settled = true;
      destroyBatchPeers(null);
      if(!mmCancelled) scanNextSlot();
    }, MM_CONNECT_TIMEOUT);
    slotNums.forEach(slotNum=>{
      const slotId = MM_PREFIX + (quickPlayStake||0) + '-' + slotNum;
      const p = new Peer(PEER_OPTS);
      mmBatchPeers.push(p);
      p.on('open', ()=>{
        if(settled || mmCancelled) return;
        const c = p.connect(slotId, {reliable:true});
        c.on('open', ()=>{
          if(settled) return;
          settled = true;
          clearTimeout(failTimeout);
          destroyBatchPeers(p);
          peer = p;
          myRole = 1;
          currentRoomCode = null;
          setupConnection(c);
          startOnlineGame();
        });
        // per-peer connect error: leave it to the batch timeout, other slots
        // in this batch (or the claim fallback) may still succeed
        c.on('error', ()=>{});
      });
      p.on('error', ()=>{}); // handled by the shared failTimeout above
    });
  }
  function tryClaimSlot(slotNum){
    if(mmCancelled) return;
    const slotId = MM_PREFIX + (quickPlayStake||0) + '-' + slotNum;
    if(peer){ try{ peer.destroy(); }catch(e){} }
    peer = new Peer(slotId, PEER_OPTS);
    let claimed = false;
    peer.on('open', ()=>{
      if(mmCancelled){ try{ peer.destroy(); }catch(e){} return; }
      claimed = true;
      quickStatus.textContent = 'منتظرِ یه حریفِ دیگه...';
      peer.on('connection', (c)=>{
        if(mmCancelled) return;
        myRole = 0;
        currentRoomCode = null;
        setupConnection(c);
        c.on('open', ()=> startOnlineGame());
      });
    });
    peer.on('error', ()=>{
      if(claimed) return;
      if(peer){ try{ peer.destroy(); }catch(e){} peer = null; }
      if(!mmCancelled) scanNextSlot();
    });
  }

  // ----- tournament flow (host = slot 0, joiners = slots 1/2/3, star topology through host) -----
  function tournamentBroadcastAll(data){
    Object.values(hostConns).forEach(c=>{
      if(c && c.open){ try{ c.send(data); }catch(e){} }
    });
  }
  function tournamentRelayExcept(exceptSlot, data){
    Object.keys(hostConns).forEach(slotKey=>{
      if(+slotKey === exceptSlot) return;
      const c = hostConns[slotKey];
      if(c && c.open){ try{ c.send(data); }catch(e){} }
    });
  }
  function hostBroadcastAndApply(data){
    tournamentBroadcastAll(data);
    handleRemoteData(data);
  }
  function hostHandleConnData(slot, c, data){
    if(!data || !data.type) return;
    if(data.type==='t_join_name'){
      tournament.players[slot] = {name:(data.name||'بازیکن').slice(0,10), connected:true};
      try{ c.send({type:'t_slot_assign', slot:slot}); }catch(e){}
      renderTournamentLobbyView();
      hostBroadcastAndApply({type:'t_lobby', players: tournament.players});
    } else {
      handleRemoteData(data);
      tournamentRelayExcept(slot, data);
    }
  }

  function showTView(view){
    tMenuView.classList.toggle('hidden', view!=='menu');
    tCreateView.classList.toggle('hidden', view!=='create');
    tJoinCodeView.classList.toggle('hidden', view!=='joincode');
    tLobbyView.classList.toggle('hidden', view!=='lobby');
  }
  function openTournamentOverlay(){
    aiEnabled = false;
    aiToggle.checked = false;
    aiDiffRow.classList.add('hidden');
    tournamentOverlay.classList.add('show');
    showTView('menu');
  }

  function slotName(slot){
    if(slot===null || slot===undefined) return '—';
    return (tournament && tournament.players[slot] && tournament.players[slot].name) || ('بازیکن ' + toFa(slot+1));
  }
  function matchRoundLabel(round){ return round===1 ? 'نیمه‌نهایی' : 'فینال'; }

  function renderTSlotListInto(container){
    if(!container || !tournament) return;
    container.innerHTML = '';
    for(let i=0;i<4;i++){
      const p = tournament.players[i];
      const row = document.createElement('div');
      row.className = 't-slot' + (p && p.connected ? ' filled' : '');
      const dot = document.createElement('div'); dot.className = 't-slot-dot';
      const num = document.createElement('div'); num.className = 't-slot-num'; num.textContent = toFa(i+1);
      const name = document.createElement('div'); name.className = 't-slot-name';
      name.textContent = (p && p.connected) ? p.name : 'در انتظار...';
      row.appendChild(dot); row.appendChild(num); row.appendChild(name);
      container.appendChild(row);
    }
  }
  function renderTournamentLobbyView(){
    if(!tournament) return;
    renderTSlotListInto(tSlotList);
    renderTSlotListInto(tLobbySlotList);
    const filled = tournament.players.filter(p=> p && p.connected).length;
    if(myTournamentSlot===0){
      tCreateStatus.textContent = filled>=4 ? 'همه وصل شدن! می‌تونی شروع کنی 🎮' : ('در انتظارِ ' + toFa(4-filled) + ' بازیکنِ دیگه...');
      tCreateStatus.className = 'status-line';
      tStartBtn.classList.toggle('hidden', filled<4);
    } else {
      tLobbyStatus.textContent = filled>=4 ? 'همه وصل شدن! منتظرِ شروعِ میزبان...' : ('در انتظارِ ' + toFa(4-filled) + ' بازیکنِ دیگه...');
    }
  }

  function renderBracketInto(container){
    if(!container || !tournament || !tournament.matches.length) return;
    container.innerHTML = '';
    let lastRound = null;
    tournament.matches.forEach(m=>{
      if(m.round !== lastRound){
        lastRound = m.round;
        const lbl = document.createElement('div');
        lbl.className = 'bracket-round-label';
        lbl.textContent = matchRoundLabel(m.round);
        container.appendChild(lbl);
      }
      const row = document.createElement('div');
      row.className = 'bracket-match' + (m.winner!=null ? ' done' : '');
      const s0 = document.createElement('span');
      s0.className = 'bm-side' + (m.winner!=null && m.winner===m.p[0] ? ' winner' : '');
      s0.textContent = slotName(m.p[0]);
      const vs = document.createElement('span');
      vs.className = 'bm-vs'; vs.textContent = 'مقابل';
      const s1 = document.createElement('span');
      s1.className = 'bm-side' + (m.winner!=null && m.winner===m.p[1] ? ' winner' : '');
      s1.textContent = slotName(m.p[1]);
      row.appendChild(s0); row.appendChild(vs); row.appendChild(s1);
      container.appendChild(row);
    });
  }
  function renderBracket(){
    renderBracketInto(tBracketList);
    renderBracketInto(tChampionBracketList);
  }

  function applyMatchStart(data){
    tournament.currentMatchIdx = data.matchIdx;
    myRole = data.p[0]===myTournamentSlot ? 0 : (data.p[1]===myTournamentSlot ? 1 : null);
    onlineMode = true;
    aiEnabled = false;
    state = freshState();
    playerNames[0] = data.names[0];
    playerNames[1] = data.names[1];
    name1Input.value = data.names[0];
    name2Input.value = data.names[1];
    suddenDeathEnabled = false;
    sessionScore = [0,0];
    winOverlay.classList.remove('show');
    tChampionOverlay.classList.remove('show');
    tBracketOverlay.classList.remove('show');
    tournamentOverlay.classList.remove('show');
    startScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    applyPlayerColors();
    setMode('move');
    updateHud();
    updateScoreBar();
    sdBadge.classList.add('hidden');
    updateNameEditability();
    tSpectateBanner.classList.toggle('hidden', myRole!==null);
    updateRoomBadge();
    resize();
    draw();
    toast('🏆 ' + matchRoundLabel(data.round) + ' شروع شد: ' + data.names[0] + ' مقابل ' + data.names[1]);
  }

  function hostAdvanceMatch(){
    if(!tournament || myTournamentSlot!==0) return;
    const final = tournament.matches[2];
    if(final.p[0]==null && tournament.matches[0].winner!=null) final.p[0] = tournament.matches[0].winner;
    if(final.p[1]==null && tournament.matches[1].winner!=null) final.p[1] = tournament.matches[1].winner;
    const nextIdx = tournament.matches.findIndex(m=> m.winner==null && m.p[0]!=null && m.p[1]!=null);
    if(nextIdx===-1){
      hostFinishTournament();
      return;
    }
    tournament.currentMatchIdx = nextIdx;
    const match = tournament.matches[nextIdx];
    const names = [slotName(match.p[0]), slotName(match.p[1])];
    hostBroadcastAndApply({type:'t_bracket', matches: tournament.matches});
    hostBroadcastAndApply({type:'t_match_start', matchIdx: nextIdx, round: match.round, p: match.p.slice(), names: names});
  }
  function hostFinishTournament(){
    if(!tournament || myTournamentSlot!==0) return;
    const championSlot = tournament.matches[2].winner;
    tournament.finished = true;
    hostBroadcastAndApply({type:'t_bracket', matches: tournament.matches});
    hostBroadcastAndApply({type:'t_finished', championSlot: championSlot, championName: slotName(championSlot)});
  }
  function showTournamentChampion(slot, name){
    winOverlay.classList.remove('show');
    tBracketOverlay.classList.remove('show');
    appEl.classList.remove('hidden');
    tChampionOverlay.classList.add('show');
    const isMe = slot===myTournamentSlot;
    tChampionTitle.textContent = '🏆 قهرمانِ تورنومنت: ' + name;
    tChampionSubtitle.textContent = isMe ? 'تبریک، تو قهرمان شدی! 🎉' : 'تورنومنت تموم شد';
    tChampionDot.style.background = 'radial-gradient(circle at 35% 30%, var(--amber-glow), var(--amber))';
    renderBracket();
    vibrate([30,60,30,60,30]);
    playSound('win');
    if(isMe){ launchConfetti(0); awardCoins(40, 'قهرمانیِ تورنومنت'); }
  }

  function exitTournament(){
    tournamentMode = false;
    tournament = null;
    myTournamentSlot = null;
    myRole = null;
    onlineMode = false;
    hostConns = {};
    currentRoomCode = null;
    if(conn){ try{ conn.close(); }catch(e){} conn=null; }
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    tSpectateBanner.classList.add('hidden');
    winOverlay.classList.remove('show');
    tChampionOverlay.classList.remove('show');
    tBracketOverlay.classList.remove('show');
    tournamentOverlay.classList.remove('show');
    updateRoomBadge();
    updateNameEditability();
    state = freshState();
    setMode('move');
    updateHud();
    draw();
  }

  // ----- create tournament flow -----
  let tCreateAttempts = 0;
  function beginCreateTournament(){
    showTView('create');
    tCreateAttempts = 0;
    tCreateStatus.textContent = 'در حال آماده‌سازی...';
    tCreateStatus.className = 'status-line';
    tCodeDisplay.textContent = '------';
    tStartBtn.classList.add('hidden');
    attemptCreateTournament();
  }
  function attemptCreateTournament(){
    tCreateAttempts++;
    if(tCreateAttempts > 5){
      tCreateStatus.textContent = 'مشکلی پیش اومد، دوباره امتحان کن.';
      tCreateStatus.className = 'status-line err';
      return;
    }
    const code = genCode();
    if(peer){ try{ peer.destroy(); }catch(e){} }
    tournamentMode = true;
    myTournamentSlot = 0;
    hostConns = {};
    tournament = {
      code: code,
      players: [
        {name:(setupName1.value.trim() || 'بازیکن ۱').slice(0,10), connected:true},
        null, null, null
      ],
      matches: [],
      currentMatchIdx: -1,
      finished: false
    };
    peer = new Peer(TOURNAMENT_PREFIX + code, PEER_OPTS);
    peer.on('open', ()=>{
      tCodeDisplay.textContent = code;
      renderTournamentLobbyView();
    });
    peer.on('connection', (c)=>{
      const slot = [1,2,3].find(s=> !hostConns[s] || !hostConns[s].open);
      if(slot===undefined){ try{ c.close(); }catch(e){} return; }
      hostConns[slot] = c;
      c.on('data', data=> hostHandleConnData(slot, c, data));
      c.on('close', ()=>{
        if(tournament && tournament.players[slot]) tournament.players[slot].connected = false;
        renderTournamentLobbyView();
        if(tournament) hostBroadcastAndApply({type:'t_lobby', players: tournament.players});
        toast('یکی از بازیکنا قطع شد');
      });
    });
    peer.on('error', (err)=>{
      if(err && err.type==='unavailable-id'){
        attemptCreateTournament();
      } else {
        tCreateStatus.textContent = 'خطا در ساختِ تورنومنت. اتصال اینترنت رو چک کن.';
        tCreateStatus.className = 'status-line err';
      }
    });
  }

  // ----- join tournament flow -----
  function beginJoinTournament(){
    showTView('joincode');
    tJoinCodeInput.value = '';
    tJoinStatus.textContent = '';
    tJoinStatus.className = 'status-line';
    setTimeout(()=> tJoinCodeInput.focus(), 200);
  }
  function attemptJoinTournament(){
    const code = tJoinCodeInput.value.trim();
    if(!/^\d{6}$/.test(code)){
      tJoinStatus.textContent = 'کد باید ۶ رقم باشه.';
      tJoinStatus.className = 'status-line err';
      return;
    }
    tJoinStatus.textContent = 'در حال اتصال...';
    tJoinStatus.className = 'status-line';
    tConnectBtn.disabled = true;

    if(peer){ try{ peer.destroy(); }catch(e){} }
    peer = new Peer(PEER_OPTS);
    let settled = false;
    const timeout = setTimeout(()=>{
      if(!settled){
        settled = true;
        tJoinStatus.textContent = 'تورنومنت پیدا نشد. کد رو چک کن.';
        tJoinStatus.className = 'status-line err';
        tConnectBtn.disabled = false;
      }
    }, 9000);

    peer.on('open', ()=>{
      const c = peer.connect(TOURNAMENT_PREFIX + code, {reliable:true});
      conn = c;
      conn.on('data', data=> handleRemoteData(data));
      conn.on('close', ()=>{
        toast('اتصال با تورنومنت قطع شد');
        exitTournament();
      });
      conn.on('error', ()=>{ toast('خطا در اتصال'); });
      c.on('open', ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(timeout);
        tournamentMode = true;
        myTournamentSlot = null;
        tournament = {code:code, players:[null,null,null,null], matches:[], currentMatchIdx:-1, finished:false};
        c.send({type:'t_join_name', name:(setupName1.value.trim() || 'بازیکن').slice(0,10)});
        showTView('lobby');
        tConnectBtn.disabled = false;
      });
      c.on('error', ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(timeout);
        tJoinStatus.textContent = 'تورنومنت پیدا نشد. کد رو چک کن.';
        tJoinStatus.className = 'status-line err';
        tConnectBtn.disabled = false;
      });
    });
    peer.on('error', (err)=>{
      if(settled) return;
      settled = true;
      clearTimeout(timeout);
      tJoinStatus.textContent = 'تورنومنت پیدا نشد. کد رو چک کن.';
      tJoinStatus.className = 'status-line err';
      tConnectBtn.disabled = false;
    });
  }

  // ---------- actions ----------
  function tryMove(playerIdx, nx, ny, fromRemote){
    if(state.over) return;
    if(!fromRemote){
      if(playerIdx !== state.turn) return;
      if(onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
      if(aiEnabled && state.turn===aiIdx){ toast('نوبتِ ربات 🤖'); return; }
    }
    const moves = legalMoves(playerIdx);
    const found = moves.find(m=>m.x===nx && m.y===ny);
    if(!found){ if(!fromRemote){ toast('حرکتِ نامعتبر'); vibrate(15); playSound('error'); } return; }
    if(playerIdx===0) state.dailyMoves++;
    state.actionCount[playerIdx]++;
    const from = state.pos[playerIdx];
    let fx = nx, fy = ny;
    if(state.iceEnabled && state.iceCells.has(fx+','+fy)){
      const dx = nx - from.x, dy = ny - from.y;
      let cx = fx, cy = fy;
      while(state.iceCells.has(cx+','+cy)){
        const nnx = cx+dx, nny = cy+dy;
        if(!inBounds(nnx,nny)) break;
        if(blockedBetween(cx,cy,nnx,nny)) break;
        if(occupied(nnx,nny, playerIdx)) break;
        cx = nnx; cy = nny;
      }
      if(cx!==fx || cy!==fy) toast('سُر خوردی رو یخ! ❄️🧊');
      fx = cx; fy = cy;
    }
    if(state.portalsEnabled && state.portals[fx+','+fy]!==undefined){
      const partnerKey = state.portals[fx+','+fy];
      const [px,py] = partnerKey.split(',').map(Number);
      if(!occupied(px,py, playerIdx)){
        fx = px; fy = py;
        toast('تله‌پورت شدی! 🌀');
      }
    }
    state.anim = {player:playerIdx, fromX:from.x, fromY:from.y, toX:fx, toY:fy, start:performance.now(), dur:150};
    state.pos[playerIdx] = {x:fx,y:fy};
    vibrate(12);
    playSound('move');
    if(!fromRemote && onlineMode) sendAction({type:'move', x:nx, y:ny});

    const ikey = fx+','+fy;
    if(state.items[ikey]){
      spawnParticles(fx, fy, state.items[ikey]);
      applyItem(playerIdx, state.items[ikey]);
      delete state.items[ikey];
    }

    if(fy === state.goal[playerIdx]){
      setTimeout(()=> endGame(playerIdx), 200);
      return;
    }
    endTurn();
    maybeSpawnItem();
  }

  // ---------- items ----------
  function applyItem(idx, type){
    const nm = playerNames[idx];
    if(type==='stick'){
      state.sticksLeft[idx] += 2;
      toast(nm + ' ۲ چوبِ اضافه گرفت 🪵');
      playSound('item');
    } else if(type==='double'){
      state.extraMove[idx] = true;
      toast(nm + ' یه حرکتِ اضافه گرفت ⚡');
      playSound('item');
    } else if(type==='shield'){
      state.shield[idx] = (state.shield[idx]||0) + 1;
      toast(nm + ' سپر گرفت 🛡');
      playSound('shield');
    } else if(type==='freeze'){
      state.skipNext[1-idx] = true;
      toast(nm + ' حریف رو یخ زد ❄️');
      playSound('freeze');
    } else if(type==='spy'){
      state.spyEffect = {active:true, hideOwner:1-idx, until:performance.now()+SPY_DURATION_MS};
      toast(nm + ' چوب‌های حریف رو محو کرد 👁');
      playSound('item');
    } else if(type==='jump'){
      const p = state.pos[idx];
      const dir = idx===0 ? 1 : -1;
      let ny = Math.max(0, Math.min(N-1, p.y + dir*2));
      if(occupied(p.x, ny, idx)) ny = Math.max(0, Math.min(N-1, p.y + dir));
      if(!occupied(p.x, ny, idx)) state.pos[idx] = {x:p.x, y:ny};
      state.usedJump[idx] = true;
      toast(nm + ' جهش زد! 🌀');
      playSound('item');
    } else if(type==='hammer'){
      state.breakerLeft[idx] += 1;
      toast(nm + ' یه خیبرشکنِ اضافه گرفت 🔨');
      playSound('item');
    } else if(type==='swap'){
      const tmp = state.pos[0]; state.pos[0] = state.pos[1]; state.pos[1] = tmp;
      toast('جای ' + playerNames[0] + ' و ' + playerNames[1] + ' عوض شد! 🔄');
      playSound('freeze');
    } else if(type==='steal'){
      const opp = 1-idx;
      if(state.sticksLeft[opp] > 0){
        state.sticksLeft[opp]--; state.sticksLeft[idx]++;
        toast(nm + ' یه چوب از حریف دزدید 💰');
      } else {
        toast(nm + ' خواست بدزده ولی حریف چوبی نداشت 💰');
      }
      playSound('item');
    } else if(type==='mystery'){
      const pool = ['stick','double','shield','freeze','jump','hammer'];
      const pick = pool[Math.floor(Math.random()*pool.length)];
      applyItem(idx, pick);
      return;
    }
    vibrate([10,30,10]);
    updateHud();
  }

  function pickRandomEmptyCell(){
    for(let tries=0; tries<25; tries++){
      const x = Math.floor(Math.random()*N);
      const y = Math.floor(Math.random()*N);
      const key = x+','+y;
      if(state.items[key]) continue;
      if(occupied(x,y,-1)) continue;
      if(state.pos[0].x===x && state.pos[0].y===y) continue;
      if(state.pos[1].x===x && state.pos[1].y===y) continue;
      return {x,y};
    }
    return null;
  }

  function maybeSpawnItem(){
    if(state.over) return;
    if(onlineMode && !isAuthorityNow()) return; // only the authoritative side spawns items
    if(Object.keys(state.items).length >= MAX_ITEMS_ON_BOARD) return;
    if(Math.random() > 0.35) return;
    const cell = pickRandomEmptyCell();
    if(!cell) return;
    const type = ITEM_TYPES[Math.floor(Math.random()*ITEM_TYPES.length)];
    state.items[cell.x+','+cell.y] = type;
    if(onlineMode) sendAction({type:'item', x:cell.x, y:cell.y, itemType:type});
    draw();
  }

  function tryPlaceWall(type, x, y, fromRemote){
    if(state.over) return;
    const pIdx = state.turn;
    if(!fromRemote && onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
    if(!fromRemote && aiEnabled && state.turn===aiIdx){ toast('نوبتِ ربات 🤖'); return; }
    if(state.sticksLeft[pIdx] <= 0){ if(!fromRemote){ toast('چوبی نداری!'); vibrate(15); playSound('error'); } return; }
    const key = x+','+y;
    if(type==='v'){
      if(x<0||x>N-2||y<0||y>N-1) return;
      if(state.wallsV.has(key)){ if(!fromRemote){ toast('اینجا از قبل چوب هست'); vibrate(15); playSound('error'); } return; }
      state.wallsV.add(key);
      if(!bothPathsOk()){
        state.wallsV.delete(key);
        if(!fromRemote){ toast('این کار راهِ رفتن رو کاملاً می‌بنده!'); vibrate([10,40,10]); playSound('error'); }
        return;
      }
      state.wallOwner['v:'+key] = pIdx;
    } else {
      if(x<0||x>N-1||y<0||y>N-2) return;
      if(state.wallsH.has(key)){ if(!fromRemote){ toast('اینجا از قبل چوب هست'); vibrate(15); playSound('error'); } return; }
      state.wallsH.add(key);
      if(!bothPathsOk()){
        state.wallsH.delete(key);
        if(!fromRemote){ toast('این کار راهِ رفتن رو کاملاً می‌بنده!'); vibrate([10,40,10]); playSound('error'); }
        return;
      }
      state.wallOwner['h:'+key] = pIdx;
    }
    if(pIdx===0) state.dailyMoves++;
    state.actionCount[pIdx]++;

    const opp = 1-pIdx;
    if(state.shield[opp] > 0){
      state.shield[opp]--;
      if(type==='v') state.wallsV.delete(key); else state.wallsH.delete(key);
      delete state.wallOwner[(type==='v'?'v:':'h:')+key];
      toast(playerNames[opp] + ' سپرش جلوی چوبِ تو رو گرفت! 🛡');
      vibrate([10,10,10]);
      if(!fromRemote && onlineMode) sendAction({type:'wall', wallType:type, x:x, y:y});
      updateHud();
      endTurn();
      maybeSpawnItem();
      return;
    }

    state.sticksLeft[pIdx]--;
    state.wallsPlaced[pIdx]++;
    if(state.fragileEnabled){
      state.fragileWalls[(type==='v'?'v:':'h:')+key] = FRAGILE_WALL_TURNS;
    }
    vibrate(18);
    playSound('wall');
    if(!fromRemote && onlineMode) sendAction({type:'wall', wallType:type, x:x, y:y});
    updateHud();
    endTurn();
    maybeSpawnItem();
  }

  function tryBreakWall(type, x, y, fromRemote){
    if(state.over) return;
    const pIdx = state.turn;
    if(!fromRemote && onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
    if(!fromRemote && aiEnabled && state.turn===aiIdx){ toast('نوبتِ ربات 🤖'); return; }
    if(state.breakerLeft[pIdx] <= 0){ if(!fromRemote){ toast('خیبرشکنِ تو تموم شده!'); vibrate(15); playSound('error'); } return; }
    const key = x+','+y;
    if(type==='v'){
      if(!state.wallsV.has(key)){ if(!fromRemote){ toast('اینجا چوبی نیست'); vibrate(15); playSound('error'); } return; }
      state.wallsV.delete(key);
      delete state.wallOwner['v:'+key];
    } else {
      if(!state.wallsH.has(key)){ if(!fromRemote){ toast('اینجا چوبی نیست'); vibrate(15); playSound('error'); } return; }
      state.wallsH.delete(key);
      delete state.wallOwner['h:'+key];
    }
    state.breakerLeft[pIdx]--;
    state.usedBreaker[pIdx] = true;
    if(pIdx===0) state.dailyMoves++;
    state.actionCount[pIdx]++;
    vibrate([15,20,15]);
    playSound('break');
    toast(playerNames[pIdx] + ' با خیبرشکن یه چوب رو ترکوند 💥');
    if(!fromRemote && onlineMode) sendAction({type:'break', wallType:type, x:x, y:y});
    setMode('move');
    updateHud();
    endTurn();
    maybeSpawnItem();
    draw();
  }

  function resetTurnTimer(){
    state.turnDeadline = performance.now() + currentTurnSeconds()*1000;
  }

  function tickFragileWalls(){
    if(!state.fragileEnabled) return;
    let broke = false;
    Object.keys(state.fragileWalls).forEach(key=>{
      state.fragileWalls[key]--;
      if(state.fragileWalls[key] <= 0){
        const coord = key.slice(2);
        if(key[0]==='v') state.wallsV.delete(coord); else state.wallsH.delete(coord);
        delete state.wallOwner[key];
        delete state.fragileWalls[key];
        broke = true;
      }
    });
    if(broke){ toast('یه دیوارِ شکننده ترک خورد و شکست! 💥'); draw(); }
  }
  function endTurn(){
    if(puzzleMode){ updateHud(); return; }
    const pIdx = state.turn;
    tickFragileWalls();
    if(state.extraMove[pIdx]){
      state.extraMove[pIdx] = false;
      resetTurnTimer();
      updateHud();
      maybeTriggerAI();
      return;
    }
    state.turn = 1 - state.turn;
    if(state.skipNext[state.turn]){
      const skippedIdx = state.turn;
      state.skipNext[skippedIdx] = false;
      state.turn = 1 - state.turn;
      toast('نوبتِ ' + playerNames[skippedIdx] + ' یخ زد و پرید ❄️');
    }
    resetTurnTimer();
    updateHud();
    maybeTriggerAI();
    // it just became MY turn because the opponent (not me) acted — alert immediately
    if(onlineMode && myRole!=null && !state.over && pIdx!==myRole && state.turn===myRole){
      announceYourTurn();
    }
  }

  let lastGameResult = null;
  function endGame(winnerIdx){
    if(state.puzzleLevel){ handlePuzzleWin(); return; }
    stopSuddenDeathMusic();
    state.over = true;
    puzzleResultBox.classList.add('hidden');
    puzzleNextBtn.classList.add('hidden');
    puzzleListBtn2.classList.add('hidden');
    winOverlay.classList.add('show');
    const hasPerspective = (onlineMode && myRole!==null) || aiEnabled;
    const iWonThis = onlineMode ? (myRole===winnerIdx) : (aiEnabled ? winnerIdx!==aiIdx : true);
    winFlagBanner.classList.toggle('lose-flag', hasPerspective && !iWonThis);
    winTitle.textContent = !hasPerspective ? (playerNames[winnerIdx] + ' برنده شد! 🎉')
      : (iWonThis ? 'برنده شدی! 🎉' : 'باختی 😔');
    lastGameResult = {
      winnerName: playerNames[winnerIdx],
      elapsedSec: (performance.now() - state.gameStart)/1000,
      walls: state.wallsPlaced[winnerIdx]
    };
    const wt = themeOf(winnerIdx);
    winDot.style.background = dotGradient(wt);
    winDot.style.color = wt.base;
    winnerChip.classList.remove('hidden');
    winnerChipName.textContent = playerNames[winnerIdx];
    let bonusCoins = 0;
    gsTime.textContent = fmtMs(lastGameResult.elapsedSec*1000);
    gsMoves.textContent = toFa(state.actionCount ? state.actionCount[winnerIdx] : 0);
    gsWalls.textContent = toFa(state.wallsPlaced[winnerIdx]);
    sessionScore[winnerIdx]++;
    updateScoreBar();
    vibrate([30,60,30]);
    const iLost = (onlineMode && myRole!==null && myRole!==winnerIdx) || (aiEnabled && winnerIdx===aiIdx);
    playSound(iLost ? 'lose' : 'win');
    launchConfetti(winnerIdx);
    const elapsedSec = (performance.now() - state.gameStart)/1000;
    const iWasSpectating = tournamentMode && myRole===null;
    if(!iWasSpectating){
      recordGameResult(winnerIdx, elapsedSec, state.wallsPlaced[winnerIdx], state.usedJump[winnerIdx], state.usedBreaker[winnerIdx]);
    }

    if(tournamentMode){
      dailyResultBox.classList.add('hidden');
      tMatchResultBox.classList.remove('hidden');
      playAgainBtn.classList.add('hidden');
      const match = tournament.matches[tournament.currentMatchIdx];
      const winnerSlot = match.p[winnerIdx];
      const loserSlot = match.p[1-winnerIdx];
      match.winner = winnerSlot;
      tMatchRoundLabel.textContent = matchRoundLabel(match.round);
      if(myTournamentSlot===winnerSlot){ awardCoins(12, 'بردِ مسابقهٔ تورنومنت'); bonusCoins = 12; }
      if(myTournamentSlot===winnerSlot) tMatchStatusLabel.textContent = '🎉 شما بردید!';
      else if(myTournamentSlot===loserSlot) tMatchStatusLabel.textContent = 'باختی، ولی می‌تونی ادامه رو تماشا کنی 👀';
      else tMatchStatusLabel.textContent = 'مسابقه تموم شد 👀';
      winSubtitle.textContent = '';
      const isFinal = match.round===2;
      tNextMatchBtn.classList.toggle('hidden', myTournamentSlot!==0 || isFinal);
      if(myTournamentSlot===0 && isFinal){
        setTimeout(()=> hostFinishTournament(), 400);
      }
      winnerChipBonus.classList.toggle('hidden', bonusCoins<=0);
      winnerChipBonus.textContent = '🪙 +' + toFa(bonusCoins);
      gameResultBox.classList.remove('hidden');
      return;
    }
    tMatchResultBox.classList.add('hidden');
    tNextMatchBtn.classList.add('hidden');
    playAgainBtn.classList.remove('hidden');

    if(onlineMode && !iWasSpectating){
      const amWinnerRank = myRole===winnerIdx;
      const rankResult = recordOnlineRatingResult(amWinnerRank, oppRating);
      const tier = rankTierOf(rankResult.rating);
      rankResultTierIcon.textContent = tier.icon;
      rankResultTier.textContent = tier.name;
      rankResultRating.textContent = toFa(rankResult.rating);
      const sign = rankResult.delta>0 ? '+' : '';
      rankResultDelta.textContent = sign + toFa(rankResult.delta);
      rankResultDelta.style.color = rankResult.delta>0 ? 'var(--ok)' : (rankResult.delta<0 ? 'var(--danger)' : 'var(--ink)');
      rankResultBox.classList.remove('hidden');
    } else {
      rankResultBox.classList.add('hidden');
    }

    if(!state.daily && !iWasSpectating){
      const amWinner = !onlineMode || myRole===winnerIdx;
      if(onlineMode && quickPlayMode && quickPlayStake){
        if(amWinner){ awardCoins(quickPlayStake*2, 'بردِ بازیِ سریع — پاتِ ' + toFa(quickPlayStake*2) + ' سکه'); bonusCoins = quickPlayStake*2; }
        quickPlayStake = null;
      } else if(amWinner){
        const amt = onlineMode ? 15 : 8;
        awardCoins(amt, onlineMode ? 'بردِ آنلاین' : 'بردِ بازی');
        bonusCoins = amt;
      }
    }

    if(state.daily){
      const won = winnerIdx===0;
      const timeMs = elapsedSec*1000;
      const data = loadDailyData();
      const key = todayStr();
      const prev = data[key];
      const isFirstWinToday = won && !(prev && prev.won);
      let bestTimeToday = (prev && prev.won) ? prev.timeMs : null;
      let bestMovesToday = (prev && prev.won) ? prev.moves : null;
      if(won && (bestTimeToday===null || timeMs < bestTimeToday)){
        bestTimeToday = timeMs;
        bestMovesToday = state.dailyMoves;
      }
      data[key] = {won: won || !!(prev && prev.won), timeMs: bestTimeToday, moves: bestMovesToday};
      saveDailyData(data);
      const streak = computeStreak(data);
      const overallBest = bestTimeMs(data);
      const dailyStars = won ? starsForResult(state.dailyMoves, state.dailyPar || state.dailyMoves) : 0;
      if(isFirstWinToday){
        const starReward = {1:10, 2:20, 3:35}[dailyStars] || 10;
        awardCoins(starReward, toFa(dailyStars) + '⭐ چالشِ روزانه');
        bonusCoins += starReward;
        // streak bonus is capped so it can't inflate the coin economy indefinitely
        const cappedStreak = Math.min(streak, 30);
        if(streak>0 && streak%5===0){
          const streakBonus = 20 + cappedStreak; // e.g. day 5 -> 25, day 30 -> 50 (capped)
          awardCoins(streakBonus, 'استریکِ ' + toFa(streak) + ' روزه');
          bonusCoins += streakBonus;
        }
      }
      dailyResultStars.textContent = won ? ('⭐'.repeat(dailyStars) + '☆'.repeat(3-dailyStars)) : '—';
      dailyResultTime.textContent = fmtMs(timeMs);
      dailyResultMoves.textContent = toFa(state.dailyMoves);
      dailyResultBest.textContent = overallBest===null ? '—' : fmtMs(overallBest);
      dailyResultStreak.textContent = toFa(streak);
      dailyResultBox.classList.remove('hidden');
      gameResultBox.classList.add('hidden');
      winSubtitle.textContent = won ? '🏆 چالشِ امروز رو با موفقیت رد کردی!' : 'امروز نشد، ولی می‌تونی دوباره امتحان کنی 💪';
    } else {
      dailyResultBox.classList.add('hidden');
      gameResultBox.classList.remove('hidden');
      winSubtitle.textContent = 'یک بازی دیگه بازی می‌کنی؟';
    }
    winnerChipBonus.classList.toggle('hidden', bonusCoins<=0);
    winnerChipBonus.textContent = '🪙 +' + toFa(bonusCoins);
  }

  function spawnConfettiPieces(colors, count, minDur, maxDur){
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random()*100 + 'vw';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.animationDuration = (minDur + Math.random()*(maxDur-minDur)) + 's';
      el.style.animationDelay = (Math.random()*0.4) + 's';
      el.style.borderRadius = Math.random()<0.5 ? '50%' : '2px';
      document.body.appendChild(el);
      setTimeout(()=> el.remove(), (maxDur+1.8)*1000);
    }
  }
  function spawnEmojiConfetti(emoji, count, minDur, maxDur, fontSize){
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti-piece confetti-emoji';
      el.textContent = emoji;
      el.style.left = Math.random()*100 + 'vw';
      el.style.fontSize = fontSize || '1.3rem';
      el.style.animationDuration = (minDur + Math.random()*(maxDur-minDur)) + 's';
      el.style.animationDelay = (Math.random()*0.4) + 's';
      document.body.appendChild(el);
      setTimeout(()=> el.remove(), (maxDur+1.8)*1000);
    }
  }
  function launchConfetti(winnerIdx){
    const t = themeOf(winnerIdx);
    const fx = equippedWinFx || 'confetti-gold';
    if(fx==='coin-rain'){
      spawnEmojiConfetti('🪙', 50, 1.4, 2.6, '1.4rem');
    } else if(fx==='crown-drop'){
      spawnEmojiConfetti('👑', 16, 1.8, 2.8, '2rem');
    } else if(fx==='star-shower'){
      spawnEmojiConfetti('⭐', 45, 1.3, 2.4, '1.3rem');
    } else if(fx==='balloons'){
      spawnEmojiConfetti('🎈', 20, 2.0, 3.2, '1.8rem');
    } else if(fx==='rainbow-burst'){
      const colors = ['#ff5f6d','#ffc371','#f9f871','#7bed9f','#70a1ff','#a29bfe','#ff6fb0'];
      spawnConfettiPieces(colors, 100, 1.2, 2.4);
    } else if(fx==='fireworks'){
      const colors = [t.base, t.glow, '#f1e6d8', '#ff6b6b', '#ffd93d'];
      spawnConfettiPieces(colors, 90, 1.2, 2.2);
    } else {
      const colors = [t.base, t.glow, '#f1e6d8'];
      spawnConfettiPieces(colors, 60, 1.6, 3.0);
    }
  }

  function restart(fromRemote){
    stopSuddenDeathMusic();
    if(puzzleMode && currentPuzzleIdx!=null){
      startPuzzle(currentPuzzleIdx);
      return;
    }
    const wasDaily = state.daily;
    const carryOpts = onlineMode ? {} : {
      ice: state.iceEnabled, portal: state.portalsEnabled,
      fragile: state.fragileEnabled, fog: state.fogEnabled
    };
    state = freshState(carryOpts);
    aiThinking = false;
    winOverlay.classList.remove('show');
    sdBadge.classList.add('hidden');
    if(wasDaily){
      state.daily = true;
      state.dailySeed = todayStr();
      generateDailyLayout(state.dailySeed);
    }
    setMode('move');
    updateHud();
    updateScoreBar();
    draw();
    if(!fromRemote && onlineMode) sendAction({type:'restart'});
  }

  function setMode(m){
    state.mode = m;
    moveModeBtn.classList.toggle('on', m==='move');
    wallModeBtn.classList.toggle('on', m==='wall');
    breakModeBtn.classList.toggle('on', m==='break');
    selectedEdge = null;
  }

  // ---------- hud ----------
  function updateHud(){
    card1.classList.toggle('active', state.turn===0 && !state.over);
    card2.classList.toggle('active', state.turn===1 && !state.over);
    renderSticks(sticks1, state.sticksLeft[0], state.wallTotal);
    renderSticks(sticks2, state.sticksLeft[1], state.wallTotal);
    updateTimerUI();
    updateRatingBadges();
    const left = state.breakerLeft[state.turn];
    breakBadge.textContent = toFa(left);
    breakModeBtn.disabled = left<=0 || state.over;
    if(left<=0 && state.mode==='break'){ setMode('move'); draw(); }
    if(puzzleMode) updatePuzzleBar();
  }

  function updateRatingBadges(){
    if(!rating1El || !rating2El) return;
    if(!onlineMode){
      rating1El.classList.add('hidden');
      rating2El.classList.add('hidden');
      return;
    }
    const myR = toFa(loadProfile().rating || 1000);
    const oppR = toFa(oppRating || 1000);
    const r0 = myRole===0 ? myR : oppR;
    const r1 = myRole===1 ? myR : oppR;
    rating1El.textContent = '🏅 ' + r0;
    rating2El.textContent = '🏅 ' + r1;
    rating1El.classList.remove('hidden');
    rating2El.classList.remove('hidden');
  }

  const toFa = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  function updateTimerUI(){
    if(state.over){
      turnTimerText.textContent = '';
      turnTimerCircle.classList.remove('urgent');
      turnTimerCircle.style.setProperty('--pct', 0);
      return;
    }
    const remainMs = Math.max(0, state.turnDeadline - performance.now());
    const secs = Math.ceil(remainMs/1000);
    const total = currentTurnSeconds();
    const mm = Math.floor(secs/60), ss = secs%60;
    turnTimerText.textContent = toFa(String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0'));
    const pct = total>0 ? Math.max(0, Math.min(100, (remainMs/1000/total)*100)) : 0;
    turnTimerCircle.style.setProperty('--pct', pct);
    const turnColor = state.turn===0 ? 'var(--amber)' : 'var(--teal)';
    turnTimerCircle.style.setProperty('--ring-color', turnColor);
    turnTimerCircle.classList.toggle('urgent', secs<=5);
  }

  function autoTimeoutMove(){
    if(state.over) return;
    const moves = legalMoves(state.turn);
    if(moves.length){
      const m = moves[Math.floor(Math.random()*moves.length)];
      toast('وقت تموم شد! حرکتِ خودکار ⏱');
      playSound('timeout');
      tryMove(state.turn, m.x, m.y);
    } else {
      endTurn();
      maybeSpawnItem();
    }
    if(state.anim) requestAnimationFrame(draw); else draw();
  }

  // Game-logic tick: sudden-death activation, spy-effect expiry, timeout detection.
  // Kept at a coarse interval since none of this needs per-frame precision.
  setInterval(()=>{
    if(state.over) return;
    if(puzzleMode) return;
    if(suddenDeathEnabled && !state.suddenDeathNotified && state.gameStart &&
       (performance.now()-state.gameStart) >= SUDDEN_DEATH_DELAY_MS){
      state.suddenDeathNotified = true;
      toast('⚡ مرگِ ناگهانی فعال شد! نوبت‌ها کوتاه‌تر شدن');
      vibrate([20,40,20]);
      sdBadge.classList.remove('hidden');
      startSuddenDeathMusic();
    }
    if(state.spyEffect && state.spyEffect.active && performance.now() >= state.spyEffect.until){
      state.spyEffect.active = false;
      draw();
    }
    const remainMs = state.turnDeadline - performance.now();
    if(remainMs <= 0){
      if(aiEnabled && state.turn===aiIdx){
        resetTurnTimer();
        maybeTriggerAI();
      } else if(!onlineMode || state.turn===myRole){
        autoTimeoutMove();
      }
    }
  }, 200);

  // Visual timer-ring tick: runs on requestAnimationFrame so the conic-gradient
  // countdown animates smoothly instead of jumping every 200ms.
  (function timerRAFLoop(){
    if(!state.over && !puzzleMode) updateTimerUI();
    requestAnimationFrame(timerRAFLoop);
  })();
  function renderSticks(container, left){
    container.innerHTML='';
    for(let i=0;i<STICKS;i++){
      const s = document.createElement('div');
      s.className = 'stick-icon' + (i<left ? '' : ' used');
      container.appendChild(s);
    }
  }

  // ---------- drawing ----------
  function roundRect(x,y,w,h,r,targetCtx){
    const c = targetCtx || ctx;
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }

  // ---- special mechanic visuals ----
  function drawIceCells(){
    if(!state.iceEnabled || !state.iceCells.size) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.floor(cell*0.34) + 'px system-ui, sans-serif';
    state.iceCells.forEach(key=>{
      const [x,y] = key.split(',').map(Number);
      const px = x*cell, py = y*cell;
      roundRect(px+2, py+2, cell-4, cell-4, 4);
      const grad = ctx.createLinearGradient(px, py, px+cell, py+cell);
      grad.addColorStop(0, 'rgba(150,222,255,.30)');
      grad.addColorStop(1, 'rgba(210,244,255,.12)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = .5;
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = Math.max(1, cell*0.015);
      ctx.beginPath();
      ctx.moveTo(px+cell*0.18, py+cell*0.82);
      ctx.lineTo(px+cell*0.82, py+cell*0.18);
      ctx.moveTo(px+cell*0.2, py+cell*0.2);
      ctx.lineTo(px+cell*0.5, py+cell*0.5);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = .85;
      ctx.fillText('❄️', px+cell/2, py+cell/2);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function drawPortals(){
    if(!state.portalsEnabled) return;
    const keys = Object.keys(state.portals || {});
    if(!keys.length) return;
    const palette = ['#b98af0', '#4fb0a5', '#e0a458', '#7fa8f0'];
    const seen = new Set();
    let pairIdx = 0;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    keys.forEach(key=>{
      if(seen.has(key)) return;
      const partner = state.portals[key];
      seen.add(key); seen.add(partner);
      const color = palette[pairIdx % palette.length];
      pairIdx++;
      [key, partner].forEach(k=>{
        const [x,y] = k.split(',').map(Number);
        const cx = x*cell + cell/2, cy = y*cell + cell/2;
        const r = cell*0.46;
        const grad = ctx.createRadialGradient(cx,cy,1, cx,cy,r);
        grad.addColorStop(0, color+'cc');
        grad.addColorStop(0.6, color+'55');
        grad.addColorStop(1, color+'00');
        ctx.beginPath();
        ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.font = Math.floor(cell*0.42) + 'px system-ui, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = .9;
        ctx.fillText('🌀', cx, cy);
        ctx.globalAlpha = 1;
      });
    });
    ctx.restore();
  }

  function drawFragileOverlay(x,y,vertical,turnsLeft){
    ctx.save();
    let px,py,w,h;
    if(vertical){
      w = cell*0.16; h = cell*0.92;
      px = (x+1)*cell - w/2; py = y*cell + cell*0.04;
    } else {
      w = cell*0.92; h = cell*0.16;
      px = x*cell + cell*0.04; py = (y+1)*cell - h/2;
    }
    const cx = px+w/2, cy = py+h/2;
    const dmg = 1 - (turnsLeft / FRAGILE_WALL_TURNS);
    ctx.globalAlpha = .18 + dmg*.35;
    ctx.fillStyle = getCss('--danger');
    roundRect(px,py,w,h, Math.min(w,h)/2);
    ctx.fill();
    ctx.globalAlpha = .8;
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = Math.max(1, cell*0.012);
    ctx.beginPath();
    if(vertical){
      ctx.moveTo(cx, py+h*0.08);
      ctx.lineTo(cx - w*0.32, py+h*0.34);
      ctx.lineTo(cx + w*0.22, py+h*0.56);
      ctx.lineTo(cx - w*0.18, py+h*0.88);
    } else {
      ctx.moveTo(px+w*0.08, cy);
      ctx.lineTo(px+w*0.34, cy - h*0.32);
      ctx.lineTo(px+w*0.56, cy + h*0.22);
      ctx.lineTo(px+w*0.88, cy - h*0.18);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cell*0.15, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(20,14,10,.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.floor(cell*0.18) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(turnsLeft), cx, cy);
    ctx.restore();
  }

  function fogCenterIdx(){
    if(onlineMode && myRole!=null) return myRole;
    return state.turn;
  }

  function drawFogOverlay(){
    if(!state.fogEnabled) return;
    const p = state.pos[fogCenterIdx()];
    if(!p) return;
    const cx = (p.x+0.5)*cell, cy = (p.y+0.5)*cell;
    const rPx = FOG_RADIUS*cell;
    const size = N*cell;
    ctx.save();
    const grad = ctx.createRadialGradient(cx,cy, rPx*0.3, cx,cy, rPx);
    grad.addColorStop(0, 'rgba(12,9,6,0)');
    grad.addColorStop(0.65, 'rgba(12,9,6,.5)');
    grad.addColorStop(1, 'rgba(9,7,5,.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,size,size);
    ctx.restore();
  }

  // PERF: the checkerboard background never changes between frames (only on
  // resize or tile-theme change), so it's pre-rendered once to an offscreen
  // canvas instead of re-running the shadowBlur-heavy per-cell loop every draw().
  let boardBgCanvas = null;
  let boardBgCtx = null;
  let boardBgDirty = true;
  function markBoardBgDirty(){ boardBgDirty = true; }
  function rebuildBoardBackground(){
    if(!cell) return;
    const size = N*cell;
    if(!boardBgCanvas) boardBgCanvas = document.createElement('canvas');
    if(boardBgCanvas.width !== canvas.width || boardBgCanvas.height !== canvas.height){
      boardBgCanvas.width = canvas.width;
      boardBgCanvas.height = canvas.height;
    }
    boardBgCtx = boardBgCanvas.getContext('2d');
    boardBgCtx.setTransform(dpr,0,0,dpr,0,0);
    boardBgCtx.clearRect(0,0,size,size);
    for(let y=0;y<N;y++){
      for(let x=0;x<N;x++){
        const light = (x+y)%2===0;
        boardBgCtx.save();
        roundRect(x*cell+1, y*cell+1, cell-2, cell-2, 4, boardBgCtx);
        boardBgCtx.fillStyle = light ? getCss('--cell-a') : getCss('--cell-b');
        boardBgCtx.shadowColor = 'rgba(0,0,0,.4)';
        boardBgCtx.shadowBlur = 3;
        boardBgCtx.shadowOffsetY = 2;
        boardBgCtx.fill();
        boardBgCtx.shadowColor = 'transparent';
        boardBgCtx.globalAlpha = .07;
        boardBgCtx.fillStyle = '#ffffff';
        roundRect(x*cell+2, y*cell+2, cell-4, (cell-4)*0.42, 3, boardBgCtx);
        boardBgCtx.fill();
        boardBgCtx.restore();
      }
    }
    boardBgDirty = false;
  }
  function draw(now){
    if(!cell) return;
    const size = N*cell;
    ctx.clearRect(0,0,size,size);

    if(boardBgDirty) rebuildBoardBackground();
    if(boardBgCanvas) ctx.drawImage(boardBgCanvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

    drawIceCells();
    drawPortals();
    drawGoalEdge(0);
    drawGoalEdge(1);
    drawItems();

    if(!state.over && state.mode==='move' && (!onlineMode || state.turn===myRole)){
      const moves = legalMoves(state.turn);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = themeOf(state.turn).base;
      moves.forEach(m=>{
        ctx.beginPath();
        ctx.arc(m.x*cell+cell/2, m.y*cell+cell/2, cell*0.11, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.restore();
    }

    const spy = state.spyEffect && state.spyEffect.active ? state.spyEffect : null;
    state.wallsV.forEach(key=>{
      const [x,y] = key.split(',').map(Number);
      const owner = state.wallOwner['v:'+key];
      ctx.save();
      if(spy && owner===spy.hideOwner) ctx.globalAlpha = 0.12;
      drawWallV(x,y, owner);
      ctx.restore();
      if(state.fragileEnabled && state.fragileWalls['v:'+key]!==undefined){
        drawFragileOverlay(x,y,true, state.fragileWalls['v:'+key]);
      }
    });
    state.wallsH.forEach(key=>{
      const [x,y] = key.split(',').map(Number);
      const owner = state.wallOwner['h:'+key];
      ctx.save();
      if(spy && owner===spy.hideOwner) ctx.globalAlpha = 0.12;
      drawWallH(x,y, owner);
      ctx.restore();
      if(state.fragileEnabled && state.fragileWalls['h:'+key]!==undefined){
        drawFragileOverlay(x,y,false, state.fragileWalls['h:'+key]);
      }
    });

    if(state.mode==='wall' && selectedEdge){
      ctx.save();
      ctx.globalAlpha = 0.55;
      if(selectedEdge.type==='v') drawWallV(selectedEdge.x, selectedEdge.y, state.turn, selectedEdge.valid);
      else drawWallH(selectedEdge.x, selectedEdge.y, state.turn, selectedEdge.valid);
      ctx.restore();
    }

    if(state.mode==='break' && selectedEdge){
      const e = selectedEdge;
      const px = e.type==='v' ? (e.x+1)*cell : e.x*cell + cell/2;
      const py = e.type==='v' ? e.y*cell + cell/2 : (e.y+1)*cell;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, cell*0.3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(217,99,79,.35)';
      ctx.fill();
      ctx.strokeStyle = getCss('--danger');
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = Math.floor(cell*0.32) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💥', px, py);
      ctx.restore();
    }

    drawFogOverlay();
    drawHintPath();

    for(let i=0;i<2;i++){
      let px = state.pos[i].x, py = state.pos[i].y;
      if(state.anim && state.anim.player===i && now){
        const t = Math.min(1, (now - state.anim.start)/state.anim.dur);
        const ease = 1 - Math.pow(1-t, 3);
        px = state.anim.fromX + (state.anim.toX-state.anim.fromX)*ease;
        py = state.anim.fromY + (state.anim.toY-state.anim.fromY)*ease;
        if(t>=1) state.anim = null;
      }
      drawPlayer(px, py, i);
    }

    drawParticles();

    if(state.anim || state.particles.length || state.hintPath) requestAnimationFrame(draw);
  }

  function drawHintPath(){
    if(!state.hintPath) return;
    const remain = state.hintExpire - performance.now();
    if(remain <= 0){ state.hintPath = null; state.hintExpire = null; return; }
    const fade = remain < 500 ? remain/500 : 1;
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = getCss('--amber-glow');
    ctx.lineWidth = Math.max(2, cell*0.09);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = getCss('--amber-glow');
    ctx.shadowBlur = 10;
    ctx.setLineDash([cell*0.16, cell*0.12]);
    ctx.lineDashOffset = -((performance.now()/35) % (cell*0.28));
    ctx.beginPath();
    state.hintPath.forEach((p,i)=>{
      const cx = p.x*cell+cell/2, cy = p.y*cell+cell/2;
      if(i===0) ctx.moveTo(cx,cy); else ctx.lineTo(cx,cy);
    });
    ctx.stroke();
    ctx.restore();
  }

  const cssCache = {};
  function refreshCssCache(){
    // call this any time the CSS variables on :root actually change
    // (e.g. a future day/night or skin theme swap) to invalidate the cache
    for(const key in cssCache) delete cssCache[key];
  }
  function getCss(varName){
    let v = cssCache[varName];
    if(v === undefined){
      v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      cssCache[varName] = v;
    }
    return v;
  }

  function drawGoalEdge(playerIdx){
    const row = state.goal[playerIdx];
    const c1 = themeOf(playerIdx).base;
    ctx.save();
    ctx.fillStyle = c1;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, row===9 ? N*cell-4 : 0, N*cell, 4);
    ctx.restore();
  }

  function spawnParticles(gx, gy, itemType){
    const colors = ITEM_COLOR[itemType] || ['#f1e6d8','#ffffff'];
    const cx = gx + 0.5, cy = gy + 0.5;
    const now = performance.now();
    const count = 16;
    for(let i=0;i<count;i++){
      const ang = (Math.PI*2*i/count) + (Math.random()-0.5)*0.5;
      const speed = 0.55 + Math.random()*0.55; // grid units per second
      state.particles.push({
        x:cx, y:cy,
        vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed,
        start: now,
        life: 480 + Math.random()*260,
        size: 1.6 + Math.random()*2.2,
        color: colors[Math.floor(Math.random()*colors.length)]
      });
    }
    // a few bigger "sparkle" bits that drift slower and fade last
    for(let i=0;i<5;i++){
      const ang = Math.random()*Math.PI*2;
      state.particles.push({
        x:cx, y:cy,
        vx: Math.cos(ang)*0.18, vy: Math.sin(ang)*0.18 - 0.35,
        start: now,
        life: 650 + Math.random()*250,
        size: 3 + Math.random()*2,
        color: colors[1] || colors[0],
        sparkle:true
      });
    }
    requestAnimationFrame(draw);
  }

  function drawParticles(){
    if(!state.particles.length) return;
    const now = performance.now();
    ctx.save();
    state.particles = state.particles.filter(p=>{
      const age = now - p.start;
      if(age >= p.life) return false;
      const t = age/1000;
      const px = (p.x + p.vx*t) * cell;
      const py = (p.y + p.vy*t + (p.sparkle?0:0.55*t*t)) * cell;
      const alpha = 1 - age/p.life;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(px, py, p.size * (p.sparkle ? (1+alpha*0.6) : 1), 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.sparkle ? 8 : 4;
      ctx.fill();
      return true;
    });
    ctx.restore();
  }

  function drawItems(){
    const keys = Object.keys(state.items);
    if(!keys.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.floor(cell*0.5) + 'px system-ui, sans-serif';
    keys.forEach(key=>{
      const [x,y] = key.split(',').map(Number);
      const cx = x*cell + cell/2, cy = y*cell + cell/2;
      ctx.beginPath();
      ctx.arc(cx, cy, cell*0.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(ITEM_ICON[state.items[key]] || '★', cx, cy);
    });
    ctx.restore();
  }

  function drawPlayer(gx, gy, idx){
    const cx = gx*cell+cell/2, cy = gy*cell+cell/2;
    const r = cell*0.34;
    const th = themeOf(idx);
    const baseColor = th.base, glow = th.glow, dark = th.dark;
    ctx.save();

    // ground shadow — gives the pawn a sense of sitting above the tile
    ctx.beginPath();
    ctx.ellipse(cx, cy+r*0.6, r*0.85, r*0.3, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fill();

    // base/foot of the pawn (darker ellipse) for a 3D pedestal feel
    ctx.beginPath();
    ctx.ellipse(cx, cy+r*0.42, r*0.72, r*0.24, 0, 0, Math.PI*2);
    ctx.fillStyle = dark;
    ctx.fill();

    // main sphere body, lifted slightly to look raised
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = state.turn===idx && !state.over ? 18 : 8;
    const grad = ctx.createRadialGradient(cx-r*0.35, cy-r*0.5, r*0.12, cx, cy-r*0.1, r*1.05);
    grad.addColorStop(0, glow);
    grad.addColorStop(.55, baseColor);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy-r*0.15, r, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.stroke();

    // glossy highlight for a polished 3D look
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.ellipse(cx-r*0.32, cy-r*0.55, r*0.26, r*0.17, -0.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fill();
    ctx.restore();

    drawRingEffect(cx, cy-r*0.15, r, glow);

    const avEmoji = avatarGlyphFor(idx);
    if(avEmoji){
      ctx.save();
      ctx.font = Math.round(r*1.15) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(avEmoji, cx, cy-r*0.15);
      ctx.restore();
    }
  }

  // ---- purchasable cosmetic ring effect (drawn around both players' pawns) ----
  function drawRingEffect(cx, cy, r, glow){
    if(equippedRing==='none') return;
    ctx.save();
    if(equippedRing==='halo'){
      ctx.shadowColor = glow;
      ctx.shadowBlur = r*1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r*1.18, 0, Math.PI*2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.stroke();
    } else if(equippedRing==='dashed'){
      ctx.setLineDash([4,4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r*1.3, 0, Math.PI*2);
      ctx.stroke();
    } else if(equippedRing==='spark'){
      const t = (typeof performance!=='undefined' ? performance.now() : Date.now())/500;
      for(let i=0;i<5;i++){
        const ang = t + i*(Math.PI*2/5);
        const sx = cx + Math.cos(ang)*r*1.35, sy = cy + Math.sin(ang)*r*1.35;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, r*0.07), 0, Math.PI*2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    } else if(equippedRing==='crown'){
      ctx.font = Math.round(r*1.15) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('👑', cx, cy - r*0.85);
    } else if(equippedRing==='rainbow'){
      const t = (typeof performance!=='undefined' ? performance.now() : Date.now())/1200;
      const colors = ['#ff5f6d','#ffc371','#f9f871','#7bed9f','#70a1ff','#a29bfe','#ff6fb0'];
      const seg = (Math.PI*2/colors.length);
      ctx.lineWidth = Math.max(2, r*0.14);
      ctx.lineCap = 'round';
      colors.forEach((col, i)=>{
        const a0 = t + i*seg;
        ctx.beginPath();
        ctx.arc(cx, cy, r*1.28, a0, a0 + seg*0.82);
        ctx.strokeStyle = col;
        ctx.stroke();
      });
    } else if(equippedRing==='galaxy'){
      const t = (typeof performance!=='undefined' ? performance.now() : Date.now())/900;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t % (Math.PI*2));
      ctx.strokeStyle = 'rgba(179,136,255,.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r*1.55, r*0.5, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
      for(let i=0;i<6;i++){
        const ang = t*1.3 + i*(Math.PI*2/6);
        const sx = cx + Math.cos(ang)*r*1.55;
        const sy = cy + Math.sin(ang)*r*1.55*0.42;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.2, r*0.06), 0, Math.PI*2);
        ctx.fillStyle = '#e8dcff';
        ctx.fill();
      }
    } else if(equippedRing==='phoenix'){
      const t = (typeof performance!=='undefined' ? performance.now() : Date.now())/650;
      ctx.font = Math.round(r*0.85) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for(let i=0;i<4;i++){
        const ang = t + i*(Math.PI*2/4);
        const sx = cx + Math.cos(ang)*r*1.4;
        const sy = cy + Math.sin(ang)*r*1.4*0.85;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang + Math.PI/2);
        ctx.fillText('🔥', 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function ownerColor(owner){
    if(owner===0) return {base:themeOf(0).base, light:themeOf(0).glow};
    if(owner===1) return {base:themeOf(1).base, light:themeOf(1).glow};
    return {base:getCss('--wall'), light:getCss('--wall-light')};
  }

  function drawWallV(x,y, owner, forcedValid){
    const px = (x+1)*cell;
    const py = y*cell;
    const w = cell*0.16, h = cell*0.92;
    const c = forcedValid===false ? {base:getCss('--danger'), light:'#f0a08f'} : ownerColor(owner);
    drawPlank(px - w/2, py + cell*0.04, w, h, c, true);
  }
  function drawWallH(x,y, owner, forcedValid){
    const px = x*cell;
    const py = (y+1)*cell;
    const w = cell*0.92, h = cell*0.16;
    const c = forcedValid===false ? {base:getCss('--danger'), light:'#f0a08f'} : ownerColor(owner);
    drawPlank(px + cell*0.04, py - h/2, w, h, c, false);
  }
  function drawPlank(x,y,w,h,color, vertical){
    ctx.save();
    const depth = Math.max(2, cell*0.07);

    // extrusion/shadow face — gives the plank physical depth
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    roundRect(x+depth*0.55, y+depth*0.85, w, h, Math.min(w,h)/2);
    ctx.fill();

    // main beveled face
    const grad = vertical
      ? ctx.createLinearGradient(x,y,x+w,y)
      : ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0, color.light);
    grad.addColorStop(.5, color.base);
    grad.addColorStop(1, color.light);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = depth*0.35;
    roundRect(x,y,w,h, Math.min(w,h)/2);
    ctx.fill();

    // glossy top sheen for a rounded 3D beam feel
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = .4;
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    if(vertical) roundRect(x+w*0.14, y, w*0.26, h, w*0.13);
    else roundRect(x, y+h*0.14, w, h*0.26, h*0.13);
    ctx.fill();
    ctx.globalAlpha = 1;

    drawWallSkinOverlay(x,y,w,h,vertical);
    ctx.restore();
  }

  // ---- purchasable wall material overlay ----
  function drawWallSkinOverlay(x,y,w,h,vertical){
    if(equippedWallSkin==='classic') return;
    ctx.shadowColor = 'transparent';
    if(equippedWallSkin==='grain'){
      ctx.globalAlpha = .3;
      ctx.strokeStyle = 'rgba(30,15,5,.55)';
      ctx.lineWidth = Math.max(1, Math.min(w,h)*0.06);
      const lines = 3;
      for(let i=1;i<=lines;i++){
        ctx.beginPath();
        if(vertical){
          const lx = x + (w/(lines+1))*i;
          ctx.moveTo(lx, y+h*0.08); ctx.lineTo(lx, y+h*0.92);
        } else {
          const ly = y + (h/(lines+1))*i;
          ctx.moveTo(x+w*0.08, ly); ctx.lineTo(x+w*0.92, ly);
        }
        ctx.stroke();
      }
    } else if(equippedWallSkin==='metal'){
      ctx.globalAlpha = .85;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      const rv = Math.max(1.4, Math.min(w,h)*0.16);
      const pts = vertical
        ? [[x+w/2, y+h*0.14], [x+w/2, y+h*0.86]]
        : [[x+w*0.14, y+h/2], [x+w*0.86, y+h/2]];
      pts.forEach(p=>{
        ctx.beginPath(); ctx.arc(p[0], p[1], rv, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], rv*0.5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(60,60,60,.6)'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.65)';
      });
    } else if(equippedWallSkin==='crystal'){
      ctx.globalAlpha = .5;
      ctx.fillStyle = 'rgba(220,245,255,.55)';
      if(vertical) roundRect(x+w*0.1, y+h*0.06, w*0.22, h*0.4, w*0.1);
      else roundRect(x+w*0.06, y+h*0.1, w*0.4, h*0.22, h*0.1);
      ctx.fill();
    } else if(equippedWallSkin==='gold'){
      ctx.globalAlpha = .8;
      const gg = vertical
        ? ctx.createLinearGradient(x,y,x+w,y)
        : ctx.createLinearGradient(x,y,x,y+h);
      gg.addColorStop(0, 'rgba(255,235,150,.15)');
      gg.addColorStop(.5, 'rgba(255,215,90,.55)');
      gg.addColorStop(1, 'rgba(255,235,150,.15)');
      ctx.fillStyle = gg;
      roundRect(x,y,w,h, Math.min(w,h)/2);
      ctx.fill();
      ctx.globalAlpha = .5;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      if(vertical) roundRect(x+w*0.4, y+h*0.06, w*0.2, h*0.88, w*0.1);
      else roundRect(x+w*0.06, y+h*0.4, w*0.88, h*0.2, h*0.1);
      ctx.fill();
    } else if(equippedWallSkin==='neon'){
      ctx.globalAlpha = .95;
      ctx.shadowColor = 'rgba(90,209,255,.95)';
      ctx.shadowBlur = Math.max(4, Math.min(w,h)*0.55);
      ctx.strokeStyle = 'rgba(150,230,255,.95)';
      ctx.lineWidth = Math.max(1.4, Math.min(w,h)*0.16);
      if(vertical) roundRect(x+w*0.32, y+h*0.06, w*0.36, h*0.88, w*0.14);
      else roundRect(x+w*0.06, y+h*0.32, w*0.88, h*0.36, h*0.14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if(equippedWallSkin==='onyx'){
      ctx.globalAlpha = .7;
      const gg = vertical
        ? ctx.createLinearGradient(x,y,x+w,y)
        : ctx.createLinearGradient(x,y,x,y+h);
      gg.addColorStop(0, 'rgba(70,40,120,.05)');
      gg.addColorStop(.5, 'rgba(150,90,230,.55)');
      gg.addColorStop(1, 'rgba(70,40,120,.05)');
      ctx.fillStyle = gg;
      roundRect(x,y,w,h, Math.min(w,h)/2);
      ctx.fill();
      ctx.globalAlpha = .5;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      if(vertical) roundRect(x+w*0.42, y+h*0.06, w*0.16, h*0.88, w*0.08);
      else roundRect(x+w*0.06, y+h*0.42, w*0.88, h*0.16, h*0.08);
      ctx.fill();
    } else if(equippedWallSkin==='greatwall'){
      // stone-block base tint
      ctx.globalAlpha = .55;
      ctx.fillStyle = 'rgba(150,140,120,.5)';
      roundRect(x,y,w,h, Math.min(w,h)/2);
      ctx.fill();
      // brick mortar lines
      ctx.globalAlpha = .4;
      ctx.strokeStyle = 'rgba(60,50,40,.6)';
      ctx.lineWidth = Math.max(1, Math.min(w,h)*0.05);
      const segs = 4;
      for(let i=1;i<segs;i++){
        ctx.beginPath();
        if(vertical){
          const ly = y + (h/segs)*i;
          ctx.moveTo(x+w*0.1, ly); ctx.lineTo(x+w*0.9, ly);
        } else {
          const lx = x + (w/segs)*i;
          ctx.moveTo(lx, y+h*0.1); ctx.lineTo(lx, y+h*0.9);
        }
        ctx.stroke();
      }
      // crenellations (merlons) running along the wall like the Great Wall's battlements
      ctx.globalAlpha = .9;
      ctx.fillStyle = 'rgba(120,110,95,.9)';
      const merlons = 3;
      if(vertical){
        const mh = h/(merlons*2+1);
        for(let i=0;i<merlons;i++){
          const my = y + mh*(2*i+0.5);
          ctx.fillRect(x - w*0.2, my, w*0.2, mh);
        }
      } else {
        const mw = w/(merlons*2+1);
        for(let i=0;i<merlons;i++){
          const mx = x + mw*(2*i+0.5);
          ctx.fillRect(mx, y - h*0.2, mw, h*0.2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- input ----------
  function getPointer(evt){
    const rect = canvasRect || (canvasRect = canvas.getBoundingClientRect());
    const t = evt.changedTouches && evt.changedTouches[0] ? evt.changedTouches[0] : (evt.touches && evt.touches[0] ? evt.touches[0] : evt);
    const x = (t.clientX - rect.left);
    const y = (t.clientY - rect.top);
    return {x,y};
  }

  function handleTapMove(px, py){
    const gx = Math.floor(px/cell), gy = Math.floor(py/cell);
    if(!inBounds(gx,gy)) return;
    tryMove(state.turn, gx, gy);
  }

  function nearestEdge(px, py){
    const gx = px/cell, gy = py/cell;
    const cxFrac = gx - Math.floor(gx);
    const cyFrac = gy - Math.floor(gy);
    const col = Math.floor(gx), row = Math.floor(gy);
    const distRight = Math.abs(cxFrac-1)*cell;
    const distLeft = Math.abs(cxFrac)*cell;
    const distBottom = Math.abs(cyFrac-1)*cell;
    const distTop = Math.abs(cyFrac)*cell;
    const THRESH = cell*0.32;

    const candidates = [];
    if(distRight < THRESH && col <= N-2) candidates.push({type:'v', x:col, y:row, d:distRight});
    if(distLeft < THRESH && col-1 >= 0) candidates.push({type:'v', x:col-1, y:row, d:distLeft});
    if(distBottom < THRESH && row <= N-2) candidates.push({type:'h', x:col, y:row, d:distBottom});
    if(distTop < THRESH && row-1 >= 0) candidates.push({type:'h', x:col, y:row-1, d:distTop});
    if(!candidates.length) return null;
    candidates.sort((a,b)=>a.d-b.d);
    return candidates[0];
  }

  function nearestWallEdge(px, py){
    const gx = px/cell, gy = py/cell;
    const cxFrac = gx - Math.floor(gx);
    const cyFrac = gy - Math.floor(gy);
    const col = Math.floor(gx), row = Math.floor(gy);
    const distRight = Math.abs(cxFrac-1)*cell;
    const distLeft = Math.abs(cxFrac)*cell;
    const distBottom = Math.abs(cyFrac-1)*cell;
    const distTop = Math.abs(cyFrac)*cell;
    const THRESH = cell*0.4;

    const candidates = [];
    function tryV(x,y,d){ if(state.wallsV.has(x+','+y)) candidates.push({type:'v', x, y, d}); }
    function tryH(x,y,d){ if(state.wallsH.has(x+','+y)) candidates.push({type:'h', x, y, d}); }
    if(distRight < THRESH && col <= N-2) tryV(col, row, distRight);
    if(distLeft < THRESH && col-1 >= 0) tryV(col-1, row, distLeft);
    if(distBottom < THRESH && row <= N-2) tryH(col, row, distBottom);
    if(distTop < THRESH && row-1 >= 0) tryH(col, row-1, distTop);
    if(!candidates.length) return null;
    candidates.sort((a,b)=>a.d-b.d);
    return candidates[0];
  }

  function checkEdgeValidity(edge){
    const pIdx = state.turn;
    if(state.sticksLeft[pIdx] <= 0) return false;
    if(edge.type==='v'){
      const key = edge.x+','+edge.y;
      if(state.wallsV.has(key)) return false;
      state.wallsV.add(key);
      const ok = bothPathsOk();
      state.wallsV.delete(key);
      return ok;
    } else {
      const key = edge.x+','+edge.y;
      if(state.wallsH.has(key)) return false;
      state.wallsH.add(key);
      const ok = bothPathsOk();
      state.wallsH.delete(key);
      return ok;
    }
  }

  let pointerMovePending = false;
  let lastPointerEvt = null;
  function onPointerMove(evt){
    lastPointerEvt = evt;
    if(pointerMovePending) return;
    pointerMovePending = true;
    requestAnimationFrame(()=>{
      pointerMovePending = false;
      processPointerMove(lastPointerEvt);
    });
  }
  function processPointerMove(evt){
    if(state.over) return;
    const {x,y} = getPointer(evt);
    if(state.mode==='wall'){
      const edge = nearestEdge(x,y);
      if(edge) edge.valid = checkEdgeValidity(edge);
      selectedEdge = edge;
      draw();
    } else if(state.mode==='break'){
      selectedEdge = nearestWallEdge(x,y);
      draw();
    }
  }

  function onTap(evt){
    evt.preventDefault();
    const {x,y} = getPointer(evt);
    if(state.over) return;
    if(onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
    if(state.mode==='move'){
      handleTapMove(x,y);
      draw();
      if(state.anim) requestAnimationFrame(draw);
    } else if(state.mode==='break'){
      const edge = nearestWallEdge(x,y);
      if(!edge){ toast('روی یه چوبِ موجود بزن'); return; }
      tryBreakWall(edge.type, edge.x, edge.y);
      selectedEdge = null;
      draw();
    } else {
      const edge = nearestEdge(x,y);
      if(!edge){ toast('نزدیک‌تر روی خط بین دو خانه بزن'); return; }
      tryPlaceWall(edge.type, edge.x, edge.y);
      selectedEdge = null;
      draw();
    }
  }

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('touchmove', (e)=>{ onPointerMove(e); }, {passive:true});
  canvas.addEventListener('click', onTap);
  canvas.addEventListener('touchend', (e)=>{ onTap(e); });

  function commitName(idx, input){
    let v = input.value.trim();
    if(!v) v = idx===0 ? 'بازیکن ۱' : 'بازیکن ۲';
    v = v.slice(0,10);
    input.value = v;
    playerNames[idx] = v;
    if(onlineMode) sendAction({type:'name', idx:idx, name:v});
    updateHud();
  }
  name1Input.addEventListener('change', ()=> commitName(0, name1Input));
  name2Input.addEventListener('change', ()=> commitName(1, name2Input));
  name1Input.addEventListener('blur', ()=> commitName(0, name1Input));
  name2Input.addEventListener('blur', ()=> commitName(1, name2Input));

  moveModeBtn.addEventListener('click', ()=>{ setMode('move'); draw(); });
  wallModeBtn.addEventListener('click', ()=>{ setMode('wall'); draw(); });
  breakModeBtn.addEventListener('click', ()=>{
    if(state.breakerLeft[state.turn]<=0){ toast('خیبرشکنِ تو تموم شده!'); return; }
    if(onlineMode && state.turn !== myRole){ toast('نوبت شما نیست'); return; }
    setMode('break'); draw();
  });
  restartBtn.addEventListener('click', ()=> restart(false));
  playAgainBtn.addEventListener('click', ()=> restart(false));
  winExitBtn.addEventListener('click', ()=>{
    winOverlay.classList.remove('show');
    homeBtn.click();
  });
  shareResultBtn.addEventListener('click', async ()=>{
    const p = loadProfile();
    const link = referralLink(p);
    let text = '🎮 مسیرِ آزاد';
    if(lastGameResult){
      text += ' — ' + lastGameResult.winnerName + ' با ' + fmtSec(lastGameResult.elapsedSec) + ' برنده شد! 🏆';
    }
    text += '\nبیا با من بازی کن:';
    const ok = await shareOrCopy(text, link);
    if(ok){ markInviteShared(); }
  });
  if(rulesBtn) rulesBtn.addEventListener('click', ()=> rulesOverlay.classList.add('show'));
  closeRules.addEventListener('click', ()=> rulesOverlay.classList.remove('show'));
  closeRules2.addEventListener('click', ()=> rulesOverlay.classList.remove('show'));

  dailyBtn.addEventListener('click', ()=>{ renderDailyOverlay(); dailyOverlay.classList.add('show'); });
  closeDaily.addEventListener('click', ()=> dailyOverlay.classList.remove('show'));
  startDailyBtn.addEventListener('click', startDailyChallenge);

  hintBtn.addEventListener('click', useHint);

  puzzleBtn.addEventListener('click', ()=>{ renderPuzzleList(); puzzleOverlay.classList.add('show'); });
  closePuzzle.addEventListener('click', ()=> puzzleOverlay.classList.remove('show'));
  closePuzzle2.addEventListener('click', ()=> puzzleOverlay.classList.remove('show'));
  puzzleBarListBtn.addEventListener('click', ()=>{
    exitPuzzleMode();
    appEl.classList.add('hidden');
    startScreen.classList.remove('hidden');
    renderPuzzleList();
    puzzleOverlay.classList.add('show');
  });
  puzzleNextBtn.addEventListener('click', ()=>{
    winOverlay.classList.remove('show');
    startPuzzle(currentPuzzleIdx+1);
  });
  puzzleListBtn2.addEventListener('click', ()=>{
    winOverlay.classList.remove('show');
    exitPuzzleMode();
    appEl.classList.add('hidden');
    startScreen.classList.remove('hidden');
    renderPuzzleList();
    puzzleOverlay.classList.add('show');
  });

  if(profileBtn) profileBtn.addEventListener('click', ()=>{ renderProfile(); profileOverlay.classList.add('show'); });
  if(startProfileBtn) startProfileBtn.addEventListener('click', ()=>{ renderProfile(); profileOverlay.classList.add('show'); });
  closeProfile.addEventListener('click', ()=> profileOverlay.classList.remove('show'));
  closeProfile2.addEventListener('click', ()=> profileOverlay.classList.remove('show'));

  function openInvite(){ renderInvite(loadProfile()); inviteOverlay.classList.add('show'); }
  openInviteFromProfileBtn.addEventListener('click', openInvite);
  closeInvite.addEventListener('click', ()=> inviteOverlay.classList.remove('show'));
  closeInvite2.addEventListener('click', ()=> inviteOverlay.classList.remove('show'));

  copyInviteBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(inviteLinkInput.value);
      toast('لینکِ دعوت کپی شد ✅');
    }catch(e){
      inviteLinkInput.select();
      try{ document.execCommand('copy'); toast('لینکِ دعوت کپی شد ✅'); }catch(e2){ toast('نشد کپی بشه'); }
    }
    markInviteShared();
    renderInvite(loadProfile());
  });
  shareInviteBtn.addEventListener('click', async ()=>{
    const p = loadProfile();
    const link = referralLink(p);
    const ok = await shareOrCopy('بیا با من «مسیرِ آزاد» بازی کنیم! 🎮🪵', link);
    if(ok){ markInviteShared(); renderInvite(loadProfile()); }
  });

  function openShop(){ shopTab = 'tile'; renderShop(); shopOverlay.classList.add('show'); }
  coinPillStart.addEventListener('click', openShop);
  coinPillApp.addEventListener('click', openShop);
  shopBtnStart.addEventListener('click', openShop);
  const coinAddBtnStart = document.getElementById('coinAddBtnStart');
  if(coinAddBtnStart) coinAddBtnStart.addEventListener('click', openShop);
  const coinAddBtnApp = document.getElementById('coinAddBtnApp');
  if(coinAddBtnApp) coinAddBtnApp.addEventListener('click', openShop);
  if(shopBtnApp) shopBtnApp.addEventListener('click', openShop);
  closeShop.addEventListener('click', ()=> shopOverlay.classList.remove('show'));
  closeShop2.addEventListener('click', ()=> shopOverlay.classList.remove('show'));
  shopTabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{ shopTab = btn.dataset.tab; renderShop(); });
  });
  shopGridEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]');
    if(!btn || btn.disabled) return;
    handleShopAction(btn.dataset.act, btn.dataset.id);
  });

  onlineBtn.addEventListener('click', openOnlineOverlay);
  closeOnline.addEventListener('click', ()=>{
    mmCancelled = true;
    if(!onlineMode) quickPlayMode = false;
    refundStakeIfUnmatched();
    closeOnlineOverlay();
    if(peer && !onlineMode){ try{ peer.destroy(); }catch(e){} peer=null; }
  });
  quickPlayBtn.addEventListener('click', beginStakeSelection);
  backFromStake.addEventListener('click', ()=> showOnlineView('menu'));
  stakeGrid.addEventListener('click', (e)=>{
    const btn = e.target.closest('.stake-btn');
    if(!btn || btn.disabled) return;
    chooseStakeAndPlay(parseInt(btn.dataset.amount, 10));
  });
  backFromQuick.addEventListener('click', cancelQuickPlay);
  createRoomBtn.addEventListener('click', beginCreateRoom);
  joinRoomBtn.addEventListener('click', beginJoinRoom);
  backFromCreate.addEventListener('click', ()=>{
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    showOnlineView('menu');
  });
  backFromJoin.addEventListener('click', ()=>{
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    showOnlineView('menu');
  });
  connectBtn.addEventListener('click', attemptJoin);
  joinCodeInput.addEventListener('input', ()=>{
    joinCodeInput.value = joinCodeInput.value.replace(/\D/g,'').slice(0,6);
  });
  joinCodeInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') attemptJoin();
  });
  leaveRoomBtn.addEventListener('click', ()=>{
    if(tournamentMode){
      exitTournament();
      toast('از تورنومنت خارج شدی');
    } else {
      exitOnline();
      toast('از روم خارج شدی');
    }
  });

  tournamentBtn.addEventListener('click', ()=>{
    playerNames[0] = (setupName1.value.trim() || 'بازیکن ۱').slice(0,10);
    name1Input.value = playerNames[0];
    openTournamentOverlay();
  });
  closeTournament.addEventListener('click', ()=>{
    tournamentOverlay.classList.remove('show');
  });
  tCreateBtn.addEventListener('click', beginCreateTournament);
  tJoinBtn.addEventListener('click', beginJoinTournament);
  tBackFromCreate.addEventListener('click', ()=>{
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    tournamentMode = false; tournament = null; myTournamentSlot = null; hostConns = {};
    showTView('menu');
  });
  tBackFromJoin.addEventListener('click', ()=>{
    if(peer){ try{ peer.destroy(); }catch(e){} peer=null; }
    tournamentMode = false; tournament = null; myTournamentSlot = null;
    showTView('menu');
  });
  tConnectBtn.addEventListener('click', attemptJoinTournament);
  tJoinCodeInput.addEventListener('input', ()=>{
    tJoinCodeInput.value = tJoinCodeInput.value.replace(/\D/g,'').slice(0,6);
  });
  tJoinCodeInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') attemptJoinTournament();
  });
  tStartBtn.addEventListener('click', ()=>{
    if(myTournamentSlot!==0 || !tournament) return;
    const filled = tournament.players.filter(p=> p && p.connected).length;
    if(filled<4) return;
    tournament.matches = [
      {id:0, round:1, p:[0,1], winner:null},
      {id:1, round:1, p:[2,3], winner:null},
      {id:2, round:2, p:[null,null], winner:null}
    ];
    tournament.currentMatchIdx = -1;
    tournament.finished = false;
    hostAdvanceMatch();
  });
  tLeaveLobbyBtn.addEventListener('click', ()=>{
    exitTournament();
    tournamentOverlay.classList.remove('show');
    toast('از تورنومنت خارج شدی');
  });
  tBracketBtn.addEventListener('click', ()=>{
    renderBracket();
    tBracketOverlay.classList.add('show');
  });
  closeTBracket.addEventListener('click', ()=> tBracketOverlay.classList.remove('show'));
  closeTBracket2.addEventListener('click', ()=> tBracketOverlay.classList.remove('show'));
  tNextMatchBtn.addEventListener('click', ()=>{
    if(myTournamentSlot!==0) return;
    hostAdvanceMatch();
  });
  tChampionHomeBtn.addEventListener('click', ()=>{
    exitTournament();
    tChampionOverlay.classList.remove('show');
    appEl.classList.add('hidden');
    startScreen.classList.remove('hidden');
    buildSwatches(swatches1El, 0);
    buildSwatches(swatches2El, 1);
  });

  function updateMechanicsBadge(){
    const n = mechanicsToggles.filter(t=>t.checked).length;
    mechanicsToggleBtn.classList.toggle('on', n>0);
    mechanicsCountBadge.classList.toggle('hidden', n===0);
    mechanicsCountBadge.textContent = toFa(n);
  }
  mechanicsToggleBtn.addEventListener('click', ()=>{
    const open = mechanicsPanel.classList.toggle('hidden') === false;
    mechanicsChevron.classList.toggle('open', open);
  });
  mechanicsToggles.forEach(t=> t.addEventListener('change', updateMechanicsBadge));
  updateMechanicsBadge();

  startGameBtn.addEventListener('click', ()=>{
    aiEnabled = aiToggle.checked;
    playerNames[0] = (setupName1.value.trim() || 'بازیکن ۱').slice(0,10);
    playerNames[1] = aiEnabled ? '🤖 ربات' : (setupName2.value.trim() || 'بازیکن ۲').slice(0,10);
    name1Input.value = playerNames[0];
    name2Input.value = playerNames[1];
    suddenDeathEnabled = suddenDeathToggle.checked;
    sessionScore = [0,0];
    onlineMode = false;
    aiThinking = false;
    startScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    applyPlayerColors();
    state = freshState({
      ice: iceToggle.checked,
      portal: portalToggle.checked,
      fragile: fragileToggle.checked,
      fog: fogToggle.checked
    });
    setMode('move');
    updateHud();
    updateScoreBar();
    updateNameEditability();
    updateRoomBadge();
    sdBadge.classList.add('hidden');
    resize();
    draw();
  });
  startOnlineBtn.addEventListener('click', ()=>{
    aiEnabled = false;
    aiToggle.checked = false;
    aiDiffRow.classList.add('hidden');
    playerNames[0] = (setupName1.value.trim() || 'بازیکن ۱').slice(0,10);
    playerNames[1] = (setupName2.value.trim() || 'بازیکن ۲').slice(0,10);
    name1Input.value = playerNames[0];
    name2Input.value = playerNames[1];
    openOnlineOverlay();
  });
  aiToggle.addEventListener('change', ()=>{
    aiDiffRow.classList.toggle('hidden', !aiToggle.checked);
    if(aiToggle.checked){
      aiPrevName2 = setupName2.value;
      setupName2.value = '🤖 ربات';
      setupName2.readOnly = true;
    } else {
      setupName2.readOnly = false;
      setupName2.value = aiPrevName2 || 'بازیکن ۲';
    }
  });
  diffBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      diffBtns.forEach(b=> b.classList.toggle('on', b===btn));
      aiDifficulty = btn.dataset.diff;
    });
  });
  startRulesBtn.addEventListener('click', ()=> rulesOverlay.classList.add('show'));
  homeBtn.addEventListener('click', ()=>{
    stopSuddenDeathMusic();
    if(tournamentMode) exitTournament();
    else if(onlineMode) exitOnline();
    if(puzzleMode) exitPuzzleMode();
    aiThinking = false;
    appEl.classList.add('hidden');
    startScreen.classList.remove('hidden');
    buildSwatches(swatches1El, 0);
    buildSwatches(swatches2El, 1);
  });

  buildSwatches(swatches1El, 0);
  buildSwatches(swatches2El, 1);
  updateSetupDot(0);
  updateSetupDot(1);
  applyEquippedCosmetics();
  updateCoinDisplays();

  // ---- hidden cheat code: type "hesoyam" anywhere to load up on coins ----
  const CHEAT_CODE = 'hesoyam';
  const CHEAT_COINS = 250000;
  let cheatBuffer = '';
  window.addEventListener('keydown', (e)=>{
    if(!e.key || e.key.length !== 1) return;
    cheatBuffer = (cheatBuffer + e.key.toLowerCase()).slice(-CHEAT_CODE.length);
    if(cheatBuffer === CHEAT_CODE){
      cheatBuffer = '';
      awardCoins(CHEAT_COINS, 'کدِ تقلب 💸');
      vibrate([15,40,15,40,15]);
      playSound('item');
    }
  });

  // ---- sound / volume panel wiring ----
  const soundPanel = document.getElementById('soundPanel');
  const soundBtnStart = document.getElementById('soundBtnStart');
  const soundBtnApp = document.getElementById('soundBtnApp');
  const muteAllBtn = document.getElementById('muteAllBtn');
  const sfxVolumeSlider = document.getElementById('sfxVolumeSlider');
  const musicVolumeSlider = document.getElementById('musicVolumeSlider');

  function refreshSoundPanelUI(){
    sfxVolumeSlider.value = Math.round(audioSettings.sfx*100);
    musicVolumeSlider.value = Math.round(audioSettings.music*100);
    muteAllBtn.textContent = audioSettings.muted ? 'صدا: خاموش' : 'صدا: روشن';
    muteAllBtn.classList.toggle('muted', audioSettings.muted);
    const icon = audioSettings.muted ? '🔇' : '🔊';
    soundBtnStart.textContent = icon;
    soundBtnApp.textContent = icon;
  }
  function toggleSoundPanel(){
    soundPanel.classList.toggle('show');
  }
  soundBtnStart.addEventListener('click', toggleSoundPanel);
  soundBtnApp.addEventListener('click', toggleSoundPanel);
  document.addEventListener('click', (e)=>{
    if(!soundPanel.classList.contains('show')) return;
    if(soundPanel.contains(e.target) || e.target===soundBtnStart || e.target===soundBtnApp) return;
    soundPanel.classList.remove('show');
  });
  muteAllBtn.addEventListener('click', ()=>{
    audioSettings.muted = !audioSettings.muted;
    saveAudioSettings();
    refreshSoundPanelUI();
    applyAudioSettingsLive();
    if(!audioSettings.muted) playSound('click');
  });
  sfxVolumeSlider.addEventListener('input', ()=>{
    audioSettings.sfx = sfxVolumeSlider.value/100;
    saveAudioSettings();
  });
  sfxVolumeSlider.addEventListener('change', ()=> playSound('click'));
  musicVolumeSlider.addEventListener('input', ()=>{
    audioSettings.music = musicVolumeSlider.value/100;
    saveAudioSettings();
    applyAudioSettingsLive();
  });
  refreshSoundPanelUI();

  function syncMenuMusic(){
    if(startScreen.classList.contains('hidden')) stopMenuMusic();
    else if(!audioSettings.muted && audioSettings.music>0) startMenuMusic();
  }
  new MutationObserver(syncMenuMusic).observe(startScreen, {attributes:true, attributeFilter:['class']});
  syncMenuMusic();

  setMode('move');
  updateHud();
  updateRoomBadge();
  resize();
})();

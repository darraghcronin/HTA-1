/**
 * game.js — Main loop, camera, spawn logic, full game controller
 */
const Game = (() => {
  // ── Canvas setup ────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const minimapCanvas = document.getElementById('minimap');
  const mmCtx = minimapCanvas.getContext('2d');

  let W, H;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  }
  window.addEventListener('resize', resize);

  // ── Game state ──────────────────────────────────────────────
  let player, enemies, npcs, keys, running;
  let camX, camY;
  let scale = 0.38;  // zoom level
  let frameCount = 0;
  let wantedDecayTimer = 0;
  let copSpawnTimer = 0;
  let roamEnemyTimer = 0;
  let lastTime = 0;

  // ── Camera ──────────────────────────────────────────────────
  function updateCamera() {
    const targetX = player.x - W / (2*scale);
    const targetY = player.y - H / (2*scale);
    camX += (targetX - camX) * 0.08;
    camY += (targetY - camY) * 0.08;
    // Shake
    if(FX.screenShake > 0) {
      camX += (Math.random()-0.5)*FX.screenShake/scale*0.5;
      camY += (Math.random()-0.5)*FX.screenShake/scale*0.5;
    }
    // Clamp to world
    camX = Math.max(0, Math.min(MAP.W - W/scale, camX));
    camY = Math.max(0, Math.min(MAP.H - H/scale, camY));
  }

  // ── Spawn helpers ───────────────────────────────────────────
  function spawnEnemy(def, x, y) {
    const e = createEnemy(def, x, y);
    enemies.push(e);
    return e;
  }

  function spawnRoamingEnemies() {
    if(enemies.filter(e=>!e.dead).length > 20) return;
    // Spawn random enemies away from player
    const angle = Math.random()*Math.PI*2;
    const dist = 500 + Math.random()*400;
    const ex = Math.max(300, Math.min(MAP.W-300, player.x + Math.cos(angle)*dist));
    const ey = Math.max(300, Math.min(MAP.H-300, player.y + Math.sin(angle)*dist));
    const tier = Math.min(Math.floor(player.score/5000), ENEMY_DEFS.length-2);
    const def = ENEMY_DEFS[Math.floor(Math.random()*(tier+1))];
    spawnEnemy(def, ex, ey);
  }

  function spawnCops() {
    if(player.wanted < 2) return;
    const count = player.wanted >= 4 ? 3 : player.wanted >= 3 ? 2 : 1;
    const copDef = ENEMY_DEFS.find(d=>d.type==='cop');
    for(let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2;
      const dist = 300 + Math.random()*200;
      const ex = Math.max(200, Math.min(MAP.W-200, player.x+Math.cos(angle)*dist));
      const ey = Math.max(200, Math.min(MAP.H-200, player.y+Math.sin(angle)*dist));
      spawnEnemy(copDef, ex, ey);
    }
    UI.notification(`⚠ COPS DISPATCHED — WANTED LEVEL ${player.wanted}`, 2500, '#5588ff');
  }

  // ── Scatter NPCs on map ─────────────────────────────────────
  function populateNPCs() {
    npcs = [];
    // Pedestrians at various spots
    const pedestrianZones = [
      [1550,1010],[1620,1020],[1480,980],[1700,1000], // Times Sq
      [1080,1020],[1100,1060],[1040,990],              // Grand Central
      [1360,1030],[1400,1060],[1330,990],              // Bryant Park
      [800,1100],[850,1050],[780,1150],
      [600,800],[650,820],[580,780],
    ];
    pedestrianZones.forEach(([x,y]) => {
      npcs.push(createNPC(x+Math.random()*60-30, y+Math.random()*60-30, 'pedestrian'));
    });
  }

  // ── Input ───────────────────────────────────────────────────
  function setupInput() {
    keys = {};
    const attackKeys = new Set();
    window.addEventListener('keydown', e => {
      if(!running) return;
      keys[e.key] = true;

      // Dialog advance
      if(e.key==='e'||e.key==='E') {
        if(UI.isDialogOpen()) { UI.advanceDialog(); return; }
        QUESTS.tryInteract(player, spawnEnemy);
        return;
      }
      // Attacks (one-shot on keydown)
      if((e.key==='j'||e.key==='J') && !attackKeys.has('j')) { attackKeys.add('j'); player.attack('punch', enemies); }
      if((e.key==='k'||e.key==='K') && !attackKeys.has('k')) { attackKeys.add('k'); player.attack('kick', enemies); }
      if((e.key==='l'||e.key==='L') && !attackKeys.has('l')) { attackKeys.add('l'); player.attack('special', enemies); }
      if((e.key==='r'||e.key==='R') && !attackKeys.has('r')) { attackKeys.add('r'); player.roll(); }
      // Zoom
      if(e.key==='='||e.key==='+') scale = Math.min(0.7, scale+0.05);
      if(e.key==='-') scale = Math.max(0.15, scale-0.05);
      e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      keys[e.key] = false;
      attackKeys.delete(e.key.toLowerCase());
    });
  }

  // ── Main loop ───────────────────────────────────────────────
  function loop(timestamp) {
    if(!running) return;
    const dt = Math.min((timestamp - lastTime)/16.67, 3);
    lastTime = timestamp;
    frameCount++;

    // ─ Update
    if(!UI.isDialogOpen()) {
      player.update(keys, enemies, MAP.W, MAP.H);
    }

    enemies.forEach(e => { e.update(player); });
    enemies = enemies.filter(e => !(e.dead && e.deathTimer<=0));
    npcs.forEach(n => n.update());
    FX.update();

    // Quest logic
    QUESTS.update(player, enemies, spawnEnemy);

    // Wanted system
    wantedDecayTimer++;
    if(wantedDecayTimer > 600 && player.wanted > 0) {
      player.wanted--;
      wantedDecayTimer = 0;
      if(player.wanted===0) UI.notification('WANTED LEVEL CLEARED', 2000, '#2ecc71');
    }
    copSpawnTimer++;
    if(copSpawnTimer > Math.max(180, 400-player.wanted*60)) {
      if(player.wanted>1) spawnCops();
      copSpawnTimer = 0;
    }
    roamEnemyTimer++;
    if(roamEnemyTimer > 300) { spawnRoamingEnemies(); roamEnemyTimer=0; }

    // Camera
    updateCamera();

    // ─ HUD updates
    UI.updateHealth(player.hp, player.maxHp, player.armor, player.maxArmor, player.stamina, player.maxStamina);
    UI.updateWanted(player.wanted);
    UI.updateScore(player.score);
    UI.updateCash(player.cash);
    if(!QUESTS.isActive()) UI.updateQuestPanel(null, 0, 0, 0);

    // Death check
    if(player.hp <= 0) { running=false; UI.showGameOver(player.score); return; }

    // ─ Render
    ctx.clearRect(0,0,W,H);
    MAP.render(ctx, camX, camY, scale);
    FX.renderDecals(ctx, camX, camY, scale);

    // Sort entities by Y for depth
    const allEntities = [...enemies, ...npcs].sort((a,b)=>a.y-b.y);
    allEntities.forEach(e => e.draw(ctx, camX, camY, scale));
    player.draw(ctx, camX, camY, scale);

    FX.renderParticles(ctx, camX, camY, scale);
    FX.renderTexts(ctx, camX, camY, scale);

    // Quest markers
    const objMarker = QUESTS.getMarker();
    if(objMarker) {
      UI.drawObjectiveMarker(ctx, objMarker.x, objMarker.y, camX, camY, scale, QUESTS.getActiveStageDesc().slice(0,20));
    }
    // Quest giver markers
    QUESTS.getQuestGivers().forEach(npc => {
      const d = Math.hypot(player.x-npc.x, player.y-npc.y);
      if(d < 800) {
        UI.drawQuestGiverMarker(ctx, npc.x, npc.y, camX, camY, scale, npc.name);
      }
    });

    // Combo display
    if(player.combo >= 3 && player.comboTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, player.comboTimer/30);
      ctx.fillStyle = player.combo>=8?'#ff4400':player.combo>=5?'#ff8800':'#f5c518';
      ctx.font = `bold ${Math.min(40, 18+player.combo*2)}px Bebas Neue, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor='#000'; ctx.shadowBlur=8;
      const labels = ['','','','NICE!','GOOD!','GREAT!','EXCELLENT!','CRAZY!!','UNSTOPPABLE!!!'];
      const lbl = labels[Math.min(player.combo, labels.length-1)] || player.combo+'x COMBO!!!';
      ctx.fillText(lbl, W/2, H-120);
      ctx.font='bold 16px Bebas Neue, sans-serif';
      ctx.fillStyle='#fff';
      ctx.fillText(player.combo + 'x COMBO', W/2, H-96);
      ctx.restore();
    }

    // Location display (show nearest landmark name)
    if(frameCount % 120 === 0) updateLocationDisplay();

    // Minimap
    MAP.renderMinimap(mmCtx, player.x, player.y, enemies, QUESTS.getAllMarkers());

    requestAnimationFrame(loop);
  }

  function updateLocationDisplay() {
    let nearest = null, nearestDist = Infinity;
    MAP.LANDMARKS.forEach(l => {
      const d = Math.hypot(player.x-(l.x+l.w/2), player.y-(l.y+l.h/2));
      if(d < nearestDist) { nearestDist=d; nearest=l; }
    });
    if(nearest && nearestDist < 400) {
      document.getElementById('minimap-label').textContent = nearest.name;
    } else {
      // Figure out approximate street/avenue
      const av = MAP.AVENUES.reduce((best,a)=>Math.abs(player.x-a.x)<Math.abs(player.x-best.x)?a:best);
      const st = MAP.STREETS.reduce((best,s)=>Math.abs(player.y-s.y)<Math.abs(player.y-best.y)?s:s);
      document.getElementById('minimap-label').textContent = (st?.name||'') + ' & ' + (av?.name?.split(' ')[0]||'');
    }
  }

  // ── Public API ──────────────────────────────────────────────
  function init() {
    resize();
    player = createPlayer(1360, 850);  // Start near Empire State
    camX = player.x - W/(2*scale);
    camY = player.y - H/(2*scale);
    enemies = [];
    populateNPCs();
    QUESTS.init(spawnEnemy);
    setupInput();
    // Initial roaming enemies
    for(let i=0;i<8;i++) spawnRoamingEnemies();
    running = true;
    UI.notification('WELCOME TO NYC — FIND A MISSION MARKER TO START', 4000);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function respawn() {
    UI.hideGameOver();
    FX.particles=[]; FX.texts=[]; FX.bloodDecals=[]; FX.screenShake=0;
    player = createPlayer(1360, 850);
    enemies = [];
    populateNPCs();
    QUESTS.init(spawnEnemy);
    for(let i=0;i<6;i++) spawnRoamingEnemies();
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  return { init, respawn };
})();

// ── Boot screen ─────────────────────────────────────────────
document.getElementById('boot-btn').addEventListener('click', () => {
  document.getElementById('boot-screen').style.display = 'none';
  document.getElementById('game-wrap').style.display = 'block';
  Game.init();
});

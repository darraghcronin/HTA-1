/**
 * entities.js — Player, Enemy, NPC, Particle systems
 */

// ── Particle / Effect system ────────────────────────────────
const FX = {
  particles: [],
  texts: [],
  bloodDecals: [],   // persistent blood on ground
  screenShake: 0,

  spawnHit(x, y, count=8, color='#cc2222') {
    for(let i=0;i<count;i++) {
      const a = Math.random()*Math.PI*2;
      const spd = 1.5 + Math.random()*4;
      this.particles.push({
        x,y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 2,
        life:1, decay: 0.03+Math.random()*0.04,
        size: 2+Math.random()*5, color,
        gravity: 0.15, type:'circle'
      });
    }
    // Blood splat on ground (persistent)
    this.bloodDecals.push({ x:x+Math.random()*20-10, y:y+Math.random()*10, r:3+Math.random()*8, alpha:0.7 });
    if(this.bloodDecals.length > 200) this.bloodDecals.shift();
    this.screenShake = Math.max(this.screenShake, 4);
  },

  spawnKO(x, y) {
    this.spawnHit(x, y, 20, '#cc2222');
    this.spawnHit(x, y, 10, '#ff6644');
    for(let i=0;i<6;i++) {
      this.particles.push({ x,y,vx:(Math.random()-0.5)*6,vy:-3-Math.random()*4,
        life:1,decay:0.025,size:8+Math.random()*6,color:'#ff2200',type:'star',gravity:0.2});
    }
    this.screenShake = 10;
  },

  spawnSpecial(x,y) {
    for(let i=0;i<30;i++) {
      const a = (i/30)*Math.PI*2;
      this.particles.push({
        x,y, vx:Math.cos(a)*5+Math.random()*2, vy:Math.sin(a)*5-1+Math.random()*2,
        life:1,decay:0.025,size:4+Math.random()*6,color:['#f5c518','#ff8800','#ff4400'][i%3],type:'circle',gravity:0.05
      });
    }
    this.screenShake = 14;
  },

  spawnCash(x,y,amount) {
    this.texts.push({ x,y,text:'+$'+amount,color:'#2ecc71',life:1,vy:-1.8,size:16 });
  },

  spawnDmg(x,y,dmg,color='#ff4444') {
    this.texts.push({ x,y:y-20,text:'-'+dmg,color,life:1,vy:-1.4,size:14 });
  },

  spawnNotif(x,y,text,color='#f5c518') {
    this.texts.push({ x,y:y-30,text,color,life:1.5,vy:-0.8,size:13 });
  },

  update() {
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity||0;
      p.life -= p.decay;
    });
    this.particles = this.particles.filter(p=>p.life>0);
    this.texts.forEach(t => { t.y+=t.vy; t.life-=0.02; });
    this.texts = this.texts.filter(t=>t.life>0);
    if(this.screenShake > 0) this.screenShake -= 0.5;
  },

  renderDecals(ctx, camX, camY, scale) {
    this.bloodDecals.forEach(d => {
      ctx.save();
      ctx.globalAlpha = d.alpha * 0.6;
      ctx.fillStyle = '#550000';
      ctx.beginPath();
      ctx.ellipse((d.x-camX)*scale, (d.y-camY)*scale, d.r*scale, d.r*0.6*scale, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  },

  renderParticles(ctx, camX, camY, scale) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      const px = (p.x-camX)*scale, py = (p.y-camY)*scale;
      if(p.type==='star') {
        ctx.font = `${p.size*scale*2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', px, py);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, p.size*scale, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });
  },

  renderTexts(ctx, camX, camY, scale) {
    this.texts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px Bebas Neue, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(t.text, (t.x-camX)*scale, (t.y-camY)*scale);
      ctx.restore();
    });
  }
};

// ── Player ──────────────────────────────────────────────────
function createPlayer(x, y) {
  return {
    x, y, w:18, h:24,
    vx:0, vy:0, speed:3.2,
    hp:100, maxHp:100,
    armor:0, maxArmor:100,
    stamina:100, maxStamina:100, staminaRegen:0.12,
    cash:0, score:0,
    wanted:0, wantedTimer:0,
    dir:'down', state:'idle',
    frame:0, frameTimer:0,
    attackTimer:0, hurtTimer:0, invincible:0,
    rollTimer:0, rollCooldown:0,
    combo:0, comboTimer:0,
    completedQuests:[],
    skin:'#d4956a', shirt:'#1a2a8a', pants:'#1a1a2a', hair:'#2a1808',

    attack(type, enemies) {
      if(this.attackTimer>0) return false;
      if(type==='special' && this.stamina<30) { FX.spawnNotif(this.x,this.y,'NO STAMINA!','#ff4444'); return false; }
      const cfg = { punch:{dmg:18,range:40,cd:16,cost:0}, kick:{dmg:30,range:50,cd:24,cost:8}, special:{dmg:55,range:80,cd:45,cost:30} };
      const c = cfg[type];
      this.state = type; this.attackTimer = c.cd;
      this.stamina = Math.max(0, this.stamina - c.cost);
      if(type==='special') FX.spawnSpecial(this.x, this.y);
      let hitCount = 0;
      enemies.forEach(e => {
        if(e.dead) return;
        const d = Math.hypot(e.x-this.x, e.y-this.y);
        if(d < c.range) {
          const dmg = c.dmg + Math.floor(Math.random()*10);
          e.takeDamage(dmg);
          FX.spawnDmg(e.x, e.y, dmg);
          hitCount++;
          this.combo++; this.comboTimer=90;
          this.score += e.dead ? (e.scoreVal||100) : 10;
          if(e.dead) { this.cash += e.cashDrop||0; FX.spawnCash(e.x,e.y,e.cashDrop||0); this.wanted++; }
        }
      });
      if(hitCount===0 && type==='punch') FX.spawnNotif(this.x,this.y,'MISS!','#888');
      return hitCount>0;
    },

    roll() {
      if(this.rollCooldown>0 || this.stamina<15) return;
      this.rollTimer = 20; this.rollCooldown = 40;
      this.stamina -= 15; this.invincible = 20;
      const dirMap = { right:[6,0],left:[-6,0],down:[0,6],up:[0,-6] };
      const [dvx,dvy] = dirMap[this.dir]||[0,6];
      this.vx += dvx; this.vy += dvy;
      FX.spawnNotif(this.x, this.y, 'DODGE!', '#44aaff');
    },

    takeDamage(dmg) {
      if(this.invincible>0) return;
      if(this.armor>0) {
        const ab = Math.min(this.armor, Math.ceil(dmg*0.6));
        this.armor -= ab; dmg -= ab;
      }
      this.hp -= dmg;
      this.hurtTimer = 15; this.invincible = 30;
      FX.spawnHit(this.x, this.y, 6, '#ff2200');
      FX.screenShake = Math.max(FX.screenShake, 6);
    },

    update(keys, enemies, mapW, mapH) {
      // Input
      let dx=0, dy=0;
      if(keys['a']||keys['ArrowLeft']) dx=-1;
      if(keys['d']||keys['ArrowRight']) dx=1;
      if(keys['w']||keys['ArrowUp']) dy=-1;
      if(keys['s']||keys['ArrowDown']) dy=1;
      if(dx&&dy){dx*=0.707;dy*=0.707;}

      let spd = this.speed;
      if(this.rollTimer>0) { spd=6; this.rollTimer--; }
      this.vx = dx*spd; this.vy = dy*spd;
      if(this.attackTimer>0){this.vx*=0.4;this.vy*=0.4;}

      this.x = Math.max(10, Math.min(mapW-10, this.x+this.vx));
      this.y = Math.max(10, Math.min(mapH-10, this.y+this.vy));

      // Direction
      if(dx||dy) {
        this.state='walk';
        if(Math.abs(dx)>Math.abs(dy)) this.dir=dx>0?'right':'left';
        else this.dir=dy>0?'down':'up';
        this.frameTimer++;
        if(this.frameTimer>7){this.frame++;this.frameTimer=0;}
      } else if(this.attackTimer<=0) {
        this.state='idle'; this.frame=0;
      }

      // Timers
      if(this.attackTimer>0) this.attackTimer--;
      if(this.invincible>0) this.invincible--;
      if(this.hurtTimer>0) this.hurtTimer--;
      if(this.rollCooldown>0) this.rollCooldown--;
      if(this.comboTimer>0) this.comboTimer--; else this.combo=0;
      this.stamina = Math.min(this.maxStamina, this.stamina+this.staminaRegen);
      if(this.wantedTimer>0) this.wantedTimer--;
      else if(this.wanted>0 && this.wantedTimer<=0) { /* wanted decreases handled externally */ }
    },

    draw(ctx, camX, camY, scale) {
      if(this.invincible>0 && Math.floor(this.invincible/4)%2===1) return;
      const sx = (this.x-camX)*scale, sy = (this.y-camY)*scale;
      const s = scale;
      drawHumanoid(ctx, sx, sy, this.w*s, this.h*s, {
        skin:this.skin, shirt:this.shirt, pants:this.pants, hair:this.hair,
        dir:this.dir, state:this.state, frame:this.frame, isPlayer:true,
        hurtTimer:this.hurtTimer, rollTimer:this.rollTimer
      });
      // Player indicator
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(sx, sy-this.h*s/2-6*s, 3*s, 0, Math.PI*2); ctx.fill();
    }
  };
}

// ── Enemy archetypes ────────────────────────────────────────
const ENEMY_DEFS = [
  { type:'thug',    name:'THUG',       skin:'#c07050',shirt:'#1a1a1a',pants:'#2a2030',hp:60, spd:1.6,dmg:12,score:80, cash:20, aggro:200 },
  { type:'gangster',name:'GANGSTER',   skin:'#3a2818',shirt:'#3a1a00',pants:'#1a1a1a',hp:90, spd:1.4,dmg:18,score:150,cash:40, aggro:250 },
  { type:'bouncer', name:'BOUNCER',    skin:'#e0b080',shirt:'#0a0a0a',pants:'#1a1a1a',hp:150,spd:1.1,dmg:28,score:250,cash:80, aggro:180 },
  { type:'cop',     name:'OFFICER',    skin:'#e8c090',shirt:'#224488',pants:'#224488',hp:100,spd:1.8,dmg:22,score:200,cash:0,  aggro:999, isCop:true },
  { type:'dealer',  name:'DEALER',     skin:'#b07848',shirt:'#4a1a00',pants:'#1a1a1a',hp:50, spd:2.0,dmg:8, score:120,cash:100,aggro:160, flees:true },
  { type:'bruiser', name:'BRUISER',    skin:'#c0a070',shirt:'#2a0a0a',pants:'#2a0000',hp:200,spd:1.0,dmg:35,score:400,cash:120,aggro:220 },
  { type:'hitman',  name:'HITMAN',     skin:'#d0b080',shirt:'#2a2a2a',pants:'#1a1a1a',hp:120,spd:2.2,dmg:25,score:350,cash:150,aggro:300 },
];

function createEnemy(def, x, y) {
  return {
    ...def, x, y, w:16, h:20,
    maxHp: def.hp, vx:0, vy:0,
    state:'idle', frame:0, frameTimer:0,
    attackCooldown:0, hurtTimer:0,
    dir:'down', dead:false, deathTimer:0,
    scoreVal: def.score, cashDrop: def.cash,
    wanderTimer: Math.floor(Math.random()*120),
    wanderDx:0, wanderDy:0,

    takeDamage(dmg) {
      this.hp -= dmg;
      this.hurtTimer = 12;
      FX.spawnHit(this.x, this.y, 5, '#cc2222');
      if(this.hp<=0 && !this.dead) {
        this.dead = true; this.deathTimer = 120;
        FX.spawnKO(this.x, this.y);
      }
    },

    update(player) {
      if(this.dead) { this.deathTimer--; return; }
      const d = Math.hypot(player.x-this.x, player.y-this.y);
      const aggro = this.aggro || 200;

      if(d < aggro) {
        // Chase
        if(this.flees && player.hp < 50) {
          // flee when player is weak
          this.vx = -(player.x-this.x)/d * this.spd;
          this.vy = -(player.y-this.y)/d * this.spd;
        } else {
          this.vx = (player.x-this.x)/d * this.spd;
          this.vy = (player.y-this.y)/d * this.spd;
          this.state = 'walk';
        }
        if(Math.abs(this.vx)>Math.abs(this.vy)) this.dir=this.vx>0?'right':'left';
        else this.dir=this.vy>0?'down':'up';
        // Attack
        if(d < 28 && this.attackCooldown<=0) {
          player.takeDamage(this.dmg);
          this.attackCooldown = 55 + Math.floor(Math.random()*30);
          this.state='punch';
          FX.spawnDmg(player.x, player.y, this.dmg, '#ff8800');
        }
      } else {
        // Wander
        this.wanderTimer--;
        if(this.wanderTimer<=0) {
          this.wanderDx = (Math.random()-0.5)*1.5;
          this.wanderDy = (Math.random()-0.5)*1.5;
          this.wanderTimer = 60+Math.floor(Math.random()*120);
        }
        this.vx = this.wanderDx; this.vy = this.wanderDy;
        this.state = (this.vx||this.vy)?'walk':'idle';
      }

      this.x += this.vx; this.y += this.vy;
      this.x = Math.max(200, Math.min(MAP.W-200, this.x));
      this.y = Math.max(200, Math.min(MAP.H-200, this.y));

      if(this.attackCooldown>0) this.attackCooldown--;
      if(this.hurtTimer>0) this.hurtTimer--;
      this.frameTimer++; if(this.frameTimer>7){this.frame++;this.frameTimer=0;}
    },

    draw(ctx, camX, camY, scale) {
      const sx=(this.x-camX)*scale, sy=(this.y-camY)*scale;
      const s=scale;
      // Death fade
      if(this.dead) {
        ctx.save(); ctx.globalAlpha=Math.max(0,this.deathTimer/120);
        ctx.translate(sx,sy);
        ctx.rotate((120-this.deathTimer)*0.08);
        ctx.translate(-sx,-sy);
      }
      if(this.hurtTimer>0){ctx.save();ctx.globalAlpha=0.5+Math.sin(this.hurtTimer*0.8)*0.5;}
      drawHumanoid(ctx, sx, sy, this.w*s, this.h*s, {
        skin:this.skin, shirt:this.shirt, pants:this.pants, hair:'#111',
        dir:this.dir, state:this.state, frame:this.frame, isPlayer:false,
        hurtTimer:this.hurtTimer
      });
      if(this.hurtTimer>0) ctx.restore();
      if(this.dead) ctx.restore();
      // HP bar
      if(!this.dead && Math.hypot(this.x-0,this.y-0)<9999) {
        const bw=24*s, bh=4*s;
        ctx.fillStyle='#111'; ctx.fillRect(sx-bw/2,sy-this.h*s/2-8*s,bw,bh);
        const pct=this.hp/this.maxHp;
        ctx.fillStyle=pct>0.5?'#2ecc71':pct>0.25?'#f5c518':'#e82020';
        ctx.fillRect(sx-bw/2,sy-this.h*s/2-8*s,bw*pct,bh);
        // Name
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillRect(sx-20*s,sy-this.h*s/2-16*s,40*s,10*s);
        ctx.fillStyle=this.isCop?'#5588ff':'#ff8888';
        ctx.font=`${Math.max(5,7*s)}px Bebas Neue, sans-serif`;
        ctx.textAlign='center';
        ctx.fillText(this.name, sx, sy-this.h*s/2-8*s);
      }
    }
  };
}

// ── NPC (non-hostile pedestrians) ──────────────────────────
function createNPC(x, y, role='pedestrian') {
  const skins = ['#e8c090','#c09060','#7a4820','#f0d0a0','#3a2818'];
  const shirts = ['#882020','#205020','#202080','#806020','#402040'];
  const def = { pedestrian:{}, shopkeeper:{isShop:true}, questgiver:{isQuestGiver:true} };
  const r = def[role]||{};
  return {
    x,y,w:14,h:18,role,
    skin:skins[Math.floor(Math.random()*skins.length)],
    shirt:shirts[Math.floor(Math.random()*shirts.length)],
    pants:'#111', hair:'#111',
    dir:'down', state:'walk', frame:0, frameTimer:0,
    wanderTimer:Math.floor(Math.random()*90),
    wanderDx:(Math.random()-0.5)*0.8, wanderDy:(Math.random()-0.5)*0.8,
    ...r,

    update() {
      this.wanderTimer--;
      if(this.wanderTimer<=0){
        this.wanderDx=(Math.random()-0.5)*0.8;
        this.wanderDy=(Math.random()-0.5)*0.8;
        this.wanderTimer=90+Math.floor(Math.random()*180);
      }
      this.x=Math.max(200,Math.min(MAP.W-200,this.x+this.wanderDx));
      this.y=Math.max(200,Math.min(MAP.H-200,this.y+this.wanderDy));
      this.state=this.wanderDx||this.wanderDy?'walk':'idle';
      if(Math.abs(this.wanderDx)>Math.abs(this.wanderDy)) this.dir=this.wanderDx>0?'right':'left';
      else this.dir=this.wanderDy>0?'down':'up';
      this.frameTimer++;if(this.frameTimer>8){this.frame++;this.frameTimer=0;}
    },

    draw(ctx, camX, camY, scale) {
      const sx=(this.x-camX)*scale,sy=(this.y-camY)*scale,s=scale;
      drawHumanoid(ctx,sx,sy,this.w*s,this.h*s,{
        skin:this.skin,shirt:this.shirt,pants:this.pants,hair:this.hair,
        dir:this.dir,state:this.state,frame:this.frame,isPlayer:false
      });
      if(this.isQuestGiver){
        ctx.fillStyle='#f5c518';
        ctx.font=`${Math.max(8,14*s)}px sans-serif`;
        ctx.textAlign='center';
        ctx.fillText('!',sx,sy-this.h*s/2-4*s);
      }
      if(this.isShop){
        ctx.fillStyle='#2ecc71';
        ctx.font=`${Math.max(6,10*s)}px sans-serif`;
        ctx.textAlign='center';
        ctx.fillText('$',sx,sy-this.h*s/2-4*s);
      }
    }
  };
}

// ── Shared humanoid renderer ────────────────────────────────
function drawHumanoid(ctx, cx, cy, w, h, opts) {
  const { skin, shirt, pants, hair, dir, state, frame, isPlayer, hurtTimer, rollTimer } = opts;
  const f = Math.floor(frame||0) % 4;
  const walk = state==='walk';
  const swing = walk ? Math.sin(f*Math.PI/2)*3 : 0;
  const punch = state==='punch'||state==='kick'||state==='special';
  const s = w/18; // scale factor

  ctx.save();
  ctx.translate(cx, cy);

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0,h*0.52,w*0.55,3*s,0,0,Math.PI*2); ctx.fill();

  // Legs
  const legW=w*0.35, legH=h*0.3;
  const legY=h*0.08;
  ctx.fillStyle=pants||'#111';
  // Left leg
  ctx.save(); ctx.translate(-w*0.15, legY);
  if(walk&&(dir==='left'||dir==='right')) ctx.rotate(swing*0.08);
  ctx.fillRect(-legW/2,0,legW,legH); ctx.restore();
  // Right leg
  ctx.save(); ctx.translate(w*0.15, legY);
  if(walk&&(dir==='left'||dir==='right')) ctx.rotate(-swing*0.08);
  ctx.fillRect(-legW/2,0,legW,legH); ctx.restore();
  // Shoes
  ctx.fillStyle='#111';
  ctx.fillRect(-w*0.3, legY+legH, legW, 3*s);
  ctx.fillRect(w*0.15-legW/2, legY+legH, legW, 3*s);

  // Body
  ctx.fillStyle=shirt||'#222';
  ctx.fillRect(-w*0.45, -h*0.2, w*0.9, h*0.28);

  // Arms
  const armY=-h*0.2, armW=w*0.22, armH=h*0.22;
  // Left arm
  ctx.fillStyle=skin||'#d4956a';
  ctx.save(); ctx.translate(-w*0.5-armW*0.3, armY);
  if(walk||(punch&&dir==='right')) ctx.rotate(swing*0.1+(punch&&dir==='right'?0.4:0));
  ctx.fillRect(0,0,armW,armH); ctx.restore();
  // Right arm
  ctx.save(); ctx.translate(w*0.5-armW*0.5, armY);
  if(walk||(punch&&dir==='left')) ctx.rotate(-swing*0.1-(punch&&dir==='left'?0.4:0));
  ctx.fillRect(0,0,armW,armH); ctx.restore();

  // Head
  ctx.fillStyle=skin||'#d4956a';
  const headR=w*0.38;
  ctx.beginPath(); ctx.ellipse(0,-h*0.26,headR,headR*1.1,0,0,Math.PI*2); ctx.fill();

  // Hair
  ctx.fillStyle=hair||'#111';
  ctx.beginPath(); ctx.ellipse(0,-h*0.26-headR*0.3,headR*0.9,headR*0.55,0,Math.PI,Math.PI*2); ctx.fill();

  // Eyes (not facing up)
  if(dir!=='up') {
    ctx.fillStyle='#111';
    ctx.fillRect(-headR*0.45,-h*0.3,headR*0.3,headR*0.3);
    ctx.fillRect(headR*0.15,-h*0.3,headR*0.3,headR*0.3);
    // Whites
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.fillRect(-headR*0.38,-h*0.3,headR*0.18,headR*0.18);
    ctx.fillRect(headR*0.2,-h*0.3,headR*0.18,headR*0.18);
  }

  // Hurt flash
  if(hurtTimer>0) {
    ctx.fillStyle=`rgba(255,0,0,${0.4+Math.sin(hurtTimer*0.8)*0.3})`;
    ctx.beginPath(); ctx.ellipse(0,0,w*0.6,h*0.6,0,0,Math.PI*2); ctx.fill();
  }

  // Roll trail
  if(rollTimer>0) {
    ctx.strokeStyle='rgba(100,200,255,0.3)';
    ctx.lineWidth=2*s;
    ctx.beginPath(); ctx.ellipse(0,0,w*0.7,h*0.7,0,0,Math.PI*2); ctx.stroke();
  }

  // Player star tag
  if(isPlayer) {
    ctx.fillStyle='#2ecc71';
    ctx.font=`${w*0.6}px sans-serif`;
    ctx.textAlign='center';
    ctx.fillText('▲', 0, -h*0.55-headR);
  }

  ctx.restore();
}

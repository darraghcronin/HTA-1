/**
 * map.js — NYC street grid + landmark rendering
 * Based on real Lower Manhattan / Midtown geography
 * World size: 3200 x 2400 (pixels at 1:1 zoom)
 */
const MAP = (() => {
  const W = 3200, H = 2400;

  // ── Color palette (night/day switchable) ──────────────────
  const C = {
    asphalt:    '#1c1e22',
    asphaltMark:'#2a2d33',
    sidewalk:   '#2e2e2e',
    sidewalkEdge:'#252525',
    block:      '#1a1c1f',
    parkGrass:  '#1e3a1e',
    parkPath:   '#2a2a20',
    water:      '#0d1f3c',
    waterShim:  '#162845',
    sand:       '#3a3028',
    roofBase:   '#23262b',
    roofTop:    '#1a1c20',
    glass:      '#1a3a5c',
    glassLit:   '#4a8ab0',
    streetLight:'#ffdd88',
    yellow:     '#f5c518',
    white:      '#e8e8e8',
    red:        '#cc2222',
    green:      '#226622',
    bridge:     '#3a3520',
    bridgeGird: '#4a4530',
    rail:       '#2a2030',
  };

  // ── Street grid definition (world coords) ─────────────────
  // Modeled on real NYC grid: avenues run N/S, streets run E/W
  // Avenues spaced ~180px, Streets spaced ~80px
  // 1st Ave area = x:400, 2nd=580, 3rd=760, Lex=920, Park=1060,
  // Mad=1200, 5th=1340, 6th=1480, 7th=1600, 8th=1740, 9th=1900
  const AVENUES = [
    { name:'FDR Drive',      x:200,  w:28, type:'highway' },
    { name:'1st Ave',        x:400,  w:22 },
    { name:'2nd Ave',        x:580,  w:22 },
    { name:'3rd Ave',        x:760,  w:24 },
    { name:'Lexington Ave',  x:930,  w:24 },
    { name:'Park Ave',       x:1080, w:30 },
    { name:'Madison Ave',    x:1220, w:22 },
    { name:'5th Ave',        x:1360, w:26 },
    { name:'6th Ave / AOA',  x:1510, w:26 },
    { name:'7th Ave',        x:1650, w:26 },
    { name:'Broadway',       x:1790, w:28, type:'diagonal' },
    { name:'8th Ave',        x:1880, w:26 },
    { name:'9th Ave',        x:2040, w:22 },
    { name:'10th Ave',       x:2200, w:22 },
    { name:'11th Ave / WSH', x:2360, w:28, type:'highway' },
    { name:'West Side Hwy',  x:2520, w:32, type:'highway' },
  ];

  // Streets every ~70px from y=200 to y=2200
  // Labeled as 14th St area = y:400, 23rd=560, 34th=800,
  // 42nd=1000, 50th=1160, 57th=1300, 72nd=1580, 86th=1860, 96th=2080
  const STREETS = [];
  const streetNames = [
    '14th St','15th St','16th St','17th St','18th St','19th St','20th St',
    '21st St','22nd St','23rd St','24th St','25th St','26th St','27th St',
    '28th St','29th St','30th St','31st St','32nd St','33rd St','34th St',
    '35th St','36th St','37th St','38th St','39th St','40th St','41st St',
    '42nd St','43rd St','44th St','45th St','46th St','47th St','48th St',
    '49th St','50th St','51st St','52nd St','53rd St','54th St','55th St',
    '56th St','57th St','58th St','59th St','60th St','61st St','62nd St',
    '63rd St','64th St','65th St','66th St','67th St','68th St','69th St',
    '70th St','71st St','72nd St','73rd St','74th St','75th St','76th St',
  ];
  for(let i=0;i<streetNames.length;i++) {
    STREETS.push({ name: streetNames[i], y: 240 + i*28, w: 18 });
  }
  // Major streets get wider
  const wideStreets = ['14th St','23rd St','34th St','42nd St','57th St','72nd St'];
  STREETS.forEach(s => { if(wideStreets.includes(s.name)) s.w = 28; });

  // ── Landmark building definitions ──────────────────────────
  const LANDMARKS = [
    // Empire State Building
    { id:'esb', name:'EMPIRE STATE BLDG', x:1340, y:790, w:60, h:80,
      colors:['#3a3c42','#4a4c52','#55585f'], spire:true,
      desc:'342 floors above Midtown' },
    // Chrysler Building
    { id:'chrysler', name:'CHRYSLER BLDG', x:960, y:810, w:50, h:70,
      colors:['#4a4a4a','#5a5a5a','#888'], spire:true,
      desc:'Art Deco jewel of Lexington' },
    // One World Trade Center
    { id:'owtc', name:'ONE WORLD TRADE', x:490, y:1900, w:70, h:120,
      colors:['#2a3a4a','#3a4a5a','#4a6a8a'], spire:true,
      desc:'Freedom Tower — 1,776 ft' },
    // Rockefeller Center
    { id:'30rock', name:'30 ROCKEFELLER', x:1440, y:1080, w:55, h:90,
      colors:['#353535','#454545','#555'], spire:false,
      desc:'30 Rock — NBC Studios' },
    // MetLife Building
    { id:'metlife', name:'METLIFE BLDG', x:1100, y:990, w:50, h:75,
      colors:['#404040','#505050','#666'], spire:false,
      desc:'Pan Am legacy on Park Ave' },
    // Flatiron Building
    { id:'flatiron', name:'FLATIRON BLDG', x:1335, y:445, w:22, h:50,
      colors:['#5a5040','#6a6050','#8a7060'], spire:false, triangle:true,
      desc:'Iconic triangular skyscraper' },
    // Chrysler 2 (fictional filler)
    { id:'trump', name:'TRUMP TOWER', x:1350, y:1130, w:40, h:60,
      colors:['#5a4020','#7a5530','#aa7a40'], spire:false,
      desc:'Gold-clad Midtown tower' },
    // Grand Central
    { id:'gc', name:'GRAND CENTRAL', x:1070, y:1020, w:90, h:50,
      colors:['#4a3a28','#5a4a38','#7a6048'], spire:false, landmark:true,
      desc:'Beaux-Arts transit hub' },
    // Penn Station / MSG
    { id:'penn', name:'PENN STATION / MSG', x:1570, y:830, w:100, h:60,
      colors:['#303035','#404045','#555560'], spire:false, landmark:true,
      desc:'Below Madison Square Garden' },
    // Times Square area building
    { id:'ts1', name:'ONE TIMES SQUARE', x:1630, y:1010, w:35, h:65,
      colors:['#2a2a2a','#3a3a3a','#555'], billboard:true,
      desc:'The ball drops here every NYE' },
    // Waldorf Astoria
    { id:'waldorf', name:'WALDORF ASTORIA', x:1095, y:1080, w:55, h:65,
      colors:['#3a3028','#4a4038','#6a5a48'], spire:true,
      desc:'Park Ave luxury icon' },
    // UN Headquarters
    { id:'un', name:'UN HEADQUARTERS', x:350, y:1060, w:80, h:50,
      colors:['#304050','#406070','#5080a0'], spire:false,
      desc:'East River — world diplomacy' },
    // Brooklyn Bridge
    { id:'bb', name:'BROOKLYN BRIDGE', x:600, y:2200, w:400, h:24,
      type:'bridge', colors:['#3a3520','#4a4530','#222'],
      desc:'Iconic 1883 suspension bridge' },
    // Central Park (large green area)
    { id:'cp', name:'CENTRAL PARK', x:1060, y:1480, w:560, h:760,
      type:'park', colors:[C.parkGrass,'#224422','#1a3a1a'],
      desc:'843 acres of urban wilderness' },
    // Hudson River Park
    { id:'hrp', name:'HUDSON RIVER PARK', x:2530, y:400, w:120, h:1600,
      type:'park', colors:['#163a16','#1e3a1e','#1a301a'],
      desc:'Riverside greenway' },
    // High Line (elevated park)
    { id:'hl', name:'THE HIGH LINE', x:1860, y:400, w:20, h:500,
      type:'rail', colors:['#222820','#2a3020'],
      desc:'Elevated linear park in Chelsea' },
    // Madison Square Park
    { id:'msp', name:'MADISON SQ PARK', x:1280, y:445, w:60, h:60,
      type:'park', colors:[C.parkGrass,'#1e3a1e'],
      desc:'23rd St park by the Flatiron' },
    // Bryant Park
    { id:'bp', name:'BRYANT PARK', x:1460, y:1010, w:60, h:60,
      type:'park', colors:[C.parkGrass,'#1e3a1e'],
      desc:'Behind the NY Public Library' },
    // Union Square
    { id:'us', name:'UNION SQUARE', x:1295, y:375, w:55, h:55,
      type:'park', colors:[C.parkGrass],
      desc:'Greenmarket & gathering place' },
    // NY Public Library
    { id:'nypl', name:'NY PUBLIC LIBRARY', x:1380, y:1020, w:75, h:50,
      colors:['#6a5a40','#7a6a50','#9a8a70'], landmark:true,
      desc:'Beaux-Arts library on 5th Ave' },
    // Macy\'s Herald Square
    { id:'macys', name:"MACY'S HERALD SQ", x:1558, y:807, w:70, h:50,
      colors:['#553030','#663030','#883030'], landmark:true,
      desc:'World\'s largest department store' },
    // Times Square billboard block
    { id:'ts2', name:'TIMES SQUARE', x:1550, y:1010, w:200, h:100,
      type:'district', colors:['#1a1a22'],
      desc:'The Crossroads of the World' },
  ];

  // ── Regular city blocks (fill between streets/avenues) ────
  function drawCityBlocks(ctx, camX, camY, scale) {
    // Fill solid city block color across entire map
    ctx.fillStyle = C.block;
    ctx.fillRect(-camX*scale, -camY*scale, W*scale, H*scale);
  }

  // ── Draw water bodies ──────────────────────────────────────
  function drawWater(ctx, camX, camY, scale) {
    const ox = -camX*scale, oy = -camY*scale;
    const s = scale;
    // Hudson River (west)
    ctx.fillStyle = C.water;
    ctx.fillRect(ox + 2620*s, oy, W*s, H*s); // west of 11th
    // East River (east)
    ctx.fillStyle = C.water;
    ctx.fillRect(ox, oy, 180*s, H*s);
    // Shimmer on water
    ctx.fillStyle = C.waterShim;
    for(let i=0;i<20;i++) {
      ctx.fillRect(ox + (2650+i*25)*s, oy + (i*120+50)*s, 8*s, 2*s);
    }
    for(let i=0;i<20;i++) {
      ctx.fillRect(ox + (10+i*8)*s, oy + (i*115+80)*s, 6*s, 2*s);
    }
  }

  // ── Draw street grid ───────────────────────────────────────
  function drawStreets(ctx, camX, camY, scale) {
    const ox = -camX*scale, oy = -camY*scale;
    const s = scale;

    // Avenues (vertical)
    AVENUES.forEach(av => {
      const x = ox + av.x*s;
      ctx.fillStyle = av.type==='highway' ? '#242830' : C.asphalt;
      ctx.fillRect(x - av.w/2*s, oy, av.w*s, H*s);
      // Center line
      if(!av.type) {
        ctx.strokeStyle = C.yellow;
        ctx.setLineDash([12*s, 18*s]);
        ctx.lineWidth = 0.8*s;
        ctx.beginPath();
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + H*s);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Sidewalks
      ctx.fillStyle = C.sidewalk;
      ctx.fillRect(x - (av.w/2+6)*s, oy, 5*s, H*s);
      ctx.fillRect(x + (av.w/2+1)*s, oy, 5*s, H*s);
    });

    // Streets (horizontal)
    STREETS.forEach(st => {
      const y = oy + st.y*s;
      ctx.fillStyle = C.asphalt;
      ctx.fillRect(ox, y - st.w/2*s, W*s, st.w*s);
      // Dashes
      ctx.strokeStyle = C.yellow;
      ctx.setLineDash([10*s, 16*s]);
      ctx.lineWidth = 0.7*s;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + W*s, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Sidewalks
      ctx.fillStyle = C.sidewalk;
      ctx.fillRect(ox, y - (st.w/2+5)*s, W*s, 4*s);
      ctx.fillRect(ox, y + (st.w/2+1)*s, W*s, 4*s);
    });

    // Intersections (slightly lighter)
    AVENUES.forEach(av => {
      STREETS.forEach(st => {
        ctx.fillStyle = '#20232a';
        ctx.fillRect(
          ox + (av.x - av.w/2)*s,
          oy + (st.y - st.w/2)*s,
          av.w*s, st.w*s
        );
      });
    });
  }

  // ── Draw a single building ─────────────────────────────────
  function drawBuilding(ctx, b, ox, oy, s) {
    const x = ox + b.x*s, y = oy + b.y*s;
    const w = b.w*s, h = b.h*s;

    // Special types
    if(b.type==='park') {
      ctx.fillStyle = b.colors[0];
      ctx.fillRect(x, y, w, h);
      // Tree dots
      ctx.fillStyle = b.colors[1] || '#1a3a1a';
      const step = 28*s;
      for(let tx=x+10*s; tx<x+w-8*s; tx+=step) {
        for(let ty=y+10*s; ty<y+h-8*s; ty+=step) {
          ctx.beginPath();
          ctx.arc(tx + Math.sin(tx*ty)*8*s, ty + Math.cos(tx+ty)*6*s, 7*s, 0, Math.PI*2);
          ctx.fill();
        }
      }
      // Park path
      ctx.fillStyle = C.parkPath;
      ctx.fillRect(x + w*0.4, y, w*0.15, h);
      ctx.fillRect(x, y + h*0.45, w, h*0.1);
      // Label
      if(s > 0.15) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = `bold ${Math.max(7,9*s)}px Bebas Neue, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(b.name, x + w/2, y + h/2 + 4*s);
      }
      return;
    }

    if(b.type==='bridge') {
      ctx.fillStyle = b.colors[0];
      ctx.fillRect(x, y, w, h);
      // Cable lines
      ctx.strokeStyle = b.colors[1];
      ctx.lineWidth = 1.5*s;
      const cx1 = x + w*0.3, cx2 = x + w*0.7;
      const ty = y + h*0.5;
      const towerH = 60*s;
      // Towers
      ctx.fillStyle = b.colors[1];
      ctx.fillRect(cx1-4*s, y-towerH*0.6, 8*s, towerH);
      ctx.fillRect(cx2-4*s, y-towerH*0.6, 8*s, towerH);
      // Suspension cables
      ctx.beginPath();
      ctx.moveTo(cx1, y-towerH*0.6); ctx.quadraticCurveTo(x+w/2, y+h, cx2, y-towerH*0.6);
      ctx.stroke();
      return;
    }

    if(b.type==='district') {
      ctx.fillStyle = 'rgba(255,200,0,0.03)';
      ctx.fillRect(x, y, w, h);
      return;
    }

    if(b.type==='rail') {
      ctx.fillStyle = b.colors[0];
      ctx.fillRect(x, y, w, h);
      return;
    }

    // Standard building
    const shadow = 8*s;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x+shadow, y+shadow, w, h);

    // Base
    ctx.fillStyle = b.colors[0];
    ctx.fillRect(x, y, w, h);

    // Face gradient (lighter top)
    const grad = ctx.createLinearGradient(x, y, x, y+h);
    grad.addColorStop(0, b.colors[2] || b.colors[1]);
    grad.addColorStop(1, b.colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Windows grid
    const ww = Math.max(4, 6*s), wh = Math.max(3, 5*s);
    const wx = Math.max(6, 10*s), wy = Math.max(5, 9*s);
    const cols = Math.floor((w - 8*s) / wx);
    const rows = Math.floor((h - 8*s) / wy);
    for(let r=0; r<rows; r++) {
      for(let c=0; c<cols; c++) {
        const lit = Math.random() < 0.6;
        ctx.fillStyle = lit ? C.glassLit : C.glass;
        ctx.fillRect(x + 5*s + c*wx, y + 5*s + r*wy, ww, wh);
      }
    }

    // Spire
    if(b.spire) {
      ctx.fillStyle = b.colors[2] || '#888';
      ctx.beginPath();
      ctx.moveTo(x + w/2, y - 30*s);
      ctx.lineTo(x + w/2 - 3*s, y);
      ctx.lineTo(x + w/2 + 3*s, y);
      ctx.closePath();
      ctx.fill();
      // Tip light
      ctx.fillStyle = '#ff6644';
      ctx.beginPath();
      ctx.arc(x + w/2, y - 30*s, 2*s, 0, Math.PI*2);
      ctx.fill();
    }

    // Billboard on Times Square buildings
    if(b.billboard && s > 0.1) {
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(x - 15*s, y - 5*s, 30*s, 18*s);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(4, 7*s)}px Bebas Neue`;
      ctx.textAlign = 'center';
      ctx.fillText('NYC', x, y + 8*s);
    }

    // Roof details
    ctx.fillStyle = '#111';
    ctx.fillRect(x + w*0.2, y - 6*s, w*0.6, 5*s);

    // Name label (only if zoomed in enough)
    if(s > 0.22 && b.name) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const lw = (b.name.length * 5 + 10) * s;
      ctx.fillRect(x + w/2 - lw/2, y + h/2 - 7*s, lw, 12*s);
      ctx.fillStyle = '#ffdd88';
      ctx.font = `${Math.max(6, 8*s)}px Bebas Neue, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(b.name, x + w/2, y + h/2 + 3*s);
    }
  }

  // ── Draw all landmarks ─────────────────────────────────────
  function drawLandmarks(ctx, camX, camY, scale) {
    const ox = -camX*scale, oy = -camY*scale;
    LANDMARKS.forEach(b => drawBuilding(ctx, b, ox, oy, scale));
  }

  // ── Draw generic filler buildings for every city block ─────
  function drawFillerBuildings(ctx, camX, camY, scale) {
    if(scale < 0.06) return; // skip at very low zoom
    const ox = -camX*scale, oy = -camY*scale;
    const s = scale;

    // Seed-based deterministic filler
    const rng = (seed) => {
      let x = Math.sin(seed) * 43758.5453;
      return x - Math.floor(x);
    };

    // For each block between avenues & streets, fill with buildings
    for(let ai=0; ai<AVENUES.length-1; ai++) {
      for(let si=0; si<STREETS.length-1; si++) {
        const ax = AVENUES[ai].x + AVENUES[ai].w/2 + 6;
        const ax2 = AVENUES[ai+1].x - AVENUES[ai+1].w/2 - 6;
        const sy = STREETS[si].y + STREETS[si].w/2 + 4;
        const sy2 = STREETS[si+1].y - STREETS[si+1].w/2 - 4;
        const bw = ax2 - ax, bh = sy2 - sy;
        if(bw < 10 || bh < 8) continue;

        const seed = ai * 1000 + si;
        const numH = Math.floor(rng(seed) * 3) + 1;
        const numV = Math.floor(rng(seed+0.5) * 2) + 1;
        const bsw = (bw - 4*(numH-1)) / numH;
        const bsh = (bh - 4*(numV-1)) / numV;

        for(let bi=0; bi<numH; bi++) {
          for(let bj=0; bj<numV; bj++) {
            const bx = ax + bi*(bsw+4);
            const byy = sy + bj*(bsh+4);
            const lumi = 25 + Math.floor(rng(seed+bi*10+bj)*25);
            const col = `rgb(${lumi},${lumi},${lumi+5})`;

            const px = ox + bx*s, py = oy + byy*s;
            const pw = bsw*s, ph = bsh*s;

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(px+3*s, py+3*s, pw, ph);
            ctx.fillStyle = col;
            ctx.fillRect(px, py, pw, ph);

            // Windows (only if big enough)
            if(pw > 10 && ph > 8) {
              const ww = Math.max(2, 4*s), wh = Math.max(1.5, 3*s);
              const cols2 = Math.max(1, Math.floor(pw / (ww+2)));
              const rows2 = Math.max(1, Math.floor(ph / (wh+2)));
              for(let r=0;r<rows2;r++) {
                for(let c=0;c<cols2;c++) {
                  const lit = rng(seed+r*5+c*7) < 0.55;
                  ctx.fillStyle = lit ? 'rgba(100,160,200,0.7)' : 'rgba(20,40,60,0.8)';
                  ctx.fillRect(px + 2*s + c*(ww+2), py + 2*s + r*(wh+2), ww, wh);
                }
              }
            }
          }
        }
      }
    }
  }

  // ── Street name labels ─────────────────────────────────────
  function drawStreetLabels(ctx, camX, camY, scale) {
    if(scale < 0.18) return;
    const ox = -camX*scale, oy = -camY*scale;
    ctx.fillStyle = 'rgba(200,200,150,0.55)';
    ctx.font = `${Math.max(6, 8*scale)}px Share Tech Mono, monospace`;
    ctx.textAlign = 'left';
    STREETS.filter((_,i)=>i%3===0).forEach(st => {
      ctx.fillText(st.name, ox + 185*scale, oy + st.y*scale + 3*scale);
    });
    ctx.textAlign = 'center';
    AVENUES.filter((_,i)=>i%2===0).forEach(av => {
      ctx.save();
      ctx.translate(ox + av.x*scale, oy + 280*scale);
      ctx.rotate(-Math.PI/2);
      ctx.fillText(av.name, 0, 0);
      ctx.restore();
    });
  }

  // ── Streetlights ───────────────────────────────────────────
  function drawStreetlights(ctx, camX, camY, scale) {
    if(scale < 0.15) return;
    const ox = -camX*scale, oy = -camY*scale;
    AVENUES.forEach(av => {
      STREETS.filter((_,i)=>i%2===0).forEach(st => {
        const lx = ox + (av.x + av.w/2 + 8)*scale;
        const ly = oy + (st.y - st.w/2 - 8)*scale;
        ctx.fillStyle = '#888';
        ctx.fillRect(lx, ly, 1.5*scale, 10*scale);
        ctx.fillStyle = '#ffeeaa';
        ctx.beginPath();
        ctx.arc(lx + 4*scale, ly, 3*scale, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,150,0.1)';
        ctx.beginPath();
        ctx.arc(lx + 4*scale, ly, 18*scale, 0, Math.PI*2);
        ctx.fill();
      });
    });
  }

  // ── Main render function ───────────────────────────────────
  function render(ctx, camX, camY, scale) {
    ctx.save();
    drawCityBlocks(ctx, camX, camY, scale);
    drawWater(ctx, camX, camY, scale);
    drawStreets(ctx, camX, camY, scale);
    drawFillerBuildings(ctx, camX, camY, scale);
    drawLandmarks(ctx, camX, camY, scale);
    drawStreetlights(ctx, camX, camY, scale);
    drawStreetLabels(ctx, camX, camY, scale);
    ctx.restore();
  }

  // ── Minimap render ─────────────────────────────────────────
  function renderMinimap(ctx, playerX, playerY, entities, quests) {
    const W2 = 130, H2 = 130;
    ctx.clearRect(0, 0, W2, H2);
    ctx.save();
    ctx.beginPath(); ctx.arc(W2/2, H2/2, W2/2, 0, Math.PI*2); ctx.clip();

    // Scale entire world into minimap
    const sc = W2 / W;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W2, H2);

    // Water
    ctx.fillStyle = '#0d1f3c';
    ctx.fillRect(0, 0, 7, H2);
    ctx.fillRect(W2*0.82, 0, W2, H2);

    // Streets
    ctx.fillStyle = '#252830';
    AVENUES.forEach(av => ctx.fillRect(av.x*sc - 1, 0, 3, H2));
    STREETS.forEach(st => ctx.fillRect(0, st.y*sc - 0.5, W2, 2));

    // Park
    ctx.fillStyle = '#1e3a1e';
    ctx.fillRect(1060*sc, 1480*sc, 560*sc, 760*sc);

    // Quest markers
    if(quests) quests.forEach(q => {
      if(q.active && !q.complete) {
        ctx.fillStyle = '#f5c518';
        ctx.beginPath();
        ctx.arc(q.markerX*sc, q.markerY*sc, 3, 0, Math.PI*2);
        ctx.fill();
      }
    });

    // Enemies
    if(entities) entities.forEach(e => {
      if(!e.dead) {
        ctx.fillStyle = '#e82020';
        ctx.fillRect(e.x*sc - 1, e.y*sc - 1, 2, 2);
      }
    });

    // Player dot
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(playerX*sc, playerY*sc, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W2/2, H2/2, W2/2 - 1, 0, Math.PI*2); ctx.stroke();
  }

  return { render, renderMinimap, LANDMARKS, AVENUES, STREETS, W, H };
})();

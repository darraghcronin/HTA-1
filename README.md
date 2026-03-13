# NYC Streets — Open World Brawler

A GTA-inspired top-down open world brawler set in New York City, built entirely in vanilla HTML5/CSS/JavaScript. No dependencies. Runs in any modern browser — perfect for Chromebooks.

![NYC Streets](https://img.shields.io/badge/Game-Open%20World%20Brawler-red) ![HTML5](https://img.shields.io/badge/Built%20With-HTML5%2FJS-orange) ![No Dependencies](https://img.shields.io/badge/Dependencies-None-green)

---

## 🗽 Features

### Open World NYC Map
- Accurate Midtown & Lower Manhattan street grid (5th Ave, Park Ave, Broadway, etc.)
- Real NYC landmarks rendered in pixel-art style:
  - Empire State Building, Chrysler Building, One World Trade Center
  - Grand Central Terminal, Penn Station / MSG, 30 Rockefeller Plaza
  - Times Square, Central Park, Brooklyn Bridge, UN Headquarters
  - Flatiron Building, NY Public Library, Waldorf Astoria, Trump Tower
- Hudson River & East River with shimmering water
- Dynamic building windows (lit/unlit), streetlights, street name labels
- Minimap with real-time player/enemy/quest tracking

### Combat System
| Key | Action | Notes |
|-----|--------|-------|
| `WASD` / Arrow Keys | Move | 8-directional |
| `J` | Punch | Fast, low damage |
| `K` | Kick | Medium, costs stamina |
| `L` | Special | AOE burst, costs 30 stamina |
| `R` | Roll/Dodge | Invincibility frames, costs stamina |
| `E` | Interact | Talk to NPCs, advance dialog |
| `+` / `-` | Zoom | Adjust camera zoom |

- **Combo system** — chain hits for multiplied rewards (NICE → GOOD → EXCELLENT → UNSTOPPABLE)
- **Blood decals** — persistent on the ground
- **Screen shake** on heavy hits
- **Armor system** — absorbs 60% of damage

### Enemy Types
| Enemy | Description | Behavior |
|-------|-------------|----------|
| Thug | Street-level punk | Aggressive chaser |
| Gangster | Mid-tier crew member | Group fighter |
| Bouncer | Heavy tank | Slow but hits hard |
| Officer (Cop) | NYPD | Spawns when wanted ≥ 2 |
| Dealer | Cash-rich, low HP | Flees when player is weak |
| Bruiser | Elite heavy | High HP, brutal damage |
| Hitman | Fast assassin | Long aggro range |

### 8-Mission Story Campaign
1. **Welcome to the Streets** — Clear thugs from Times Square
2. **Hell's Kitchen Heat** — Take down the Westside crew
3. **Central Park Hustle** — Stop a deal at Sheep Meadow
4. **Lower East Side Lockdown** — Bust a dealer network
5. **Brooklyn Bridge Standoff** — Clear the Ferrara family
6. **Midtown Massacre** — Fight from 57th St to Penn Station
7. **The UN Incident** — Neutralize mercenaries at the UN HQ
8. **One World Trade — Final Stand** — The final boss gauntlet

### HUD & UI
- Real-time health/armor/stamina bars
- ⭐ Wanted system (5 levels — cops spawn at level 2+)
- Score & cash tracking
- Quest panel with multi-stage objectives & progress bar
- Floating damage numbers & notifications
- Mission Complete / WASTED screens

---

## 🚀 How to Play

### Option 1: Open locally
```bash
git clone https://github.com/YOUR_USERNAME/nyc-streets.git
cd nyc-streets
# Just open index.html in your browser
open index.html
```

### Option 2: GitHub Pages
1. Fork this repo
2. Go to Settings → Pages → Deploy from `main` branch `/root`
3. Visit `https://YOUR_USERNAME.github.io/nyc-streets`

---

## 📁 Project Structure

```
nyc-streets/
├── index.html          # Entry point & HTML structure
├── css/
│   └── style.css       # All styles — dark GTA aesthetic
├── js/
│   ├── map.js          # NYC map rendering (streets, buildings, landmarks)
│   ├── entities.js     # Player, enemies, NPCs, FX system
│   ├── quests.js       # Mission/quest logic (8 missions)
│   ├── ui.js           # HUD, dialogs, notifications
│   └── game.js         # Main game loop, camera, spawn system
└── README.md
```

---

## 🛠 Technical Details

- **Pure vanilla JS** — no frameworks, no build step
- **HTML5 Canvas** — 2D rendering
- **Pixel-perfect scaling** — works on any screen size
- **60fps game loop** with `requestAnimationFrame`
- **Entity-component-ish** architecture
- Procedural city block generation using seeded RNG
- Depth-sorted rendering (Y-sort)

---

## 🎮 Tips

- Talk to NPCs with **yellow `!`** markers to get missions
- Dodge rolls (`R`) give invincibility frames — use them against bouncers
- Build combos for score multipliers — 8+ hits = UNSTOPPABLE
- Wanted level decays after ~10 seconds without killing enemies
- Enemies scale in difficulty as your score increases
- Use `-`/`+` to zoom out and see more of the map

---

## License
MIT — do whatever you want with it.

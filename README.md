# Rift Swarm

**Rift Swarm** is a complete, dependency-free neon arena-survival roguelite. Hold the line against escalating waves of geometric hostiles, collect XP, stack upgrades, and take down the Rift Warden every fifth wave.

Built with plain HTML, CSS, and Canvas 2D. No frameworks, build step, or runtime network access required.

## Play

Open `index.html` through any static web server (the project runtime serves it at the repository root), then press **Play**.

- **Desktop:** `WASD` / arrow keys move · mouse aims · fire is automatic · `Space` or `Shift` dashes · `P` / `Esc` pauses · `M` mutes.
- **Touch:** drag the left joystick to move · aim and fire are automatic · tap **DASH** to dash.
- Choose one of three upgrade cards on every level-up with the mouse, touch, or keys `1`–`3`.

## Features

- Four enemy archetypes (drifter, weaver, spitter, brute) plus a multi-phase boss every fifth wave.
- Thirteen stackable upgrades, including fire rate, damage, multishot, piercing, ricochet, drones, crits, shields, magnet range, and hull plating.
- XP orbs, combo score multipliers, wave banners, boss health bars, screen shake, particles, and a full WebAudio synth soundtrack/SFX.
- Pause, title, level-up, and game-over screens with persistent best score and best wave in `localStorage`.
- Responsive desktop and mobile layouts with a virtual joystick, dash button, and safe-area-aware HUD.
- Self-hosted Orbitron/Rajdhani fonts and procedurally generated visuals — the game is fully self-contained.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD, overlays, and canvas mount point |
| `styles.css` | Responsive UI, overlays, HUD, touch controls |
| `game.js` | Game loop, entities, waves, upgrades, rendering, audio |
| `assets/fonts/` | Self-hosted WOFF2 font files |

## Assumptions

- The game targets a single-player, keyboard/mouse or touch experience and is designed for the provided static-site runtime.
- Best score and best wave are stored locally per browser; there are no accounts or backend services.
- Audio starts only after the first user gesture, as required by browser autoplay policies.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/babydraztic0211/Games)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/babydraztic0211/Games)

- 🎮 [Open the project](https://go.ondev.store/babydraztic0211/Games).
- ✨ [Remix this project](https://go.ondev.store/babydraztic0211/Games?remix=1).
- 💻 [Explore the source](https://github.com/babydraztic0211/Games).
- 🛠️ [Check build runs](https://github.com/babydraztic0211/Games/actions).
- 🐛 [Report an issue](https://github.com/babydraztic0211/Games/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/babydraztic0211).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
- 🧬 [Explore the remix source](https://github.com/babydraztic0211/Games).
<!-- omgithub:readme:end -->
